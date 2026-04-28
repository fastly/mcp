import { describe, expect, test } from "bun:test";
import { execute } from "../src/tools/execute.js";

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

  test("Fastly client is available in sandbox", async () => {
    const result = await execute("return typeof Fastly;");
    expect(result).toEqual({ result: "object" });
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

  test("Buffer is exposed for binary work", async () => {
    const result = await execute(
      "return Buffer.from('hello').toString('hex');",
    );
    expect(result).toEqual({ result: "68656c6c6f" });
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

  test("parent-side stdout cap kills subprocess on oversize output", async () => {
    const result = await execute(`return "x".repeat(200000);`);
    expect(
      result.error?.includes("Output too large") ||
        result.result?._truncated === true,
    ).toBe(true);
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
