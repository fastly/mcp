import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { execute } from "./tools/execute.js";
import { inspect } from "./tools/inspect.js";
import { search } from "./tools/search.js";

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

export function registerTools(
  mcp,
  { shield, index, apiToken, executionProfile },
) {
  const shielded = makeShielded(shield);

  mcp.registerTool(
    "search",
    { description: SEARCH_DESCRIPTION, inputSchema: SEARCH_INPUT_SCHEMA },
    shielded(async ({ query }) => jsonResult(search(index, query))),
  );

  mcp.registerTool(
    "execute",
    { description: EXECUTE_DESCRIPTION, inputSchema: EXECUTE_INPUT_SCHEMA },
    shielded(async ({ code }, extra) => {
      const { outcome: _internal, ...result } = await execute(code, {
        apiToken,
        signal: extra?.mcpReq?.signal,
        profile: executionProfile,
      });
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

export function createMcpServer({
  version,
  shield,
  index,
  apiToken,
  executionProfile,
}) {
  const mcp = new McpServer(
    {
      name: "@fastly/mcp",
      version,
    },
    {
      cacheHints: {
        "tools/list": LIST_CACHE_HINT,
        "server/discover": LIST_CACHE_HINT,
      },
    },
  );
  registerTools(mcp, { shield, index, apiToken, executionProfile });
  return mcp;
}
