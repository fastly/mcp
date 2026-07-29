import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { execute } from "../src/tools/execute.js";
import { expectNoInternals } from "./helpers.js";

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

  test("large array is auto-summarized", async () => {
    const result = await execute(
      'return Array.from({length: 50}, (_, i) => ({id: i, name: "item" + i}));',
    );
    expect(result.result._type).toBe("array");
    expect(result.result._total).toBe(50);
    expect(result.result._showing).toBe(10);
    expect(result.result.items).toHaveLength(10);
    expect(result.truncated).toBe(true);
  }, 10000);

  test("a __proto__ key survives object auto-summarization", async () => {
    const result = await execute(`
      const obj = {};
      Object.defineProperty(obj, "__proto__", {
        value: 1, enumerable: true, writable: true, configurable: true,
      });
      for (let i = 0; i < 40; i++) obj["key" + i] = i;
      return obj;
    `);
    expect(result.result._type).toBe("object");
    expect(result.truncated).toBe(true);
    const preview = result.result.preview;
    expect(Object.getPrototypeOf(preview)).toBe(Object.prototype);
    expect(Object.getOwnPropertyDescriptor(preview, "__proto__").value).toBe(1);
    expect(preview.key0).toBe(0);
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

  test("WebAssembly is available", async () => {
    const result = await execute(
      "const m = new WebAssembly.Module(new Uint8Array([0,97,115,109,1,0,0,0])); return WebAssembly.Module.imports(m).length;",
    );
    expect(result).toEqual({ result: 0 });
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

  // safeSerialize shrinks a large return value before it can reach the
  // cap; only console text, which crosses the bridge verbatim, can drive
  // the output past it.
  test("parent-side stdout cap kills subprocess on oversize output", async () => {
    const result = await execute('console.log("x".repeat(120000)); return 1;');
    expect(result.error).toContain("Output too large");
  }, 15000);

  // "€" is one code unit but three UTF-8 bytes, so counting string length
  // instead of chunk bytes would let this 120 KB payload through.
  test("the cap counts bytes, not string length", async () => {
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

  // 40,000 euro signs are 40,002 code units but 120,002 UTF-8 bytes; a
  // code-unit budget would let them through to die at the parent cap.
  test("serializer truncation triggers on bytes, not code units", async () => {
    const result = await execute('return "\\u20ac".repeat(40000);');
    expect(result.error).toBeUndefined();
    expect(result.result._truncated).toBe(true);
    expect(result.result._message).toContain("Result too large (120002 bytes");
  }, 15000);

  // Same unit bug, auto-summary flavor: five 3,000-euro strings are under
  // the 20 KB summary threshold in code units but 45 KB serialized.
  test("auto-summary size threshold counts bytes, not code units", async () => {
    const result = await execute(
      'return Array.from({length: 5}, () => "\\u20ac".repeat(3000));',
    );
    expect(result.truncated).toBe(true);
    expect(result.result._type).toBe("array");
    expect(result.result._hint).toContain("bytes serialized");
  }, 15000);

  // Skipped: takes ~30s to trigger the timeout. Run manually with:
  //   bun test test/execute.test.js -t "infinite loop"
  test.skip("infinite loop is killed after timeout (30s)", async () => {
    const result = await execute("while(true) {}");
    expect(result.error).toContain("timed out");
  }, 35000);

  test("hung async (fetch-style) is killed by wall-clock timeout", async () => {
    const result = await execute("await new Promise(() => {}); return 1;");
    expect(result.error).toContain("timed out");
  }, 40000);
});
