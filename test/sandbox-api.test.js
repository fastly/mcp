import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawn, spawnSync } from "node:child_process";
import { join } from "node:path";
import { expectNoInternals, startLocalServer } from "./helpers.js";

const ENTRY = join(import.meta.dir, "fixtures/sandbox-with-mock-fastly.mjs");

let server;
let basePath;
let nextResponse;

beforeAll(async () => {
  server = await startLocalServer((_req, res) => {
    const { status, contentType, body } = nextResponse;
    res.writeHead(status, { "content-type": contentType });
    res.end(body);
  });
  basePath = server.url;
});

afterAll(async () => {
  if (server) await server.close();
});

function runSandbox(
  code,
  { fastlyApiToken, runtime = process.execPath, policy } = {},
) {
  return new Promise((resolve, reject) => {
    const args =
      runtime === process.execPath
        ? [ENTRY]
        : ["--experimental-vm-modules", ENTRY];
    const child = spawn(runtime, args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, FASTLY_MCP_TEST_API: basePath },
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
