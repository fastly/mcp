import { randomUUID, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { isIP } from "node:net";
import { networkInterfaces, hostname as osHostname } from "node:os";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

const MAX_BODY_BYTES = 4 * 1024 * 1024;
const SESSION_HEADER = "mcp-session-id";
const STATELESS_ALLOW = "POST, OPTIONS";
const MAX_SESSIONS = 1000;

export function isLoopbackHost(host) {
  if (!host) return false;
  const lower = String(host).toLowerCase();
  if (lower === "localhost") return true;
  const v = isIP(lower);
  if (v === 4) return lower.startsWith("127.");
  if (v === 6) return lower === "::1" || lower === "0:0:0:0:0:0:0:1";
  return false;
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
  const transport = resolveTransport(cliArgs, env);

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

  const stateless = !!cliArgs.httpStateless;
  if (cliArgs.httpJson && cliArgs.httpSse) {
    throw new Error(
      "--http-json and --http-sse are mutually exclusive. Pick one.",
    );
  }
  let jsonResponse;
  if (cliArgs.httpJson) {
    jsonResponse = true;
  } else if (cliArgs.httpSse) {
    jsonResponse = false;
  } else {
    jsonResponse = stateless;
  }

  const originList = [
    ...(cliArgs.httpAllowOrigins ?? []),
    ...parseCsv(env.FASTLY_MCP_HTTP_ALLOW_ORIGIN),
  ];
  const allowedOrigins = new Set(originList.map((o) => o.toLowerCase()));

  return {
    transport,
    host,
    port,
    path,
    authToken,
    stateless,
    jsonResponse,
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

export function writeJsonError(res, status, message, id = null) {
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

async function readBody(req) {
  const chunks = [];
  let total = 0;
  return new Promise((resolve, reject) => {
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function applyCors(res, originHeader, allowedOrigins) {
  if (!originHeader) return;
  const origin = String(originHeader).toLowerCase();
  if (!allowedOrigins.has(origin)) return;
  res.setHeader("Access-Control-Allow-Origin", originHeader);
  res.setHeader("Vary", "Origin");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, Mcp-Session-Id, Authorization, Last-Event-ID",
  );
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
}

export async function startHttp(createMcpServer, { cliArgs, env, version }) {
  const opts = resolveHttpOptions({ cliArgs, env });
  const {
    host,
    port,
    path,
    authToken,
    stateless,
    jsonResponse,
    allowedOrigins,
    allowHostsExtras,
    includeNetworkHosts,
  } = opts;

  const sessions = new Map();
  let allowedHosts = buildAllowedHosts({
    port,
    extra: allowHostsExtras,
    includeNetwork: includeNetworkHosts,
  });

  function closeSession(sessionId, { skipTransport = false } = {}) {
    const entry = sessions.get(sessionId);
    if (!entry) return Promise.resolve();
    sessions.delete(sessionId);
    const tasks = [Promise.resolve().then(() => entry.mcp.close())];
    if (!skipTransport) {
      tasks.push(Promise.resolve().then(() => entry.transport.close()));
    }
    return Promise.allSettled(tasks);
  }

  function safe(handler) {
    return async (req, res, ...rest) => {
      try {
        await handler(req, res, ...rest);
      } catch (err) {
        if (!res.headersSent && !res.writableEnded) {
          writeJsonError(res, 500, err.message ?? "Internal error");
        }
      }
    };
  }

  function requireSession(req, res) {
    const sessionId = req.headers[SESSION_HEADER];
    if (typeof sessionId !== "string" || !sessions.has(sessionId)) {
      writeJsonError(res, 404, "Unknown session");
      return null;
    }
    return { sessionId, entry: sessions.get(sessionId) };
  }

  async function handleStatefulPost(req, res, parsedBody) {
    const sessionId = req.headers[SESSION_HEADER];

    if (typeof sessionId === "string" && sessions.has(sessionId)) {
      const { transport } = sessions.get(sessionId);
      await transport.handleRequest(req, res, parsedBody);
      return;
    }

    if (sessionId) {
      writeJsonError(res, 404, "Unknown session");
      return;
    }

    if (!isInitializeRequest(parsedBody)) {
      writeJsonError(
        res,
        400,
        "Missing Mcp-Session-Id header. Send an initialize request first.",
      );
      return;
    }

    if (sessions.size >= MAX_SESSIONS) {
      writeJsonError(res, 503, "Too many sessions");
      return;
    }

    const mcp = createMcpServer();
    let transport;
    let registered = false;
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      enableJsonResponse: jsonResponse,
      onsessioninitialized: (id) => {
        registered = true;
        sessions.set(id, { mcp, transport });
      },
      onsessionclosed: (id) => {
        closeSession(id, { skipTransport: true });
      },
    });

    try {
      await mcp.connect(transport);
      await transport.handleRequest(req, res, parsedBody);
    } catch (err) {
      if (!registered) {
        Promise.allSettled([
          Promise.resolve().then(() => transport.close()),
          Promise.resolve().then(() => mcp.close()),
        ]);
      }
      throw err;
    }
  }

  async function handleStatefulGet(req, res) {
    const session = requireSession(req, res);
    if (!session) return;
    await session.entry.transport.handleRequest(req, res);
  }

  async function handleStatefulDelete(req, res) {
    const session = requireSession(req, res);
    if (!session) return;
    await closeSession(session.sessionId);
    if (!res.headersSent && !res.writableEnded) {
      res.writeHead(204);
      res.end();
    }
  }

  async function handleStatelessPost(req, res, parsedBody) {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: jsonResponse,
    });
    const mcp = createMcpServer();

    let closed = false;
    const cleanup = () => {
      if (closed) return;
      closed = true;
      Promise.allSettled([
        Promise.resolve().then(() => transport.close()),
        Promise.resolve().then(() => mcp.close()),
      ]);
    };
    res.on("close", cleanup);
    res.on("finish", cleanup);

    try {
      await mcp.connect(transport);
      await transport.handleRequest(req, res, parsedBody);
    } catch (err) {
      cleanup();
      if (!res.headersSent && !res.writableEnded) {
        writeJsonError(res, 500, err.message ?? "Internal error");
      }
    }
  }

  function methodNotAllowed(res, allow) {
    res.writeHead(405, { Allow: allow });
    res.end();
  }

  const handle = safe(async (req, res) => {
    const method = req.method ?? "GET";
    const reqPath = new URL(req.url ?? "/", "http://h").pathname;

    const originHeader = req.headers.origin;
    if (originHeader) {
      const origin = String(originHeader).toLowerCase();
      if (!allowedOrigins.has(origin)) {
        writeJsonError(res, 403, "Origin not allowed");
        return;
      }
      applyCors(res, originHeader, allowedOrigins);
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

    const hostHeader = req.headers.host;
    if (hostHeader) {
      const hostKey = String(hostHeader).toLowerCase();
      if (!allowedHosts.has(hostKey)) {
        writeJsonError(res, 421, "Host not allowed");
        return;
      }
    } else {
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

    if (method === "POST") {
      let bodyBuf;
      try {
        bodyBuf = await readBody(req);
      } catch (err) {
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
      if (stateless) {
        await handleStatelessPost(req, res, parsedBody);
      } else {
        await handleStatefulPost(req, res, parsedBody);
      }
      return;
    }

    if (method === "GET") {
      if (stateless) return methodNotAllowed(res, STATELESS_ALLOW);
      await handleStatefulGet(req, res);
      return;
    }

    if (method === "DELETE") {
      if (stateless) return methodNotAllowed(res, STATELESS_ALLOW);
      await handleStatefulDelete(req, res);
      return;
    }

    methodNotAllowed(res, "GET, POST, DELETE, OPTIONS");
  });

  const server = createServer(handle);

  let shuttingDown = false;
  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    process.stderr.write(`[fastly-mcp] Shutting down (${signal})\n`);
    server.close();
    const closes = [];
    for (const id of sessions.keys()) {
      closes.push(closeSession(id));
    }
    await Promise.allSettled(closes);
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
      `stateless=${stateless} json=${jsonResponse}\n`,
  );
  if (displayHost !== host) {
    process.stderr.write(
      `[fastly-mcp] (bound to ${host}; the URL above uses ${displayHost} because wildcard binds are not valid Host headers)\n`,
    );
  }

  return { server, options: opts };
}
