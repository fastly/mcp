import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { getExecutionRuntime } from "../src/execution-runtime.js";
import { PREVIEW_BYTES } from "../src/limits.js";
import { createResultStore } from "../src/result-files.js";
import { SecretShield } from "../src/secrets.js";
import { execute } from "../src/tools/execute.js";
import {
  expectNoInternals,
  GITHUB_PAT,
  startLocalServer,
  tempDir,
  tokenAtPreviewCut,
} from "./helpers.js";

const NODE_HARNESS_PATH = join(
  import.meta.dir,
  "fixtures/run-sandbox-under-node.mjs",
);

const NODE_EXECUTE_HARNESS_PATH = join(
  import.meta.dir,
  "fixtures/run-execute-under-node.mjs",
);

const SCRIPTED_CHILD_PATH = join(
  import.meta.dir,
  "fixtures/scripted-child.mjs",
);

function executeRemotely(code) {
  return execute(code, {
    apiToken: "synthetic-token",
    remote: true,
    profile: getExecutionRuntime(),
  });
}

// What the model would see of a remote result, once the shield has run over the response.
function remoteResponse(result) {
  const shield = SecretShield.forCaller("synthetic-token");
  try {
    return shield.encrypt(JSON.stringify(result, null, 2));
  } finally {
    shield.destroy();
  }
}

// Runs a stand-in child that writes the given stderr pieces and stdout instead of running code.
function executeScripted(script, options) {
  return execute(JSON.stringify(script), {
    ...options,
    profile: {
      executable: process.execPath,
      args: [],
      entry: SCRIPTED_CHILD_PATH,
      env: {},
      cwd: import.meta.dir,
    },
  });
}

const LATE_REJECTION_CODE =
  'Promise.reject(new Error("late")); console.log("x".repeat(90000)); return 7;';

const temporaryStores = new Set();

function tempStore(options) {
  const store = createResultStore({
    dir: tempDir("execute-results"),
    ...options,
  });
  temporaryStores.add(store);
  return store;
}

afterAll(() => {
  for (const store of temporaryStores) {
    store.close();
    rmSync(store.directory, { recursive: true, force: true });
  }
});

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

  test("an error with a throwing metadata getter stays a user error", async () => {
    const result = await execute(`
      const error = new Error("user failure");
      Object.defineProperty(error, "status", { get() { throw new Error("getter trap"); } });
      throw error;
    `);
    expect(result.error).toBe("user failure");
    expect(result.error).not.toContain("Subprocess error");
  }, 10000);

  test("hostile stack and constructor metadata cannot crash the subprocess", async () => {
    const stack = await execute(`
      const error = new Error("user failure");
      Object.defineProperty(error, "stack", { get() { throw new Error("stack trap"); } });
      throw error;
    `);
    expect(stack.error).toBe("user failure");
    expect(stack.error).not.toContain("Subprocess error");

    const constructorFailure = await execute(`
      const name = { [Symbol.toPrimitive]() { throw new Error("constructor trap"); } };
      throw { constructor: { name } };
    `);
    expect(constructorFailure.error).toBe('{"constructor":{"name":{}}}');
    expect(constructorFailure.error).not.toContain("Subprocess error");
  }, 15000);

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

  test("console output survives a snippet that returns nothing", async () => {
    const result = await execute('console.log("debug info");');
    expect(result.error).toBeUndefined();
    expect(result.console).toEqual([{ level: "log", text: "debug info" }]);
  }, 10000);

  test("an error that fits keeps its message when console output would not", async () => {
    const result = await execute(
      'console.log("x".repeat(95000)); throw new Error("y".repeat(20000));',
    );
    expect(result.error).toBe("y".repeat(20000));
    expect(result.console).toBeUndefined();
    expect(result.hint).toContain("Console output was omitted");
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

  test("the subprocess does not inherit parent NODE_OPTIONS", async () => {
    const previous = process.env.NODE_OPTIONS;
    process.env.NODE_OPTIONS = "--not-a-real-node-option";
    try {
      expect(await execute("return 42;")).toEqual({ result: 42 });
    } finally {
      if (previous === undefined) delete process.env.NODE_OPTIONS;
      else process.env.NODE_OPTIONS = previous;
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

  // A token cut in half no longer looks like one, so encrypting the preview after clipping it let 39 of 40 characters through.
  test("a secret cut by the preview is encrypted before it is cut", async () => {
    const token = GITHUB_PAT;
    const code = tokenAtPreviewCut(token);
    const partial = token.slice(0, -1);

    // Without a shield the cut lands inside the token, which is what makes this a test of the ordering.
    const plain = await execute(code, { resultStore: tempStore() });
    expect(plain.result.head).toContain(partial);
    expect(plain.result.head).not.toContain(token);

    for (const resultStore of [tempStore(), null]) {
      const shield = new SecretShield();
      const result = await execute(code, { resultStore, shield });
      expect(result.truncated).toBe(true);
      // The response already holds encrypted values, which can't be encrypted again.
      const response = JSON.stringify(result);
      expect(response).not.toContain(partial);
      expect(response).not.toContain(token.slice(0, 10));
      if (resultStore) {
        const stored = readFileSync(result.resultFile, "utf8");
        expect(stored).not.toContain(token);
        expect(result.result.head).toStartWith(
          JSON.parse(stored).slice(0, 1000),
        );
      }
    }
  }, 15000);

  test("a result whose secrets cannot be encrypted is withheld, not previewed", async () => {
    const store = tempStore();
    const result = await execute('return "a\\n" + "x".repeat(200000);', {
      resultStore: store,
      shield: {
        encrypt: () => {
          throw new Error("cycle walk did not converge");
        },
      },
    });
    expect(result.error).toContain("withheld");
    expect(result.result).toBeUndefined();
    expect(readdirSync(store.directory)).toEqual([]);
  }, 15000);

  test("stored results are shielded as values before JSON serialization", async () => {
    const store = tempStore();
    const shield = new SecretShield({ key: Buffer.alloc(16, 7) });
    const prefix = "a\nAb0Cd1Ef2Gh3Ij4Kl5Mn6Op7Qr8St9U.";
    const result = await execute(
      `return ${JSON.stringify(prefix)} + "x".repeat(200000);`,
      { resultStore: store, shield },
    );
    expect(result.error).toBeUndefined();
    expect(result.resultFile).toBeDefined();
    expect(JSON.parse(readFileSync(result.resultFile, "utf8"))).toBe(
      `${prefix}${"x".repeat(200000)}`,
    );
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

  test("a small result beyond the depth cap is flagged as incomplete", async () => {
    const result = await execute(
      "let value = { leaf: 42 }; for (let i = 0; i < 7; i++) value = { next: value }; return value;",
    );
    expect(result.truncated).toBe(true);
    expect(result.resultBytes).toBeUndefined();
    expect(result.resultFile).toBeUndefined();
    expect(JSON.stringify(result.result)).toContain("[truncated: max depth]");
    expect(result.hint).toContain("complete size is unknown");
  }, 10000);

  // The hint has to name the remote budget, not the local one.
  test("a remote hint names the remote limit", async () => {
    const result = await executeRemotely('return "x".repeat(150000);');
    expect(result.error).toBeUndefined();
    expect(result.truncated).toBe(true);
    expect(result.resultBytes).toBe(150002);
    expect(result.hint).toContain("above the 100000-byte limit");
    expect(result.hint).not.toContain("4000000");
    expect(result.result._truncated).toBe(true);
  }, 15000);

  // A proxy that throws a huge error used to get past the sandbox's budget, and the message then reached a preview clipped before the remote shield ran.
  test("a remote result that throws a huge error while being read never shows part of a secret", async () => {
    const before = 1000 - (GITHUB_PAT.length - 1);
    const result = await executeRemotely(
      `const message = " ".repeat(${before}) + "${GITHUB_PAT}" + " ".repeat(150000);
      return new Proxy({}, { ownKeys() { throw new Error(message); } });`,
    );
    expect(result.result).toBe(`[unserializable: ${" ".repeat(before)}…]`);
    expect(remoteResponse(result)).not.toContain(GITHUB_PAT.slice(4, 14));
  }, 15000);

  // The sandbox is supposed to keep remote results under the limit; one that doesn't must not be trusted, whatever it claims.
  test("a remote result over the inline limit is refused, not previewed", async () => {
    const result = "x".repeat(150_000);
    for (const reduced of [undefined, { bytes: 150_002, depth: 0 }]) {
      const out = await executeScripted(
        { stdout: JSON.stringify({ ok: true, result, reduced }) },
        { apiToken: "synthetic-token", remote: true },
      );
      expect(out.result).toBeUndefined();
      expect(out.error).toContain("Output too large");
      expect(out.outcome).toBe("output_too_large");
    }
  }, 15000);

  // Error details are cut in the child, long before the remote shield sees them.
  test("error details cut in the sandbox never show part of a secret", async () => {
    const opening = 'const e = new Error("boom"); //';
    const pad = 200 - (GITHUB_PAT.length - 1) - opening.length;
    const code = [
      opening + " ".repeat(pad) + GITHUB_PAT,
      `e.body = " ".repeat(1970) + "${GITHUB_PAT}" + " ".repeat(100);`,
      "throw e;",
    ].join("\n");
    const result = await executeRemotely(code);
    expect(result.error).toBe("boom");
    expect(result.line.source).toBe(`${opening}${" ".repeat(pad)}…`);
    expect(result.body).toBe(`${" ".repeat(1970)}…`);
    expect(remoteResponse(result)).not.toContain(GITHUB_PAT.slice(4, 14));
  }, 15000);

  test("crash output cut for the error never shows part of a secret", async () => {
    const lead = "x".repeat(1980);
    // The token straddles the 2,000-character cut and arrives in two separate writes.
    const result = await executeScripted({
      stderr: [lead + GITHUB_PAT.slice(0, 25), `${GITHUB_PAT.slice(25)} after`],
    });
    expect(result.outcome).toBe("crashed");
    expect(result.error).toBe(`Subprocess error: ${lead}`);
  }, 15000);

  test("crash output that fits the capture limit is shown whole up to the cut", async () => {
    const result = await executeScripted({
      stderr: ["é".repeat(500), "é".repeat(500)],
    });
    expect(result.error).toBe(`Subprocess error: ${"é".repeat(1000)}`);
  }, 15000);

  // Whether a token is recognized can depend on what follows it, so output that wasn't captured whole can't be checked.
  test("crash output over the capture limit is omitted, not cut", async () => {
    const result = await executeScripted({
      stderr: [`${GITHUB_PAT} `, "y".repeat(60_000), "z".repeat(60_000)],
    });
    expect(result.outcome).toBe("crashed");
    expect(result.error).toContain("omitted");
    expect(result.error).not.toContain("ghp_");
    expect(result.error.length).toBeLessThan(200);
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

// What comes right before a truncation note must never be part of an encrypted value.
const PARTIAL_WRAPPER_BEFORE_NOTE =
  /\{(?:E|EN|ENC|ENCR|ENCRY|ENCRYP|ENCRYPT|ENCRYPTE|ENCRYPTED|ENCRYPTED:[0-9A-Za-z+/\-_.]*) \[\d+ chars, truncated\]/;

// Where the cut lands in the 60-character encrypted value: inside "{ENCRYPTED:", right after it, in the middle, and just before the closing brace.
const CUT_OFFSETS = [5, 11, 30, 59];

function kept(budget, clippedLength) {
  return budget - ` [${clippedLength} chars, truncated]`.length - 2;
}

async function previewWithShield(code) {
  const shield = new SecretShield();
  try {
    const result = await execute(code, { resultStore: null, shield });
    expect(result.truncated).toBe(true);
    const response = JSON.stringify(result);
    expect(response).not.toMatch(PARTIAL_WRAPPER_BEFORE_NOTE);
    expect(response).not.toContain(GITHUB_PAT.slice(0, 10));
    // Every encrypted value left in the response is whole, so it can be used again.
    expect(() => shield.decrypt(response)).not.toThrow();
    return { result, shield: shield.decrypt(response) };
  } finally {
    shield.destroy();
  }
}

describe("previews never cut a wrapper", () => {
  test("the head of a scalar preview", async () => {
    const length = 100_001;
    const cut = kept(PREVIEW_BYTES, length + 20);
    for (const offset of [...CUT_OFFSETS, 60]) {
      const before = cut - offset;
      const code = `return " ".repeat(${before}) + "${GITHUB_PAT}" + " ".repeat(${length - before - GITHUB_PAT.length});`;
      const { result, shield: decrypted } = await previewWithShield(code);
      const head = result.result.head;
      const text = head.slice(0, head.lastIndexOf(" ["));
      if (offset < 60) {
        expect(text).toBe(" ".repeat(before));
      } else {
        expect(text.endsWith("}")).toBe(true);
        expect(decrypted).toContain(GITHUB_PAT);
      }
    }
  }, 30000);

  test("a string nested in an array", async () => {
    const itemLength = 60_000;
    const share = Math.floor((PREVIEW_BYTES - 2 - 1) / 2);
    const cut = kept(share, itemLength + 20);
    for (const offset of CUT_OFFSETS) {
      const before = cut - offset;
      const code = `return [" ".repeat(${before}) + "${GITHUB_PAT}" + " ".repeat(${itemLength - before - GITHUB_PAT.length}), "y".repeat(${itemLength})];`;
      const { result } = await previewWithShield(code);
      const [first] = result.result.items;
      expect(first.slice(0, first.lastIndexOf(" ["))).toBe(" ".repeat(before));
    }
  }, 30000);

  test("a property name", async () => {
    const keyLength = 400;
    const cut = kept(200, keyLength + 20);
    for (const offset of CUT_OFFSETS) {
      const before = cut - offset;
      const key = `${" ".repeat(before)}${GITHUB_PAT}${" ".repeat(keyLength - before - GITHUB_PAT.length)}`;
      const code = `return { ${JSON.stringify(key)}: "x".repeat(60000), b: "y".repeat(60000) };`;
      const { result } = await previewWithShield(code);
      const [name] = Object.keys(result.result.preview);
      expect(name.slice(0, name.lastIndexOf(" ["))).toBe(" ".repeat(before));
    }
  }, 30000);

  test("the key names listed in an object summary", async () => {
    const keyLength = 100;
    const cut = kept(64, keyLength + 20);
    for (const offset of CUT_OFFSETS.filter((offset) => offset <= cut)) {
      const before = cut - offset;
      const key = `${" ".repeat(before)}${GITHUB_PAT}${" ".repeat(keyLength - before - GITHUB_PAT.length)}`;
      const code = `const big = { ${JSON.stringify(key)}: "v".repeat(2000) };
        for (const k of ["a", "b", "c", "d", "e"]) big[k] = "v".repeat(2000);
        return [big, "z".repeat(120000)];`;
      const { result } = await previewWithShield(code);
      const [summary] = result.result.items;
      expect(summary).toStartWith(`{Object: keys=${" ".repeat(before)} [`);
    }
  }, 30000);
});

describe("child output validation", () => {
  const UNREADABLE = {
    error: "The subprocess returned output this server could not read",
    outcome: "crashed",
  };

  function spyShield() {
    const seen = [];
    const encrypt = (text) => {
      seen.push(text);
      return text;
    };
    return { seen, shield: { encrypt } };
  }

  test("output that breaks the sandbox's contract never reaches the shield", async () => {
    const padding = "p".repeat(7_000_000);
    const cases = [
      JSON.stringify({ ok: true, result: 0, padding }),
      JSON.stringify({ ok: false, error: "boom", padding }),
      JSON.stringify({ ok: "yes", result: 0 }),
      JSON.stringify({ ok: true }),
      JSON.stringify({ ok: false, error: { message: "boom" } }),
      JSON.stringify({ ok: false, error: "boom", status: "404" }),
      JSON.stringify({ ok: false, error: "boom", statusText: "" }),
      JSON.stringify({
        ok: true,
        result: 0,
        reduced: { bytes: "12", depth: 0 },
      }),
      '{"ok":true,"result":0,"reduced":{"bytes":1e400,"depth":0}}',
      JSON.stringify({
        ok: true,
        result: 0,
        reduced: { bytes: 1, depth: 0, extra: 1 },
      }),
      JSON.stringify({
        ok: false,
        error: "boom",
        line: { number: 1, column: 1, source: "x", extra: "y" },
      }),
      JSON.stringify({
        ok: true,
        result: 0,
        console: [{ level: "trace", text: "hi" }],
      }),
      JSON.stringify([{ ok: true, result: 0 }]),
      `{"ok":true,"result":"${GITHUB_PAT}`,
    ];
    for (const stdout of cases) {
      const { seen, shield } = spyShield();
      const out = await executeScripted({ stdout }, { shield });
      expect(out).toEqual(UNREADABLE);
      expect(seen).toEqual([]);
    }
  }, 60000);

  test("oversized error details are refused before the shield sees them", async () => {
    const { seen, shield } = spyShield();
    const out = await executeScripted(
      { stdout: JSON.stringify({ ok: false, error: "e".repeat(200_000) }) },
      { shield },
    );
    expect(out.outcome).toBe("output_too_large");
    expect(seen).toEqual([]);
  }, 15000);

  test("every shape the sandbox writes still goes through", async () => {
    const { seen, shield } = spyShield();
    const cases = [
      ['throw "plain";', (out) => expect(out.error).toBe("plain")],
      [
        'throw Object.assign(new Error("Not Found"), { status: 404, statusText: "Not Found", body: "missing", hint: "check the id" });',
        (out) =>
          expect(out).toMatchObject({
            error: "Not Found",
            status: 404,
            statusText: "Not Found",
            body: "missing",
            hint: "check the id",
          }),
      ],
      [
        'console.warn("careful");\nconst e = new Error("boom");\nthrow e;',
        (out) => {
          expect(out.error).toBe("boom");
          expect(out.line).toMatchObject({ number: 2 });
          expect(out.console).toEqual([{ level: "warn", text: "careful" }]);
        },
      ],
    ];
    // The snippet can rewrite its stack, so the column can be huge.
    for (const column of ["9007199254740993", "9".repeat(400)]) {
      cases.push([
        `const e = new Error("rewritten"); e.stack = "Error: rewritten\\n    at user-code:2:${column}"; throw e;`,
        (out) => {
          expect(out.error).toBe("rewritten");
          expect(out.line.number).toBe(1);
        },
      ]);
    }
    for (const [code, check] of cases) {
      const out = await execute(code, { shield });
      expect(out.error).not.toBe(UNREADABLE.error);
      check(out);
    }
    expect(seen.length).toBeGreaterThan(0);
  }, 30000);
});
