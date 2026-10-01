import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { getExecutionRuntime } from "../src/execution-runtime.js";
import {
  API_RESPONSE_BYTES,
  INLINE_RESULT_BYTES,
  SANDBOX_MAX_DEPTH,
} from "../src/limits.js";
import { ngwafMethods } from "../src/ngwaf.js";
import { createResultStore } from "../src/result-files.js";
import { execute } from "../src/tools/execute.js";
import {
  expectNoInternals,
  GITHUB_PAT,
  startLocalServer,
  tempDir,
} from "./helpers.js";

const ENTRY = join(import.meta.dir, "fixtures/sandbox-with-mock-fastly.mjs");

let server;
let basePath;
// Either one response for every request, or a function of the request that returns one.
let nextResponse;
const requests = [];

beforeAll(async () => {
  server = await startLocalServer((req, res) => {
    const request = {
      url: req.url,
      key: req.headers["fastly-key"],
      host: req.headers["x-original-host"],
      method: req.method,
      body: "",
    };
    requests.push(request);
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      request.body += chunk;
    });
    req.on("end", () => {
      const response =
        typeof nextResponse === "function" ? nextResponse(req) : nextResponse;
      const { status, contentType, body } = response;
      res.writeHead(status, { "content-type": contentType });
      if (response.chunked) {
        for (let offset = 0; offset < body.length; offset += 64 * 1024) {
          res.write(body.slice(offset, offset + 64 * 1024));
        }
        res.end();
      } else {
        res.end(body);
      }
    });
  });
  basePath = server.url;
});

afterAll(async () => {
  if (server) await server.close();
});

function runSandbox(
  code,
  { fastlyApiToken, runtime = process.execPath, policy, entry = ENTRY } = {},
) {
  return new Promise((resolve, reject) => {
    const args =
      runtime === process.execPath
        ? [entry]
        : ["--experimental-vm-modules", entry];
    const child = spawn(runtime, args, {
      stdio: ["pipe", "pipe", "pipe"],
      // Like production, the child gets no inherited environment, so the developer's own FASTLY_API_TOKEN cannot replace the token under test.
      env: {
        PATH: process.env.PATH,
        BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0",
        DO_NOT_TRACK: "1",
        FASTLY_MCP_TEST_API: basePath,
      },
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => {
      stdout += c;
    });
    child.stderr.on("data", (c) => {
      stderr += c;
    });
    child.on("error", reject);
    child.on("close", () => {
      try {
        resolve({ ...JSON.parse(stdout), stderr });
      } catch {
        reject(new Error(`unparseable sandbox output: ${stdout}${stderr}`));
      }
    });

    child.stdin.end(JSON.stringify({ code, fastlyApiToken, policy }));
  });
}

describe("large Fastly API responses through the sandbox bridge", () => {
  const services = (count, padding) =>
    JSON.stringify(
      Array.from({ length: count }, (_, i) => ({
        id: `srv${i}`,
        name: `service ${i}`,
        comment: "x".repeat(padding),
      })),
    );

  test("the raw response limit is enforced before parsing", async () => {
    nextResponse = {
      status: 200,
      contentType: "application/json",
      body: `${" ".repeat(API_RESPONSE_BYTES - 2)}[]`,
    };
    const exact = await runSandbox(
      "return { count: (await serviceApi.listServices()).length };",
      { fastlyApiToken: "token" },
    );
    expect(exact.result).toEqual({ count: 0 });

    nextResponse = {
      status: 200,
      contentType: "application/json",
      body: `${" ".repeat(API_RESPONSE_BYTES - 1)}[]`,
      chunked: true,
    };
    const oversized = await runSandbox(
      "return { count: (await serviceApi.listServices()).length };",
      { fastlyApiToken: "token" },
    );
    expect(oversized.ok).toBe(false);
    expect(oversized.error).toContain(
      `more than the ${API_RESPONSE_BYTES} bytes`,
    );
    expect(oversized.error).toContain("paging or filtering");

    // superagent leaves binary bodies unbuffered unless told otherwise, and an unbuffered body has no size limit.
    for (const contentType of ["application/octet-stream", "application/pdf"]) {
      nextResponse = {
        status: 200,
        contentType,
        body: "x".repeat(API_RESPONSE_BYTES + 1),
        chunked: true,
      };
      const binary = await runSandbox(
        "return typeof (await serviceApi.listServices());",
        { fastlyApiToken: "token" },
      );
      expect(binary.ok).toBe(false);
      expect(binary.error).toContain(
        `more than the ${API_RESPONSE_BYTES} bytes`,
      );
    }
  }, 60000);

  // The bridge used to hand over placeholders instead of nested values, with nothing to say so.
  test("a response too large to hand over is an error the snippet can read", async () => {
    nextResponse = {
      status: 200,
      contentType: "application/json",
      body: services(20_000, 200),
    };

    const out = await runSandbox("return await serviceApi.listServices();", {
      fastlyApiToken: "token",
    });

    expect(out.ok).toBe(false);
    expect(out.error).toContain("ServiceApi.listServices");
    expect(out.error).toContain("paging or filtering");
    expect(JSON.stringify(out)).not.toContain("[truncated: max depth]");
  }, 30000);

  test("a snippet can catch it and return something smaller", async () => {
    nextResponse = {
      status: 200,
      contentType: "application/json",
      body: services(20_000, 200),
    };

    const out = await runSandbox(
      `try { await serviceApi.listServices(); return "unexpected"; }
       catch (e) { return e.message.includes("bytes") ? "too large" : e.message; }`,
      { fastlyApiToken: "token" },
    );

    expect(out.ok).toBe(true);
    expect(out.result).toBe("too large");
  }, 30000);

  test("a deeply nested response is refused instead of returned incomplete", async () => {
    let body = { leaf: 42 };
    for (let i = 0; i < SANDBOX_MAX_DEPTH; i++) body = { next: body };
    nextResponse = {
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    };

    const out = await runSandbox(
      "return await iamPermissionsApi.listPermissions();",
      { fastlyApiToken: "token" },
    );
    expect(out.ok).toBe(false);
    expect(out.error).toContain(
      `nested deeper than ${SANDBOX_MAX_DEPTH} levels`,
    );
    expect(JSON.stringify(out)).not.toContain("[truncated: max depth]");

    nextResponse.body = JSON.stringify(body.next);
    const whole = await runSandbox(
      "return await iamPermissionsApi.listPermissions();",
      { fastlyApiToken: "token" },
    );
    expect(whole.ok).toBe(true);
    expect(whole.reduced).toBeUndefined();
    expect(whole.result).toEqual(body.next);
  }, 15000);

  // What a snippet may receive is separate from what it may return.
  test("a remote snippet receives a response larger than its result budget intact", async () => {
    nextResponse = {
      status: 200,
      contentType: "application/json",
      body: services(3_000, 40),
    };

    const out = await runSandbox(
      "const all = await serviceApi.listServices(); return [all.length, all[2999].id, all[2999].comment.length];",
      { fastlyApiToken: "token", policy: { remote: true }, runtime: "node" },
    );

    expect(out.ok).toBe(true);
    expect(out.result).toEqual([3000, "srv2999", 40]);
  }, 30000);
});

describe("Fastly API errors through the sandbox bridge", () => {
  test("hostile stack access stays a user error under the current runtime", async () => {
    const out = await runSandbox(`
      const error = new Error("user failure");
      Object.defineProperty(error, "stack", { get() { throw new Error("stack trap"); } });
      throw error;
    `);
    expect(out.ok).toBe(false);
    expect(out.error).toBe("user failure");
    expect(JSON.stringify(out)).not.toContain("Subprocess error");
  }, 15000);

  test("a rejected token reads as HTTP 401 with the API's own explanation", async () => {
    nextResponse = {
      status: 401,
      contentType: "text/plain",
      body: '{"msg":"Provided credentials are missing or invalid"}',
    };

    const out = await runSandbox("return await serviceApi.listServices();", {
      fastlyApiToken: "expired-token",
    });

    expect(out.ok).toBe(false);
    expect(out.error).toBe("HTTP 401 Unauthorized");
    expect(out.status).toBe(401);
    expect(out.body).toBe(
      '{"msg":"Provided credentials are missing or invalid"}',
    );
    expect(out.hint).toMatch(/Fastly rejected the API token/);
  }, 15000);

  test("a missing token is called out instead of blamed on the API", async () => {
    nextResponse = {
      status: 401,
      contentType: "text/plain",
      body: '{"msg":"Provided credentials are missing or invalid"}',
    };

    const out = await runSandbox("return await serviceApi.listServices();");

    expect(out.status).toBe(401);
    expect(out.hint).toMatch(/No Fastly API token is configured/);
  }, 15000);

  test("a JSON error body is passed through with its status", async () => {
    nextResponse = {
      status: 404,
      contentType: "application/json",
      body: '{"msg":"Record not found"}',
    };

    const out = await runSandbox(
      'return await serviceApi.getServiceDetail({service_id: "nope"});',
    );

    expect(out.error).toBe("HTTP 404 Not Found");
    expect(out.status).toBe(404);
    expect(out.body).toBe('{"msg":"Record not found"}');
    expect(out.hint).toBeUndefined();
  }, 15000);

  // The bridge describes the failure, then the uncaught error is described again, and each time the body gets cut.
  test("an API error body never shows part of a secret, caught or not", async () => {
    const token = GITHUB_PAT;
    nextResponse = {
      status: 404,
      contentType: "text/plain",
      body: `${" ".repeat(1970)}${token} tail`,
    };
    const uncaught = await runSandbox(
      'return await serviceApi.getServiceDetail({service_id: "nope"});',
    );
    expect(uncaught.body).toBe(`${" ".repeat(1970)}…`);
    const caught = await runSandbox(
      'try { await serviceApi.getServiceDetail({service_id: "nope"}); } catch (e) { return e.body; }',
    );
    expect(caught.result).toBe(`${" ".repeat(1970)}…`);
  }, 15000);

  test("user code can catch the failure and read status, body and message", async () => {
    nextResponse = {
      status: 403,
      contentType: "application/json",
      body: '{"msg":"You do not have access"}',
    };

    const out = await runSandbox(`
      try {
        return await serviceApi.listServices();
      } catch (e) {
        return { isError: e instanceof Error, message: e.message, status: e.status, body: e.body };
      }
    `);

    expect(out.ok).toBe(true);
    expect(out.result.isError).toBe(true);
    expect(out.result.message).toBe("HTTP 403 Forbidden");
    expect(out.result.status).toBe(403);
    expect(out.result.body).toBe('{"msg":"You do not have access"}');
  }, 15000);

  test("no sandbox internals leak into the reported stack", async () => {
    nextResponse = {
      status: 401,
      contentType: "text/plain",
      body: "nope",
    };

    const out = await runSandbox("return await serviceApi.listServices();");

    // Node keeps an async frame pointing back at the call and Bun does not, so
    // the stack and the line are reported opportunistically rather than promised.
    expectNoInternals(expect, out.stack);
    expect(out.stack ?? "").not.toContain("[object Object]");
    if (out.line) {
      expect(out.line.source).toBe("return await serviceApi.listServices();");
    }
  }, 15000);

  test("a 403 is reported as a permission problem, not a bad token", async () => {
    nextResponse = {
      status: 403,
      contentType: "application/json",
      body: '{"msg":"You do not have access to this service"}',
    };

    const out = await runSandbox("return await serviceApi.listServices();", {
      fastlyApiToken: "valid-but-limited",
    });

    expect(out.error).toBe("HTTP 403 Forbidden");
    expect(out.hint).toMatch(/not allowed to perform this operation/);
    expect(out.hint).not.toMatch(/revoked/);
  }, 15000);

  test("a successful call still returns deserialized data", async () => {
    nextResponse = {
      status: 200,
      contentType: "application/json",
      body: '[{"id":"svc123","name":"my-service"}]',
    };

    const out = await runSandbox(
      "const services = await serviceApi.listServices(); return services.map((s) => s.name);",
      { fastlyApiToken: "good-token" },
    );

    expect(out.ok).toBe(true);
    expect(out.result).toEqual(["my-service"]);
  }, 15000);
});

// `execute` spawns the sandbox with `process.execPath`, so whichever runtime is
// running the server is the one that has to behave. Only the stack shapes differ
// between the two, and Bun-only coverage would not catch a Node regression there.
const node = spawnSync("node", ["--version"]).status === 0 ? "node" : null;
const describeOnNode = node ? describe : describe.skip;

describeOnNode("stack reporting under Node", () => {
  test("the stack points at user code and keeps internals out", async () => {
    nextResponse = {
      status: 401,
      contentType: "text/plain",
      body: "nope",
    };

    const out = await runSandbox(
      "const id = 'svc';\nreturn await serviceApi.listServices();",
      { runtime: node },
    );

    expect(out.line).toEqual({
      number: 2,
      column: 8,
      source: "return await serviceApi.listServices();",
    });
    expectNoInternals(expect, out.stack);
  }, 15000);
});

const COLLIDING_ENTRY = join(
  import.meta.dir,
  "fixtures/sandbox-with-colliding-sdk.mjs",
);

const json = (body) => ({
  status: 200,
  contentType: "application/json",
  body: JSON.stringify(body),
});

const requestsSince = (start) =>
  requests.slice(start).map(({ url, key, host }) => {
    const parsed = new URL(url, "https://api.fastly.com");
    return {
      host,
      key,
      path: parsed.pathname,
      query: Object.fromEntries(parsed.searchParams),
    };
  });

// The Go SDK's recorded responses, including the deepest nesting a rule allows and a rate limit.
const NESTED_RULE = {
  id: "698650606232b4afcd5a47f7",
  type: "request",
  scope: { type: "workspace", applies_to: ["ws1"] },
  enabled: true,
  description: "nested_multival_test",
  group_operator: "any",
  request_logging: "sampled",
  conditions: [
    {
      type: "group",
      group_operator: "all",
      conditions: [
        {
          type: "single",
          field: "ip",
          operator: "in_list",
          value: "site.blacklist",
        },
        {
          type: "multival",
          field: "request_header",
          operator: "exists",
          group_operator: "all",
          conditions: [
            {
              type: "single",
              field: "name",
              operator: "equals",
              value: "x-something",
            },
            {
              type: "single",
              field: "value_string",
              operator: "equals",
              value: "abc-123",
            },
          ],
        },
      ],
    },
  ],
  actions: [{ type: "block" }],
  created_at: "2026-02-06T20:34:40Z",
  updated_at: "2026-02-06T20:34:40Z",
};

const RATE_LIMIT_RULE = {
  id: "6986506c32e98085365e81a6",
  type: "rate_limit",
  scope: { type: "workspace", applies_to: ["ws1"] },
  enabled: false,
  group_operator: "all",
  conditions: [
    { type: "single", field: "path", operator: "equals", value: "/login" },
  ],
  actions: [{ type: "block_signal", signal: "site.a-real-name-workspace" }],
  rate_limit: {
    signal: "site.a-real-name-workspace",
    threshold: 1,
    interval: 60,
    duration: 300,
    client_identifiers: [{ type: "ip", name: "name" }],
  },
  expires_at: "2026-12-31T00:00:00Z",
  not_in_any_sdk: { kept: [1, { deeper: true }] },
};

const WORKSPACE = {
  id: "ws1",
  name: "main",
  mode: "block",
  attack_signal_thresholds: {
    one_minute: 10000,
    ten_minutes: 10000,
    one_hour: 10000,
    immediate: true,
  },
  ip_anonymization: "hashed",
  default_blocking_response_code: 406,
  client_ip_headers: ["X-Forwarded-For", "X-Real-IP"],
  not_in_any_sdk: "kept",
};

// Serves `rules` for every rule listing and WORKSPACE for anything else.
const rulesAndWorkspace = (rules) => (req) =>
  json(req.url.includes("/rules") ? rules : WORKSPACE);

describe("NGWAF adapters through the sandbox bridge", () => {
  test("requests reach the fixed endpoints with encoded IDs and only the options given", async () => {
    nextResponse = json({ data: [], meta: { limit: 100, total: 0 } });
    const start = requests.length;
    const out = await runSandbox(
      `await ngwafRulesApi.listAccountRules();
       await ngwafRulesApi.listAccountRules({ enabled: false, types: "request,signal", action: "block", limit: 2, page: 0 });
       await ngwafRulesApi.listWorkspaceRules({ workspace_id: "ws/1 ?#", enabled: true });
       await new Fastly.NgwafWorkspacesApi().getWorkspace({ workspace_id: "ws1" });
       return "done";`,
      { fastlyApiToken: "token" },
    );
    expect(out.result).toBe("done");
    const common = { host: "api.fastly.com", key: "token" };
    expect(requestsSince(start)).toEqual([
      { ...common, path: "/ngwaf/v1/rules", query: {} },
      {
        ...common,
        path: "/ngwaf/v1/rules",
        query: {
          enabled: "false",
          types: "request,signal",
          action: "block",
          limit: "2",
          page: "0",
        },
      },
      {
        ...common,
        path: "/ngwaf/v1/workspaces/ws%2F1%20%3F%23/rules",
        query: { enabled: "true" },
      },
      { ...common, path: "/ngwaf/v1/workspaces/ws1", query: {} },
    ]);
  }, 15000);

  test("every owned method sends its options to its endpoint", async () => {
    nextResponse = json({ data: [], meta: { total: 0 } });
    const samples = { String: "a/b ?#", Number: 7, Boolean: false };
    const expected = [];
    const calls = ngwafMethods().map(
      ({ apiClass, method, httpPath, params }) => {
        const options = Object.fromEntries(
          params.map((p) => [p.name, samples[p.type]]),
        );
        const query = {};
        let path = httpPath;
        for (const [name, value] of Object.entries(options)) {
          if (path.includes(`{${name}}`)) {
            path = path.replace(`{${name}}`, encodeURIComponent(value));
          } else {
            query[name] = String(value);
          }
        }
        expected.push({ host: "api.fastly.com", key: "token", path, query });
        const global = apiClass[0].toLowerCase() + apiClass.slice(1);
        return `await ${global}.${method}(${JSON.stringify(options)});`;
      },
    );
    const start = requests.length;
    const out = await runSandbox(`${calls.join("\n")}\nreturn "done";`, {
      fastlyApiToken: "token",
    });
    expect(out.result).toBe("done");
    expect(requestsSince(start)).toEqual(expected);
  }, 15000);

  // Written out by hand, so a wrongly named option cannot pass by agreeing with its own metadata.
  test("analysis options reach the query as written", async () => {
    nextResponse = json({ data: [], meta: { total: 0 } });
    const start = requests.length;
    const out = await runSandbox(
      `await ngwafEventsApi.listEvents({ workspace_id: "ws1", from: "2026-09-30T00:00:00Z", to: "2026-09-30T12:00:00Z", ip: "192.0.2.1", signal: "SQLI", status: "expired", limit: 25, page: 3 });
       await ngwafRequestsApi.searchWorkspaceRequests({ workspace_id: "ws1", q: "from:-1h tag:XSS", limit: 50, page: 2 });
       await ngwafTimeseriesApi.getWorkspaceTimeseries({ workspace_id: "ws1", start: "2026-09-30T00:00:00Z", end: "2026-09-30T12:00:00Z", metrics: "requests_total,SQLI", granularity: 86400 });
       await ngwafWorkspacesApi.getTopAttacks({ workspace_id: "ws1", field: "path", from: "2026-09-30T00:00:00Z", limit: 10 });
       await ngwafSignalsApi.listWorkspaceSignals({ workspace_id: "ws1", limit: 200 });
       return "done";`,
      { fastlyApiToken: "token" },
    );
    expect(out.result).toBe("done");
    const common = { host: "api.fastly.com", key: "token" };
    expect(requestsSince(start)).toEqual([
      {
        ...common,
        path: "/ngwaf/v1/workspaces/ws1/events",
        query: {
          from: "2026-09-30T00:00:00Z",
          to: "2026-09-30T12:00:00Z",
          ip: "192.0.2.1",
          signal: "SQLI",
          status: "expired",
          limit: "25",
          page: "3",
        },
      },
      {
        ...common,
        path: "/ngwaf/v1/workspaces/ws1/requests",
        query: { q: "from:-1h tag:XSS", limit: "50", page: "2" },
      },
      {
        ...common,
        path: "/ngwaf/v1/workspaces/ws1/timeseries",
        query: {
          start: "2026-09-30T00:00:00Z",
          end: "2026-09-30T12:00:00Z",
          metrics: "requests_total,SQLI",
          granularity: "86400",
        },
      },
      {
        ...common,
        path: "/ngwaf/v1/workspaces/ws1/top-attacks",
        query: {
          field: "path",
          from: "2026-09-30T00:00:00Z",
          limit: "10",
        },
      },
      {
        ...common,
        path: "/ngwaf/v1/workspaces/ws1/signals",
        query: { limit: "200" },
      },
    ]);
  }, 15000);

  test("invalid options and a missing ID fail before any request", async () => {
    const start = requests.length;
    const out = await runSandbox(
      `const messages = [];
       for (const call of [
         () => ngwafRulesApi.listAccountRules({ types: ["request", "signal"] }),
         () => ngwafRulesApi.listAccountRules({ scope: "ws1" }),
         () => ngwafRulesApi.listWorkspaceRules({ enabled: true }),
         () => ngwafWorkspacesApi.getWorkspace(),
       ]) {
         try { await call(); messages.push("sent"); } catch (e) { messages.push(e.message); }
       }
       return messages;`,
      { fastlyApiToken: "token" },
    );
    expect(out.result).toEqual([
      "'types' must be a string.",
      "listAccountRules does not accept 'scope'. Its options are action, enabled, limit, page, types.",
      "Missing the required parameter 'workspace_id'.",
      "Missing the required parameter 'workspace_id'.",
    ]);
    expect(requests.length).toBe(start);
  }, 15000);

  test("responses come back exactly as Fastly sent them", async () => {
    const page = {
      data: [NESTED_RULE, RATE_LIMIT_RULE],
      meta: { limit: 2, total: 3 },
      links: { next: "/ngwaf/v1/workspaces/ws1/rules?page=1" },
    };
    const empty = { data: [], meta: { limit: 100, total: 0 } };
    nextResponse = (req) =>
      req.url.includes("/rules")
        ? json(req.url.startsWith("/ngwaf/v1/rules") ? empty : page)
        : json(WORKSPACE);
    const out = await runSandbox(
      `return {
         workspace: await ngwafWorkspacesApi.getWorkspace({ workspace_id: "ws1" }),
         workspaceRules: await ngwafRulesApi.listWorkspaceRules({ workspace_id: "ws1" }),
         accountRules: await ngwafRulesApi.listAccountRules(),
       };`,
      { fastlyApiToken: "token" },
    );
    expect(out.ok).toBe(true);
    expect(out.reduced).toBeUndefined();
    expect(out.result).toEqual({
      workspace: WORKSPACE,
      workspaceRules: page,
      accountRules: empty,
    });
  }, 15000);

  test("an SDK that ships one of the adapter classes fails every execution before a request", async () => {
    nextResponse = json([]);
    const start = requests.length;
    const out = await runSandbox("return await serviceApi.listServices();", {
      fastlyApiToken: "token",
      entry: COLLIDING_ENTRY,
    });
    expect(out.ok).toBe(false);
    expect(out.error).toBe(
      "The installed fastly SDK exports NgwafRulesApi, which this server also implements. Install the SDK version pinned in package.json.",
    );
    expect(requests.length).toBe(start);
  }, 15000);
});

describe("NGWAF results through final delivery", () => {
  const stores = [];
  afterAll(() => {
    for (const store of stores) {
      store.close();
      rmSync(store.directory, { recursive: true, force: true });
    }
  });

  const profile = () => {
    const runtime = getExecutionRuntime();
    return {
      ...runtime,
      args: [
        ...runtime.args,
        `--allow-fs-read=${join(import.meta.dir, "fixtures")}`,
      ],
      env: { ...runtime.env, FASTLY_MCP_TEST_API: basePath },
      entry: ENTRY,
    };
  };

  // Enough rules that the combined result has to go to a file.
  const manyRules = (count) => ({
    data: Array.from({ length: count }, (_, i) => ({
      ...NESTED_RULE,
      id: `rule-${i}`,
    })),
    meta: { limit: count, total: count },
  });
  const COMBINED = `return {
    workspace: await ngwafWorkspacesApi.getWorkspace({ workspace_id: "ws1" }),
    workspaceRules: [await ngwafRulesApi.listWorkspaceRules({ workspace_id: "ws1" })],
    accountRules: [await ngwafRulesApi.listAccountRules()],
  };`;

  test("a large combined result is written to a file with every level intact", async () => {
    const page = manyRules(150);
    nextResponse = rulesAndWorkspace(page);
    const store = createResultStore({ dir: tempDir("ngwaf-results") });
    stores.push(store);
    const result = await execute(COMBINED, {
      apiToken: "token",
      profile: profile(),
      resultStore: store,
    });
    expect(result.error).toBeUndefined();
    expect(result.resultBytes).toBeGreaterThan(INLINE_RESULT_BYTES);
    expect(JSON.parse(readFileSync(result.resultFile, "utf8"))).toEqual({
      workspace: WORKSPACE,
      workspaceRules: [page],
      accountRules: [page],
    });
  }, 20000);

  test("a remote caller gets a small combined result whole and a large one described", async () => {
    const small = manyRules(2);
    nextResponse = rulesAndWorkspace(small);
    const remote = (code) =>
      execute(code, { apiToken: "token", remote: true, profile: profile() });
    const whole = await remote(COMBINED);
    expect(whole.truncated).toBeUndefined();
    expect(whole.result).toEqual({
      workspace: WORKSPACE,
      workspaceRules: [small],
      accountRules: [small],
    });

    const large = manyRules(150);
    nextResponse = rulesAndWorkspace(large);
    const described = await remote(COMBINED);
    expect(described.truncated).toBe(true);
    expect(described.resultFile).toBeUndefined();
    expect(described.hint).toContain(
      `above the ${INLINE_RESULT_BYTES}-byte limit`,
    );
  }, 30000);
});

// The paging the method descriptions ask for, run against mock NGWAF collections that page in different ways.
describe("the NGWAF paging flow", () => {
  const FLOW = `
const { configuration } = await productNgwafApi.getProductNgwafConfiguration({
  service_id: 'SERVICE_ID',
});
const workspaceId = configuration.workspace_id;

async function collect(list) {
  const rules = new Map();
  let total;
  for (let page = 1; ; page++) {
    const { data, meta } = await list({ page });
    if (total !== undefined && meta.total !== total) {
      return { rules, incomplete: 'the total changed while paging' };
    }
    total = meta.total;
    const before = rules.size;
    for (const rule of data) rules.set(rule.id, rule);
    if (rules.size === total) return { rules };
    if (data.length === 0) {
      return { rules, incomplete: 'a page came back empty' };
    }
    if (rules.size === before) {
      return { rules, incomplete: 'a page added no new rule' };
    }
  }
}

const [workspace, workspaceRules, accountRules] = await Promise.all([
  ngwafWorkspacesApi.getWorkspace({ workspace_id: workspaceId }),
  collect((options) =>
    ngwafRulesApi.listWorkspaceRules({ workspace_id: workspaceId, ...options }),
  ),
  collect((options) => ngwafRulesApi.listAccountRules(options)),
]);
const applies = (rule) =>
  ['*', workspaceId].some((id) => rule.scope?.applies_to?.includes(id));
const rules = new Map([
  ...workspaceRules.rules,
  ...[...accountRules.rules].filter(([, rule]) => applies(rule)),
]);
return {
  workspace: {
    id: workspace.id,
    name: workspace.name,
    mode: workspace.mode,
    attack_signal_thresholds: workspace.attack_signal_thresholds,
  },
  traffic_ramp: configuration.traffic_ramp,
  incomplete: [workspaceRules.incomplete, accountRules.incomplete].filter(Boolean),
  enabled_rules: [...rules.values()].filter((rule) => rule.enabled),
};
`;

  const rule = (id, enabled, appliesTo) => ({
    ...NESTED_RULE,
    id,
    enabled,
    scope: {
      type: appliesTo ? "account" : "workspace",
      applies_to: appliesTo ?? ["ws1"],
    },
  });
  const WORKSPACE_RULES = [
    rule("w1", true),
    rule("w2", false),
    rule("w3", true),
    rule("a2", true, ["ws1"]),
  ];
  const ACCOUNT_RULES = [
    rule("a1", true, ["*"]),
    rule("a2", true, ["ws1"]),
    rule("a3", true, ["ws2"]),
    rule("a4", false, ["*"]),
  ];

  // Two rules per page, numbered from 1 like the live API, which refuses page 0.
  // `pages` replaces the slicing, and `totals` gives `meta.total` page by page.
  function collection(rules, { pages, totals } = {}) {
    return (params) => {
      const page = params.has("page") ? Number(params.get("page")) : 1;
      if (page < 1) {
        return {
          status: 400,
          contentType: "application/json",
          body: '{"detail":"Validation failed - invalid page param"}',
        };
      }
      const enabled = params.get("enabled");
      const matching =
        enabled === null
          ? rules
          : rules.filter((r) => String(r.enabled) === enabled);
      const data = pages
        ? (pages[page - 1] ?? [])
        : matching.slice(page * 2 - 2, page * 2);
      const total = totals?.[page - 1] ?? matching.length;
      return json({ data, meta: { limit: 2, total } });
    };
  }

  function ngwafApi({ mode = "block", workspace, account } = {}) {
    const workspaceRules = workspace ?? collection(WORKSPACE_RULES);
    const accountRules = account ?? collection(ACCOUNT_RULES);
    return (req) => {
      const url = new URL(req.url, "https://api.fastly.com");
      switch (url.pathname) {
        case "/enabled-products/v1/ngwaf/services/SERVICE_ID/configuration":
          return json({
            configuration: { workspace_id: "ws1", traffic_ramp: "100" },
          });
        case "/ngwaf/v1/workspaces/ws1":
          return json({ ...WORKSPACE, mode });
        case "/ngwaf/v1/workspaces/ws1/rules":
          return workspaceRules(url.searchParams);
        case "/ngwaf/v1/rules":
          return accountRules(url.searchParams);
        default:
          return { status: 404, contentType: "application/json", body: "{}" };
      }
    };
  }

  async function runFlow(api, code = FLOW) {
    nextResponse = api;
    const start = requests.length;
    const out = await runSandbox(code, { fastlyApiToken: "token" });
    expect(out.ok).toBe(true);
    const ids = out.result.enabled_rules.map((r) => r.id).sort();
    return { ...out.result, ids, calls: requestsSince(start) };
  }

  const [a1, a2, a3, a4] = ACCOUNT_RULES;

  const pagesOf = (calls, path) =>
    calls.filter((c) => c.path === path).map((c) => c.query.page);

  test("every page is read and only the applicable enabled rules remain", async () => {
    const out = await runFlow(ngwafApi());
    expect(out.incomplete).toEqual([]);
    // w2 and a4 are disabled, a3 is scoped to another workspace, and a2 is in both lists.
    expect(out.ids).toEqual(["a1", "a2", "w1", "w3"]);
    expect(out.workspace).toEqual({
      id: "ws1",
      name: "main",
      mode: "block",
      attack_signal_thresholds: WORKSPACE.attack_signal_thresholds,
    });
    expect(out.traffic_ramp).toBe("100");
    // The first page alone was not taken for the collection, and page 0 was never asked for.
    for (const path of ["/ngwaf/v1/workspaces/ws1/rules", "/ngwaf/v1/rules"]) {
      expect(pagesOf(out.calls, path)).toEqual(["1", "2"]);
    }
    // The snippet pages the unfiltered collections and filters locally.
    expect(out.calls.every((c) => c.query.enabled === undefined)).toBe(true);
    expect(out.enabled_rules.find((r) => r.id === "w3").conditions).toEqual(
      NESTED_RULE.conditions,
    );
  }, 15000);

  test("rows repeated across pages do not count twice", async () => {
    const out = await runFlow(
      ngwafApi({
        mode: "log",
        account: collection(ACCOUNT_RULES, {
          pages: [[a1, a2], [a2, a3], [a4]],
        }),
      }),
    );
    expect(out.incomplete).toEqual([]);
    expect(out.ids).toEqual(["a1", "a2", "w1", "w3"]);
    expect(out.workspace.mode).toBe("log");
    // Four rows had arrived after page 2, but only three distinct rules.
    expect(pagesOf(out.calls, "/ngwaf/v1/rules")).toEqual(["1", "2", "3"]);
  }, 15000);

  test("a server that ignores the page number is reported as incomplete", async () => {
    const out = await runFlow(
      ngwafApi({
        account: collection(ACCOUNT_RULES, {
          pages: [
            [a1, a2],
            [a1, a2],
          ],
        }),
      }),
    );
    expect(out.incomplete).toEqual(["a page added no new rule"]);
    expect(pagesOf(out.calls, "/ngwaf/v1/rules")).toEqual(["1", "2"]);
  }, 15000);

  test("paging from the wrong first page is reported as incomplete", async () => {
    // A server numbering from 0 answers page 1 with its second page.
    const out = await runFlow(
      ngwafApi({ account: collection(ACCOUNT_RULES, { pages: [[a3, a4]] }) }),
    );
    expect(out.incomplete).toEqual(["a page came back empty"]);
    // a1 was on the page that was skipped.
    expect(out.ids).toEqual(["a2", "w1", "w3"]);
  }, 15000);

  test("an early empty page and a changing total are reported as incomplete", async () => {
    const out = await runFlow(
      ngwafApi({
        workspace: collection(WORKSPACE_RULES, { totals: [5, 5, 5] }),
        account: collection(ACCOUNT_RULES, { totals: [4, 5] }),
      }),
    );
    expect(out.incomplete).toEqual([
      "a page came back empty",
      "the total changed while paging",
    ]);
  }, 15000);

  test("a filtered listing is complete only when the total counts the filtered rules", async () => {
    const filtered = FLOW.replace(
      "ngwafRulesApi.listAccountRules(options)",
      "ngwafRulesApi.listAccountRules({ ...options, enabled: true })",
    );
    expect(filtered).not.toBe(FLOW);

    const countsFiltered = await runFlow(ngwafApi(), filtered);
    expect(countsFiltered.incomplete).toEqual([]);
    expect(countsFiltered.ids).toEqual(["a1", "a2", "w1", "w3"]);

    // Four rules in all, three of them enabled.
    const countsAll = ngwafApi({
      account: collection(ACCOUNT_RULES, { totals: [4, 4, 4] }),
    });
    const misled = await runFlow(countsAll, filtered);
    expect(misled.incomplete).toEqual(["a page came back empty"]);
  }, 30000);
});

// The questions the analysis descriptions are written for, answered by snippets like the ones they ask for.
describe("the NGWAF analysis flows", () => {
  const RULE_ID = "6986506c32e98085365e81b7";
  const HEADERS = (n) =>
    Array.from({ length: n }, (_, i) => ({
      name: `X-Header-${i}`,
      value: "v".repeat(200),
    }));
  const stored = (id, overrides = {}) => ({
    id,
    timestamp: "2026-09-30T10:00:00Z",
    server_name: "www.example.com",
    method: "POST",
    uri: "/login?next=%2F",
    path: "/login",
    user_agent: "curl/8.7.1",
    remote_ip: "192.0.2.1",
    country: "US",
    response_code: 406,
    agent_response_code: 406,
    request_headers: [{ name: "Cookie", value: "session=secret" }],
    response_headers: [],
    signals: [
      { id: "site.bad-login", location: "", value: "", detector: RULE_ID },
      { id: "BLOCKED", location: "", value: "406", detector: RULE_ID },
      {
        id: "SQLI",
        location: "QUERYSTRING",
        value: "' or 1=1",
        detector: "SQLI",
      },
    ],
    summation: { attrs: { RuleID: RULE_ID }, attacks: [] },
    ...overrides,
  });
  // Opaque workspace IDs, as the Go SDK recorded them; only `reference_id` matches the tag.
  const WORKSPACE_SIGNALS = [
    {
      id: "JYLhUW8UOr3kfAhGYQzVXb",
      reference_id: "site.bad-login",
      name: "Bad login",
    },
  ];
  const ACCOUNT_SIGNALS = [
    { id: "corp.scanner", reference_id: "corp.scanner", name: "Scanner" },
  ];
  const WORKSPACE_LISTS = [
    {
      id: "BihNOa797HeV0We2A4LBr4",
      type: "ip",
      reference_id: "site.blocklist",
      name: "Blocklist",
      entries: ["192.0.2.1", "198.51.100.7"],
    },
  ];
  const BLOCK_RULE = {
    ...NESTED_RULE,
    id: RULE_ID,
    description: "Block listed IPs on login",
    conditions: [
      {
        type: "group",
        group_operator: "all",
        conditions: [
          {
            type: "single",
            field: "ip",
            operator: "in_list",
            value: "site.blocklist",
          },
          {
            type: "single",
            field: "path",
            operator: "equals",
            value: "/login",
          },
        ],
      },
    ],
    actions: [
      { type: "block" },
      { type: "add_signal", signal: "site.bad-login" },
    ],
  };

  const event = (id, source, action, reasons) => ({
    id,
    source,
    action,
    type: "attack",
    reasons: reasons.map(([signal_id, count]) => ({ signal_id, count })),
    request_count: reasons.reduce((sum, [, count]) => sum + count, 0),
    window: 60,
    is_expired: false,
    sample_request: stored(`sample-${id}`),
  });
  const EVENT = event("6841c2c07d3691b0f5b95130", "192.0.2.1", "flagged", [
    ["SQLI", 97],
  ]);

  // Pages of `limit`, numbered from 1 like the rule lists.
  // `pages` replaces the slicing, and `totals` gives `meta.total` page by page.
  const paged = (records, params, { pages, totals } = {}) => {
    const page = Number(params.get("page") ?? 1);
    const limit = Number(params.get("limit") ?? 100);
    return json({
      meta: {
        limit,
        total: totals?.[page - 1] ?? records.length,
        next_cursor: "",
      },
      data: pages
        ? (pages[page - 1] ?? [])
        : records.slice((page - 1) * limit, page * limit),
    });
  };

  const REPORT = [
    { id: "ws2", name: "quiet", attack_count: 3, blocked_count: 0 },
    {
      id: "ws1",
      name: "main",
      total_count: 90000,
      attack_count: 1200,
      blocked_count: 900,
      flagged_count: 40,
      top_attack_signals: [
        { tag_name: "SQLI", tag_count: 800, total_count: 1200 },
      ],
    },
  ];
  const SERIES = [
    { timestamp: "2026-09-30T08:00:00Z", requests_attack: 10 },
    { timestamp: "2026-09-30T08:10:00Z", requests_attack: 1100 },
    { timestamp: "2026-09-30T08:20:00Z", requests_attack: 90 },
  ];

  function ngwafApi({
    requests: stored_ = [],
    events = [EVENT],
    report = REPORT,
    series = SERIES,
    workspaceRules = [BLOCK_RULE],
    workspaceLists = { data: WORKSPACE_LISTS, meta: { total: 1 } },
    paging = {},
  } = {}) {
    return (req) => {
      const url = new URL(req.url, "https://api.fastly.com");
      const params = url.searchParams;
      const routes = {
        "/enabled-products/v1/ngwaf/services/SERVICE_ID/configuration": () =>
          json({ configuration: { workspace_id: "ws1", traffic_ramp: "100" } }),
        "/ngwaf/v1/reports/attacks": () =>
          json({ data: report, meta: { total: report.length } }),
        "/ngwaf/v1/workspaces/ws1/top-attacks": () =>
          json({
            data:
              params.get("field") === "remote_ip"
                ? [
                    {
                      value: "192.0.2.1",
                      display_name: "192.0.2.1",
                      count: 700,
                    },
                  ]
                : [
                    {
                      value: "www.example.com/login",
                      display_name: "www.example.com/login",
                      count: 1100,
                    },
                  ],
            meta: { limit: Number(params.get("limit") ?? 100) },
          }),
        "/ngwaf/v1/workspaces/ws1/timeseries": () =>
          json({ meta: { total: series.length }, data: series }),
        "/ngwaf/v1/workspaces/ws1/events": () =>
          paged(events, params, paging.events),
        "/ngwaf/v1/workspaces/ws1": () => json(WORKSPACE),
        "/ngwaf/v1/workspaces/ws1/requests": () =>
          paged(stored_, params, paging.requests),
        "/ngwaf/v1/workspaces/ws1/signals": () =>
          json({ data: WORKSPACE_SIGNALS, meta: { total: 1, limit: 200 } }),
        "/ngwaf/v1/signals": () =>
          json({ data: ACCOUNT_SIGNALS, meta: { total: 1, limit: 200 } }),
        "/ngwaf/v1/workspaces/ws1/lists": () => json(workspaceLists),
        "/ngwaf/v1/lists": () => json({ data: [], meta: { total: 0 } }),
        "/ngwaf/v1/workspaces/ws1/rules": () =>
          paged(workspaceRules, params, paging.rules),
        "/ngwaf/v1/rules": () => paged([], params),
        "/ngwaf/v1/workspaces/ws1/simulate": () =>
          json({
            waf_response: 406,
            signals: [
              {
                type: "site.bad-login",
                detector: RULE_ID,
                detector_scope: "workspace",
                redaction: "none",
              },
              {
                type: "BLOCKED",
                detector: RULE_ID,
                detector_scope: "system",
                redaction: "none",
                value: "406",
              },
            ],
          }),
      };
      const route =
        routes[url.pathname] ??
        (url.pathname.startsWith("/ngwaf/v1/workspaces/ws1/requests/") &&
          (() =>
            json(
              stored_.find((r) => url.pathname.endsWith(`/${r.id}`)) ??
                stored("single"),
            )));
      return route
        ? route()
        : { status: 404, contentType: "application/json", body: "{}" };
    };
  }

  async function run(code, api) {
    nextResponse = api;
    const start = requests.length;
    const out = await runSandbox(code, { fastlyApiToken: "token" });
    expect(out.error).toBeUndefined();
    return { out, calls: requests.slice(start) };
  }

  // The paging the analysis descriptions ask for, shared by the request and event flows.
  const COLLECT = `
async function collect(list, add) {
  const deadline = Date.now() + 20e3;
  const seen = new Set();
  let total;
  for (let page = 1; ; page++) {
    const stop = (incomplete, continueFrom) => ({ seen: seen.size, total, incomplete, continueFrom });
    if (Date.now() > deadline) return stop('out of time', page);
    const { data, meta } = await list(page);
    if (total !== undefined && meta.total !== total) {
      return stop('the total changed while paging');
    }
    total = meta.total;
    const before = seen.size;
    for (const record of data) {
      if (seen.has(record.id)) continue;
      seen.add(record.id);
      add(record);
    }
    if (seen.size === total) return { seen: seen.size, total };
    if (data.length === 0) return stop('a page came back empty');
    if (seen.size === before) return stop('a page added no new record');
  }
}
`;

  // Finds the most attacked workspace, then what, who and when, and the IPs it flagged.
  const ATTACKS = `${COLLECT}
const to = '2026-09-30T12:00:00Z';
const from = '2026-09-29T12:00:00Z';
const report = await ngwafReportsApi.getAttacksReport({ from, to });
const busiest = [...report.data].sort((a, b) => b.attack_count - a.attack_count)[0];
if (!busiest?.attack_count) return { workspaces: report.data.length, attacks: 0 };
const workspace_id = busiest.id;
const flagged = [];
const [urls, ips, series, events] = await Promise.all([
  ngwafWorkspacesApi.getTopAttacks({ workspace_id, field: 'server_name_and_path', from, to, limit: 5 }),
  ngwafWorkspacesApi.getTopAttacks({ workspace_id, field: 'remote_ip', from, to, limit: 5 }),
  ngwafTimeseriesApi.getWorkspaceTimeseries({ workspace_id, start: from, end: to, metrics: 'requests_attack' }),
  collect(
    (page) => ngwafEventsApi.listEvents({ workspace_id, from, to, status: 'active', page }),
    (e) => flagged.push({ ip: e.source, action: e.action, signals: e.reasons.map((r) => r.signal_id) }),
  ),
]);
// The bucket in progress is left out, so a short range can have no points at all.
const peak = series.data.reduce((a, b) => (a && a.requests_attack >= b.requests_attack ? a : b), undefined);
return {
  workspace: busiest.name,
  attacks: busiest.attack_count,
  blocked: busiest.blocked_count,
  urls: urls.data.map(({ value, count }) => ({ value, count })),
  ips: ips.data.map(({ value, count }) => ({ value, count })),
  peak: peak && { at: peak.timestamp, attacks: peak.requests_attack },
  flagged,
  // An incomplete event read keeps its reason and, after a timeout, the page to continue from.
  flaggedPaging: events.incomplete && events,
};`;

  test("is anyone attacking us", async () => {
    const { out, calls } = await run(ATTACKS, ngwafApi());
    expect(out.result).toEqual({
      workspace: "main",
      attacks: 1200,
      blocked: 900,
      urls: [{ value: "www.example.com/login", count: 1100 }],
      ips: [{ value: "192.0.2.1", count: 700 }],
      peak: { at: "2026-09-30T08:10:00Z", attacks: 1100 },
      flagged: [{ ip: "192.0.2.1", action: "flagged", signals: ["SQLI"] }],
    });
    const sent = Object.fromEntries(
      calls.map((c) => {
        const url = new URL(c.url, "https://api.fastly.com");
        return [
          `${url.pathname}?field=${url.searchParams.get("field")}`,
          Object.fromEntries(url.searchParams),
        ];
      }),
    );
    expect(sent["/ngwaf/v1/workspaces/ws1/timeseries?field=null"]).toEqual({
      start: "2026-09-29T12:00:00Z",
      end: "2026-09-30T12:00:00Z",
      metrics: "requests_attack",
    });
    expect(sent["/ngwaf/v1/workspaces/ws1/events?field=null"]).toEqual({
      from: "2026-09-29T12:00:00Z",
      to: "2026-09-30T12:00:00Z",
      status: "active",
      page: "1",
    });
    expect(
      sent["/ngwaf/v1/workspaces/ws1/top-attacks?field=remote_ip"],
    ).toMatchObject({ field: "remote_ip", limit: "5" });
  }, 15000);

  test("a report without attacks ends the overview there", async () => {
    for (const [report, workspaces] of [
      [[], 0],
      [[{ id: "ws1", name: "main", attack_count: 0, blocked_count: 0 }], 1],
    ]) {
      const { out, calls } = await run(ATTACKS, ngwafApi({ report }));
      expect(out.result).toEqual({ workspaces, attacks: 0 });
      expect(calls.map((c) => c.url.split("?")[0])).toEqual([
        "/ngwaf/v1/reports/attacks",
      ]);
    }
  }, 15000);

  test("an overview with no finished bucket and more flagged IPs than it could read says so", async () => {
    const { out } = await run(
      ATTACKS,
      ngwafApi({
        series: [],
        paging: { events: { pages: [[EVENT]], totals: [2, 2] } },
      }),
    );
    expect(out.result.peak).toBeUndefined();
    expect(out.result.flagged).toEqual([
      { ip: "192.0.2.1", action: "flagged", signals: ["SQLI"] },
    ]);
    expect(out.result.flaggedPaging).toEqual({
      seen: 1,
      total: 2,
      incomplete: "a page came back empty",
    });
  }, 15000);

  test("an overview that runs out of time while reading events gives the page to continue from", async () => {
    const stopped = ATTACKS.replace(
      "if (Date.now() > deadline)",
      "if (page > 1)",
    );
    expect(stopped).not.toBe(ATTACKS);
    const second = event("e2", "198.51.100.7", "blocked", [["XSS", 10]]);
    const { out } = await run(
      stopped,
      ngwafApi({
        events: [EVENT, second],
        paging: { events: { pages: [[EVENT], [second]] } },
      }),
    );
    expect(out.result.flagged).toHaveLength(1);
    expect(out.result.flaggedPaging).toEqual({
      seen: 1,
      total: 2,
      incomplete: "out of time",
      continueFrom: 2,
    });
  }, 15000);

  // Explains one blocked request through its signals, the rule behind them and the lists that rule uses.
  const WHY_BLOCKED = `${COLLECT}
       const { configuration } = await productNgwafApi.getProductNgwafConfiguration({ service_id: 'SERVICE_ID' });
       const workspace_id = configuration.workspace_id;
       const found = await ngwafRequestsApi.searchWorkspaceRequests({
         workspace_id,
         q: 'from:-1h ip:192.0.2.1 path:/login',
         page: 1,
       });
       // Only some requests are stored, so no match is an answer of its own.
       if (found.meta.total === 0) return { stored: 0 };
       // An empty first page despite matches is a failed read, not an absence.
       if (found.data.length === 0) {
         return { stored: found.meta.total, incomplete: 'the first page came back empty' };
       }
       const request = await ngwafRequestsApi.getRequest({ workspace_id, request_id: found.data[0].id });
       const rules = new Map();
       const [workspace, wsSignals, acctSignals, wsLists, acctLists, wsRules, acctRules] = await Promise.all([
         ngwafWorkspacesApi.getWorkspace({ workspace_id }),
         ngwafSignalsApi.listWorkspaceSignals({ workspace_id, limit: 200 }),
         ngwafSignalsApi.listAccountSignals({ limit: 200 }),
         ngwafListsApi.listWorkspaceLists({ workspace_id }),
         ngwafListsApi.listAccountLists(),
         collect((page) => ngwafRulesApi.listWorkspaceRules({ workspace_id, page }), (r) => rules.set(r.id, r)),
         collect((page) => ngwafRulesApi.listAccountRules({ page }), (r) => rules.set(r.id, r)),
       ]);
       // A short read would make a rule, list or signal look absent, so say which reads were incomplete.
       const incomplete = [
         ...Object.entries({ wsSignals, acctSignals, wsLists, acctLists })
           .filter(([, r]) => r.data.length !== r.meta.total)
           .map(([name]) => name),
         ...Object.entries({ wsRules, acctRules })
           .filter(([, paging]) => paging.incomplete)
           .map(([name, paging]) => name + ': ' + paging.incomplete),
       ];
       const signals = new Map([...wsSignals.data, ...acctSignals.data].map((s) => [s.reference_id, s]));
       const lists = new Map([...wsLists.data, ...acctLists.data].map((l) => [l.reference_id, l]));
       const listsIn = (conditions = []) =>
         conditions.flatMap((c) => (c.operator === 'in_list' ? [c.value] : listsIn(c.conditions)));
       return {
         mode: workspace.mode,
         request: { id: request.id, path: request.path, status: request.response_code },
         signals: request.signals.map((s) => {
           const rule = rules.get(s.detector);
           return {
             tag: s.id,
             custom: signals.get(s.id)?.name ?? null,
             rule: rule
               ? {
                   id: rule.id,
                   description: rule.description,
                   actions: rule.actions.map((a) => a.type),
                   lists: listsIn(rule.conditions).map((ref) => ({
                     ref,
                     name: lists.get(ref)?.name,
                     hasIp: lists.get(ref)?.entries.includes(request.remote_ip),
                   })),
                 }
               : null,
           };
         }),
         incomplete: incomplete.length ? incomplete : undefined,
       };`;

  test("why was this request blocked", async () => {
    const { out, calls } = await run(
      WHY_BLOCKED,
      ngwafApi({ requests: [stored("req-1")] }),
    );
    const rule = {
      id: RULE_ID,
      description: "Block listed IPs on login",
      actions: ["block", "add_signal"],
      lists: [{ ref: "site.blocklist", name: "Blocklist", hasIp: true }],
    };
    expect(out.result).toEqual({
      mode: "block",
      request: { id: "req-1", path: "/login", status: 406 },
      signals: [
        { tag: "site.bad-login", custom: "Bad login", rule },
        { tag: "BLOCKED", custom: null, rule },
        { tag: "SQLI", custom: null, rule: null },
      ],
    });
    // Matching the tag on `id` would have found nothing.
    expect(WORKSPACE_SIGNALS[0].id).not.toBe("site.bad-login");
    const search = new URL(calls[1].url, "https://api.fastly.com");
    expect(search.pathname).toBe("/ngwaf/v1/workspaces/ws1/requests");
    expect(search.searchParams.get("q")).toBe(
      "from:-1h ip:192.0.2.1 path:/login",
    );
    expect(new URL(calls[2].url, "https://api.fastly.com").pathname).toBe(
      "/ngwaf/v1/workspaces/ws1/requests/req-1",
    );
  }, 15000);

  test("a rule on a later page is still found, and a short list read is reported", async () => {
    const other = { ...BLOCK_RULE, id: "other-rule", description: "Other" };
    const { out, calls } = await run(
      WHY_BLOCKED,
      ngwafApi({
        requests: [stored("req-1")],
        workspaceRules: [other, BLOCK_RULE],
        paging: { rules: { pages: [[other], [BLOCK_RULE]] } },
        workspaceLists: { data: [], meta: { total: 1 } },
      }),
    );
    expect(out.result.signals[0].rule).toMatchObject({
      id: RULE_ID,
      lists: [{ ref: "site.blocklist" }],
    });
    expect(out.result.incomplete).toEqual(["wsLists"]);
    expect(
      calls
        .filter((c) => c.url.startsWith("/ngwaf/v1/workspaces/ws1/rules"))
        .map((c) =>
          new URL(c.url, "https://api.fastly.com").searchParams.get("page"),
        ),
    ).toEqual(["1", "2"]);
  }, 15000);

  test("an empty first page with matches is not reported as nothing stored", async () => {
    const { out, calls } = await run(
      WHY_BLOCKED,
      ngwafApi({
        requests: MATCHES,
        paging: { requests: { pages: [[]] } },
      }),
    );
    expect(out.result).toEqual({
      stored: 5,
      incomplete: "the first page came back empty",
    });
    expect(calls.some((c) => c.url.includes("/requests/"))).toBe(false);
  }, 15000);

  test("a request that was not stored is reported as such", async () => {
    const { out, calls } = await run(WHY_BLOCKED, ngwafApi());
    expect(out.result).toEqual({ stored: 0 });
    expect(calls.map((c) => c.url.split("?")[0])).toEqual([
      "/enabled-products/v1/ngwaf/services/SERVICE_ID/configuration",
      "/ngwaf/v1/workspaces/ws1/requests",
    ]);
  }, 15000);

  // Counts what the rule matched, keeps two small examples, and replays the first one.
  const FALSE_POSITIVES = `${COLLECT}
const workspace_id = 'ws1';
const until = Math.floor(Date.now() / 1000);
const q = \`from:\${until - 7 * 86400} until:\${until} ruleid:${RULE_ID}\`;
// Clients choose their paths and user agents, so count in Maps, where '__proto__' is just another key.
const counts = { path: new Map(), user_agent: new Map(), country: new Map(), remote_ip: new Map() };
const examples = [];
const paging = await collect(
  (page) => ngwafRequestsApi.searchWorkspaceRequests({ workspace_id, q, limit: 2, page }),
  (r) => {
    for (const [field, values] of Object.entries(counts)) {
      values.set(r[field], (values.get(r[field]) ?? 0) + 1);
    }
    if (examples.length < 2) {
      examples.push({ id: r.id, method: r.method, uri: r.uri, host: r.server_name, user_agent: r.user_agent });
    }
  },
);
const [example] = examples;
// With no match there is nothing to replay.
const simulated =
  example &&
  (await ngwafSimulateApi.ngwafSimulateWafRequest({
    workspace_id,
    waf_simulate_request: {
      request: [
        example.method + ' ' + example.uri + ' HTTP/1.1',
        'Host: ' + example.host,
        'User-Agent: ' + example.user_agent,
        '',
        '',
      ].join('\\r\\n'),
    },
  }));
return {
  ...paging,
  // The search description warns that a total of exactly 10,000 may be a cap.
  capped: paging.total === 10000 || undefined,
  counts: Object.fromEntries(
    Object.entries(counts).map(([field, values]) => [field, Object.fromEntries(values)]),
  ),
  examples,
  replay: simulated && {
    status: simulated.waf_response,
    byRule: simulated.signals.filter((s) => s.detector === '${RULE_ID}').map((s) => s.type),
  },
};`;

  // Sums a week of events per source IP.
  const EVENT_SOURCES = `${COLLECT}
const workspace_id = 'ws1';
const to = new Date().toISOString();
const from = new Date(Date.now() - 7 * 86400e3).toISOString();
const byIp = {};
const paging = await collect(
  (page) => ngwafEventsApi.listEvents({ workspace_id, from, to, limit: 2, page }),
  (e) => {
    const ip = (byIp[e.source] ??= { events: 0, requests: 0, actions: [], signals: {} });
    ip.events += 1;
    ip.requests += e.request_count;
    if (!ip.actions.includes(e.action)) ip.actions.push(e.action);
    for (const { signal_id, count } of e.reasons) {
      ip.signals[signal_id] = (ip.signals[signal_id] ?? 0) + count;
    }
  },
);
return { ...paging, byIp };`;

  const MATCHES = [
    stored("r1"),
    stored("r2", { path: "/login/sso", uri: "/login/sso" }),
    stored("r3", { remote_ip: "198.51.100.7", country: "CA" }),
    stored("r4", { user_agent: "Mozilla/5.0" }),
    stored("r5"),
  ].map((r) => ({ ...r, request_headers: HEADERS(120) }));

  const EVENTS = [
    EVENT,
    event("e2", "198.51.100.7", "blocked", [["XSS", 10]]),
    event("e3", "192.0.2.1", "blocked", [
      ["SQLI", 50],
      ["CMDEXE", 5],
    ]),
  ];

  const urlsOf = (calls, path) =>
    calls
      .filter((c) => new URL(c.url, "https://api.fastly.com").pathname === path)
      .map((c) => new URL(c.url, "https://api.fastly.com").searchParams);

  test("is this rule causing false positives", async () => {
    const { out, calls } = await run(
      FALSE_POSITIVES,
      ngwafApi({ requests: MATCHES }),
    );
    // Every page together is larger than a result may be, and the aggregate is not.
    expect(JSON.stringify(MATCHES).length).toBeGreaterThan(INLINE_RESULT_BYTES);
    expect(out.reduced).toBeUndefined();
    expect(out.result).toMatchObject({
      seen: 5,
      total: 5,
      counts: {
        path: { "/login": 4, "/login/sso": 1 },
        user_agent: { "curl/8.7.1": 4, "Mozilla/5.0": 1 },
        country: { US: 4, CA: 1 },
        remote_ip: { "192.0.2.1": 4, "198.51.100.7": 1 },
      },
      replay: { status: 406, byRule: ["site.bad-login", "BLOCKED"] },
    });
    expect(out.result.incomplete).toBeUndefined();
    expect(out.result.examples[0]).toEqual({
      id: "r1",
      method: "POST",
      uri: "/login?next=%2F",
      host: "www.example.com",
      user_agent: "curl/8.7.1",
    });
    const pages = urlsOf(calls, "/ngwaf/v1/workspaces/ws1/requests");
    expect(pages.map((p) => p.get("page"))).toEqual(["1", "2", "3"]);
    // One fixed window for every page.
    const queries = new Set(pages.map((p) => p.get("q")));
    expect(queries.size).toBe(1);
    const [from, until] = [...queries][0]
      .match(new RegExp(`^from:(\\d+) until:(\\d+) ruleid:${RULE_ID}$`))
      .slice(1)
      .map(Number);
    expect(until - from).toBe(7 * 86400);
    const simulate = calls.find((c) => c.method === "POST");
    expect(simulate.url).toBe("/ngwaf/v1/workspaces/ws1/simulate");
    expect(JSON.parse(simulate.body)).toEqual({
      request:
        "POST /login?next=%2F HTTP/1.1\r\nHost: www.example.com\r\nUser-Agent: curl/8.7.1\r\n\r\n",
    });
  }, 15000);

  test("a rule that matched nothing is reported without a replay", async () => {
    const { out, calls } = await run(FALSE_POSITIVES, ngwafApi());
    expect(out.result).toEqual({
      seen: 0,
      total: 0,
      counts: { path: {}, user_agent: {}, country: {}, remote_ip: {} },
      examples: [],
    });
    expect(calls.some((c) => c.method === "POST")).toBe(false);
  }, 15000);

  test("a user agent named __proto__ is counted like any other", async () => {
    const { out } = await run(
      FALSE_POSITIVES,
      ngwafApi({ requests: [stored("r1", { user_agent: "__proto__" })] }),
    );
    expect(Object.keys(out.result.counts.user_agent)).toEqual(["__proto__"]);
    expect(
      Object.getOwnPropertyDescriptor(out.result.counts.user_agent, "__proto__")
        .value,
    ).toBe(1);
  }, 15000);

  test("a search that matched exactly 10,000 requests is flagged as possibly capped", async () => {
    const many = Array.from({ length: 10000 }, (_, i) => ({
      id: `r${i}`,
      path: "/login",
      user_agent: "curl/8.7.1",
      country: "US",
      remote_ip: "192.0.2.1",
      method: "GET",
      uri: "/login",
      server_name: "www.example.com",
      signals: [],
    }));
    const code = FALSE_POSITIVES.replace("limit: 2, page", "limit: 1000, page");
    expect(code).not.toBe(FALSE_POSITIVES);
    const { out } = await run(code, ngwafApi({ requests: many }));
    expect(out.result).toMatchObject({
      seen: 10000,
      total: 10000,
      capped: true,
    });

    const { out: fewer } = await run(
      code,
      ngwafApi({ requests: many.slice(1) }),
    );
    expect(fewer.result.capped).toBeUndefined();
  }, 30000);

  test("a first page with nothing on it is incomplete and replays nothing", async () => {
    const { out, calls } = await run(
      FALSE_POSITIVES,
      ngwafApi({ requests: MATCHES, paging: { requests: { pages: [[]] } } }),
    );
    expect(out.result).toMatchObject({
      seen: 0,
      total: 5,
      incomplete: "a page came back empty",
    });
    expect(out.result.replay).toBeUndefined();
    expect(calls.some((c) => c.method === "POST")).toBe(false);
  }, 15000);

  test("events are summed per source IP across pages of one fixed range", async () => {
    const { out, calls } = await run(
      EVENT_SOURCES,
      ngwafApi({ events: EVENTS }),
    );
    expect(out.result).toEqual({
      seen: 3,
      total: 3,
      byIp: {
        "192.0.2.1": {
          events: 2,
          requests: 152,
          actions: ["flagged", "blocked"],
          signals: { SQLI: 147, CMDEXE: 5 },
        },
        "198.51.100.7": {
          events: 1,
          requests: 10,
          actions: ["blocked"],
          signals: { XSS: 10 },
        },
      },
    });
    const pages = urlsOf(calls, "/ngwaf/v1/workspaces/ws1/events");
    expect(pages.map((p) => p.get("page"))).toEqual(["1", "2"]);
    expect(
      new Set(pages.map((p) => `${p.get("from")} ${p.get("to")}`)).size,
    ).toBe(1);
  }, 15000);

  // Every way the shared paging can stop short, for both paged analysis reads.
  for (const [name, code, key, records, path] of [
    [
      "request search",
      FALSE_POSITIVES,
      "requests",
      MATCHES,
      "/ngwaf/v1/workspaces/ws1/requests",
    ],
    [
      "event listing",
      EVENT_SOURCES,
      "events",
      EVENTS,
      "/ngwaf/v1/workspaces/ws1/events",
    ],
  ]) {
    const api = (paging) =>
      ngwafApi({ [key]: records, paging: { [key]: paging } });
    const [first, second] = records;

    test(`a ${name} that runs out of time returns what it has and where to continue`, async () => {
      // With no time left after the first page, the loop stops before asking for page 2.
      const stopped = code.replace(
        "if (Date.now() > deadline)",
        "if (page > 1)",
      );
      expect(stopped).not.toBe(code);
      const { out, calls } = await run(stopped, api());
      expect(out.result).toMatchObject({
        seen: 2,
        total: records.length,
        incomplete: "out of time",
        continueFrom: 2,
      });
      expect(urlsOf(calls, path).map((p) => p.get("page"))).toEqual(["1"]);
    }, 15000);

    test(`a ${name} that skips its first page reports itself incomplete`, async () => {
      // As if the API numbered pages from 0: page 1 is the second page.
      const skipping = code.replace("let page = 1", "let page = 2");
      expect(skipping).not.toBe(code);
      const { out } = await run(skipping, api());
      expect(out.result).toMatchObject({
        seen: records.length - 2,
        total: records.length,
        incomplete: "a page came back empty",
      });
    }, 15000);

    test(`a ${name} that gets the same page twice reports itself incomplete`, async () => {
      const { out, calls } = await run(
        code,
        api({
          pages: [
            [first, second],
            [first, second],
          ],
        }),
      );
      expect(out.result).toMatchObject({
        seen: 2,
        total: records.length,
        incomplete: "a page added no new record",
      });
      expect(urlsOf(calls, path).map((p) => p.get("page"))).toEqual(["1", "2"]);
    }, 15000);

    test(`a ${name} whose total changes reports itself incomplete`, async () => {
      const { out } = await run(
        code,
        api({ totals: [records.length, records.length + 1] }),
      );
      expect(out.result).toMatchObject({
        seen: 2,
        total: records.length,
        incomplete: "the total changed while paging",
      });
    }, 15000);
  }

  test("would this request be blocked", async () => {
    const { out, calls } = await run(
      `const request = [
         'GET /search?q=%27%20or%201%3D1 HTTP/1.1',
         'Host: www.example.com',
         'User-Agent: curl/8.7.1',
         '',
         '',
       ].join('\\r\\n');
       const { waf_response, signals } = await ngwafSimulateApi.ngwafSimulateWafRequest({
         workspace_id: 'ws1',
         waf_simulate_request: { request },
       });
       return { blocked: waf_response === 406, signals: signals.map((s) => [s.type, s.detector_scope]) };`,
      ngwafApi(),
    );
    expect(out.result).toEqual({
      blocked: true,
      signals: [
        ["site.bad-login", "workspace"],
        ["BLOCKED", "system"],
      ],
    });
    expect(JSON.parse(calls[0].body).request).toBe(
      "GET /search?q=%27%20or%201%3D1 HTTP/1.1\r\nHost: www.example.com\r\nUser-Agent: curl/8.7.1\r\n\r\n",
    );
  }, 15000);
});
