import { readFileSync } from "node:fs";
import { join } from "node:path";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { admissionLimits, createAdmission } from "./admission.js";
import { createAuditLog, fileSink, streamSink } from "./audit.js";
import { createPrevalidationBudgets } from "./budgets.js";
import { parseArgs } from "./cli.js";
import { parseTrustedProxies } from "./client-address.js";
import {
  getExecutionRuntime,
  resolveRemoteExecutionProfile,
} from "./execution-runtime.js";
import {
  preferAsOomVictim,
  requireDisconnectDetection,
  requireNoInspector,
  requireYama,
  resolvePrlimit,
} from "./host-checks.js";
import { resolveHttpOptions, resolveMode, startHttp } from "./http.js";
import { buildIndex } from "./indexer.js";
import { projectRemoteIndex } from "./method-policy.js";
import { createTokenValidator } from "./remote-auth.js";
import { resolveResultStore } from "./result-files.js";
import { SecretShield } from "./secrets.js";
import { createMcpServer } from "./server.js";
import { execute, killAllExecutions } from "./tools/execute.js";

const pkg = JSON.parse(
  readFileSync(
    join(import.meta.dirname ?? import.meta.dir, "../package.json"),
    "utf-8",
  ),
);

const EXECUTION_CPU_SECONDS = 30;
const DEFAULT_MAX_EXECUTIONS = 8;
const DEFAULT_EXECUTION_MEMORY_MB = 1024;

// What remote mode needs from the host and the network.
// Tests swap parts of it through `main({ overrides })`, which no flag,
// environment variable or request can reach.
const REMOTE_DEPENDENCIES = Object.freeze({
  fetch: globalThis.fetch,
  resolveExecutionProfile: resolveRemoteExecutionProfile,
  requestBodyTimeoutMs: undefined,
  maxInFlightRequests: undefined,
});

function parseEncryptKey(hex) {
  if (hex === undefined) return undefined;
  if (!/^[0-9a-fA-F]{32}$/.test(hex)) {
    throw new Error(
      `--encrypt-key / FASTLY_MCP_ENCRYPT_KEY must be exactly 32 hex characters (16 bytes), got ${hex.length} chars`,
    );
  }
  return Buffer.from(hex, "hex");
}

function positiveInteger(text, flag, fallback, { min = 1, max }) {
  if (text === undefined) return fallback;
  const value = Number(text);
  if (!/^\d+$/.test(text) || value < min || value > max) {
    throw new Error(`${flag} must be an integer between ${min} and ${max}.`);
  }
  return value;
}

function printHelp(version) {
  process.stdout.write(`fastly-mcp ${version}

MCP server that gives AI agents access to the Fastly API.

By default it speaks MCP over stdio so an MCP client can spawn it as a
subprocess. Pass --transport http to expose the same tools over the MCP
Streamable HTTP transport instead, which is useful for sharing one
long-lived server process between several clients or running behind a
reverse proxy.

Usage:
  fastly-mcp [options]

Options:
  --encrypt-secrets         Encrypt sensitive values in tool output before
                            they reach the model. Encrypted values are
                            transparently decrypted on the way back in.
  --encrypt-key <hex>       32 hex characters (16 bytes) used as the
                            encryption key. Defaults to a per-session key.
                            Also reads FASTLY_MCP_ENCRYPT_KEY.
  --result-dir <path>       Directory for results too large to return in
                            one response. Defaults to a fastly-mcp-results
                            directory under the system temporary directory.
                            Pass "off" to disable result files. Also reads
                            FASTLY_MCP_RESULT_DIR.
  -h, --help                Show this help and exit.
  -V, --version             Print the version and exit.

HTTP transport (only used when --transport http is set):
  --transport <stdio|http>  Pick the transport. Defaults to stdio. Also
                            reads FASTLY_MCP_TRANSPORT.
  --http-host <addr>        Bind address. Defaults to 127.0.0.1.
  --http-port <n>           Port to listen on. Defaults to 8231. Also
                            reads FASTLY_MCP_HTTP_PORT.
  --http-path <path>        Endpoint mount. Defaults to /mcp.
  --http-allow-origin <o>   Add an entry to the allowed Origin list. May
                            be repeated. Also reads
                            FASTLY_MCP_HTTP_ALLOW_ORIGIN (comma-separated).
  --http-allow-host <h>     Add an entry to the allowed Host list. May be
                            repeated.
  --http-auth-token <t>     Require Authorization: Bearer <t> on every
                            request. Prefer the env var below: the CLI
                            form leaks into shell history and ps output.
                            Also reads FASTLY_MCP_HTTP_AUTH_TOKEN.
  --http-json               Never stream: answer with a single JSON body.
                            Mid-call progress notifications are dropped.
  --http-sse                Always stream responses as text/event-stream.
                            Combining --http-json and --http-sse is a
                            startup error. Without either flag the server
                            sends JSON and upgrades to SSE only when a
                            handler emits something before its result.

                            Both flags shape 2026-07-28 exchanges only.
                            Clients still speaking the 2025 protocol are
                            always answered with text/event-stream.
  --http-allow-network      Bind to 0.0.0.0 and auto-populate allowed
                            hosts from local interface addresses. Requires
                            an auth token unless --remote-http is set.

Remote service (see REMOTE-HTTP.md before exposing it):
  --remote-http             Serve many users over HTTP. Each request must
                            carry its caller's Fastly API token in a
                            Fastly-Key header; FASTLY_API_TOKEN is ignored.
                            Secrets are always encrypted with a key derived
                            from that token, and executions get no fetch
                            and no file access. Implies --transport http.
  --http-trusted-proxy <c>  IP or CIDR of a reverse proxy whose
                            X-Forwarded-For entries are trusted when rate
                            limiting by source address. May be repeated.
  --audit-log <path>        Append audit records (JSON lines) to this file
                            instead of stdout.
  --remote-max-executions <n>
                            Executions running at once on this replica.
                            Defaults to 8. Per-customer and per-token
                            ceilings scale with it.
  --remote-execution-memory <MiB>
                            Memory limit for one execution. Half of it caps
                            the JavaScript heap; on Linux with prlimit, the
                            whole of it also limits what the process can
                            allocate. Defaults to 1024.

Environment:
  FASTLY_API_TOKEN             Fastly API token used for authenticated calls.
  FASTLY_MCP_ENCRYPT_SECRETS   Set to "true" or "1" to enable encryption
                               without passing --encrypt-secrets.
  FASTLY_MCP_ENCRYPT_KEY       Same as --encrypt-key.
  FASTLY_MCP_ENCRYPT_TWEAK     Optional tweak string for domain separation.
  FASTLY_MCP_RESULT_DIR        Same as --result-dir.
  FASTLY_MCP_TRANSPORT         Same as --transport.
  FASTLY_MCP_HTTP_PORT         Same as --http-port.
  FASTLY_MCP_HTTP_ALLOW_ORIGIN Comma-separated list of allowed origins.
  FASTLY_MCP_HTTP_AUTH_TOKEN   Same as --http-auth-token. Preferred over
                               the CLI form.

See the README for client configuration examples and details on the
search, inspect, and execute tools.
`);
}

class StartupError extends Error {}

function localShield(cliArgs, env) {
  const enabled =
    cliArgs.encryptSecrets ||
    env.FASTLY_MCP_ENCRYPT_SECRETS === "true" ||
    env.FASTLY_MCP_ENCRYPT_SECRETS === "1";
  // Parse the key even with encryption off, so a typo fails at startup.
  const key = parseEncryptKey(cliArgs.encryptKey ?? env.FASTLY_MCP_ENCRYPT_KEY);
  if (!enabled) return null;
  const shield = new SecretShield({
    key,
    tweak: env.FASTLY_MCP_ENCRYPT_TWEAK
      ? new TextEncoder().encode(env.FASTLY_MCP_ENCRYPT_TWEAK)
      : undefined,
  });
  process.on("exit", () => shield.destroy());
  return shield;
}

const HOST_CHECKS = { requireYama, resolvePrlimit, requireDisconnectDetection };

/**
 * Looks for the protections remote mode can use on this host.
 * Remote mode still runs without them, so a failed check only adds a line
 * to `missing` for startup to print and record.
 */
export async function detectHardening(limits, checks = HOST_CHECKS) {
  const missing = [];
  const attempt = async (name, check) => {
    try {
      return await check();
    } catch (error) {
      missing.push(`${name}: ${error.message}`);
      return null;
    }
  };
  const [yamaPtraceScope, prlimit, disconnectDetection] = await Promise.all([
    attempt("Yama", checks.requireYama),
    attempt("prlimit", () => checks.resolvePrlimit(limits)),
    attempt("disconnect detection", checks.requireDisconnectDetection),
  ]);
  return {
    hardening: {
      yamaPtraceScope,
      prlimit,
      disconnectDetection: disconnectDetection === true,
    },
    missing,
  };
}

// One throwaway execution, to check that the sandbox starts within the
// limits and whether the OOM score handshake works on a real child.
async function proveLaunch(profile, { memoryMb, heapMb }) {
  let handshake = null;
  const record = (pid) => {
    try {
      preferAsOomVictim(pid);
      handshake = true;
    } catch (error) {
      handshake = error.message;
    }
  };
  const probe = await execute("return 1;", {
    remote: true,
    profile: { ...profile, oomVictim: record },
  });
  if (probe.result !== 1) {
    const limits = profile.prlimit
      ? `${memoryMb} MiB of data, ${heapMb} MiB of heap`
      : `${heapMb} MiB of heap`;
    throw new Error(
      `The sandbox cannot start within the configured execution limits (${limits}): ${probe.error}. Raise --remote-execution-memory.`,
    );
  }
  return handshake;
}

async function prepareRemote({ cliArgs, env, deps }) {
  requireNoInspector();
  const trustedProxies = parseTrustedProxies(cliArgs.httpTrustedProxies);

  const maxRunning = positiveInteger(
    cliArgs.remoteMaxExecutions,
    "--remote-max-executions",
    DEFAULT_MAX_EXECUTIONS,
    { max: 256 },
  );
  const memoryMb = positiveInteger(
    cliArgs.remoteExecutionMemory,
    "--remote-execution-memory",
    DEFAULT_EXECUTION_MEMORY_MB,
    { min: 256, max: 65_536 },
  );
  const limits = {
    memoryMb,
    heapMb: Math.floor(memoryMb / 2),
    cpuSeconds: EXECUTION_CPU_SECONDS,
  };
  const { hardening, missing } = await detectHardening({
    dataBytes: memoryMb * 1024 * 1024,
    cpuSeconds: EXECUTION_CPU_SECONDS,
  });
  const base = deps.resolveExecutionProfile(limits, hardening);
  const handshake = await proveLaunch(base, limits);
  if (handshake !== true) missing.push(`OOM victim preference: ${handshake}`);
  const executionProfile = Object.freeze({
    ...base,
    oomVictim: handshake === true ? preferAsOomVictim : undefined,
  });
  for (const item of missing) {
    process.stderr.write(`[fastly-mcp] Warning: running without ${item}\n`);
  }

  const sink = cliArgs.auditLog
    ? fileSink(cliArgs.auditLog)
    : streamSink(process.stdout);
  let sinkFailures = 0;
  const audit = createAuditLog({
    sink,
    onSinkFailure: () => {
      sinkFailures++;
      process.stderr.write(
        `[fastly-mcp] Audit sink is failing (${sinkFailures} so far); records are held in a bounded queue and then dropped\n`,
      );
    },
  });

  if (env.FASTLY_API_TOKEN) {
    process.stderr.write(
      "[fastly-mcp] Warning: FASTLY_API_TOKEN is set but ignored in remote mode. Unset it: executions run under the same user and could read this process's environment.\n",
    );
  }

  audit.emit("startup", {
    version: pkg.version,
    serverRuntime: process.versions.bun ? "bun" : "node",
    serverRuntimeVersion: process.versions.bun ?? process.versions.node,
    executionRuntime: executionProfile.name,
    executionRuntimeVersion: executionProfile.version,
    limits: { ...limits, maxRunning },
    hardening: {
      yamaPtraceScope: hardening.yamaPtraceScope,
      prlimit: Boolean(hardening.prlimit),
      oomVictim: handshake === true,
      disconnectDetection: hardening.disconnectDetection,
    },
    trustedProxies: cliArgs.httpTrustedProxies.length,
    deploymentToken: Boolean(
      cliArgs.httpAuthToken ?? env.FASTLY_MCP_HTTP_AUTH_TOKEN,
    ),
  });

  return {
    trustedProxies,
    audit,
    budgets: createPrevalidationBudgets(),
    validator: createTokenValidator({ fetch: deps.fetch }),
    admission: createAdmission({ limits: admissionLimits(maxRunning) }),
    executionProfile,
    requestBodyTimeoutMs: deps.requestBodyTimeoutMs,
    maxInFlightRequests: deps.maxInFlightRequests,
  };
}

// Any failure in a startup step becomes the clean exit `runCli` prints.
async function startup(step) {
  try {
    return await step();
  } catch (err) {
    throw new StartupError(err.message);
  }
}

export async function main({
  argv = process.argv,
  env = process.env,
  overrides = {},
} = {}) {
  let cliArgs;
  try {
    cliArgs = parseArgs(argv);
  } catch (err) {
    throw new StartupError(`${err.message}\nRun fastly-mcp --help for usage.`);
  }

  if (cliArgs.help) {
    printHelp(pkg.version);
    return;
  }
  if (cliArgs.version) {
    process.stdout.write(`${pkg.version}\n`);
    return;
  }

  const deps = { ...REMOTE_DEPENDENCIES, ...overrides };

  return startup(async () => {
    const mode = resolveMode(cliArgs, env);
    if (mode.transport !== "stdio" && mode.transport !== "http") {
      throw new Error(
        `Unknown transport "${mode.transport}". Use --transport stdio or --transport http.`,
      );
    }
    const shield = mode.remote ? null : localShield(cliArgs, env);
    const index = await buildIndex();
    if (mode.transport === "http") resolveHttpOptions({ cliArgs, env });

    if (mode.remote) {
      const remote = await prepareRemote({ cliArgs, env, deps });
      const remoteIndex = projectRemoteIndex(index);
      return startHttp(
        (context) =>
          createMcpServer({
            version: pkg.version,
            index: remoteIndex,
            apiToken: context.apiToken,
            remote: { context, services: remote },
          }),
        {
          cliArgs,
          env,
          version: pkg.version,
          remote,
          onShutdown: () => {
            killAllExecutions();
            remote.audit.flush();
            remote.audit.close();
          },
        },
      );
    }

    getExecutionRuntime();
    // The process token is read once, here, and handed down explicitly.
    const local = {
      version: pkg.version,
      index,
      shield,
      apiToken: env.FASTLY_API_TOKEN,
      executionProfile: overrides.resolveExecutionProfile?.({}),
      // Stored results get the same secret encryption as a response, since the model is told to read them.
      resultStore: resolveResultStore({
        env,
        dir: cliArgs.resultDir,
        seal: shield ? (text) => shield.encrypt(text) : undefined,
      }),
    };
    if (mode.transport === "http") {
      return startHttp(() => createMcpServer(local), {
        cliArgs,
        env,
        version: pkg.version,
        onShutdown: killAllExecutions,
      });
    }

    // Executions lead their own process groups, so a signal to this process
    // does not reach them by itself.
    process.on("exit", killAllExecutions);
    for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
      process.on(signal, () => process.exit(0));
    }

    serveStdio(() => createMcpServer(local), {
      onerror: (err) => {
        process.stderr.write(`[fastly-mcp] ${err.message}\n`);
      },
    });
    console.error("[fastly-mcp] Server started (stdio)");
  });
}

/** Like `main`, but prints startup errors and exits 2 instead of throwing. */
export async function runCli(options) {
  try {
    await main(options);
  } catch (err) {
    if (!(err instanceof StartupError)) throw err;
    for (const line of err.message.split("\n")) {
      process.stderr.write(`[fastly-mcp] ${line}\n`);
    }
    process.exit(2);
  }
}
