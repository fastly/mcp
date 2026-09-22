import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  callTool,
  modernRpc,
  readResult,
  rpc,
  spawnRemoteServer,
  startMockFastly,
  TOKEN_A,
} from "./remote-helpers.js";

describe("remote response framing", () => {
  for (const [flag, contentType] of [
    ["--http-json", "application/json"],
    ["--http-sse", "text/event-stream"],
  ]) {
    test(`${flag} shapes authenticated modern exchanges`, async () => {
      const server = await spawnRemoteServer({ args: [flag] });
      try {
        const res = await modernRpc(server.url, TOKEN_A, {
          method: "tools/call",
          params: { name: "search", arguments: { query: "purge" } },
        });
        expect(res.status).toBe(200);
        expect(res.headers.get("content-type")).toContain(contentType);
        expect(res.headers.get("cache-control")).toBe("no-store, no-transform");
        const body = await readResult(res);
        expect(JSON.parse(body.result.content[0].text).ok).toBe(true);

        const legacy = await rpc(
          server.url,
          { jsonrpc: "2.0", id: 1, method: "tools/list" },
          { "Fastly-Key": TOKEN_A },
        );
        expect(legacy.headers.get("content-type")).toContain(
          "text/event-stream",
        );
        expect(legacy.headers.get("cache-control")).toBe(
          "no-store, no-transform",
        );
      } finally {
        await server.close();
      }
    }, 30000);
  }
});

describe("remote executions against Fastly failures and deadlines", () => {
  let mock;
  let server;

  beforeAll(async () => {
    mock = await startMockFastly();
    server = await spawnRemoteServer({
      mockFastlyUrl: mock.url,
      env: { FASTLY_MCP_TEST_TIMEOUT_MS: "1500" },
    });
  }, 30000);

  afterAll(async () => {
    await server?.close();
    await mock?.close();
  });

  test("a Fastly 401 or 403 keeps its details and points at the Fastly-Key header", async () => {
    const rejected = await callTool(server.url, TOKEN_A, "execute", {
      code: "return await serviceApi.getService({ service_id: 'reject' });",
    });
    expect(rejected.isError).toBe(true);
    expect(rejected.parsed.status).toBe(401);
    expect(rejected.parsed.body).toContain("synthetic 401");
    expect(rejected.parsed.hint).toContain("Fastly-Key");
    expect(rejected.parsed.hint).not.toContain("FASTLY_API_TOKEN");

    const denied = await callTool(server.url, TOKEN_A, "execute", {
      code: "return await serviceApi.getService({ service_id: 'deny' });",
    });
    expect(denied.parsed.status).toBe(403);
    expect(denied.parsed.hint).toContain("not allowed");
    expect(denied.parsed.hint).not.toContain("environment");
  }, 30000);

  test("a Fastly 401 drops the cached admission, a 403 does not", async () => {
    await callTool(server.url, TOKEN_A, "search", { query: "purge" });
    const warm = server.upstreamValidations();
    await callTool(server.url, TOKEN_A, "execute", {
      code: "return await serviceApi.getService({ service_id: 'deny' });",
    });
    await callTool(server.url, TOKEN_A, "search", { query: "purge" });
    expect(server.upstreamValidations()).toBe(warm);

    await callTool(server.url, TOKEN_A, "execute", {
      code: "return await serviceApi.getService({ service_id: 'reject' });",
    });
    await callTool(server.url, TOKEN_A, "search", { query: "purge" });
    expect(server.upstreamValidations()).toBe(warm + 1);
  }, 30000);

  test("neither the credential nor the policy is visible to executed code", async () => {
    const result = await callTool(server.url, TOKEN_A, "execute", {
      code: `const names = Reflect.ownKeys(globalThis).map(String);
             const leaked = names.filter((name) => {
               try { return JSON.stringify(globalThis[name])?.includes("synthetic-token"); } catch { return false; }
             });
             return { leaked, types: [typeof fastlyApiToken, typeof policy, typeof remote, typeof apiToken, typeof shield, typeof request] };`,
    });
    expect(result.parsed.result.leaked).toEqual([]);
    expect(new Set(result.parsed.result.types)).toEqual(new Set(["undefined"]));
  }, 30000);

  test("a timed out execution is reported, audited and leaves no secret behind", async () => {
    const sentinel = "synthetic-sentinel-in-timeout";
    const result = await callTool(server.url, TOKEN_A, "execute", {
      code: `const marker = "${sentinel}"; return await serviceApi.getService({ service_id: 'hang' });`,
    });
    expect(result.isError).toBe(true);
    expect(result.parsed.error).toContain("timed out");
    const record = await server.auditRecord(
      (entry) => entry.outcome === "timeout",
    );
    expect(record.event).toBe("execution");
    expect(record.tokenId).toBe("tokenA");
    expect(server.rawAudit() + server.getStderr()).not.toContain(sentinel);
    expect(server.rawAudit() + server.getStderr()).not.toContain(TOKEN_A);

    const next = await callTool(server.url, TOKEN_A, "execute", {
      code: "return 'permit released';",
    });
    expect(next.parsed.result).toBe("permit released");
  }, 30000);
});

describe("local HTTP mode keeps using the process credential, explicitly", () => {
  let mock;
  let server;

  beforeAll(async () => {
    mock = await startMockFastly();
    server = await spawnRemoteServer({
      local: true,
      mockFastlyUrl: mock.url,
      env: { FASTLY_API_TOKEN: "synthetic-local-process-token" },
    });
  }, 30000);

  afterAll(async () => {
    await server?.close();
    await mock?.close();
  });

  test("executions use FASTLY_API_TOKEN and ignore a Fastly-Key header", async () => {
    const result = await callTool(server.url, TOKEN_A, "execute", {
      code: "return (await serviceApi.listServices()).length;",
    });
    expect(result.parsed.result).toBe(1);
    expect(mock.calls.map((call) => call.key)).toEqual([
      "synthetic-local-process-token",
    ]);
  }, 30000);

  test("local mode keeps fetch, putPackage discovery and needs no key for search", async () => {
    const found = await callTool(server.url, undefined, "search", {
      query: "putPackage",
    });
    expect(found.parsed.matches.map((match) => match.method)).toContain(
      "putPackage",
    );
    const types = await callTool(server.url, undefined, "execute", {
      code: "return typeof fetch;",
    });
    expect(types.parsed.result).toBe("function");
  }, 30000);
});
