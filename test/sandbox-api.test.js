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
    requests.push({
      url: req.url,
      key: req.headers["fastly-key"],
      host: req.headers["x-original-host"],
    });
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
  basePath = server.url;
});

afterAll(async () => {
  if (server) await server.close();
});

// Every SDK constructor authenticates with FASTLY_API_TOKEN when it is set, which would replace the token under test with the developer's own.
const { FASTLY_API_TOKEN: _developerToken, ...childEnv } = process.env;

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
      env: { ...childEnv, FASTLY_MCP_TEST_API: basePath },
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

  // Rule conditions nest a group, a multival and a single condition, which the old six-level budget refused.
  test("the deepest rule conditions survive the bridge and a combined result", async () => {
    const rule = {
      id: "698650606232b4afcd5a47f7",
      type: "request",
      scope: { type: "workspace", applies_to: ["Am2qjXkgamuYp3u54rQkLD"] },
      enabled: true,
      group_operator: "any",
      conditions: [
        {
          type: "group",
          group_operator: "all",
          conditions: [
            { type: "single", field: "ip", operator: "in_list", value: "x" },
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
              ],
            },
          ],
        },
      ],
      actions: [{ type: "block" }],
    };
    const page = { data: [rule], meta: { limit: 100, total: 1 } };
    nextResponse = {
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(page),
    };

    const out = await runSandbox(
      `const workspace = await iamPermissionsApi.listPermissions();
       const account = await iamPermissionsApi.listPermissions();
       return { workspaceRules: [workspace], accountRules: [account] };`,
      { fastlyApiToken: "token" },
    );
    expect(out.ok).toBe(true);
    expect(out.reduced).toBeUndefined();
    expect(out.result).toEqual({
      workspaceRules: [page],
      accountRules: [page],
    });
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
    nextResponse = (req) =>
      req.url.includes("/rules") ? json(page) : json(WORKSPACE);
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
    nextResponse = (req) =>
      req.url.includes("/rules") ? json(small) : json(WORKSPACE);
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
    nextResponse = (req) =>
      req.url.includes("/rules") ? json(large) : json(WORKSPACE);
    const described = await remote(COMBINED);
    expect(described.truncated).toBe(true);
    expect(described.resultFile).toBeUndefined();
    expect(described.hint).toContain(
      `above the ${INLINE_RESULT_BYTES}-byte limit`,
    );
  }, 30000);
});

// The flow in the README, run as written against mock NGWAF collections that page in different ways.
describe("the documented NGWAF flow", () => {
  const readme = readFileSync(join(import.meta.dir, "../README.md"), "utf8");
  const section = readme.slice(readme.indexOf("### NGWAF rules"));
  const FLOW = section.slice(
    section.indexOf("```js\n") + 6,
    section.indexOf("\n```", section.indexOf("```js\n")),
  );

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
  // `base: 0` stands for a server numbering from 0, `pages` replaces the slicing, and `totals` gives `meta.total` call by call.
  function collection(
    rules,
    { base = 1, ignorePage, pages, totals, countAll } = {},
  ) {
    let calls = 0;
    return (params) => {
      const page = params.has("page") ? Number(params.get("page")) : base;
      if (page < base) {
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
      const index = ignorePage ? 0 : page - base;
      const data = pages
        ? (pages[index] ?? [])
        : matching.slice(index * 2, index * 2 + 2);
      const total =
        totals?.[calls] ?? (countAll ? rules.length : matching.length);
      calls++;
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

  const pagesOf = (calls, path) =>
    calls.filter((c) => c.path === path).map((c) => c.query.page);

  test("the README snippet is the one under test", () => {
    expect(FLOW).toContain("async function collect(list)");
    expect(FLOW.trimEnd()).toEndWith("};");
  });

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
    expect(out.enabled_rules.find((r) => r.id === "w3").conditions).toEqual(
      NESTED_RULE.conditions,
    );
  }, 15000);

  test("rows repeated across pages do not count twice", async () => {
    const [a1, a2, a3, a4] = ACCOUNT_RULES;
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
      ngwafApi({ account: collection(ACCOUNT_RULES, { ignorePage: true }) }),
    );
    expect(out.incomplete).toEqual(["a page added no new rule"]);
    expect(pagesOf(out.calls, "/ngwaf/v1/rules")).toEqual(["1", "2"]);
  }, 15000);

  test("paging from the wrong first page is reported as incomplete", async () => {
    const out = await runFlow(
      ngwafApi({ account: collection(ACCOUNT_RULES, { base: 0 }) }),
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

    const countsAll = ngwafApi({
      account: collection(ACCOUNT_RULES, { countAll: true }),
    });
    const misled = await runFlow(countsAll, filtered);
    expect(misled.incomplete).toEqual(["a page came back empty"]);

    // The snippet as documented pages the unfiltered collection and filters locally.
    const unfiltered = await runFlow(
      ngwafApi({ account: collection(ACCOUNT_RULES, { countAll: true }) }),
    );
    expect(unfiltered.incomplete).toEqual([]);
    expect(unfiltered.ids).toEqual(["a1", "a2", "w1", "w3"]);
    expect(unfiltered.calls.every((c) => c.query.enabled === undefined)).toBe(
      true,
    );
  }, 30000);
});
