// How every HTTP deployment answers, shared by the Node listener and the Fastly Compute build so the two cannot drift apart.

export const MCP_PATH = "/mcp";

export const MAX_BODY_BYTES = 4 * 1024 * 1024;

export const TOO_LARGE = "Request body too large";

export const NO_STORE = "no-store, no-transform";

export function parseCsv(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/** Response headers for a request from an allowed browser origin. */
export function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
    "Access-Control-Allow-Headers":
      "Content-Type, Accept, Authorization, Fastly-Key, Last-Event-ID, Mcp-Method, Mcp-Name, Mcp-Protocol-Version",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  };
}

/** Headers that go with a refused Fastly-Key, from its `RemoteAuthError`. */
export function authErrorHeaders(error) {
  const headers = {};
  if (error.status === 401) headers["WWW-Authenticate"] = "FastlyKey";
  if (error.retryAfter) headers["Retry-After"] = String(error.retryAfter);
  return headers;
}

/** The JSON-RPC body of an error answered before MCP sees the request. */
export function jsonRpcError(status, message) {
  return { jsonrpc: "2.0", error: { code: status, message }, id: null };
}

/** The MCP method and tool a request body names, for the audit log. */
export function describeMcpBody(body) {
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
