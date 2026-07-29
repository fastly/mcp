#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";
import { parseArgs } from "./cli.js";
import { resolveTransport, startHttp } from "./http.js";
import { buildIndex } from "./indexer.js";
import { SecretShield } from "./secrets.js";
import { execute } from "./tools/execute.js";
import { inspect } from "./tools/inspect.js";
import { search } from "./tools/search.js";

const pkg = JSON.parse(
  readFileSync(
    join(import.meta.dirname ?? import.meta.dir, "../package.json"),
    "utf-8",
  ),
);

function parseEncryptKey(hex) {
  if (!hex) return undefined;
  if (!/^[0-9a-fA-F]{32}$/.test(hex)) {
    throw new Error(
      `FASTLY_MCP_ENCRYPT_KEY must be exactly 32 hex characters (16 bytes), got ${hex.length} chars`,
    );
  }
  return Buffer.from(hex, "hex");
}

function printHelp() {
  process.stdout.write(`fastly-mcp ${pkg.version}

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
                            request. Prefer the env var below — the CLI
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

const cliArgs = parseArgs(process.argv);

if (cliArgs.help) {
  printHelp();
  process.exit(0);
}

if (cliArgs.version) {
  process.stdout.write(`${pkg.version}\n`);
  process.exit(0);
}

const index = await buildIndex();

const encryptionEnabled =
  cliArgs.encryptSecrets ||
  process.env.FASTLY_MCP_ENCRYPT_SECRETS === "true" ||
  process.env.FASTLY_MCP_ENCRYPT_SECRETS === "1";

const encryptKeyHex =
  cliArgs.encryptKey ?? process.env.FASTLY_MCP_ENCRYPT_KEY ?? undefined;

const shield = encryptionEnabled
  ? new SecretShield({
      key: parseEncryptKey(encryptKeyHex),
      tweak: process.env.FASTLY_MCP_ENCRYPT_TWEAK
        ? new TextEncoder().encode(process.env.FASTLY_MCP_ENCRYPT_TWEAK)
        : undefined,
    })
  : null;

if (shield) {
  process.on("exit", () => shield.destroy());
}

function walkStrings(value, fn) {
  if (typeof value === "string") return fn(value);
  if (Array.isArray(value)) return value.map((v) => walkStrings(v, fn));
  if (value !== null && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = walkStrings(v, fn);
    }
    return out;
  }
  return value;
}

function makeShielded(shield) {
  return function shielded(handler) {
    return async (params, extra) => {
      if (!shield) return handler(params, extra);

      const decrypted = walkStrings(params, (s) => shield.decrypt(s));
      const response = await handler(decrypted, extra);

      if (response.content) {
        response.content = response.content.map((block) => {
          if (block.type === "text" && typeof block.text === "string") {
            return { ...block, text: shield.encrypt(block.text) };
          }
          if (block.type === "resource" && block.resource?.text) {
            return {
              ...block,
              resource: {
                ...block.resource,
                text: shield.encrypt(block.resource.text),
              },
            };
          }
          return block;
        });
      }
      return response;
    };
  };
}

const SEARCH_DESCRIPTION =
  "Find Fastly API methods by keyword, class name, method name, or HTTP path. Each result includes a ready-to-use `usage` snippet you can pass directly to `execute`. For simple calls, go straight from search to execute. Use `inspect` only when you need full parameter docs.";

const SEARCH_INPUT_SCHEMA = z.object({
  query: z
    .string()
    .describe(
      "A keyword (e.g. 'purge'), an API class name (e.g. 'PurgeApi'), a method name (e.g. 'createBackend'), or an HTTP path fragment (e.g. '/service/{service_id}/purge')",
    ),
});

const EXECUTE_DESCRIPTION = `Run JavaScript in a sandbox with the Fastly API client pre-authenticated.

If you already know the method, call it directly. Otherwise, use \`search\` first and copy its \`usage\` snippet.

You MUST use \`return\` to produce output. API methods return values directly (arrays, objects), not wrapped in \`.result\`. Every Fastly.*Api class is pre-instantiated as a camelCase global: \`serviceApi\`, \`purgeApi\`, \`backendApi\`, etc.

Example: \`return await serviceApi.listServices();\``;

const EXECUTE_INPUT_SCHEMA = z.object({
  code: z
    .string()
    .describe(
      "JavaScript code to execute. `Fastly` is available globally. Auth is pre-configured. Use `return` to get results.",
    ),
});

const INSPECT_DESCRIPTION =
  "Get full documentation for a specific API method, including parameters, return type, and example code. Use this after search to understand how to call a method and what it returns. Accepts a method name (e.g. 'listServices') or ClassName.methodName (e.g. 'ServiceApi.listServices').";

const INSPECT_INPUT_SCHEMA = z.object({
  method: z
    .string()
    .describe(
      "Method name (e.g. 'listServices') or ClassName.methodName (e.g. 'ServiceApi.listServices')",
    ),
});

function jsonResult(result) {
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    isError: !result.ok,
  };
}

export function registerTools(mcp, { shield, index }) {
  const shielded = makeShielded(shield);

  mcp.registerTool(
    "search",
    { description: SEARCH_DESCRIPTION, inputSchema: SEARCH_INPUT_SCHEMA },
    shielded(async ({ query }) => jsonResult(search(index, query))),
  );

  mcp.registerTool(
    "execute",
    { description: EXECUTE_DESCRIPTION, inputSchema: EXECUTE_INPUT_SCHEMA },
    shielded(async ({ code }) => {
      const result = await execute(code);
      const isError = "error" in result && !("result" in result);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        isError,
      };
    }),
  );

  mcp.registerTool(
    "inspect",
    { description: INSPECT_DESCRIPTION, inputSchema: INSPECT_INPUT_SCHEMA },
    shielded(async ({ method }) => jsonResult(inspect(index, method))),
  );
}

// The tool set never changes while the process lives, and neither result
// depends on who is asking, which is what makes `public` safe here.
const LIST_CACHE_HINT = { ttlMs: 3_600_000, cacheScope: "public" };

export function createMcpServer({ shield, index }) {
  const mcp = new McpServer(
    {
      name: "@fastly/mcp",
      version: pkg.version,
    },
    {
      cacheHints: {
        "tools/list": LIST_CACHE_HINT,
        "server/discover": LIST_CACHE_HINT,
      },
    },
  );
  registerTools(mcp, { shield, index });
  return mcp;
}

const transportChoice = resolveTransport(cliArgs, process.env);

if (transportChoice !== "stdio" && transportChoice !== "http") {
  process.stderr.write(
    `[fastly-mcp] Unknown transport "${transportChoice}". Use --transport stdio or --transport http.\n`,
  );
  process.exit(2);
}

if (transportChoice === "http") {
  try {
    await startHttp(() => createMcpServer({ shield, index }), {
      cliArgs,
      env: process.env,
      version: pkg.version,
    });
  } catch (err) {
    process.stderr.write(`[fastly-mcp] ${err.message}\n`);
    process.exit(2);
  }
} else {
  serveStdio(() => createMcpServer({ shield, index }), {
    onerror: (err) => {
      process.stderr.write(`[fastly-mcp] ${err.message}\n`);
    },
  });
  console.error("[fastly-mcp] Server started (stdio)");
}
