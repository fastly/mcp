import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { connect } from "node:net";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import {
  CLIENT_CAPABILITIES_META_KEY,
  CLIENT_INFO_META_KEY,
  PROTOCOL_VERSION_META_KEY,
} from "@modelcontextprotocol/client";

import { requireDisconnectDetection } from "../src/host-checks.js";
import { execute } from "../src/tools/execute.js";
import { startLocalServer } from "./helpers.js";

export { sleep };

/** Polls `condition`, which may be async, until it returns something truthy. */
export async function until(condition, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await condition();
    if (value) return value;
    await sleep(50);
  }
  throw new Error("condition not met in time");
}

export function childrenOf(pid) {
  try {
    return execFileSync("pgrep", ["-P", String(pid)], { encoding: "utf8" })
      .split("\n")
      .filter(Boolean)
      .map(Number);
  } catch {
    return [];
  }
}

const REMOTE_SERVER = join(import.meta.dir, "fixtures/remote-server.mjs");

/**
 * Whether this Bun notices when a client hangs up.
 * Bun 1.3.11 does not, so a server on it cannot cancel an execution whose
 * caller has left.
 */
export const BUN_DETECTS_DISCONNECTS = await requireDisconnectDetection({
  timeoutMs: 1000,
}).then(
  () => true,
  () => false,
);
const MODERN_VERSION = "2026-07-28";

export const TOKEN_A = "synthetic-token-A";
export const TOKEN_A2 = "synthetic-token-A2";
export const TOKEN_B = "synthetic-token-B";

/** A secret the mock Fastly API plants in every service it returns. */
export const UPSTREAM_SECRET = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij";

/**
 * Stand-in for api.fastly.com, as seen by execution children.
 * A path containing "hang" never gets an answer, "reject" gets a 401 and
 * "deny" gets a 403.
 * The one service it knows carries a secret and echoes the requested path,
 * so a test can see exactly what the child sent.
 */
export async function startMockFastly() {
  const calls = [];
  const server = await startLocalServer((req, res) => {
    calls.push({ path: req.url, key: req.headers["fastly-key"] });
    if (req.url.includes("hang")) return;
    for (const [marker, status] of [
      ["reject", 401],
      ["deny", 403],
    ]) {
      if (!req.url.includes(marker)) continue;
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify({ msg: `synthetic ${status}` }));
      return;
    }
    res.writeHead(200, { "content-type": "application/json" });
    if (req.url.includes("/service/")) {
      res.end(
        JSON.stringify({
          id: "service-1",
          comment: `token: ${UPSTREAM_SECRET}`,
          requested: decodeURIComponent(req.url),
        }),
      );
      return;
    }
    res.end(JSON.stringify([{ id: "service-1", name: "synthetic" }]));
  });
  return { calls, url: server.url, close: server.close };
}

/**
 * Starts a server process and resolves once it listens.
 * Audit records arrive on stdout and the operational log on stderr.
 */
export async function spawnRemoteServer({
  entry = REMOTE_SERVER,
  runtime = "bun",
  local = false,
  args = [],
  env = {},
  mockFastlyUrl = "http://127.0.0.1:9",
} = {}) {
  const command = runtime === "bun" ? "bun" : Bun.which("node");
  const launch =
    runtime === "bun" ? ["run", entry] : ["--disable-sigusr1", entry];
  const child = spawn(
    command,
    [
      ...launch,
      ...(local ? ["--transport", "http"] : ["--remote-http"]),
      "--http-port",
      "0",
      ...args,
    ],
    {
      env: {
        ...process.env,
        FASTLY_MCP_TEST_API: mockFastlyUrl,
        ...env,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let stderr = "";
  let stdout = "";
  const records = [];
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
    for (const line of stdout.split("\n").slice(records.length, -1)) {
      records.push(JSON.parse(line));
    }
  });
  // A record lands on stdout a little after the HTTP response it belongs to,
  // so a test that wants the record for a call it just made has to wait.
  const auditRecord = (match, timeoutMs = 10_000) =>
    until(() => records.find(match), timeoutMs);

  const url = await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`startup timeout. stderr=${stderr}`)),
      15000,
    );
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`server exited early (code=${code}). stderr=${stderr}`));
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      const match = /listening on (http:\/\/[^\s]+)/.exec(stderr);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
  });

  return {
    url,
    child,
    getStderr: () => stderr,
    auditRecords: () => records,
    auditRecord,
    rawAudit: () => stdout,
    upstreamValidations: () => (stderr.match(/\[fake-fastly\]/g) ?? []).length,
    async close(signal = "SIGINT") {
      if (child.exitCode !== null || child.signalCode !== null) return;
      child.kill(signal);
      await once(child, "exit").catch(() => {});
    },
  };
}

export function rpc(url, body, headers = {}, init = {}) {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...headers,
    },
    body: JSON.stringify(body),
    ...init,
  });
}

export function modernRpc(url, token, body, init) {
  const { params = {}, ...rest } = body;
  const headers = {
    "Mcp-Method": body.method,
    "Mcp-Protocol-Version": MODERN_VERSION,
  };
  if (params.name) headers["Mcp-Name"] = params.name;
  if (token !== undefined) headers["Fastly-Key"] = token;
  return rpc(
    url,
    {
      jsonrpc: "2.0",
      id: 1,
      ...rest,
      params: {
        ...params,
        _meta: {
          [PROTOCOL_VERSION_META_KEY]: MODERN_VERSION,
          [CLIENT_INFO_META_KEY]: { name: "remote-test", version: "1.0.0" },
          [CLIENT_CAPABILITIES_META_KEY]: {},
        },
      },
    },
    headers,
    init,
  );
}

export async function readResult(res) {
  const text = await res.text();
  if (!res.headers.get("content-type")?.includes("text/event-stream")) {
    return JSON.parse(text);
  }
  const line = text.split("\n").find((l) => l.startsWith("data:"));
  return JSON.parse(line.slice(5).trim());
}

export async function callTool(url, token, name, args, init) {
  const res = await modernRpc(
    url,
    token,
    { method: "tools/call", params: { name, arguments: args } },
    init,
  );
  const envelope = await readResult(res);
  const text = envelope.result?.content?.[0]?.text;
  return {
    status: res.status,
    envelope,
    isError: envelope.result?.isError,
    text,
    parsed: text === undefined ? undefined : JSON.parse(text),
  };
}

/**
 * Sends a request exactly as written and resolves with its status code.
 * fetch() would merge repeated headers, which some tests need to send as is.
 * `withhold` declares more body than is sent, so the server waits for the rest.
 * `hangUpAfterMs` then closes the socket instead of waiting for an answer, and the promise resolves with nothing.
 * `target` and `hostHeader` replace the request line's target and the Host header, for requests no URL can express.
 */
export function rawRequest(
  url,
  headerLines,
  body = "{}",
  { withhold = 0, hangUpAfterMs, target, hostHeader } = {},
) {
  const { hostname, port, pathname } = new URL(url);
  return new Promise((resolve, reject) => {
    const socket = connect(Number(port), hostname, () => {
      socket.write(
        [
          `POST ${target ?? pathname} HTTP/1.1`,
          `Host: ${hostHeader ?? `${hostname}:${port}`}`,
          "Content-Type: application/json",
          `Content-Length: ${Buffer.byteLength(body) + withhold}`,
          "Connection: close",
          ...headerLines,
          "",
          body,
        ].join("\r\n"),
      );
      if (hangUpAfterMs) {
        setTimeout(() => {
          socket.destroy();
          resolve();
        }, hangUpAfterMs);
      }
    });
    let data = "";
    socket.on("data", (chunk) => {
      data += chunk;
    });
    socket.on("close", () => resolve(Number(data.split(" ")[1])));
    socket.on("error", reject);
  });
}

/** Run remote executions under one profile, with per-call overrides. */
export const executeWith =
  (profile) =>
  (code, extra = {}) =>
    execute(code, {
      apiToken: "synthetic-token",
      remote: true,
      profile: { ...profile, ...extra },
    });
