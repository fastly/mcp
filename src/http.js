import { timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { isIP } from "node:net";
import { networkInterfaces, hostname as osHostname } from "node:os";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { createMcpHandler } from "@modelcontextprotocol/server";

const MAX_BODY_BYTES = 4 * 1024 * 1024;

export function isLoopbackHost(host) {
  if (!host) return false;
  const lower = String(host).toLowerCase();
  if (lower === "localhost") return true;
  const v = isIP(lower);
  if (v === 4) return lower.startsWith("127.");
  return v === 6 && (lower === "::1" || lower === "0:0:0:0:0:0:0:1");
}

function unbracketHost(host) {
  const lower = String(host).toLowerCase();
  if (lower.startsWith("[") && lower.endsWith("]")) {
    return lower.slice(1, -1);
  }
  return lower;
}

export function reachableDisplayHost(host) {
  if (!host) return "127.0.0.1";
  const lower = unbracketHost(host);
  // Every wildcard spelling maps to the loopback of its family, so the
  // advertised URL always carries a Host the allow list accepts.
  if (isWildcardHost(lower)) {
    return lower === "0.0.0.0" ? "127.0.0.1" : "[::1]";
  }
  if (isIP(lower) === 6) return `[${lower}]`;
  return host;
}

function bareHostKey(addr) {
  const lower = String(addr).toLowerCase();
  if (lower.includes(":") && !lower.startsWith("[")) {
    return `[${lower}]`;
  }
  return lower;
}

export function formatHostKey(addr, port) {
  if (!addr) return "";
  return `${bareHostKey(addr)}:${port}`;
}

function isWildcardHost(host) {
  const lower = unbracketHost(host);
  if (lower === "0.0.0.0") return true;
  // All-zero IPv6 spellings like ::, ::0 and 0:0:0:0:0:0:0:0 are the
  // same wildcard and get URL-normalized to :: by clients.
  return isIP(lower) === 6 && /^[0:]+$/.test(lower);
}

export function buildAllowedHosts({
  host,
  port,
  extra = [],
  includeNetwork = false,
}) {
  const hosts = new Set();

  // Clients omit the default port from the Host header, so a server on
  // port 80 must also accept the portless spellings.
  const add = (addr) => {
    hosts.add(formatHostKey(addr, port));
    if (port === 80) hosts.add(bareHostKey(addr));
  };

  add("127.0.0.1");
  add("::1");
  add("localhost");

  // Wildcard binds are not valid Host headers.
  if (host && !isWildcardHost(host)) {
    add(host);
  }

  if (includeNetwork) {
    const ifaces = networkInterfaces();
    for (const list of Object.values(ifaces)) {
      if (!list) continue;
      for (const iface of list) {
        if (iface.internal) continue;
        add(iface.address);
      }
    }
    const name = osHostname();
    if (name) add(name);
  }

  for (const entry of extra) {
    if (!entry) continue;
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();

    // Entries without an explicit port are also allowed bare: a reverse
    // proxy on a default port forwards a portless Host header.
    if (lower.startsWith("[")) {
      const close = lower.indexOf("]");
      if (close === -1) continue;
      hosts.add(lower);
      if (close === lower.length - 1) hosts.add(formatHostKey(lower, port));
      continue;
    }

    if (isIP(lower) === 6) {
      hosts.add(bareHostKey(lower));
      hosts.add(formatHostKey(lower, port));
      continue;
    }

    hosts.add(lower);
    if (!lower.includes(":")) hosts.add(`${lower}:${port}`);
  }

  return hosts;
}

function parseCsv(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function resolveTransport(cliArgs, env = {}) {
  return (
    cliArgs.transport ??
    env.FASTLY_MCP_TRANSPORT ??
    "stdio"
  ).toLowerCase();
}

export function resolveHttpOptions({ cliArgs, env = {}, defaults = {} }) {
  const allowNetwork = !!cliArgs.httpAllowNetwork;
  const host = cliArgs.httpHost ?? (allowNetwork ? "0.0.0.0" : "127.0.0.1");
  const portRaw = String(
    cliArgs.httpPort ?? env.FASTLY_MCP_HTTP_PORT ?? defaults.port ?? "8231",
  );
  if (!/^\d+$/.test(portRaw)) {
    throw new Error(`Invalid --http-port value "${portRaw}"`);
  }
  const port = Number(portRaw);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid --http-port value "${portRaw}"`);
  }

  const path = cliArgs.httpPath ?? "/mcp";
  if (!path.startsWith("/")) {
    throw new Error(`--http-path must start with "/", got "${path}"`);
  }

  const authToken =
    cliArgs.httpAuthToken ?? env.FASTLY_MCP_HTTP_AUTH_TOKEN ?? undefined;

  const loopbackBind = isLoopbackHost(host);
  if (!loopbackBind && !authToken) {
    throw new Error(
      "Binding to a non-loopback address requires an auth token. " +
        "Set FASTLY_MCP_HTTP_AUTH_TOKEN (preferred) or pass --http-auth-token.",
    );
  }
  if (allowNetwork && !authToken) {
    throw new Error(
      "--http-allow-network requires an auth token. " +
        "Set FASTLY_MCP_HTTP_AUTH_TOKEN (preferred) or pass --http-auth-token.",
    );
  }

  if (cliArgs.httpJson && cliArgs.httpSse) {
    throw new Error(
      "--http-json and --http-sse are mutually exclusive. Pick one.",
    );
  }
  let responseMode = "auto";
  if (cliArgs.httpJson) responseMode = "json";
  else if (cliArgs.httpSse) responseMode = "sse";

  const originList = [
    ...(cliArgs.httpAllowOrigins ?? []),
    ...parseCsv(env.FASTLY_MCP_HTTP_ALLOW_ORIGIN),
  ];
  const allowedOrigins = new Set(originList.map((o) => o.toLowerCase()));

  return {
    host,
    port,
    path,
    authToken,
    responseMode,
    allowedOrigins,
    allowHostsExtras: cliArgs.httpAllowHosts ?? [],
    includeNetworkHosts: allowNetwork || !loopbackBind,
  };
}

function writeJson(res, status, body, extraHeaders = {}) {
  if (res.headersSent || res.writableEnded) return;
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders,
  });
  res.end(JSON.stringify(body));
}

function writeJsonError(res, status, message, extraHeaders = {}) {
  writeJson(
    res,
    status,
    {
      jsonrpc: "2.0",
      error: { code: status, message },
      id: null,
    },
    extraHeaders,
  );
}

function constantTimeEquals(a, b) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function checkAuth(req, token) {
  if (!token) return true;
  const header = req.headers.authorization;
  if (!header || typeof header !== "string") return false;
  const m = /^Bearer\s+(.+)$/i.exec(header);
  if (!m) return false;
  return constantTimeEquals(m[1], token);
}

const TOO_LARGE = "Request body too large";

const TOO_SLOW = "Request body took too long to arrive";

async function readBody(req, { timeoutMs } = {}) {
  const declared = Number(req.headers["content-length"]);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    throw new Error(TOO_LARGE);
  }

  const chunks = [];
  let total = 0;
  return new Promise((resolve, reject) => {
    const stop = (error) => {
      clearTimeout(timer);
      // Stop consuming rather than draining in the background, or a chunked
      // client can keep trickling bytes at us long after we answered.
      req.off("data", onData);
      req.pause();
      reject(error);
    };
    const onData = (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        stop(new Error(TOO_LARGE));
        return;
      }
      chunks.push(chunk);
    };
    // An authenticated caller could otherwise hold a request open for as
    // long as it likes by sending its body one byte at a time.
    const timer = timeoutMs
      ? setTimeout(() => stop(new Error(TOO_SLOW)), timeoutMs)
      : undefined;
    req.on("data", onData);
    req.on("end", () => {
      clearTimeout(timer);
      resolve(chunks.length === 1 ? chunks[0] : Buffer.concat(chunks, total));
    });
    req.on("error", stop);
  });
}

function applyCors(res, originHeader) {
  res.setHeader("Access-Control-Allow-Origin", originHeader);
  res.setHeader("Vary", "Origin");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, Authorization, Last-Event-ID, Mcp-Method, Mcp-Name",
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
}

const NO_STORE = "no-store, no-transform";
const REQUEST_BODY_TIMEOUT_MS = 30_000;

// The SDK puts its own `no-cache` on event streams, and the adapter's
// `writeHead` overrides whatever was set on the Node response before, so
// `no-store` has to be forced on the handler's own responses.
function withNoStore(handler) {
  return {
    fetch: async (request, options) => {
      const response = await handler.fetch(request, options);
      const headers = new Headers(response.headers);
      headers.set("Cache-Control", NO_STORE);
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    },
  };
}

/** A signal that aborts if the client hangs up before the response is done. */
export function disconnectSignal(res) {
  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableFinished)
      controller.abort(new Error("Client disconnected"));
  });
  return controller.signal;
}

export async function startHttp(
  createMcpServer,
  { cliArgs, env, version, onShutdown },
) {
  const opts = resolveHttpOptions({ cliArgs, env });
  const {
    host,
    port,
    path,
    authToken,
    responseMode,
    allowedOrigins,
    allowHostsExtras,
    includeNetworkHosts,
  } = opts;

  const logError = (err) => {
    process.stderr.write(`[fastly-mcp] ${err?.message ?? err}\n`);
  };

  const mcpHandler = createMcpHandler(() => createMcpServer(), {
    legacy: "stateless",
    responseMode,
    onerror: logError,
  });
  const handleMcp = toNodeHandler(withNoStore(mcpHandler), {
    onerror: logError,
  });

  let allowedHosts = buildAllowedHosts({
    host,
    port,
    extra: allowHostsExtras,
    includeNetwork: includeNetworkHosts,
  });

  function safe(handler) {
    return async (req, res, ...rest) => {
      try {
        await handler(req, res, ...rest);
      } catch (err) {
        logError(err);
        if (!res.headersSent && !res.writableEnded) {
          writeJsonError(res, 500, err.message ?? "Internal error");
        }
      }
    };
  }

  async function readJsonBody(req, res) {
    let bodyBuf;
    try {
      bodyBuf = await readBody(req, { timeoutMs: REQUEST_BODY_TIMEOUT_MS });
    } catch (err) {
      // Nothing will ever read what the client still has queued.
      res.once("finish", () => req.destroy());
      const slow = err.message === TOO_SLOW;
      writeJsonError(res, slow ? 408 : 413, err.message ?? "Body read failed", {
        Connection: "close",
      });
      return { failed: true };
    }
    if (bodyBuf.length === 0) return {};
    try {
      return { body: JSON.parse(bodyBuf.toString("utf8")) };
    } catch {
      writeJsonError(res, 400, "Invalid JSON body");
      return { failed: true };
    }
  }

  const handle = safe(async (req, res) => {
    const method = req.method ?? "GET";
    const reqPath = new URL(req.url ?? "/", "http://h").pathname;
    res.setHeader("Cache-Control", NO_STORE);

    const originHeader = req.headers.origin;
    if (originHeader) {
      if (!allowedOrigins.has(String(originHeader).toLowerCase())) {
        writeJsonError(res, 403, "Origin not allowed");
        return;
      }
      applyCors(res, originHeader);
    }

    if (method === "OPTIONS") {
      if (!res.headersSent && !res.writableEnded) {
        res.writeHead(204);
        res.end();
      }
      return;
    }

    if (method === "GET" && reqPath === "/healthz") {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("ok");
      return;
    }

    if (!allowedHosts.has(String(req.headers.host).toLowerCase())) {
      writeJsonError(res, 421, "Host not allowed");
      return;
    }

    if (!checkAuth(req, authToken)) {
      writeJsonError(res, 401, "Unauthorized", {
        "WWW-Authenticate": "Bearer",
      });
      return;
    }

    if (reqPath !== path) {
      writeJsonError(res, 404, "Not found");
      return;
    }

    if (method !== "POST") {
      await handleMcp(req, res);
      return;
    }

    const read = await readJsonBody(req, res);
    if (read.failed) return;
    await handleMcp(req, res, read.body);
  });

  const server = createServer(handle);
  // Bun ignores these Node timeouts, which is why readBody has its own
  // deadline too.
  server.headersTimeout = REQUEST_BODY_TIMEOUT_MS;
  server.requestTimeout = REQUEST_BODY_TIMEOUT_MS * 2;

  let shuttingDown = false;
  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    process.stderr.write(`[fastly-mcp] Shutting down (${signal})\n`);
    server.close();
    await mcpHandler.close().catch(() => {});
    await onShutdown?.();
    process.exit(0);
  }
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const actual = server.address();
  const boundPort = actual && typeof actual === "object" ? actual.port : port;
  if (boundPort !== port) {
    allowedHosts = buildAllowedHosts({
      host,
      port: boundPort,
      extra: allowHostsExtras,
      includeNetwork: includeNetworkHosts,
    });
  }
  const displayHost = reachableDisplayHost(host);
  process.stderr.write(
    `[fastly-mcp] Server started (http) version=${version} listening on http://${displayHost}:${boundPort}${path} ` +
      `response-mode=${responseMode}\n`,
  );
  if (displayHost !== host) {
    process.stderr.write(
      `[fastly-mcp] (bound to ${host}; the URL above uses ${displayHost} because wildcard binds are not valid Host headers)\n`,
    );
  }

  return { server, options: opts };
}
