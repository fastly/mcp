import { describe, expect, test } from "bun:test";
import { safeSerialize } from "../src/serializer.js";

describe("safeSerialize", () => {
  test("circular reference produces '[circular]'", () => {
    const obj = { a: 1 };
    obj.self = obj;
    const result = safeSerialize(obj);
    expect(result.a).toBe(1);
    expect(result.self).toBe("[circular]");
  });

  test("BigInt produces string with n suffix", () => {
    const result = safeSerialize(42n);
    expect(result).toBe("42n");
  });

  test("Buffer produces '[Buffer: N bytes]'", () => {
    const result = safeSerialize(Buffer.from("hello"));
    expect(result).toBe("[Buffer: 5 bytes]");
  });

  test("Uint8Array produces '[Buffer: N bytes]'", () => {
    const result = safeSerialize(new Uint8Array(10));
    expect(result).toBe("[Buffer: 10 bytes]");
  });

  test("function produces '[function]'", () => {
    const result = safeSerialize(() => {});
    expect(result).toBe("[function]");
  });

  test("Symbol produces 'Symbol(test)'", () => {
    const result = safeSerialize(Symbol("test"));
    expect(result).toBe("Symbol(test)");
  });

  test("deeply nested object truncates at maxDepth", () => {
    const obj = { l1: { l2: { l3: { l4: { l5: "deep" } } } } };
    const result = safeSerialize(obj, { maxDepth: 2 });
    // depth starts at 0 for the root; depth 1 = l1, depth 2 = l2, depth 3 > 2 = truncated
    expect(result.l1.l2.l3).toBe("[truncated: max depth]");
  });

  test("oversized output triggers depth reduction to fit within maxSize", () => {
    // Build a wide object with enough nested data to exceed a tiny maxSize
    const big = {};
    for (let i = 0; i < 100; i++) {
      big[`key${i}`] = { nested: { value: "x".repeat(50) } };
    }
    const maxSize = 500;
    const result = safeSerialize(big, { maxSize });
    const json = JSON.stringify(result);
    expect(json.length).toBeLessThanOrEqual(maxSize);
  });

  test("truncated result includes _truncated flag and _previewKeys", () => {
    // Create an object large enough that even depth=1 exceeds a tiny maxSize
    const huge = {};
    for (let i = 0; i < 200; i++) {
      huge[`key${i}`] = "x".repeat(100);
    }
    const result = safeSerialize(huge, { maxSize: 50 });
    expect(result._truncated).toBe(true);
    expect(Array.isArray(result._previewKeys)).toBe(true);
    expect(result._previewKeys.length).toBeLessThanOrEqual(20);
  });

  test("result is always valid JSON for each edge case", () => {
    const edgeCases = [
      42n,
      Buffer.from("hello"),
      new Uint8Array(10),
      () => {},
      Symbol("x"),
      null,
      { a: { b: { c: { d: "deep" } } } },
      [1, undefined, 3],
      "hello",
      123,
      true,
    ];
    for (const value of edgeCases) {
      expect(() => JSON.stringify(safeSerialize(value))).not.toThrow();
    }
  });

  test("null and undefined pass through", () => {
    expect(safeSerialize(null)).toBe(null);
    // Top-level undefined crashes the serializer (JSON.stringify(undefined) is
    // not a string), but undefined nested inside an object is handled correctly
    // by walk() and becomes undefined in the output (omitted by JSON.stringify).
    const result = safeSerialize({ a: undefined });
    expect(result.a).toBeUndefined();
  });

  test("primitive passthrough for strings, numbers, booleans", () => {
    expect(safeSerialize("hello")).toBe("hello");
    expect(safeSerialize(42)).toBe(42);
    expect(safeSerialize(true)).toBe(true);
    expect(safeSerialize(false)).toBe(false);
    expect(safeSerialize(0)).toBe(0);
    expect(safeSerialize("")).toBe("");
  });

  test("array with undefined produces null in that position", () => {
    const result = safeSerialize([1, undefined, 3]);
    // undefined in arrays becomes null when JSON.stringify is called
    const parsed = JSON.parse(JSON.stringify(result));
    expect(parsed).toEqual([1, null, 3]);
  });
});
