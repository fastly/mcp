import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { join } from "node:path";
import {
  CLIENT_CAPABILITIES_META_KEY,
  CLIENT_INFO_META_KEY,
  Client,
  PROTOCOL_VERSION_META_KEY,
  SERVER_INFO_META_KEY,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { parseArgs } from "../src/cli.js";
import {
  buildAllowedHosts,
  formatHostKey,
  isLoopbackHost,
  reachableDisplayHost,
  resolveHttpOptions,
} from "../src/http.js";

const SERVER_PATH = join(import.meta.dir, "../src/index.js");

const MODERN_VERSION = "2026-07-28";

function rpc(url, body, extraHeaders = {}) {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // The legacy leg answers 406 without text/event-stream on offer.
      Accept: "application/json, text/event-stream",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
}

/**
 * POST a 2026-07-28 request. `Mcp-Method` is mandatory rather than a routing
 * convenience: omit it and the server answers -32020.
 */
function modernRpc(url, body) {
  const { params = {}, ...rest } = body;
  const headers = { "Mcp-Method": body.method };
  if (params.name) headers["Mcp-Name"] = params.name;

  return rpc(
    url,
    {
      ...rest,
      params: {
        ...params,
        _meta: {
          [PROTOCOL_VERSION_META_KEY]: MODERN_VERSION,
          [CLIENT_INFO_META_KEY]: { name: "wire-test", version: "1.0.0" },
          [CLIENT_CAPABILITIES_META_KEY]: {},
        },
      },
    },
    headers,
  );
}

/**
 * Read a JSON-RPC result out of a response body. `--http-json` only shapes the
 * modern leg, so the legacy leg answers with SSE either way.
 */
async function readResult(res) {
  const text = await res.text();
  if (!res.headers.get("content-type")?.includes("text/event-stream")) {
    return JSON.parse(text);
  }
  const line = text.split("\n").find((l) => l.startsWith("data:"));
  return JSON.parse(line.slice(5).trim());
}

function emptyCliArgs(overrides = {}) {
  return { ...parseArgs(["bun", SERVER_PATH]), ...overrides };
}

async function spawnHttpServer({ args = [], env = {} } = {}) {
  const child = spawn(
    "bun",
    ["run", SERVER_PATH, "--transport", "http", "--http-port", "0", ...args],
    {
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let stderr = "";
  let url = null;
  const ready = new Promise((resolve, reject) => {
    const onExit = (code) => {
      reject(
        new Error(
          `server exited before reporting URL (code=${code}). stderr=${stderr}`,
        ),
      );
    };
    child.on("exit", onExit);
    child.stderr.on("data", (chunk) => {
      const s = chunk.toString();
      stderr += s;
      const m = /listening on (http:\/\/[^\s]+)/.exec(stderr);
      if (m && !url) {
        url = m[1];
        child.off("exit", onExit);
        resolve();
      }
    });
  });

  const timeout = new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error(`startup timeout. stderr=${stderr}`)),
      8000,
    ),
  );

  await Promise.race([ready, timeout]);

  return {
    child,
    url,
    getStderr: () => stderr,
    async close() {
      child.kill("SIGINT");
      await once(child, "exit").catch(() => {});
    },
  };
}

async function spawnExpectFail({ args = [], env = {} }) {
  const child = spawn(
    "bun",
    ["run", SERVER_PATH, "--transport", "http", ...args],
    {
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let stderr = "";
  child.stderr.on("data", (c) => {
    stderr += c.toString();
  });
  const [code] = await once(child, "exit");
  return { code, stderr };
}

describe("helpers: isLoopbackHost", () => {
  test("recognizes loopback addresses", () => {
    expect(isLoopbackHost("127.0.0.1")).toBe(true);
    expect(isLoopbackHost("127.5.5.5")).toBe(true);
    expect(isLoopbackHost("::1")).toBe(true);
    expect(isLoopbackHost("localhost")).toBe(true);
    expect(isLoopbackHost("LOCALHOST")).toBe(true);
  });

  test("rejects non-loopback", () => {
    expect(isLoopbackHost("0.0.0.0")).toBe(false);
    expect(isLoopbackHost("192.168.1.1")).toBe(false);
    expect(isLoopbackHost("example.com")).toBe(false);
    expect(isLoopbackHost("")).toBe(false);
    expect(isLoopbackHost(undefined)).toBe(false);
  });

  test("hostnames starting with '127.' are not loopback", () => {
    expect(isLoopbackHost("127.example.com")).toBe(false);
    expect(isLoopbackHost("127.0.0.1.nip.io")).toBe(false);
  });
});

describe("helpers: formatHostKey", () => {
  test("formats IPv4", () => {
    expect(formatHostKey("127.0.0.1", 8231)).toBe("127.0.0.1:8231");
  });

  test("wraps IPv6 in brackets", () => {
    expect(formatHostKey("::1", 8231)).toBe("[::1]:8231");
    expect(formatHostKey("2001:db8::1", 80)).toBe("[2001:db8::1]:80");
  });

  test("keeps already-bracketed IPv6 untouched", () => {
    expect(formatHostKey("[::1]", 8231)).toBe("[::1]:8231");
  });

  test("lowercases hostnames", () => {
    expect(formatHostKey("Example.COM", 80)).toBe("example.com:80");
  });
});

describe("helpers: buildAllowedHosts", () => {
  test("always includes loopback entries", () => {
    const hosts = buildAllowedHosts({ port: 8231 });
    expect(hosts.has("127.0.0.1:8231")).toBe(true);
    expect(hosts.has("[::1]:8231")).toBe(true);
    expect(hosts.has("localhost:8231")).toBe(true);
  });

  test("adds extra entries verbatim when they include a port", () => {
    const hosts = buildAllowedHosts({
      port: 8231,
      extra: ["mcp.example.com:9000"],
    });
    expect(hosts.has("mcp.example.com:9000")).toBe(true);
  });

  test("adds extra entries with default port when no port given", () => {
    const hosts = buildAllowedHosts({
      port: 8231,
      extra: ["mcp.example.com"],
    });
    expect(hosts.has("mcp.example.com:8231")).toBe(true);
  });

  test("includeNetwork enumerates interfaces", () => {
    const hosts = buildAllowedHosts({ port: 8231, includeNetwork: true });
    expect(hosts.size).toBeGreaterThan(3);
  });

  test("bare IPv6 extra is bracketed with the default port", () => {
    const hosts = buildAllowedHosts({
      port: 8231,
      extra: ["2001:db8::1"],
    });
    expect(hosts.has("[2001:db8::1]:8231")).toBe(true);
  });

  test("bracketed IPv6 without port gets the default port", () => {
    const hosts = buildAllowedHosts({
      port: 8231,
      extra: ["[2001:db8::1]"],
    });
    expect(hosts.has("[2001:db8::1]:8231")).toBe(true);
  });

  test("bracketed IPv6 with explicit port is preserved", () => {
    const hosts = buildAllowedHosts({
      port: 8231,
      extra: ["[2001:db8::1]:9000"],
    });
    expect(hosts.has("[2001:db8::1]:9000")).toBe(true);
  });

  test("the configured bind host is allowed", () => {
    const hosts = buildAllowedHosts({ host: "127.0.0.2", port: 8231 });
    expect(hosts.has("127.0.0.2:8231")).toBe(true);

    const v6 = buildAllowedHosts({ host: "2001:db8::7", port: 8231 });
    expect(v6.has("[2001:db8::7]:8231")).toBe(true);
  });

  test("wildcard binds do not leak into the allow list", () => {
    const wildcards = [
      "0.0.0.0",
      "::",
      "[::]",
      "0:0:0:0:0:0:0:0",
      "::0",
      "[::0]",
      "0::0",
    ];
    for (const host of wildcards) {
      const hosts = buildAllowedHosts({ host, port: 8231 });
      expect(hosts.size).toBe(3);
    }
  });

  test("port 80 also allows portless Host values", () => {
    const hosts = buildAllowedHosts({ host: "127.0.0.2", port: 80 });
    expect(hosts.has("localhost")).toBe(true);
    expect(hosts.has("localhost:80")).toBe(true);
    expect(hosts.has("127.0.0.1")).toBe(true);
    expect(hosts.has("[::1]")).toBe(true);
    expect(hosts.has("127.0.0.2")).toBe(true);
  });

  test("ports other than 80 stay port-qualified", () => {
    const hosts = buildAllowedHosts({ port: 8231 });
    expect(hosts.has("localhost")).toBe(false);
  });

  test("extra entries without a port are also allowed portless", () => {
    const hosts = buildAllowedHosts({
      port: 8231,
      extra: ["mcp.example.com", "[2001:db8::1]", "2001:db8::2"],
    });
    expect(hosts.has("mcp.example.com")).toBe(true);
    expect(hosts.has("mcp.example.com:8231")).toBe(true);
    expect(hosts.has("[2001:db8::1]")).toBe(true);
    expect(hosts.has("[2001:db8::2]")).toBe(true);
  });

  test("extra entries with an explicit port stay port-specific", () => {
    const hosts = buildAllowedHosts({
      port: 8231,
      extra: ["mcp.example.com:9000"],
    });
    expect(hosts.has("mcp.example.com:9000")).toBe(true);
    expect(hosts.has("mcp.example.com")).toBe(false);
  });
});

describe("helpers: resolveHttpOptions", () => {
  test("defaults to loopback bind, port 8231, auto response mode", () => {
    const opts = resolveHttpOptions({ cliArgs: emptyCliArgs() });
    expect(opts.host).toBe("127.0.0.1");
    expect(opts.port).toBe(8231);
    expect(opts.path).toBe("/mcp");
    expect(opts.responseMode).toBe("auto");
  });

  test("--http-json selects json response mode", () => {
    const opts = resolveHttpOptions({
      cliArgs: emptyCliArgs({ httpJson: true }),
    });
    expect(opts.responseMode).toBe("json");
  });

  test("--http-sse selects sse response mode", () => {
    const opts = resolveHttpOptions({
      cliArgs: emptyCliArgs({ httpSse: true }),
    });
    expect(opts.responseMode).toBe("sse");
  });

  test("--http-json + --http-sse is a startup error", () => {
    expect(() =>
      resolveHttpOptions({
        cliArgs: emptyCliArgs({ httpJson: true, httpSse: true }),
      }),
    ).toThrow(/mutually exclusive/);
  });

  test("non-loopback bind without token throws", () => {
    expect(() =>
      resolveHttpOptions({
        cliArgs: emptyCliArgs({ httpHost: "0.0.0.0" }),
      }),
    ).toThrow(/non-loopback address requires an auth token/);
  });

  test("--http-allow-network without token throws", () => {
    expect(() =>
      resolveHttpOptions({
        cliArgs: emptyCliArgs({ httpAllowNetwork: true }),
      }),
    ).toThrow(/requires an auth token/);
  });

  test("non-loopback bind with token succeeds and flags network hosts", () => {
    const opts = resolveHttpOptions({
      cliArgs: emptyCliArgs({ httpHost: "0.0.0.0", httpAuthToken: "secret" }),
    });
    expect(opts.host).toBe("0.0.0.0");
    expect(opts.authToken).toBe("secret");
    expect(opts.includeNetworkHosts).toBe(true);
  });

  test("env-provided origins are parsed as CSV", () => {
    const opts = resolveHttpOptions({
      cliArgs: emptyCliArgs(),
      env: {
        FASTLY_MCP_HTTP_ALLOW_ORIGIN: "https://a.example, https://b.example",
      },
    });
    expect(opts.allowedOrigins.has("https://a.example")).toBe(true);
    expect(opts.allowedOrigins.has("https://b.example")).toBe(true);
  });

  test("env auth token is used when CLI flag is absent", () => {
    const opts = resolveHttpOptions({
      cliArgs: emptyCliArgs(),
      env: { FASTLY_MCP_HTTP_AUTH_TOKEN: "envtoken" },
    });
    expect(opts.authToken).toBe("envtoken");
  });

  test("invalid path is rejected", () => {
    expect(() =>
      resolveHttpOptions({ cliArgs: emptyCliArgs({ httpPath: "mcp" }) }),
    ).toThrow(/must start with/);
  });
});

describe("parseArgs: flag-shaped values", () => {
  test("--http-auth-token followed by another flag throws", () => {
    expect(() =>
      parseArgs(["bun", "s", "--http-auth-token", "--http-json"]),
    ).toThrow();
  });

  test("--http-port followed by another flag throws", () => {
    expect(() =>
      parseArgs(["bun", "s", "--http-port", "--http-host"]),
    ).toThrow();
  });

  test("--encrypt-key followed by another flag throws", () => {
    expect(() =>
      parseArgs(["bun", "s", "--encrypt-key", "--http-json"]),
    ).toThrow();
  });

  test("--http-allow-origin can be passed multiple times", () => {
    const args = parseArgs([
      "bun",
      "s",
      "--http-allow-origin",
      "https://a.example",
      "--http-allow-origin",
      "https://b.example",
    ]);
    expect(args.httpAllowOrigins).toEqual([
      "https://a.example",
      "https://b.example",
    ]);
  });

  test("--http-auth-token=- prefix forms still work via =", () => {
    const args = parseArgs(["bun", "s", "--http-auth-token=-weird-value"]);
    expect(args.httpAuthToken).toBe("-weird-value");
  });

  test("unknown flags are rejected (strict mode)", () => {
    expect(() => parseArgs(["bun", "s", "--bogus-flag"])).toThrow();
  });

  test("malformed port values are rejected", () => {
    expect(() =>
      resolveHttpOptions({ cliArgs: emptyCliArgs({ httpPort: "8231abc" }) }),
    ).toThrow(/Invalid --http-port/);
    expect(() =>
      resolveHttpOptions({ cliArgs: emptyCliArgs({ httpPort: "0x10" }) }),
    ).toThrow(/Invalid --http-port/);
    expect(() =>
      resolveHttpOptions({ cliArgs: emptyCliArgs({ httpPort: "-1" }) }),
    ).toThrow(/Invalid --http-port/);
    expect(() =>
      resolveHttpOptions({ cliArgs: emptyCliArgs({ httpPort: "70000" }) }),
    ).toThrow(/Invalid --http-port/);
  });
});

describe("helpers: reachableDisplayHost", () => {
  test("rewrites IPv4 wildcard to loopback", () => {
    expect(reachableDisplayHost("0.0.0.0")).toBe("127.0.0.1");
  });

  test("rewrites IPv6 wildcard to bracketed loopback", () => {
    expect(reachableDisplayHost("::")).toBe("[::1]");
    expect(reachableDisplayHost("0:0:0:0:0:0:0:0")).toBe("[::1]");
  });

  test("rewrites IPv6 wildcard aliases the same way", () => {
    expect(reachableDisplayHost("::0")).toBe("[::1]");
    expect(reachableDisplayHost("0::0")).toBe("[::1]");
    expect(reachableDisplayHost("[::0]")).toBe("[::1]");
  });

  test("brackets bare IPv6 literals", () => {
    expect(reachableDisplayHost("2001:db8::1")).toBe("[2001:db8::1]");
  });

  test("keeps loopback and hostnames as-is", () => {
    expect(reachableDisplayHost("127.0.0.1")).toBe("127.0.0.1");
    expect(reachableDisplayHost("localhost")).toBe("localhost");
    expect(reachableDisplayHost("example.com")).toBe("example.com");
  });
});

describe("startup guards (spawned)", () => {
  test("non-loopback bind without token exits with code 2", async () => {
    const { code, stderr } = await spawnExpectFail({
      args: ["--http-host", "0.0.0.0", "--http-port", "0"],
    });
    expect(code).toBe(2);
    expect(stderr).toMatch(/non-loopback address requires an auth token/);
  }, 10000);

  test("--http-allow-network without token exits with code 2", async () => {
    const { code, stderr } = await spawnExpectFail({
      args: ["--http-allow-network", "--http-port", "0"],
    });
    expect(code).toBe(2);
    expect(stderr).toMatch(/requires an auth token/);
  }, 10000);

  test("--http-json and --http-sse together exit with code 2", async () => {
    const { code, stderr } = await spawnExpectFail({
      args: ["--http-port", "0", "--http-json", "--http-sse"],
    });
    expect(code).toBe(2);
    expect(stderr).toMatch(/mutually exclusive/);
  }, 10000);
});

describe("Streamable HTTP transport — SDK client", () => {
  let server;
  const clients = {};

  beforeAll(async () => {
    server = await spawnHttpServer();
    for (const [era, options] of [
      ["legacy", undefined],
      ["modern", { versionNegotiation: { mode: { pin: MODERN_VERSION } } }],
    ]) {
      const client = new Client(
        { name: `${era}-client`, version: "1.0.0" },
        options,
      );
      await client.connect(
        new StreamableHTTPClientTransport(new URL(server.url)),
      );
      clients[era] = client;
    }
  }, 25000);

  afterAll(async () => {
    await Promise.all(Object.values(clients).map((c) => c.close()));
    if (server) await server.close();
  });

  for (const era of ["legacy", "modern"]) {
    test(`${era}: lists the three tools`, async () => {
      const { tools } = await clients[era].listTools();
      expect(tools.map((t) => t.name).sort()).toEqual([
        "execute",
        "inspect",
        "search",
      ]);
    }, 10000);

    test(`${era}: execute runs code`, async () => {
      const result = await clients[era].callTool({
        name: "execute",
        arguments: { code: "return 6 * 7;" },
      });
      expect(result.isError).toBeFalsy();
      expect(JSON.parse(result.content[0].text).result).toBe(42);
    }, 15000);
  }
});

describe("Streamable HTTP transport — 2026-07-28 wire shape", () => {
  let server;

  beforeAll(async () => {
    server = await spawnHttpServer({ args: ["--http-json"] });
  }, 15000);

  afterAll(async () => {
    if (server) await server.close();
  });

  test("server/discover advertises the revision, caches, and moves serverInfo into _meta", async () => {
    const res = await modernRpc(server.url, {
      jsonrpc: "2.0",
      id: 1,
      method: "server/discover",
    });
    expect(res.status).toBe(200);
    const { result } = await res.json();
    expect(result.supportedVersions).toContain(MODERN_VERSION);
    expect(result.resultType).toBe("complete");
    expect(result.ttlMs).toBe(3600000);
    expect(result.cacheScope).toBe("public");
    expect(result.serverInfo).toBeUndefined();
    expect(result._meta[SERVER_INFO_META_KEY].name).toBe("@fastly/mcp");
  }, 10000);

  test("tools/list carries cache hints and needs no handshake", async () => {
    const res = await modernRpc(server.url, {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/list",
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("mcp-session-id")).toBeNull();
    const { result } = await res.json();
    expect(result.tools.length).toBe(3);
    expect(result.ttlMs).toBe(3600000);
    expect(result.cacheScope).toBe("public");
  }, 10000);

  test("tools/call works off a bare envelope", async () => {
    const res = await modernRpc(server.url, {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "search", arguments: { query: "purge" } },
    });
    expect(res.status).toBe(200);
    const { result } = await res.json();
    expect(JSON.parse(result.content[0].text).ok).toBe(true);
  }, 10000);
});

describe("Streamable HTTP transport — legacy 2025 fallback", () => {
  let server;

  beforeAll(async () => {
    server = await spawnHttpServer();
  }, 15000);

  afterAll(async () => {
    if (server) await server.close();
  });

  test("initialize is answered without minting a session", async () => {
    const res = await rpc(server.url, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "test", version: "1" },
      },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("mcp-session-id")).toBeNull();
    const parsed = await readResult(res);
    expect(parsed.result.protocolVersion).toBeDefined();
  }, 10000);

  test("tools/list works without a prior initialize", async () => {
    const res = await rpc(server.url, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
    });
    expect(res.status).toBe(200);
    const parsed = await readResult(res);
    expect(parsed.result.tools.length).toBe(3);
  }, 10000);

  test("GET /mcp returns 405 (no session streams to resume)", async () => {
    const res = await fetch(server.url, { method: "GET" });
    expect(res.status).toBe(405);
  }, 10000);

  test("DELETE /mcp returns 405", async () => {
    const res = await fetch(server.url, { method: "DELETE" });
    expect(res.status).toBe(405);
  }, 10000);

  test("oversized request body returns 413", async () => {
    const res = await fetch(server.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "x".repeat(4 * 1024 * 1024 + 1),
    });

    expect(res.status).toBe(413);
    expect((await res.json()).error.message).toBe("Request body too large");
  }, 10000);

  test("oversized chunked body returns 413 without a Content-Length", async () => {
    const chunk = "x".repeat(64 * 1024);
    let sent = 0;
    const body = new ReadableStream({
      pull(controller) {
        if (sent > 8 * 1024 * 1024) {
          controller.close();
          return;
        }
        sent += chunk.length;
        controller.enqueue(new TextEncoder().encode(chunk));
      },
    });

    const res = await fetch(server.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      duplex: "half",
    });

    expect(res.status).toBe(413);
    expect((await res.json()).error.message).toBe("Request body too large");
  }, 15000);
});

describe("Streamable HTTP transport — auth and CORS", () => {
  let server;

  beforeAll(async () => {
    server = await spawnHttpServer({
      args: ["--http-allow-origin", "https://allowed.example"],
      env: { FASTLY_MCP_HTTP_AUTH_TOKEN: "s3cret" },
    });
  }, 15000);

  afterAll(async () => {
    if (server) await server.close();
  });

  test("missing bearer token is 401 with a WWW-Authenticate challenge", async () => {
    const res = await fetch(server.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toBe("Bearer");
  }, 10000);

  test("wrong bearer token is 401 with a WWW-Authenticate challenge", async () => {
    const res = await fetch(server.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer wrong",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toBe("Bearer");
  }, 10000);

  test("correct bearer token passes", async () => {
    const res = await fetch(server.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: "Bearer s3cret",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect(res.status).toBe(200);
  }, 10000);

  test("healthz works without auth", async () => {
    const u = new URL(server.url);
    u.pathname = "/healthz";
    const res = await fetch(u.toString());
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
  }, 10000);

  test("disallowed Origin is 403", async () => {
    const res = await fetch(server.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer s3cret",
        Origin: "https://evil.example",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect(res.status).toBe(403);
  }, 10000);

  test("allowed Origin gets CORS headers", async () => {
    const res = await fetch(server.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: "Bearer s3cret",
        Origin: "https://allowed.example",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe(
      "https://allowed.example",
    );
    expect(res.headers.get("vary")).toMatch(/Origin/i);
  }, 10000);

  test("OPTIONS preflight bypasses auth and returns 204", async () => {
    const res = await fetch(server.url, {
      method: "OPTIONS",
      headers: { Origin: "https://allowed.example" },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-methods")).toContain("POST");
  }, 10000);
});

describe("Streamable HTTP transport — host guard", () => {
  let server;

  beforeAll(async () => {
    server = await spawnHttpServer({});
  }, 15000);

  afterAll(async () => {
    if (server) await server.close();
  });

  test("spoofed Host header is 421", async () => {
    const res = await fetch(server.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Host: "evil.example",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect(res.status).toBe(421);
  }, 10000);
});

describe("Streamable HTTP transport: reverse-proxy Host", () => {
  let server;

  beforeAll(async () => {
    server = await spawnHttpServer({
      args: ["--http-allow-host", "mcp.example.com"],
    });
  }, 15000);

  afterAll(async () => {
    if (server) await server.close();
  });

  test("an allowed Host without a port passes the guard", async () => {
    const res = await rpc(
      server.url,
      { jsonrpc: "2.0", id: 1, method: "tools/list" },
      { Host: "mcp.example.com" },
    );
    expect(res.status).toBe(200);
  }, 10000);

  test("the same Host with the listening port also passes", async () => {
    const port = new URL(server.url).port;
    const res = await rpc(
      server.url,
      { jsonrpc: "2.0", id: 1, method: "tools/list" },
      { Host: `mcp.example.com:${port}` },
    );
    expect(res.status).toBe(200);
  }, 10000);
});

describe("CLI argument errors (spawned)", () => {
  test("an unknown flag exits 2 with a clean message", async () => {
    const { code, stderr } = await spawnExpectFail({ args: ["--bogus-flag"] });
    expect(code).toBe(2);
    expect(stderr).toMatch(/--bogus-flag/);
    expect(stderr).toMatch(/--help/);
    expect(stderr).not.toMatch(/\n\s+at /);
  }, 10000);

  test("a positional argument exits 2 with a clean message", async () => {
    const { code, stderr } = await spawnExpectFail({ args: ["serve"] });
    expect(code).toBe(2);
    expect(stderr).toMatch(/Unexpected argument "serve"/);
    expect(stderr).not.toMatch(/\n\s+at /);
  }, 10000);

  test("an invalid encryption key exits 2 with a clean message", async () => {
    const { code, stderr } = await spawnExpectFail({
      args: ["--encrypt-secrets", "--encrypt-key", "nope"],
    });
    expect(code).toBe(2);
    expect(stderr).toMatch(/32 hex characters/);
    expect(stderr).not.toMatch(/\n\s+at /);
  }, 10000);

  test("an invalid encryption key is rejected even with encryption off", async () => {
    const { code, stderr } = await spawnExpectFail({
      args: ["--encrypt-key", "nope"],
    });
    expect(code).toBe(2);
    expect(stderr).toMatch(/32 hex characters/);
  }, 10000);

  test("an explicitly empty encryption key is rejected, not ignored", async () => {
    const viaFlag = await spawnExpectFail({ args: ["--encrypt-key="] });
    expect(viaFlag.code).toBe(2);
    expect(viaFlag.stderr).toMatch(/32 hex characters/);

    const viaEnv = await spawnExpectFail({
      env: { FASTLY_MCP_ENCRYPT_SECRETS: "true", FASTLY_MCP_ENCRYPT_KEY: "" },
    });
    expect(viaEnv.code).toBe(2);
    expect(viaEnv.stderr).toMatch(/32 hex characters/);
  }, 10000);
});

describe("Streamable HTTP transport — secret encryption", () => {
  let server;
  const GITHUB_PAT = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij";

  beforeAll(async () => {
    server = await spawnHttpServer({
      env: {
        FASTLY_MCP_ENCRYPT_SECRETS: "true",
        FASTLY_MCP_ENCRYPT_KEY: "0102030405060708090a0b0c0d0e0f10",
      },
    });
  }, 15000);

  afterAll(async () => {
    if (server) await server.close();
  });

  test("tokens in execute output are encrypted", async () => {
    const res = await fetch(server.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "execute",
          arguments: { code: `return "token: ${GITHUB_PAT}";` },
        },
      }),
    });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain(GITHUB_PAT);
    expect(text).toContain("ghp_");
  }, 15000);
});
