import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { parseArgs } from "../src/cli.js";
import {
  buildAllowedHosts,
  formatHostKey,
  isLoopbackHost,
  reachableDisplayHost,
  resolveHttpOptions,
} from "../src/http.js";

const SERVER_PATH = join(import.meta.dir, "../src/index.js");

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
});

describe("helpers: resolveHttpOptions", () => {
  test("defaults to loopback bind, port 8231, stateful SSE", () => {
    const opts = resolveHttpOptions({ cliArgs: emptyCliArgs() });
    expect(opts.host).toBe("127.0.0.1");
    expect(opts.port).toBe(8231);
    expect(opts.path).toBe("/mcp");
    expect(opts.stateless).toBe(false);
    expect(opts.jsonResponse).toBe(false);
  });

  test("stateless implies json", () => {
    const opts = resolveHttpOptions({
      cliArgs: emptyCliArgs({ httpStateless: true }),
    });
    expect(opts.jsonResponse).toBe(true);
  });

  test("--http-sse with stateless forces SSE", () => {
    const opts = resolveHttpOptions({
      cliArgs: emptyCliArgs({ httpStateless: true, httpSse: true }),
    });
    expect(opts.jsonResponse).toBe(false);
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
      parseArgs(["bun", "s", "--http-auth-token", "--http-stateless"]),
    ).toThrow();
  });

  test("--http-port followed by another flag throws", () => {
    expect(() =>
      parseArgs(["bun", "s", "--http-port", "--http-host"]),
    ).toThrow();
  });

  test("--encrypt-key followed by another flag throws", () => {
    expect(() =>
      parseArgs(["bun", "s", "--encrypt-key", "--http-stateless"]),
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

describe("Streamable HTTP transport — SDK client smoke", () => {
  let server;
  let client;

  beforeAll(async () => {
    server = await spawnHttpServer();
    const transport = new StreamableHTTPClientTransport(new URL(server.url));
    client = new Client({ name: "test-client", version: "1.0.0" });
    await client.connect(transport);
  }, 15000);

  afterAll(async () => {
    if (client) await client.close();
    if (server) await server.close();
  });

  test("lists the three tools", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(["execute", "inspect", "search"]);
  }, 10000);

  test("search returns results", async () => {
    const result = await client.callTool({
      name: "search",
      arguments: { query: "purge" },
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.ok).toBe(true);
    expect(parsed.total).toBeGreaterThan(0);
  }, 10000);

  test("inspect returns method details", async () => {
    const result = await client.callTool({
      name: "inspect",
      arguments: { method: "listServices" },
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.ok).toBe(true);
    expect(parsed.method).toBe("listServices");
  }, 10000);

  test("execute runs code", async () => {
    const result = await client.callTool({
      name: "execute",
      arguments: { code: "return 1 + 1;" },
    });
    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.result).toBe(2);
  }, 15000);
});

describe("Streamable HTTP transport — hand-rolled stateful (JSON mode)", () => {
  let server;
  let sessionId;

  beforeAll(async () => {
    server = await spawnHttpServer({ args: ["--http-json"] });
  }, 15000);

  afterAll(async () => {
    if (server) await server.close();
  });

  async function rpc(body, headers = {}) {
    return fetch(server.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        ...headers,
      },
      body: JSON.stringify(body),
    });
  }

  test("initialize returns Mcp-Session-Id", async () => {
    const res = await rpc({
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
    sessionId = res.headers.get("mcp-session-id");
    expect(sessionId).toBeTruthy();
    const parsed = await res.json();
    expect(parsed.result.protocolVersion).toBeDefined();
  }, 10000);

  test("notifications/initialized returns 202", async () => {
    const res = await rpc(
      { jsonrpc: "2.0", method: "notifications/initialized" },
      { "Mcp-Session-Id": sessionId },
    );
    expect(res.status).toBe(202);
  }, 10000);

  test("tools/list returns three tools", async () => {
    const res = await rpc(
      { jsonrpc: "2.0", id: 2, method: "tools/list" },
      { "Mcp-Session-Id": sessionId },
    );
    expect(res.status).toBe(200);
    const parsed = await res.json();
    expect(parsed.result.tools.length).toBe(3);
  }, 10000);

  test("tools/call search returns a result", async () => {
    const res = await rpc(
      {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "search", arguments: { query: "purge" } },
      },
      { "Mcp-Session-Id": sessionId },
    );
    expect(res.status).toBe(200);
    const parsed = await res.json();
    const body = JSON.parse(parsed.result.content[0].text);
    expect(body.ok).toBe(true);
  }, 10000);

  test("DELETE closes the session and returns 204", async () => {
    const res = await fetch(server.url, {
      method: "DELETE",
      headers: { "Mcp-Session-Id": sessionId },
    });
    expect(res.status).toBe(204);

    const after = await rpc(
      { jsonrpc: "2.0", id: 4, method: "tools/list" },
      { "Mcp-Session-Id": sessionId },
    );
    expect(after.status).toBe(404);
  }, 10000);

  test("POST without a session and without initialize body is 400", async () => {
    const res = await rpc({ jsonrpc: "2.0", id: 99, method: "tools/list" });
    expect(res.status).toBe(400);
  }, 10000);
});

describe("Streamable HTTP transport — stateless mode", () => {
  let server;

  beforeAll(async () => {
    server = await spawnHttpServer({ args: ["--http-stateless"] });
  }, 15000);

  afterAll(async () => {
    if (server) await server.close();
  });

  async function rpc(body) {
    return fetch(server.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify(body),
    });
  }

  test("tools/list works without a prior initialize", async () => {
    const res = await rpc({ jsonrpc: "2.0", id: 1, method: "tools/list" });
    expect(res.status).toBe(200);
    expect(res.headers.get("mcp-session-id")).toBeNull();
    const parsed = await res.json();
    expect(parsed.result.tools.length).toBe(3);
  }, 10000);

  test("each request is independent", async () => {
    const a = await rpc({ jsonrpc: "2.0", id: 2, method: "tools/list" });
    const b = await rpc({ jsonrpc: "2.0", id: 3, method: "tools/list" });
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
  }, 15000);

  test("GET /mcp returns 405", async () => {
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
});

describe("Streamable HTTP transport — auth and CORS", () => {
  let server;

  beforeAll(async () => {
    server = await spawnHttpServer({
      args: [
        "--http-stateless",
        "--http-allow-origin",
        "https://allowed.example",
      ],
      env: { FASTLY_MCP_HTTP_AUTH_TOKEN: "s3cret" },
    });
  }, 15000);

  afterAll(async () => {
    if (server) await server.close();
  });

  test("missing bearer token is 401", async () => {
    const res = await fetch(server.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect(res.status).toBe(401);
  }, 10000);

  test("wrong bearer token is 401", async () => {
    const res = await fetch(server.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer wrong",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect(res.status).toBe(401);
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
    server = await spawnHttpServer({ args: ["--http-stateless"] });
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

describe("Streamable HTTP transport — secret encryption", () => {
  let server;
  const GITHUB_PAT = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij";

  beforeAll(async () => {
    server = await spawnHttpServer({
      args: ["--http-stateless"],
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
