import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getExecutionRuntime } from "../src/execution-runtime.js";
import { PREVIEW_BYTES } from "../src/limits.js";
import { createResultStore } from "../src/result-files.js";
import { execute } from "../src/tools/execute.js";
import { expectNoInternals, startLocalServer, tempDir } from "./helpers.js";

const NODE_HARNESS_PATH = join(
  import.meta.dir,
  "fixtures/run-sandbox-under-node.mjs",
);

const NODE_EXECUTE_HARNESS_PATH = join(
  import.meta.dir,
  "fixtures/run-execute-under-node.mjs",
);

const LATE_REJECTION_CODE =
  'Promise.reject(new Error("late")); console.log("x".repeat(90000)); return 7;';

function tempStore(options) {
  return createResultStore({ dir: tempDir("execute-results"), ...options });
}

// The bound is measured on the JSON the model receives, give or take the truncation notes.
function expectPreviewBounded(result) {
  expect(result.truncated).toBe(true);
  expect(Buffer.byteLength(JSON.stringify(result.result))).toBeLessThan(
    PREVIEW_BYTES * 1.25,
  );
}

function runUnderNode(harnessPath, code, env) {
  return spawnSync("node", [harnessPath, code], {
    encoding: "utf8",
    timeout: 15000,
    maxBuffer: 1024 * 1024,
    ...(env ? { env: { ...process.env, ...env } } : {}),
  });
}

function expectFullLateRejectionResult(proc) {
  const { exitCode, stdout } = JSON.parse(proc.stdout);
  expect(exitCode).toBe(0);
  const parsed = JSON.parse(stdout);
  expect(parsed.ok).toBe(true);
  expect(parsed.result).toBe(7);
  expect(parsed.console[0].text.length).toBe(90000);
}

describe("execute", () => {
  test("successful code returns result directly", async () => {
    const result = await execute("return 1 + 2;");
    expect(result).toEqual({ result: 3 });
  }, 10000);

  test("throwing code returns error with stack", async () => {
    const result = await execute("throw new Error('boom');");
    expect(result.error).toBe("boom");
    expect(result.stack).toBeDefined();
    expect(typeof result.stack).toBe("string");
    expect(result.result).toBeUndefined();
  }, 10000);

  test("stack points at the offending user line and hides sandbox internals", async () => {
    const result = await execute(
      "const a = 1;\nconst b = 2;\nthrow new Error('boom');",
    );

    expect(result.line.number).toBe(3);
    expect(result.line.source).toBe("throw new Error('boom');");
    expect(result.stack).toContain("user-code:3:");
    expectNoInternals(expect, result.stack);
  }, 10000);

  test("bridge failures arrive as real Errors, not [object Object]", async () => {
    const result = await execute(
      "try { await serviceApi.thisMethodDoesNotExist(); } catch (e) { return { isError: e instanceof Error, message: e.message }; }",
    );

    expect(result.result.isError).toBe(true);
    expect(result.result.message).toBe(
      "Unknown Fastly API method: ServiceApi.thisMethodDoesNotExist",
    );
  }, 10000);

  test("awaiting console.log does not blow up the sandbox", async () => {
    const result = await execute('await console.log("first"); return "done";');
    expect(result.result).toBe("done");
    expect(result.console).toEqual([{ level: "log", text: "first" }]);
  }, 10000);

  // Node says "fetch failed: connect ECONNREFUSED ...", Bun words it its own way;
  // either is fine as long as it explains itself.
  test("a failed fetch reports why it failed", async () => {
    const result = await execute(
      "try { await fetch('http://127.0.0.1:1/'); } catch (e) { return e.message; }",
    );
    expect(result.result).toMatch(/connect|fetch failed/i);
    expect(result.result).not.toBe("[object Object]");
  }, 10000);

  test("Fastly client is available in sandbox", async () => {
    const result = await execute("return typeof Fastly;");
    expect(result).toEqual({ result: "object" });
  }, 10000);

  test("Fastly.*Api classes are pre-instantiated as lowercased globals", async () => {
    const result = await execute(
      "return [typeof serviceApi, typeof statsApi, typeof purgeApi, typeof tlsCertificatesApi];",
    );
    expect(result.result).toEqual(["object", "object", "object", "object"]);
  }, 10000);

  test("pre-instantiated globals expose the expected methods", async () => {
    const result = await execute(
      "return [typeof serviceApi.listServices, typeof statsApi.getServiceStats, typeof purgeApi.purgeTag];",
    );
    expect(result.result).toEqual(["function", "function", "function"]);
  }, 10000);

  test("pre-instantiated globals are independent of the Fastly namespace constructor path", async () => {
    // Both approaches should work; the shortcut is just sugar.
    const result = await execute(
      "const explicit = new Fastly.ServiceApi(); return [typeof explicit.listServices, typeof serviceApi.listServices, explicit.constructor === serviceApi.constructor];",
    );
    expect(result.result).toEqual(["function", "function", true]);
  }, 10000);

  test("user-declared const shadows pre-instantiated global cleanly", async () => {
    const result = await execute(
      "const serviceApi = { listServices: () => 'shadowed' }; return serviceApi.listServices();",
    );
    expect(result).toEqual({ result: "shadowed" });
  }, 10000);

  test("empty code returns error", async () => {
    const result = await execute("");
    expect(result).toEqual({ error: "code must be a non-empty string" });
  }, 10000);

  test("syntax error in code returns error", async () => {
    const result = await execute("return {{{;");
    expect(result.error).toBeDefined();
    expect(typeof result.error).toBe("string");
    expect(result.result).toBeUndefined();
  }, 10000);

  test("return value serialization preserves objects and arrays", async () => {
    const result = await execute("return { a: 1, b: [2, 3] };");
    expect(result).toEqual({ result: { a: 1, b: [2, 3] } });
  }, 10000);

  test("async code works", async () => {
    const result = await execute("return await Promise.resolve(42);");
    expect(result).toEqual({ result: 42 });
  }, 10000);

  // Fifty small items is a small result; the count alone hides nothing.
  test("an array of fifty records is returned whole", async () => {
    const result = await execute(
      'return Array.from({length: 50}, (_, i) => ({id: i, name: "item" + i}));',
    );
    expect(result.result).toHaveLength(50);
    expect(result.result[49]).toEqual({ id: 49, name: "item49" });
    expect(result.truncated).toBeUndefined();
  }, 10000);

  test("a __proto__ key survives the oversized-result preview", async () => {
    const store = tempStore();
    const result = await execute(
      `
      const obj = {};
      Object.defineProperty(obj, "__proto__", {
        value: 1, enumerable: true, writable: true, configurable: true,
      });
      for (let i = 0; i < 40; i++) obj["key" + i] = "x".repeat(4000) + i;
      return obj;
    `,
      { resultStore: store },
    );
    expect(result.result._type).toBe("object");
    expect(result.truncated).toBe(true);
    const preview = result.result.preview;
    expect(Object.getPrototypeOf(preview)).toBe(Object.prototype);
    expect(Object.getOwnPropertyDescriptor(preview, "__proto__").value).toBe(1);
    expect(preview.key0).toStartWith("x");
    const stored = JSON.parse(readFileSync(result.resultFile, "utf8"));
    expect(Object.getOwnPropertyDescriptor(stored, "__proto__").value).toBe(1);
  }, 10000);

  test("small array is NOT summarized", async () => {
    const result = await execute("return [1, 2, 3];");
    expect(result).toEqual({ result: [1, 2, 3] });
    expect(result.truncated).toBeUndefined();
  }, 10000);

  test("console.log output is included alongside result", async () => {
    const result = await execute('console.log("debug info"); return 42;');
    expect(result.result).toBe(42);
    expect(result.console).toHaveLength(1);
    expect(result.console[0].text).toBe("debug info");
  }, 10000);

  test("process global is not reachable", async () => {
    const result = await execute("return process.pid;");
    expect(result.error).toMatch(/process is not defined/);
  }, 10000);

  test("sandbox facades cannot escape through Function constructors", async () => {
    const result = await execute(
      'return console.log.constructor("return typeof process")();',
    );

    expect(result.error).toMatch(/Code generation from strings disallowed/);
  }, 10000);

  test("Bun global is not reachable", async () => {
    const result = await execute("return Bun.version;");
    expect(result.error).toMatch(/Bun is not defined/);
  }, 10000);

  test("require is not reachable", async () => {
    const result = await execute('return require("node:fs");');
    expect(result.error).toMatch(/require is not defined/);
  }, 10000);

  test("dynamic import of node:child_process is rejected", async () => {
    const result = await execute(
      'const cp = await import("node:child_process"); return cp.execSync("id").toString();',
    );
    expect(result.error).toBeDefined();
    expect(result.result).toBeUndefined();
  }, 10000);

  test("dynamic import of node:fs is rejected", async () => {
    const result = await execute(
      'const fs = await import("node:fs"); return fs.readFileSync("/etc/passwd", "utf8");',
    );
    expect(result.error).toBeDefined();
    expect(result.result).toBeUndefined();
  }, 10000);

  test("fetch is available", async () => {
    const result = await execute("return typeof fetch;");
    expect(result).toEqual({ result: "function" });
  }, 10000);

  test("Headers/Response/URL web globals are available", async () => {
    const result = await execute(
      "return [typeof Headers, typeof Response, typeof URL, typeof URLSearchParams];",
    );
    expect(result.result).toEqual([
      "function",
      "function",
      "function",
      "function",
    ]);
  }, 10000);

  test("crypto.subtle is available", async () => {
    const result = await execute("return typeof crypto.subtle.digest;");
    expect(result).toEqual({ result: "function" });
  }, 10000);

  test("process.env in subprocess is scrubbed except FASTLY_API_TOKEN", async () => {
    const sentinel = `FASTLY_MCP_TEST_SENTINEL_${Date.now()}`;
    process.env[sentinel] = "leaked";
    try {
      const result = await execute(
        `const fs = await import("node:fs"); return fs.readFileSync("/etc/passwd","utf8");`,
      );
      expect(result.error).toBeDefined();
    } finally {
      delete process.env[sentinel];
    }
  }, 10000);

  test("standard ES built-ins (Map/Set/Promise/Intl/etc.) are present", async () => {
    const result = await execute(
      "return [typeof Map, typeof Set, typeof Promise, typeof Proxy, typeof Reflect, typeof Intl, typeof JSON, typeof BigInt, typeof WeakRef, typeof Atomics];",
    );
    expect(result.result).toEqual([
      "function",
      "function",
      "function",
      "function",
      "object",
      "object",
      "object",
      "function",
      "function",
      "object",
    ]);
  }, 10000);

  test("typed arrays and ArrayBuffer are present", async () => {
    const result = await execute(
      "return [typeof Uint8Array, typeof Float64Array, typeof BigInt64Array, typeof DataView, typeof ArrayBuffer, typeof SharedArrayBuffer];",
    );
    for (const t of result.result) expect(t).toBe("function");
  }, 10000);

  test("ShadowRealm and WebAssembly are unavailable", async () => {
    const result = await execute(
      "return [typeof ShadowRealm, typeof globalThis.ShadowRealm, typeof WebAssembly, typeof globalThis.WebAssembly];",
    );
    expect(result).toEqual({
      result: ["undefined", "undefined", "undefined", "undefined"],
    });
  }, 10000);

  test("structuredClone deep-copies objects", async () => {
    const result = await execute(
      "const a = {x: [1, {y: 2}]}; const b = structuredClone(a); b.x[1].y = 99; return [a.x[1].y, b.x[1].y];",
    );
    expect(result).toEqual({ result: [2, 99] });
  }, 10000);

  test("Buffer is not exposed (use Uint8Array / TextEncoder instead)", async () => {
    const result = await execute(
      "return Buffer.from('hello').toString('hex');",
    );
    expect(result.error).toMatch(/Buffer is not defined/);
  }, 10000);

  test("streams API is present", async () => {
    const result = await execute(
      "return [typeof ReadableStream, typeof WritableStream, typeof TransformStream];",
    );
    expect(result.result).toEqual(["function", "function", "function"]);
  }, 10000);

  test("AbortController cancels fetch", async () => {
    const result = await execute(
      "const c = new AbortController(); c.abort(); try { await fetch('http://127.0.0.1:1', { signal: c.signal }); return 'no-throw'; } catch (e) { return e.name; }",
    );
    expect(result.result).toBe("AbortError");
  }, 10000);

  // A fatal unhandled rejection between event loop turns used to truncate
  // the result at the 64 KB pipe boundary. Only a Node parent draining the
  // pipe reproduces it, hence the harness.
  test("a late unhandled rejection cannot truncate the result under Node", () => {
    const proc = runUnderNode(NODE_HARNESS_PATH, LATE_REJECTION_CODE);
    expectFullLateRejectionResult(proc);
  }, 20000);

  // Strict mode promotes the rejection to an uncaughtException, which
  // needs its own safeguard.
  test("strict unhandled-rejections mode cannot truncate the result either", () => {
    const proc = runUnderNode(NODE_HARNESS_PATH, LATE_REJECTION_CODE, {
      NODE_OPTIONS: "--unhandled-rejections=strict",
    });
    expectFullLateRejectionResult(proc);
  }, 20000);

  test("Node execution rejects imports with a context-owned error", () => {
    const proc = runUnderNode(
      NODE_EXECUTE_HARNESS_PATH,
      `try {
        await import("node:fs");
        return { imported: true };
      } catch (error) {
        return {
          local: error instanceof TypeError,
          constructor: error.constructor.constructor === Function,
          message: error.message,
        };
      }`,
    );
    expect(proc.status).toBe(0);
    expect(JSON.parse(proc.stdout)).toEqual({
      result: {
        local: true,
        constructor: true,
        message: "import() is not available",
      },
    });
  }, 20000);

  // Return values get stored; console output never is, so it keeps a cap.
  test("oversize console output is refused", async () => {
    const result = await execute('console.log("x".repeat(120000)); return 1;');
    expect(result.error).toContain("Output too large");
  }, 15000);

  // "€" is one code unit but three UTF-8 bytes, so counting string length
  // instead of chunk bytes would let this 120 KB payload through.
  test("the console cap counts bytes, not string length", async () => {
    const result = await execute(
      'console.log("\\u20ac".repeat(40000)); return 1;',
    );
    expect(result.error).toContain("Output too large");
  }, 15000);

  // Node splits the sandbox pipe at the 64 KB boundary, here mid
  // character. A Bun host chunks the stream differently and never shows
  // the corruption, hence the execute() harness.
  test("sub-cap multibyte output crosses chunk boundaries intact under Node", () => {
    const proc = runUnderNode(
      NODE_EXECUTE_HARNESS_PATH,
      'console.log("\\u20ac".repeat(30000)); return 1;',
    );
    const result = JSON.parse(proc.stdout);
    expect(result.error).toBeUndefined();
    expect(result.result).toBe(1);
    expect(result.console[0].text).toBe("€".repeat(30000));
  }, 20000);

  test("oversized multibyte output is rejected under a Node host too", () => {
    const proc = runUnderNode(
      NODE_EXECUTE_HARNESS_PATH,
      'console.log("\\u20ac".repeat(40000)); return 1;',
    );
    const result = JSON.parse(proc.stdout);
    expect(result.error).toContain("Output too large");
  }, 20000);

  // 40,000 euro signs are 40,002 code units but 120,002 UTF-8 bytes.
  // A code-unit budget would call this small enough to return inline.
  test("the inline budget counts bytes, not code units", async () => {
    const store = tempStore();
    const result = await execute('return "\\u20ac".repeat(40000);', {
      resultStore: store,
    });
    expect(result.error).toBeUndefined();
    expect(result.truncated).toBe(true);
    expect(result.resultBytes).toBe(120002);
    expect(JSON.parse(readFileSync(result.resultFile, "utf8"))).toBe(
      "\u20ac".repeat(40000),
    );
  }, 15000);

  test("a result inside the inline budget is returned whole", async () => {
    const result = await execute(
      'return Array.from({length: 5}, () => "\\u20ac".repeat(3000));',
    );
    expect(result.truncated).toBeUndefined();
    expect(result.result).toHaveLength(5);
    expect(result.result[0]).toBe("\u20ac".repeat(3000));
  }, 15000);

  // The original bug: a user list came back as its first ten entries just because it was long.
  test("a long list of small records is not summarized", async () => {
    const result = await execute(
      'return Array.from({length: 400}, (_, i) => ({ id: "u" + i, login: "user" + i + "@example.com" }));',
    );
    expect(result.truncated).toBeUndefined();
    expect(result.result).toHaveLength(400);
    expect(result.result[399].login).toBe("user399@example.com");
  }, 15000);

  test("an object with many small keys is not summarized", async () => {
    const result = await execute(
      'return Object.fromEntries(Array.from({length: 200}, (_, i) => ["key" + i, i]));',
    );
    expect(result.truncated).toBeUndefined();
    expect(Object.keys(result.result)).toHaveLength(200);
  }, 15000);

  test("an oversized result is written to a file and answered by path", async () => {
    const store = tempStore();
    const result = await execute(
      'return Array.from({length: 4000}, (_, i) => ({ id: i, pad: "x".repeat(60) }));',
      { resultStore: store },
    );
    expect(result.error).toBeUndefined();
    expect(result.truncated).toBe(true);
    expect(result.resultBytes).toBeGreaterThan(100_000);
    expect(result.resultFile).toStartWith(store.directory);
    expect(result.hint).toContain(result.resultFile);
    expect(result.result._type).toBe("array");
    expect(result.result._total).toBe(4000);
    expect(result.result.items).toHaveLength(10);
    const stored = JSON.parse(readFileSync(result.resultFile, "utf8"));
    expect(stored).toHaveLength(4000);
    expect(stored[3999].id).toBe(3999);
  }, 15000);

  test("without a store an oversized result is described, not stored", async () => {
    const result = await execute(
      'return Array.from({length: 4000}, (_, i) => ({ id: i, pad: "x".repeat(60) }));',
    );
    expect(result.truncated).toBe(true);
    expect(result.resultFile).toBeUndefined();
    expect(result.hint).toContain("result files are disabled");
  }, 15000);

  test("a failing store does not fail the execution", async () => {
    const store = {
      directory: "/nonexistent",
      lastError: "EACCES",
      write: () => null,
    };
    const result = await execute(
      'return Array.from({length: 4000}, (_, i) => ({ id: i, pad: "x".repeat(60) }));',
      { resultStore: store },
    );
    expect(result.error).toBeUndefined();
    expect(result.truncated).toBe(true);
    expect(result.result._total).toBe(4000);
    expect(result.hint).toContain("EACCES");
  }, 15000);

  test("a result over the file limit is described, not stored", async () => {
    const store = tempStore({ maxBytes: 150_000 });
    const result = await execute(
      'return Array.from({length: 4000}, (_, i) => ({ id: i, pad: "x".repeat(60) }));',
      { resultStore: store },
    );
    expect(result.error).toBeUndefined();
    expect(result.truncated).toBe(true);
    expect(result.resultFile).toBeUndefined();
    expect(result.hint).toContain("150000-byte limit");
  }, 15000);

  // One huge item must not turn a ten-item preview into a 2 MB response.
  test("a preview is bounded by bytes, not only by item count", async () => {
    const store = tempStore();
    const result = await execute('return ["x".repeat(2000000), "short"];', {
      resultStore: store,
    });
    expectPreviewBounded(result);
    expect(result.resultFile).toBeDefined();
    expect(result.result.items[0]).toEndWith("[2000000 chars, truncated]");
    expect(result.result.items[1]).toBe("short");
    expect(JSON.parse(readFileSync(result.resultFile, "utf8"))[0]).toHaveLength(
      2000000,
    );
  }, 15000);

  test("an object preview clips what it opens and names what it does not", async () => {
    const store = tempStore();
    const result = await execute(
      `return {
        small: { note: "y".repeat(300000) },
        wide: Object.fromEntries(Array.from({length: 8}, (_, i) => ["k" + i, "z".repeat(50000)])),
        list: Array.from({length: 3}, () => "w".repeat(100000)),
        text: "v".repeat(400000),
        n: 1,
      };`,
      { resultStore: store },
    );
    expectPreviewBounded(result);
    const { preview } = result.result;
    expect(preview.small.note).toEndWith("[300000 chars, truncated]");
    expect(preview.wide).toStartWith("{Object: keys=k0, k1");
    expect(preview.list).toHaveLength(3);
    expect(preview.list[0]).toEndWith("[100000 chars, truncated]");
    expect(preview.text).toEndWith("[400000 chars, truncated]");
    expect(preview.n).toBe(1);
    expect(result.result._showing).toBe(5);
  }, 15000);

  // Property names and escaping count too, since the bound is on the JSON the model receives.
  test("a preview budget covers property names and escaping", async () => {
    const store = tempStore();
    const named = await execute(
      'return { ["k".repeat(150000)]: 1, other: "x".repeat(100000) };',
      { resultStore: store },
    );
    expectPreviewBounded(named);
    expect(named.result._showing).toBe(2);
    const escaped = await execute('return ["\\0".repeat(200000)];', {
      resultStore: store,
    });
    expectPreviewBounded(escaped);
    expect(escaped.result.items[0]).toEndWith("[200000 chars, truncated]");
  }, 15000);

  // Deep nesting with long names drives an entry's share down to nothing.
  // Clipping used to loop forever there.
  test("a preview of deeply nested long names terminates and stays small", async () => {
    const store = tempStore();
    const result = await execute(
      `
      const wide = () => Object.fromEntries(Array.from({length: 5}, (_, i) => ["name".repeat(100) + i, "x".repeat(4000)]));
      const nest = (depth) => depth === 0 ? wide() : Object.fromEntries(Array.from({length: 5}, (_, i) => ["level".repeat(80) + i, nest(depth - 1)]));
      return { deep: nest(3) };
      `,
      { resultStore: store },
    );
    expectPreviewBounded(result);
  }, 15000);

  // The first item always gets in, so a tree that keeps opening as its budget runs out has to be stopped some other way.
  test("a five-way tree as the first item stays inside the preview budget", async () => {
    const store = tempStore();
    const result = await execute(
      `
      const nest = (depth) => depth === 0 ? "leaf".repeat(20) : Object.fromEntries(Array.from({length: 5}, (_, i) => ["branch" + i, nest(depth - 1)]));
      return [nest(5), "x".repeat(200000)];
      `,
      { resultStore: store },
    );
    expectPreviewBounded(result);
    expect(result.resultFile).toBeDefined();
  }, 15000);

  // A result the sandbox had to cut down is not the result, and must not be stored as if it were.
  test("a result that cannot be cut down to fit is described, not stored", async () => {
    const store = tempStore();
    const result = await execute(
      'return Array.from({length: 20000}, (_, i) => ({ id: i, pad: "x".repeat(200) }));',
      { resultStore: store },
    );
    expect(result.error).toBeUndefined();
    expect(result.truncated).toBe(true);
    expect(result.result._truncated).toBe(true);
    expect(result.hint).toContain("only a description");
    expect(result.hint).toContain("above the 4000000-byte limit");
    expect(result.resultFile).toBeUndefined();
    expect(readdirSync(store.directory)).toEqual([]);
  }, 20000);

  test("a shallower result that fits inline is flagged as incomplete", async () => {
    const store = tempStore();
    const result = await execute(
      'return { data: Object.fromEntries(Array.from({length: 40}, (_, i) => ["k" + i, "x".repeat(110000)])), count: 40 };',
      { resultStore: store },
    );
    expect(result.error).toBeUndefined();
    expect(result.truncated).toBe(true);
    expect(result.resultFile).toBeUndefined();
    expect(result.result.count).toBe(40);
    expect(result.result.data.k0).toBe("[truncated: max depth]");
    expect(result.hint).toContain("nested deeper than 1 level were");
    expect(result.hint).toContain("not written to a file");
    expect(readdirSync(store.directory)).toEqual([]);
  }, 20000);

  // The hint has to name the remote budget, not the local one.
  test("a remote hint names the remote limit", async () => {
    const result = await execute('return "x".repeat(150000);', {
      apiToken: "synthetic-token",
      remote: true,
      profile: getExecutionRuntime(),
    });
    expect(result.error).toBeUndefined();
    expect(result.truncated).toBe(true);
    expect(result.resultBytes).toBe(150002);
    expect(result.hint).toContain("above the 100000-byte limit");
    expect(result.hint).not.toContain("4000000");
    expect(result.result._truncated).toBe(true);
  }, 15000);

  // Empty entries still cost their framing, and control characters grow when escaped.
  test("the console cap counts serialized bytes, not text length", async () => {
    const empties = await execute(
      'for (let i = 0; i < 10000; i++) console.log(""); return 1;',
    );
    expect(empties.error).toContain("Output too large");
    const nuls = await execute('console.log("\\0".repeat(90000)); return 1;');
    expect(nuls.error).toContain("Output too large");
  }, 20000);

  // Throwing must not be a way to smuggle a large log through.
  test("oversize console output is refused on a failed execution too", async () => {
    const result = await execute(
      'console.log("x".repeat(120000)); throw new Error("after logging");',
    );
    expect(result.error).toContain("Output too large");
    expect(result.console).toBeUndefined();
  }, 15000);

  test("an oversize error is refused rather than returned whole", async () => {
    const result = await execute('throw new Error("e".repeat(600000));');
    expect(result.error).toContain("Output too large");
    expect(result.error).toContain("error details");
    expect(result.error.length).toBeLessThan(1000);
  }, 15000);

  // Skipped: takes ~30s to trigger the timeout. Run manually with:
  //   bun test test/execute.test.js -t "infinite loop"
  test.skip("infinite loop is killed after timeout (30s)", async () => {
    const result = await execute("while(true) {}");
    expect(result.error).toContain("timed out");
  }, 35000);

  test("hung fetch is killed by wall-clock timeout", async () => {
    const server = await startLocalServer(() => {});
    try {
      const result = await execute(
        `await fetch(${JSON.stringify(server.url)}); return 1;`,
      );
      expect(result.error).toContain("timed out");
    } finally {
      await server.close();
    }
  }, 40000);
});
