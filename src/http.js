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

export function reachableDisplayHost(host) {
  if (!host) return "127.0.0.1";
  const lower = String(host).toLowerCase();
  if (lower === "0.0.0.0") return "127.0.0.1";
  if (lower === "::" || lower === "0:0:0:0:0:0:0:0") return "[::1]";
  if (isIP(lower) === 6 && !lower.startsWith("[")) return `[${lower}]`;
  return host;
}

export function formatHostKey(addr, port) {
  if (!addr) return "";
  const lower = String(addr).toLowerCase();
  if (lower.includes(":") && !lower.startsWith("[")) {
    return `[${lower}]:${port}`;
  }
  return `${lower}:${port}`;
}

export function buildAllowedHosts({
  port,
  extra = [],
  includeNetwork = false,
}) {
  const hosts = new Set();
  hosts.add(formatHostKey("127.0.0.1", port));
  hosts.add(formatHostKey("::1", port));
  hosts.add(formatHostKey("localhost", port));

  if (includeNetwork) {
    const ifaces = networkInterfaces();
    for (const list of Object.values(ifaces)) {
      if (!list) continue;
      for (const iface of list) {
        if (iface.internal) continue;
        hosts.add(formatHostKey(iface.address, port));
      }
    }
    const name = osHostname();
    if (name) hosts.add(formatHostKey(name, port));
  }

  for (const entry of extra) {
    if (!entry) continue;
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();

    if (lower.startsWith("[")) {
      const close = lower.indexOf("]");
      if (close === -1) continue;
      if (close === lower.length - 1) {
        hosts.add(`${lower}:${port}`);
      } else {
        hosts.add(lower);
      }
      continue;
    }

    if (isIP(lower) === 6) {
      hosts.add(`[${lower}]:${port}`);
      continue;
    }

    if (lower.includes(":")) {
      hosts.add(lower);
    } else {
      hosts.add(`${lower}:${port}`);
    }
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

function writeJsonError(res, status, message, id = null) {
  writeJson(res, status, {
    jsonrpc: "2.0",
    error: { code: status, message },
    id,
  });
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

async function readBody(req) {
  const declared = Number(req.headers["content-length"]);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    throw new Error(TOO_LARGE);
  }

  const chunks = [];
  let total = 0;
  return new Promise((resolve, reject) => {
    const onData = (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        // Stop consuming rather than draining in the background, or a chunked
        // client can keep trickling bytes at us long after we answered 413.
        req.off("data", onData);
        req.pause();
        reject(new Error(TOO_LARGE));
        return;
      }
      chunks.push(chunk);
    };
    req.on("data", onData);
    req.on("end", () =>
      resolve(chunks.length === 1 ? chunks[0] : Buffer.concat(chunks, total)),
    );
    req.on("error", reject);
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

export async function startHttp(createMcpServer, { cliArgs, env, version }) {
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
  const handleMcp = toNodeHandler(mcpHandler, { onerror: logError });

  let allowedHosts = buildAllowedHosts({
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

  const handle = safe(async (req, res) => {
    const method = req.method ?? "GET";
    const reqPath = new URL(req.url ?? "/", "http://h").pathname;

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
      writeJsonError(res, 401, "Unauthorized");
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

    let bodyBuf;
    try {
      bodyBuf = await readBody(req);
    } catch (err) {
      // Nothing will ever read what the client still has queued.
      res.once("finish", () => req.destroy());
      writeJsonError(res, 413, err.message ?? "Body read failed");
      return;
    }
    let parsedBody;
    if (bodyBuf.length > 0) {
      try {
        parsedBody = JSON.parse(bodyBuf.toString("utf8"));
      } catch {
        writeJsonError(res, 400, "Invalid JSON body");
        return;
      }
    }
    await handleMcp(req, res, parsedBody);
  });

  const server = createServer(handle);

  let shuttingDown = false;
  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    process.stderr.write(`[fastly-mcp] Shutting down (${signal})\n`);
    server.close();
    await mcpHandler.close().catch(() => {});
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
