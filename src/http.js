import { randomUUID, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { isIP } from "node:net";
import { networkInterfaces, hostname as osHostname } from "node:os";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { methodLabel, toolLabel } from "./audit.js";
import { rateLimitKey, resolveClientAddress } from "./client-address.js";
import { RemoteAuthError, readFastlyKey } from "./remote-auth.js";
import { requestContext } from "./request-context.js";

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

const REMOTE_ONLY_FLAGS = [
  ["httpTrustedProxies", "--http-trusted-proxy"],
  ["auditLog", "--audit-log"],
  ["remoteMaxExecutions", "--remote-max-executions"],
  ["remoteExecutionMemory", "--remote-execution-memory"],
];

/**
 * Transport and credential policy are separate choices.
 * `--transport http` still serves with the process's own token; only
 * `--remote-http` switches to a Fastly-Key per request.
 */
export function resolveMode(cliArgs, env = {}) {
  const explicit = (
    cliArgs.transport ?? env.FASTLY_MCP_TRANSPORT
  )?.toLowerCase();

  if (!cliArgs.remoteHttp) {
    for (const [name, flag] of REMOTE_ONLY_FLAGS) {
      const value = cliArgs[name];
      if (Array.isArray(value) ? value.length > 0 : value !== undefined) {
        throw new Error(`${flag} only applies to --remote-http.`);
      }
    }
    return { transport: explicit ?? "stdio", remote: false };
  }

  if (explicit !== undefined && explicit !== "http") {
    throw new Error(
      `--remote-http serves HTTP only, but the transport is set to "${explicit}". ` +
        "Remove --transport and FASTLY_MCP_TRANSPORT, or set them to http.",
    );
  }
  if (
    cliArgs.encryptKey !== undefined ||
    env.FASTLY_MCP_ENCRYPT_KEY !== undefined ||
    env.FASTLY_MCP_ENCRYPT_TWEAK !== undefined
  ) {
    throw new Error(
      "--remote-http derives its encryption key from each caller's Fastly-Key. " +
        "Remove --encrypt-key, FASTLY_MCP_ENCRYPT_KEY and FASTLY_MCP_ENCRYPT_TWEAK.",
    );
  }
  return { transport: "http", remote: true };
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
  // Requests are matched on their raw path, so one that a URL parser would rewrite could never be reached.
  let canonical = false;
  try {
    parseOriginForm(path);
    canonical = new URL(path, "http://fastly-mcp.invalid").pathname === path;
  } catch {}
  if (!canonical) {
    throw new Error(`--http-path must be a canonical path, got "${path}"`);
  }

  const authToken =
    cliArgs.httpAuthToken ?? env.FASTLY_MCP_HTTP_AUTH_TOKEN ?? undefined;

  // Remote mode already authenticates every request with the caller's own
  // Fastly token, so it can listen on the network without one.
  const loopbackBind = isLoopbackHost(host);
  if (!loopbackBind && !authToken && !cliArgs.remoteHttp) {
    throw new Error(
      "Binding to a non-loopback address requires an auth token. " +
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
    "Content-Type, Accept, Authorization, Fastly-Key, Last-Event-ID, Mcp-Method, Mcp-Name, Mcp-Protocol-Version",
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
}

const NO_STORE = "no-store, no-transform";
const MAX_IN_FLIGHT_REQUESTS = 512;
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

function describeMcpBody(body) {
  if (Array.isArray(body)) return { method: "batch" };
  if (body === null || typeof body !== "object") return {};
  const method = typeof body.method === "string" ? body.method : undefined;
  const name = body.params?.name;
  return {
    method,
    tool:
      method === "tools/call" && typeof name === "string" ? name : undefined,
  };
}

function admitLocalRequest(req, res, { authToken, reqPath, path }) {
  if (!checkAuth(req, authToken)) {
    writeJsonError(res, 401, "Unauthorized", { "WWW-Authenticate": "Bearer" });
    return undefined;
  }
  if (reqPath !== path) {
    writeJsonError(res, 404, "Not found");
    return undefined;
  }
  return { trace: {} };
}

// What every remote request goes through, even one with a malformed target: a request ID, its source address and the source's request budget.
// Returns undefined once it has answered.
function beginRemoteRequest(req, res, remote) {
  const { budgets, trustedProxies, audit } = remote;
  const started = performance.now();
  const requestId = randomUUID();
  res.setHeader("X-Request-Id", requestId);

  let sourceIp;
  const refuse = (status, category, message, headers = {}) => {
    audit.emit("request_rejected", { requestId, sourceIp, status, category });
    writeJsonError(res, status, message, { Connection: "close", ...headers });
  };

  let client;
  try {
    client = resolveClientAddress(req, trustedProxies);
  } catch {
    refuse(400, "forwarded_chain_malformed", "Malformed X-Forwarded-For");
    return undefined;
  }
  sourceIp = client.address;
  const source = rateLimitKey(client);

  const requestBudget = budgets.admitRequest(source);
  if (!requestBudget.ok) {
    refuse(
      429,
      "request_budget_exhausted",
      "Too many requests. Try again later.",
      {
        "Retry-After": String(requestBudget.retryAfter),
      },
    );
    return undefined;
  }

  return { requestId, sourceIp, source, started, refuse };
}

/**
 * Every check a `--remote-http` request passes before it reaches MCP, with the cheapest ones first so unauthenticated traffic costs the least.
 * Resolves with the request context, or undefined once it has answered.
 */
async function admitRemoteRequest(
  req,
  res,
  { remote, authToken, reqPath, path },
) {
  const { validator, budgets, audit } = remote;
  const admission = beginRemoteRequest(req, res, remote);
  if (!admission) return undefined;
  const { requestId, sourceIp, source, started, refuse } = admission;

  if (!checkAuth(req, authToken)) {
    refuse(401, "deployment_token_rejected", "Unauthorized", {
      "WWW-Authenticate": "Bearer",
    });
    return undefined;
  }

  if (reqPath !== path) {
    refuse(404, "not_found", "Not found");
    return undefined;
  }

  const signal = disconnectSignal(res);
  let context;
  try {
    const apiToken = readFastlyKey(req.rawHeaders);
    const { identity, cache } = await validator.validate(apiToken, {
      signal,
      admitMiss: () => {
        const budget = budgets.admitValidation(source);
        if (!budget.ok) {
          throw new RemoteAuthError(
            429,
            "validation_budget_exhausted",
            "Too many token validations from this address. Try again later.",
            { retryAfter: budget.retryAfter },
          );
        }
      },
    });
    context = Object.freeze({
      apiToken,
      identity,
      requestId,
      sourceIp,
      signal,
      validationCache: cache,
      trace: {},
    });
  } catch (error) {
    if (signal.aborted) return undefined;
    if (!(error instanceof RemoteAuthError)) throw error;
    if (error.category === "key_rejected" || error.category === "key_expired") {
      budgets.recordFailure(source);
    }
    const headers = {};
    if (error.status === 401) headers["WWW-Authenticate"] = "FastlyKey";
    if (error.retryAfter) headers["Retry-After"] = String(error.retryAfter);
    refuse(error.status, error.category, error.message, headers);
    return undefined;
  }

  // Older Bun releases never emit `close`, so `finish` records the normal
  // case and `close` only adds the callers who hung up first.
  let recorded = false;
  const record = (outcome) => {
    if (recorded) return;
    recorded = true;
    audit.emit("mcp_request", {
      requestId,
      sourceIp,
      tokenId: context.identity.tokenId,
      customerId: context.identity.customerId ?? undefined,
      era: context.trace.era,
      method: methodLabel(context.trace.method),
      tool: toolLabel(context.trace.tool),
      validationCache: context.validationCache,
      status: res.statusCode,
      outcome,
      durationMs: Math.round(performance.now() - started),
    });
  };
  res.on("finish", () => record("completed"));
  res.on("close", () => record("disconnected"));
  return context;
}

function rejectMalformedTarget(req, res, remote) {
  if (!remote) {
    writeJsonError(res, 400, "Malformed request target", {
      Connection: "close",
    });
    return;
  }
  const admission = beginRemoteRequest(req, res, remote);
  admission?.refuse(
    400,
    "request_target_malformed",
    "Malformed request target",
  );
}

const TARGET_PATH_CHAR = /^[A-Za-z0-9\-._~!$&'()*+,;=:@/]$/;
const TARGET_QUERY_CHAR = /^[A-Za-z0-9\-._~!$&'()*+,;=:@/?]$/;

function validTargetPart(value, allowed) {
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "%") {
      if (!/^[0-9A-Fa-f]{2}$/.test(value.slice(i + 1, i + 3))) return false;
      i += 2;
    } else if (!allowed.test(value[i])) {
      return false;
    }
  }
  return true;
}

function parseOriginForm(target) {
  if (
    !target.startsWith("/") ||
    target.includes("#") ||
    target.includes("\\")
  ) {
    throw new Error("Malformed request target");
  }
  const queryAt = target.indexOf("?");
  const path = queryAt === -1 ? target : target.slice(0, queryAt);
  const query = queryAt === -1 ? "" : target.slice(queryAt + 1);
  if (
    !validTargetPart(path, TARGET_PATH_CHAR) ||
    !validTargetPart(query, TARGET_QUERY_CHAR)
  ) {
    throw new Error("Malformed request target");
  }
  return { path, originForm: target };
}

// An absolute-form target names its own authority, which takes the place of the Host header (RFC 9112, section 3.2.2).
// It is compared as written, like a Host header, so no URL parser gets to normalize it first.
function parseRequestTarget(target, method) {
  if (target === "*" && method === "OPTIONS") {
    return { path: "*", originForm: "*" };
  }
  if (target.startsWith("/")) return parseOriginForm(target);
  const scheme = /^https?:\/\//i.exec(target);
  if (!scheme || target.includes("\\")) {
    throw new Error("Malformed request target");
  }

  const rest = target.slice(scheme[0].length);
  const authorityEnd = rest.search(/[/?#]/);
  const authority = authorityEnd === -1 ? rest : rest.slice(0, authorityEnd);
  if (!authority || authority.includes("@")) {
    throw new Error("Malformed request target");
  }
  let originForm = authorityEnd === -1 ? "/" : rest.slice(authorityEnd);
  if (originForm.startsWith("?")) originForm = `/${originForm}`;
  return { ...parseOriginForm(originForm), authority: authority.toLowerCase() };
}

export async function startHttp(
  createMcpServer,
  { cliArgs, env, version, remote, onShutdown },
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

  // Exception messages can quote request bodies, so a remote server records
  // only what kind of error it was.
  const logError = remote
    ? (err) =>
        remote.audit.emit("internal_error", {
          requestId: requestContext.getStore()?.requestId,
          name: err?.name,
          code: err?.code,
        })
    : (err) => {
        process.stderr.write(`[fastly-mcp] ${err?.message ?? err}\n`);
      };

  // The local factory ignores the context; the remote one builds its tools
  // from it.
  const mcpHandler = createMcpHandler(
    ({ era }) => {
      const context = requestContext.getStore();
      if (!context) throw new Error("Request context is missing");
      context.trace.era = era;
      return createMcpServer(context);
    },
    { legacy: "stateless", responseMode, onerror: logError },
  );
  const handleMcp = toNodeHandler(withNoStore(mcpHandler), {
    onerror: logError,
  });

  let allowedHosts = buildAllowedHosts({
    host,
    port,
    extra: allowHostsExtras,
    includeNetwork: includeNetworkHosts,
  });

  const admit = remote
    ? (req, res, reqPath) =>
        admitRemoteRequest(req, res, { remote, authToken, reqPath, path })
    : (req, res, reqPath) =>
        admitLocalRequest(req, res, { authToken, reqPath, path });
  const requestBodyTimeoutMs =
    remote?.requestBodyTimeoutMs ?? REQUEST_BODY_TIMEOUT_MS;
  const maxInFlight = remote?.maxInFlightRequests ?? MAX_IN_FLIGHT_REQUESTS;
  let inFlight = 0;

  function safe(handler) {
    return async (req, res, ...rest) => {
      try {
        await handler(req, res, ...rest);
      } catch (err) {
        logError(err);
        if (!res.headersSent && !res.writableEnded) {
          writeJsonError(
            res,
            500,
            remote ? "Internal error" : (err.message ?? "Internal error"),
          );
        }
      }
    };
  }

  async function readJsonBody(req, res) {
    let bodyBuf;
    try {
      bodyBuf = await readBody(req, { timeoutMs: requestBodyTimeoutMs });
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
    res.setHeader("Cache-Control", NO_STORE);
    let target;
    try {
      target = parseRequestTarget(req.url ?? "/", method);
    } catch {
      rejectMalformedTarget(req, res, remote);
      return;
    }
    const reqPath = target.path;

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

    const authority =
      target.authority ?? String(req.headers.host).toLowerCase();
    if (!allowedHosts.has(authority)) {
      writeJsonError(res, 421, "Host not allowed");
      return;
    }
    req.url = target.originForm;
    if (target.authority) req.headers.host = target.authority;

    // Rate limits cap how fast requests arrive, not how many are open at once.
    if (remote && inFlight >= maxInFlight) {
      remote.audit.emit("request_rejected", {
        status: 503,
        category: "server_busy",
      });
      writeJsonError(res, 503, "The server is busy. Try again shortly.", {
        "Retry-After": "1",
        Connection: "close",
      });
      return;
    }
    // The adapter only returns once the response is written, so the finally
    // below runs on every way out, even when a client hung up unnoticed.
    inFlight++;
    try {
      const context = await admit(req, res, reqPath);
      if (!context) return;

      let body;
      if (method === "POST") {
        const read = await readJsonBody(req, res);
        if (read.failed) return;
        body = read.body;
        Object.assign(context.trace, describeMcpBody(body));
      }
      await requestContext.run(context, () => handleMcp(req, res, body));
    } finally {
      inFlight--;
    }
  });

  const server = createServer(handle);
  // Bun ignores these Node timeouts, which is why readBody has its own
  // deadline too.
  server.headersTimeout = requestBodyTimeoutMs;
  server.requestTimeout = requestBodyTimeoutMs * 2;

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
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.on(signal, () => shutdown(signal));
  }

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
    `[fastly-mcp] Server started (${remote ? "remote http" : "http"}) version=${version} listening on http://${displayHost}:${boundPort}${path} ` +
      `response-mode=${responseMode}\n`,
  );
  if (displayHost !== host) {
    process.stderr.write(
      `[fastly-mcp] (bound to ${host}; the URL above uses ${displayHost} because wildcard binds are not valid Host headers)\n`,
    );
  }

  return { server, options: opts };
}
