import { readFileSync } from "node:fs";
import { join } from "node:path";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { parseArgs } from "./cli.js";
import { getExecutionRuntime } from "./execution-runtime.js";
import { resolveHttpOptions, resolveTransport, startHttp } from "./http.js";
import { buildIndex } from "./indexer.js";
import { SecretShield } from "./secrets.js";
import { createMcpServer } from "./server.js";
import { killAllExecutions } from "./tools/execute.js";

const pkg = JSON.parse(
  readFileSync(
    join(import.meta.dirname ?? import.meta.dir, "../package.json"),
    "utf-8",
  ),
);

function parseEncryptKey(hex) {
  if (hex === undefined) return undefined;
  if (!/^[0-9a-fA-F]{32}$/.test(hex)) {
    throw new Error(
      `--encrypt-key / FASTLY_MCP_ENCRYPT_KEY must be exactly 32 hex characters (16 bytes), got ${hex.length} chars`,
    );
  }
  return Buffer.from(hex, "hex");
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
                            an auth token.

Environment:
  FASTLY_API_TOKEN             Fastly API token used for authenticated calls.
  FASTLY_MCP_ENCRYPT_SECRETS   Set to "true" or "1" to enable encryption
                               without passing --encrypt-secrets.
  FASTLY_MCP_ENCRYPT_KEY       Same as --encrypt-key.
  FASTLY_MCP_ENCRYPT_TWEAK     Optional tweak string for domain separation.
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

  return startup(async () => {
    const shield = localShield(cliArgs, env);
    const index = await buildIndex();
    const transport = resolveTransport(cliArgs, env);
    if (transport !== "stdio" && transport !== "http") {
      throw new Error(
        `Unknown transport "${transport}". Use --transport stdio or --transport http.`,
      );
    }
    if (transport === "http") resolveHttpOptions({ cliArgs, env });
    getExecutionRuntime();
    const local = {
      version: pkg.version,
      index,
      shield,
      apiToken: env.FASTLY_API_TOKEN,
      executionProfile: overrides.resolveExecutionProfile?.({}),
    };
    if (transport === "http") {
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
