import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { INLINE_RESULT_BYTES } from "../src/limits.js";
import {
  BUN_DETECTS_DISCONNECTS,
  callTool,
  modernRpc,
  rawRequest,
  readResult,
  rpc,
  spawnRemoteServer,
  startMockFastly,
  TOKEN_A,
  TOKEN_A2,
  TOKEN_B,
  UPSTREAM_SECRET,
  until,
} from "./remote-helpers.js";

const SERVER_PATH = join(import.meta.dir, "../src/index.js");
const PARENT_TOKEN = "synthetic-parent-environment-token";

async function startupFailure(args, env = {}, local = false) {
  return spawnRemoteServer({ entry: SERVER_PATH, args, env, local }).then(
    () => {
      throw new Error("the server started");
    },
    (error) => error.message,
  );
}

describe("remote mode resolution (spawned)", () => {
  test("conflicting flags, machine-local encryption settings and a bad proxy list are startup errors", async () => {
    const cases = [
      [
        ["--remote-http", "--transport", "stdio"],
        {},
        "--remote-http serves HTTP only",
      ],
      [
        ["--remote-http"],
        { FASTLY_MCP_TRANSPORT: "stdio" },
        "--remote-http serves HTTP only",
      ],
      [
        ["--remote-http", "--encrypt-key", "00112233445566778899aabbccddeeff"],
        {},
        "derives its encryption key",
      ],
      [
        ["--remote-http"],
        { FASTLY_MCP_ENCRYPT_KEY: "x" },
        "derives its encryption key",
      ],
      [
        ["--remote-http"],
        { FASTLY_MCP_ENCRYPT_TWEAK: "x" },
        "derives its encryption key",
      ],
      [
        ["--http-trusted-proxy", "10.0.0.0/8"],
        {},
        "only applies to --remote-http",
        true,
      ],
      [
        ["--remote-http", "--http-trusted-proxy", "10.0.0.0/99"],
        {},
        "Invalid --http-trusted-proxy",
      ],
    ];
    await Promise.all(
      cases.map(async ([args, env, message, local]) => {
        const failure = await startupFailure(args, env, local);
        expect(failure).toContain("code=2");
        expect(failure).toContain(message);
      }),
    );
  }, 30000);

  test.skipIf(process.platform === "linux")(
    "the real entry point starts without the Linux hardening and says so",
    async () => {
      const server = await spawnRemoteServer({ entry: SERVER_PATH });
      try {
        const startup = await server.auditRecord(
          (record) => record.event === "startup",
        );
        expect(startup.hardening).toMatchObject({
          yamaPtraceScope: null,
          prlimit: false,
          oomVictim: false,
        });
        expect(startup.executionRuntime).toBe("node");
      } finally {
        await server.close();
      }
    },
    30000,
  );
});

for (const runtime of ["bun", "node"]) {
  describe(`remote HTTP service under a ${runtime} parent`, () => {
    let mock;
    let server;

    beforeAll(async () => {
      mock = await startMockFastly();
      server = await spawnRemoteServer({
        runtime,
        mockFastlyUrl: mock.url,
        args: ["--http-allow-origin", "https://app.example"],
        env: { FASTLY_API_TOKEN: PARENT_TOKEN },
      });
    }, 30000);

    afterAll(async () => {
      await server?.close();
      await mock?.close();
    });

    test("tools/list works with a valid key and is never stored by HTTP caches", async () => {
      const res = await modernRpc(server.url, TOKEN_A, {
        method: "tools/list",
      });
      expect(res.status).toBe(200);
      expect(res.headers.get("cache-control")).toBe("no-store, no-transform");
      expect(res.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
      const { result } = await readResult(res);
      expect(result.tools.map((tool) => tool.name).sort()).toEqual([
        "execute",
        "inspect",
        "search",
      ]);
      const execute = result.tools.find((tool) => tool.name === "execute");
      expect(execute.description).toContain("This server is remote");
      expect(Object.keys(execute.inputSchema.properties)).toEqual(["code"]);
      // The MCP cache hint is separate from the HTTP header and must stay.
      expect(result.cacheScope ?? result._meta).toBeDefined();
    }, 15000);

    test("the 2025 protocol takes the same key and answers with SSE", async () => {
      const res = await rpc(
        server.url,
        {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-06-18",
            capabilities: {},
            clientInfo: { name: "legacy", version: "1" },
          },
        },
        { "Fastly-Key": TOKEN_A },
      );
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/event-stream");
      expect((await readResult(res)).result.protocolVersion).toBeDefined();
    }, 15000);

    test("missing, malformed, duplicated, rejected and unverifiable keys never reach an execution", async () => {
      const before = mock.calls.length;
      const code = "return await serviceApi.listServices();";
      for (const [token, status, header] of [
        [undefined, 401, ["www-authenticate", "FastlyKey"]],
        ["two words", 400],
        ["synthetic-token-unknown", 401, ["www-authenticate", "FastlyKey"]],
        ["synthetic-token-expired", 401, ["www-authenticate", "FastlyKey"]],
        ["synthetic-token-outage", 503],
        ["synthetic-token-limited", 429, ["retry-after", "7"]],
      ]) {
        const res = await modernRpc(server.url, token, {
          method: "tools/call",
          params: { name: "execute", arguments: { code } },
        });
        expect(res.status).toBe(status);
        if (header) expect(res.headers.get(header[0])).toBe(header[1]);
      }
      expect(
        await rawRequest(server.url, [
          `Fastly-Key: ${TOKEN_A}`,
          `fastly-key: ${TOKEN_B}`,
        ]),
      ).toBe(400);
      expect(mock.calls.length).toBe(before);
    }, 15000);

    test("preflights need no credentials and allow the MCP headers", async () => {
      const preflight = await fetch(server.url, {
        method: "OPTIONS",
        headers: { Origin: "https://app.example" },
      });
      expect(preflight.status).toBe(204);
      const allowed = preflight.headers.get("access-control-allow-headers");
      for (const name of [
        "Fastly-Key",
        "Authorization",
        "Mcp-Method",
        "Mcp-Name",
        "Mcp-Protocol-Version",
      ]) {
        expect(allowed).toContain(name);
      }
    }, 15000);

    test("a request whose Mcp-Method header disagrees with its body is rejected", async () => {
      const res = await rpc(
        server.url,
        {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: {
            _meta: { "io.modelcontextprotocol/protocolVersion": "2026-07-28" },
          },
        },
        { "Fastly-Key": TOKEN_A, "Mcp-Method": "tools/call" },
      );
      expect((await readResult(res)).error).toBeDefined();
    }, 15000);

    test("concurrent callers reach Fastly with their own keys only", async () => {
      const before = mock.calls.length;
      const code = "return (await serviceApi.listServices()).length;";
      const results = await Promise.all(
        [TOKEN_A, TOKEN_B, TOKEN_A2, TOKEN_B, TOKEN_A].map((token) =>
          callTool(server.url, token, "execute", { code }),
        ),
      );
      for (const result of results) {
        expect(result.isError).toBeFalsy();
        expect(result.parsed.result).toBe(1);
      }
      const keys = mock.calls.slice(before).map((call) => call.key);
      expect(keys.sort()).toEqual(
        [TOKEN_A, TOKEN_A, TOKEN_A2, TOKEN_B, TOKEN_B].sort(),
      );
      expect(mock.calls.some((call) => call.key === PARENT_TOKEN)).toBe(false);

      // A later call must not inherit the key of whoever called before it.
      const last = mock.calls.length;
      await callTool(server.url, TOKEN_B, "execute", { code });
      expect(mock.calls.slice(last).map((call) => call.key)).toEqual([TOKEN_B]);
    }, 60000);

    test("tool arguments cannot smuggle a credential or a policy", async () => {
      const before = mock.calls.length;
      const result = await callTool(server.url, TOKEN_A, "execute", {
        code: "return await serviceApi.listServices();",
        fastlyApiToken: "synthetic-token-smuggled",
        apiToken: "synthetic-token-smuggled",
        remote: false,
        policy: { remote: false },
      });
      const keys = mock.calls.slice(before).map((call) => call.key);
      expect(keys.every((key) => key === TOKEN_A)).toBe(true);
      expect(JSON.stringify(result.envelope)).not.toContain("smuggled");
    }, 30000);

    test("generic fetch, file URLs and imports are unavailable to remote code", async () => {
      const urls = [
        "http://127.0.0.1:1/",
        "http://169.254.169.254/latest/meta-data/",
        "https://example.com/",
        "file:///etc/passwd",
      ];
      const fetched = await callTool(server.url, TOKEN_A, "execute", {
        code: `const outcomes = [];
               for (const url of ${JSON.stringify(urls)}) {
                 try { await fetch(url); outcomes.push("allowed"); }
                 catch (error) { outcomes.push(String(error.message)); }
               }
               return outcomes;`,
      });
      expect(fetched.parsed.result).toHaveLength(urls.length);
      for (const outcome of fetched.parsed.result) {
        expect(outcome).toContain("fetch is not available");
      }
      const imported = await callTool(server.url, TOKEN_A, "execute", {
        code: 'return await import("node:fs");',
      });
      expect(imported.parsed.error).toContain("import() is not available");
    }, 60000);

    test("response shielding preserves JSON escapes and round-trips", async () => {
      const plaintext = "a\nAb0Cd1Ef2Gh3Ij4Kl5Mn6Op7Qr8St9U";
      const first = await callTool(server.url, TOKEN_A, "execute", {
        code: `return ${JSON.stringify(plaintext)};`,
      });
      expect(first.isError).toBeFalsy();
      expect(first.parsed.result).toBe(plaintext);

      const second = await callTool(server.url, TOKEN_A, "execute", {
        code: `return ${JSON.stringify(first.parsed.result)};`,
      });
      expect(second.parsed.result).toBe(plaintext);
    }, 30000);

    test.skipIf(runtime === "bun")(
      "a result that secret markers push past the inline limit comes back as an encrypted preview",
      async () => {
        const result = await callTool(server.url, TOKEN_A, "execute", {
          code: `return Array(1500).fill(${JSON.stringify(UPSTREAM_SECRET)});`,
        });
        expect(Buffer.byteLength(result.text)).toBeLessThanOrEqual(
          INLINE_RESULT_BYTES,
        );
        expect(result.isError).toBe(false);
        expect(result.parsed.truncated).toBe(true);
        expect(result.parsed.hint).toContain("inline limit");
        expect(result.parsed.result._total).toBe(1500);
        expect(result.text).toContain("{{fastly-encrypted:v1:github-pat:");
        expect(result.text).not.toContain(UPSTREAM_SECRET);
      },
      30000,
    );

    test("package upload is hidden, explained and refused; package metadata still works", async () => {
      const found = await callTool(server.url, TOKEN_A, "search", {
        query: "PackageApi",
      });
      const methods = found.parsed.matches.map((match) => match.method);
      expect(methods).toContain("getPackage");
      expect(methods).not.toContain("putPackage");

      const explained = await callTool(server.url, TOKEN_A, "inspect", {
        method: "PackageApi.putPackage",
      });
      expect(explained.parsed.error).toContain(
        "unavailable on this remote server",
      );

      for (const call of [
        "packageApi.putPackage({ service_id: 's', version_id: 1, _package: '/etc/passwd' })",
        "packageApi.putPackageWithHttpInfo({ service_id: 's', version_id: 1 })",
        "new Fastly.PackageApi().putPackage({ service_id: 's', version_id: 1 })",
      ]) {
        const before = mock.calls.length;
        const refused = await callTool(server.url, TOKEN_A, "execute", {
          code: `return await ${call};`,
        });
        expect(refused.parsed.error).toContain("is unavailable here");
        expect(mock.calls.length).toBe(before);
      }

      const metadata = await callTool(server.url, TOKEN_A, "execute", {
        code: "return await packageApi.getPackage({ service_id: 's', version_id: 1 });",
      });
      expect(metadata.isError).toBeFalsy();
    }, 60000);

    test("a token without customer identity can discover but not execute", async () => {
      const token = "synthetic-token-restricted";
      const found = await callTool(server.url, token, "search", {
        query: "purge",
      });
      expect(found.parsed.ok).toBe(true);

      const before = mock.calls.length;
      const refused = await callTool(server.url, token, "execute", {
        code: "return await purgeApi.purgeAll({ service_id: 's' });",
      });
      expect(refused.isError).toBe(true);
      expect(refused.parsed.error).toContain("Execution is unavailable");
      expect(mock.calls.length).toBe(before);

      const fallback = await callTool(
        server.url,
        "synthetic-token-fallback",
        "execute",
        { code: "return 6 * 7;" },
      );
      expect(fallback.parsed.result).toBe(42);
    }, 30000);

    test.skipIf(runtime === "bun" && !BUN_DETECTS_DISCONNECTS)(
      "a disconnected caller cancels its execution and frees its permit",
      async () => {
        const controller = new AbortController();
        const hung = callTool(
          server.url,
          TOKEN_B,
          "execute",
          {
            code: "return await serviceApi.getService({ service_id: 'hang' });",
          },
          { signal: controller.signal },
        ).catch((error) => error);
        await until(() =>
          mock.calls.some((call) => call.path.includes("hang")),
        );
        controller.abort();
        await hung;

        const cancelled = await server.auditRecord(
          (record) =>
            record.event === "execution" && record.outcome === "cancelled",
        );
        expect(cancelled.tokenId).toBe("tokenB");

        const next = await callTool(server.url, TOKEN_B, "execute", {
          code: "return 1;",
        });
        expect(next.parsed.result).toBe(1);
      },
      30000,
    );

    test("audit records identify the caller and the runtime, and hold no secrets", async () => {
      const sentinel = "synthetic-sentinel-in-code";
      await callTool(server.url, TOKEN_A, "execute", {
        code: `return "${sentinel}";`,
      });
      await callTool(server.url, TOKEN_A, "execute", {
        code: `throw new Error("${sentinel}");`,
      });
      const forged = await rpc(
        server.url,
        { jsonrpc: "2.0", id: 9, method: `tools/${sentinel}\nforged` },
        { "Fastly-Key": TOKEN_A },
      );
      await forged.text();
      await server.auditRecord((record) => record.method === "other");

      const records = server.auditRecords();
      const startup = records.find((record) => record.event === "startup");
      expect(startup.serverRuntime).toBe(runtime);
      expect(startup.executionRuntime).toBe("node");
      expect(startup.executionRuntimeVersion).toMatch(/^\d+\.\d+\.\d+$/);

      const executions = records.filter(
        (record) => record.event === "execution",
      );
      for (const record of executions) {
        expect(record.executionRuntime).toBe("node");
        expect(record.executionRuntimeVersion).toBe(
          startup.executionRuntimeVersion,
        );
        expect(record.requestId).toBeDefined();
      }
      const admitted = executions.find(
        (record) => record.tokenId === "tokenA" && record.outcome === "ok",
      );
      expect(admitted.customerId).toBe("customerA");
      expect(admitted.executionMs).toBeGreaterThanOrEqual(0);
      expect(executions.some((record) => record.outcome === "error")).toBe(
        true,
      );

      expect(
        records.some(
          (record) =>
            record.event === "mcp_request" &&
            record.method === "tools/call" &&
            record.tool === "execute" &&
            record.era !== undefined &&
            record.sourceIp === "127.0.0.1",
        ),
      ).toBe(true);
      const rejected = records.filter(
        (record) => record.event === "request_rejected",
      );
      expect(rejected.every((record) => record.tokenId === undefined)).toBe(
        true,
      );

      const everything = server.rawAudit() + server.getStderr();
      for (const secret of [
        TOKEN_A,
        TOKEN_A2,
        TOKEN_B,
        PARENT_TOKEN,
        sentinel,
        "synthetic-token-unknown",
      ]) {
        expect(everything).not.toContain(secret);
      }
    }, 60000);
  });
}

describe("remote HTTP service with a deployment token", () => {
  let server;

  beforeAll(async () => {
    server = await spawnRemoteServer({
      args: ["--http-host", "0.0.0.0"],
      env: { FASTLY_MCP_HTTP_AUTH_TOKEN: "synthetic-deployment-token" },
    });
  }, 30000);

  afterAll(async () => {
    await server?.close();
  });

  test("a configured deployment token is required on top of the Fastly key", async () => {
    const keyOnly = await modernRpc(server.url, TOKEN_A, {
      method: "tools/list",
    });
    expect(keyOnly.status).toBe(401);
    expect(keyOnly.headers.get("www-authenticate")).toBe("Bearer");

    const both = await rpc(
      server.url,
      { jsonrpc: "2.0", id: 1, method: "tools/list" },
      {
        "Fastly-Key": TOKEN_A,
        Authorization: "Bearer synthetic-deployment-token",
      },
    );
    expect(both.status).toBe(200);

    const bearerOnly = await rpc(
      server.url,
      { jsonrpc: "2.0", id: 1, method: "tools/list" },
      { Authorization: "Bearer synthetic-deployment-token" },
    );
    expect(bearerOnly.status).toBe(401);
    expect(server.rawAudit()).not.toContain("synthetic-deployment-token");
  }, 15000);
});
