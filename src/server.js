import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { AdmissionError } from "./admission.js";
import { INLINE_RESULT_BYTES } from "./limits.js";
import {
  MarkerError,
  RemoteSecretShield,
  shieldJson,
  WITHHELD,
} from "./secrets.js";
import { execute } from "./tools/execute.js";
import { inspect } from "./tools/inspect.js";
import { search } from "./tools/search.js";

// Queue wait, the 30 s execution window and teardown all have to fit.
const REMOTE_REQUEST_DEADLINE_MS = 45_000;

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

Example: \`return await serviceApi.listServices();\`

Results are returned in full whenever they fit, however many records they contain. A result too large for one response is written to a JSON file on the machine running this server and the response carries its path in \`resultFile\`, with only a short preview in \`result\`; read that file to get every record instead of re-running the query.`;

const REMOTE_EXECUTE_NOTE = `

This server is remote: \`fetch\` is not available, nothing can read or write files, and oversized results cannot be written to a file you could read, so ask for less data per call. Use the Fastly API globals for every request. Uploading a Compute package (\`packageApi.putPackage\`) is not supported here.`;

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

function textResult(result, isError) {
  const text = JSON.stringify(result);
  const bytes = Buffer.byteLength(text);
  if (bytes > INLINE_RESULT_BYTES) {
    const error = `Tool response is ${bytes} bytes, more than the ${INLINE_RESULT_BYTES}-byte inline limit. Ask for less data.`;
    return textResult(
      Object.hasOwn(result, "ok") ? { ok: false, error } : { error },
      true,
    );
  }
  return {
    content: [{ type: "text", text }],
    isError,
  };
}

const jsonResult = (result) => textResult(result, !result.ok);
const executionResult = (result) =>
  textResult(result, "error" in result && !("result" in result));

function shieldedJsonResult(result, shield) {
  if (!shield) return jsonResult(result);
  try {
    return jsonResult(shieldJson(result, shield));
  } catch {
    // Never fall back to plaintext: a result whose secrets cannot be encrypted is withheld as a whole.
    return jsonResult({ ok: false, error: WITHHELD });
  }
}

function walkStrings(value, fn, path = []) {
  if (typeof value === "string") return fn(value, path);
  if (Array.isArray(value)) {
    return value.map((item, i) => walkStrings(item, fn, [...path, i]));
  }
  if (value !== null && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = walkStrings(v, fn, [...path, k]);
    }
    return out;
  }
  return value;
}

/**
 * Wraps tool handlers so secrets are decrypted on the way in, and hands each handler the shield for encrypting its own output.
 * Output is shielded by the handler rather than here because execute has to measure, store and clip the encrypted form.
 *
 * `openShield` returns the shield for one call and how to let go of it.
 * A local server shares its process-wide shield; a remote one derives a shield from the caller's token and destroys it afterwards.
 */
function makeShielded(openShield) {
  return function shielded(handler) {
    return async (params, extra) => {
      const opened = openShield();
      if (!opened) return handler(params, extra);
      const { shield, close } = opened;

      try {
        const decrypted = walkStrings(params, (text, path) =>
          shield.decrypt(text, path.join(".")),
        );
        return await handler(decrypted, extra, shield);
      } catch (error) {
        if (!(error instanceof MarkerError)) throw error;
        return executionResult({ error: error.message, hint: error.hint });
      } finally {
        close();
      }
    };
  };
}

function remoteExecutor({ apiToken, identity, requestId, signal }, services) {
  const { admission, audit, validator, executionProfile } = services;

  return async (code, toolSignal, shield) => {
    const record = {
      requestId,
      tokenId: identity.tokenId,
      customerId: identity.customerId ?? undefined,
      executionRuntime: executionProfile?.name ?? "none",
      executionRuntimeVersion: executionProfile?.version ?? "none",
    };
    const finish = (result, fields) => {
      audit.emit("execution", { ...record, ...fields });
      return result;
    };

    if (!identity.customerId) {
      return finish(
        {
          error:
            "Execution is unavailable for this Fastly API token: it cannot read the customer account it belongs to, which this server needs to apply per-customer limits.",
          hint: "Use a token that can read /current_customer. search and inspect keep working with this one.",
        },
        { decision: "refused", outcome: "identity_unavailable" },
      );
    }

    const deadline = AbortSignal.any(
      [
        signal,
        toolSignal,
        AbortSignal.timeout(REMOTE_REQUEST_DEADLINE_MS),
      ].filter(Boolean),
    );
    const queuedAt = performance.now();
    let release;
    try {
      release = await admission.acquire({
        customerId: identity.customerId,
        tokenId: identity.tokenId,
        signal: deadline,
      });
    } catch (error) {
      if (!(error instanceof AdmissionError)) throw error;
      return finish(
        { error: error.message },
        {
          decision: "refused",
          outcome: error.category,
          queueMs: Math.round(performance.now() - queuedAt),
        },
      );
    }

    const startedAt = performance.now();
    try {
      const result = await execute(code, {
        apiToken,
        remote: true,
        signal: deadline,
        profile: executionProfile,
        shield,
      });
      // Fastly saying 401 to the token itself means our cached admission is
      // stale; a 403 may only be a scope problem.
      if (result.status === 401) validator.evict(apiToken);
      return finish(result, {
        decision: "admitted",
        outcome: result.outcome ?? ("result" in result ? "ok" : "error"),
        queueMs: Math.round(startedAt - queuedAt),
        executionMs: Math.round(performance.now() - startedAt),
      });
    } finally {
      release();
    }
  };
}

export function registerTools(
  mcp,
  { shield, index, apiToken, remote, executionProfile, resultStore },
) {
  const shielded = makeShielded(
    remote
      ? () => {
          const fresh = new RemoteSecretShield(apiToken);
          return { shield: fresh, close: () => fresh.destroy() };
        }
      : () => shield && { shield, close: () => {} },
  );
  const runRemotely = remote
    ? remoteExecutor({ apiToken, ...remote.context }, remote.services)
    : undefined;

  mcp.registerTool(
    "search",
    { description: SEARCH_DESCRIPTION, inputSchema: SEARCH_INPUT_SCHEMA },
    shielded(async ({ query }, _extra, shield) =>
      shieldedJsonResult(search(index, query), shield),
    ),
  );

  mcp.registerTool(
    "execute",
    {
      description: remote
        ? EXECUTE_DESCRIPTION + REMOTE_EXECUTE_NOTE
        : EXECUTE_DESCRIPTION,
      inputSchema: EXECUTE_INPUT_SCHEMA,
    },
    shielded(async ({ code }, extra, shield) => {
      const { outcome: _internal, ...result } = runRemotely
        ? await runRemotely(code, extra?.mcpReq?.signal, shield)
        : await execute(code, {
            apiToken,
            signal: extra?.mcpReq?.signal,
            profile: executionProfile,
            resultStore,
            shield,
          });
      return executionResult(result);
    }),
  );

  mcp.registerTool(
    "inspect",
    { description: INSPECT_DESCRIPTION, inputSchema: INSPECT_INPUT_SCHEMA },
    shielded(async ({ method }, _extra, shield) =>
      shieldedJsonResult(inspect(index, method, { remote: !!remote }), shield),
    ),
  );
}

// The tool list never changes and does not depend on who is asking, which is
// what makes `public` safe.
const LIST_CACHE_HINT = { ttlMs: 3_600_000, cacheScope: "public" };

/**
 * Builds the MCP server for one connection or, over HTTP, one request.
 * Every credential arrives here explicitly: `apiToken` is the process token
 * for a local server and the caller's Fastly-Key for a remote one.
 */
export function createMcpServer({
  version,
  index,
  shield,
  apiToken,
  remote,
  executionProfile,
  resultStore,
}) {
  if (remote && (!apiToken || !remote.context?.identity)) {
    throw new Error("Remote servers need a validated caller");
  }
  const mcp = new McpServer(
    { name: "@fastly/mcp", version },
    {
      cacheHints: {
        "tools/list": LIST_CACHE_HINT,
        "server/discover": LIST_CACHE_HINT,
      },
    },
  );
  registerTools(mcp, {
    shield,
    index,
    apiToken,
    remote,
    executionProfile,
    // Remote callers can't read our files.
    resultStore: remote ? undefined : resultStore,
  });
  return mcp;
}
