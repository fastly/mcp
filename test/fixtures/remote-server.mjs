// Starts the real server for tests.
//
// Only two things are fake: the host checks, because tests also run on
// machines without Yama or prlimit, and api.fastly.com, because tests only
// ever use made-up credentials.
// Both come in through the overrides of runCli(), which no flag, environment
// variable or request can reach.
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveExecutionRuntime } from "../../src/execution-runtime.js";
import { runCli } from "../../src/main.js";

const FIXTURES = dirname(fileURLToPath(import.meta.url));

const IDENTITIES = {
  "synthetic-token-A": { id: "tokenA", customer_id: "customerA" },
  "synthetic-token-A2": { id: "tokenA2", customer_id: "customerA" },
  "synthetic-token-B": { id: "tokenB", customer_id: "customerB" },
  "synthetic-token-fallback": { id: "tokenF" },
  "synthetic-token-restricted": { id: "tokenR" },
  "synthetic-token-expired": {
    id: "tokenE",
    customer_id: "customerE",
    expires_at: "2020-01-01T00:00:00Z",
  },
};

let upstreamCalls = 0;

async function fakeFastly(url, options) {
  upstreamCalls++;
  const token = options.headers["Fastly-Key"];
  process.stderr.write(`[fake-fastly] call=${upstreamCalls} url=${url}\n`);
  if (token === "synthetic-token-outage") throw new Error("connect ETIMEDOUT");
  if (token === "synthetic-token-limited") {
    return Response.json(
      { msg: "slow down" },
      { status: 429, headers: { "retry-after": "7" } },
    );
  }
  const identity = IDENTITIES[token];
  if (!identity) {
    return Response.json(
      { msg: "Provided credentials are missing or invalid" },
      { status: 401 },
    );
  }
  if (url.endsWith("/tokens/self")) return Response.json(identity);
  if (token === "synthetic-token-fallback") {
    return Response.json({ id: "customerF" });
  }
  return Response.json(
    { msg: "You are not authorized to perform this action" },
    { status: 403 },
  );
}

const numberFromEnv = (name) => Number(process.env[name]) || undefined;

function resolveExecutionProfile({ heapMb }, hardening) {
  const runtime = resolveExecutionRuntime({ requireNode: true });
  const timeoutMs = numberFromEnv("FASTLY_MCP_TEST_TIMEOUT_MS");
  return Object.freeze({
    ...runtime,
    heapMb,
    prlimit: hardening?.prlimit,
    timeoutMs,
    args: [...runtime.args, `--allow-fs-read=${FIXTURES}`],
    env: {
      ...runtime.env,
      FASTLY_MCP_TEST_API: process.env.FASTLY_MCP_TEST_API,
    },
    entry: join(FIXTURES, "sandbox-with-mock-fastly.mjs"),
  });
}

await runCli({
  overrides: {
    fetch: fakeFastly,
    resolveExecutionProfile,
    requestBodyTimeoutMs: numberFromEnv("FASTLY_MCP_TEST_BODY_TIMEOUT_MS"),
    maxInFlightRequests: numberFromEnv("FASTLY_MCP_TEST_MAX_IN_FLIGHT"),
  },
});
