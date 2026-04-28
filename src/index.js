#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { buildIndex } from "./indexer.js";
import { SecretShield } from "./secrets.js";
import { execute } from "./tools/execute.js";
import { inspect } from "./tools/inspect.js";
import { search } from "./tools/search.js";

const index = await buildIndex();

import { readFileSync } from "node:fs";
import { join } from "node:path";

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

function parseArgs(argv) {
  const args = { encryptSecrets: false, encryptKey: undefined };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--encrypt-secrets") {
      args.encryptSecrets = true;
    } else if (argv[i] === "--encrypt-key" && i + 1 < argv.length) {
      args.encryptKey = argv[++i];
    } else if (argv[i].startsWith("--encrypt-key=")) {
      args.encryptKey = argv[i].slice("--encrypt-key=".length);
    }
  }
  return args;
}

const cliArgs = parseArgs(process.argv);

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

function shielded(handler) {
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
}

const server = new McpServer({
  name: "@fastly/mcp",
  version: pkg.version,
});

server.tool(
  "search",
  "Search functions available to perform actions on Fastly",
  {
    query: z
      .string()
      .describe(
        "A keyword (e.g. 'purge'), an API class name (e.g. 'PurgeApi'), a method name (e.g. 'createBackend'), or an HTTP path fragment (e.g. '/service/{service_id}/purge')",
      ),
  },
  shielded(async ({ query }) => {
    const result = search(index, query);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      isError: !result.ok,
    };
  }),
);

server.tool(
  "execute",
  `Execute JavaScript code in a sandbox with the Fastly API client pre-authenticated.

Rules:
- Always use \`search\` or \`inspect\` first to find the correct method, parameters, and return type.
- You MUST use \`return\` to get results. The code runs as an async function body — only the returned value is captured. console.log output is included separately but is not a substitute for return.
- API methods return values directly (arrays, objects). Do NOT assume responses are wrapped in a \`.result\` property — access the returned value directly.
- If a result is unexpectedly empty, return the raw response first to inspect its shape: \`return await api.method(params);\`

Example: \`const api = new Fastly.ServiceApi(); return await api.listServices();\``,
  {
    code: z
      .string()
      .describe(
        "JavaScript code to execute. `Fastly` is available globally. Auth is pre-configured. Use `return` to get results.",
      ),
  },
  shielded(async ({ code }) => {
    const result = await execute(code);
    const isError = "error" in result && !("result" in result);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      isError,
    };
  }),
);

server.tool(
  "inspect",
  "Get full documentation for a specific API method, including parameters, return type, and example code. Use this after search to understand how to call a method and what it returns. Accepts a method name (e.g. 'listServices') or ClassName.methodName (e.g. 'ServiceApi.listServices').",
  {
    method: z
      .string()
      .describe(
        "Method name (e.g. 'listServices') or ClassName.methodName (e.g. 'ServiceApi.listServices')",
      ),
  },
  shielded(async ({ method }) => {
    const result = inspect(index, method);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      isError: !result.ok,
    };
  }),
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[fastly-mcp] Server started");
