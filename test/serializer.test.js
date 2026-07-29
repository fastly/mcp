import { describe, expect, test } from "bun:test";
import { runInNewContext } from "node:vm";
import { safeSerialize } from "../src/serializer.js";

describe("safeSerialize", () => {
  test("circular reference produces '[circular]'", () => {
    const obj = { a: 1 };
    obj.self = obj;
    const result = safeSerialize(obj);
    expect(result.a).toBe(1);
    expect(result.self).toBe("[circular]");
  });

  test("repeated non-circular references are serialized in every branch", () => {
    const shared = { value: 1 };

    expect(safeSerialize({ first: shared, second: shared })).toEqual({
      first: { value: 1 },
      second: { value: 1 },
    });
  });

  test("BigInt produces string with n suffix", () => {
    const result = safeSerialize(42n);
    expect(result).toBe("42n");
  });

  test("Buffer produces '[Buffer: N bytes]'", () => {
    const result = safeSerialize(Buffer.from("hello"));
    expect(result).toBe("[Buffer: 5 bytes]");
  });

  test("Uint8Array produces '[Uint8Array: N bytes]'", () => {
    const result = safeSerialize(new Uint8Array(10));
    expect(result).toBe("[Uint8Array: 10 bytes]");
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

  test("Date serializes to its ISO string", () => {
    expect(safeSerialize(new Date("2024-01-02T03:04:05Z"))).toBe(
      "2024-01-02T03:04:05.000Z",
    );
    expect(safeSerialize(new Date(NaN))).toBe("Invalid Date");
  });

  test("RegExp serializes to its source form", () => {
    expect(safeSerialize(/ab+c/gi)).toBe("/ab+c/gi");
  });

  test("Error keeps name, message and own enumerable fields", () => {
    const err = new TypeError("boom");
    err.status = 401;
    expect(safeSerialize(err)).toEqual({
      name: "TypeError",
      message: "boom",
      status: 401,
    });
  });

  test("an Error referencing itself reports '[circular]'", () => {
    const err = new Error("boom");
    err.self = err;
    expect(safeSerialize(err)).toEqual({
      name: "Error",
      message: "boom",
      self: "[circular]",
    });
  });

  test("Map and Set keep their contents", () => {
    expect(safeSerialize(new Map([["a", 1]]))).toEqual({
      _type: "Map",
      entries: [["a", 1]],
    });
    expect(safeSerialize(new Set([1, 2]))).toEqual({
      _type: "Set",
      values: [1, 2],
    });
  });

  test("NaN and infinities survive as strings instead of null", () => {
    expect(safeSerialize(Number.NaN)).toBe("NaN");
    expect(safeSerialize(Number.POSITIVE_INFINITY)).toBe("Infinity");
    expect(safeSerialize({ a: Number.NEGATIVE_INFINITY })).toEqual({
      a: "-Infinity",
    });
  });

  test("typed arrays and DataView report their byte length", () => {
    expect(safeSerialize(new Float64Array(4))).toBe("[Float64Array: 32 bytes]");
    expect(safeSerialize(new DataView(new ArrayBuffer(8), 2, 3))).toBe(
      "[DataView: 3 bytes]",
    );
    expect(safeSerialize(new ArrayBuffer(16))).toBe("[ArrayBuffer: 16 bytes]");
  });

  test("values built in another realm are still recognized", () => {
    const make = (src) => runInNewContext(src);
    expect(safeSerialize(make("new Uint8Array(10)"))).toBe(
      "[Uint8Array: 10 bytes]",
    );
    expect(safeSerialize(make("new Date('2024-01-02T03:04:05Z')"))).toBe(
      "2024-01-02T03:04:05.000Z",
    );
    expect(safeSerialize(make("new Map([['a', 1]])"))).toEqual({
      _type: "Map",
      entries: [["a", 1]],
    });
    expect(safeSerialize(make("new Error('boom')"))).toEqual({
      name: "Error",
      message: "boom",
    });
  });

  test("Symbol.toStringTag cannot impersonate a built-in type", () => {
    const fakeDate = { [Symbol.toStringTag]: "Date", a: 1 };
    expect(safeSerialize(fakeDate)).toEqual({ a: 1 });

    const fakeMap = { [Symbol.toStringTag]: "Map", b: 2 };
    expect(safeSerialize(fakeMap)).toEqual({ b: 2 });
  });

  test("a throwing Symbol.toStringTag getter does not break serialization", () => {
    const hostile = { a: 1 };
    Object.defineProperty(hostile, Symbol.toStringTag, {
      get() {
        throw new Error("gotcha");
      },
    });
    expect(safeSerialize(hostile)).toEqual({ a: 1 });

    const hostileView = new Uint8Array(4);
    Object.defineProperty(hostileView, Symbol.toStringTag, {
      get() {
        throw new Error("gotcha");
      },
    });
    expect(safeSerialize(hostileView)).toBe("[TypedArray: 4 bytes]");
  });

  test("a detached DataView reports itself instead of throwing", () => {
    const buf = new ArrayBuffer(8);
    const view = new DataView(buf);
    buf.transfer();
    expect(safeSerialize(view)).toBe("[DataView: detached]");
    expect(safeSerialize({ view })).toEqual({ view: "[DataView: detached]" });
  });

  test("overridden instance methods cannot sabotage representation", () => {
    const date = new Date("2024-01-02T03:04:05Z");
    date.toISOString = () => {
      throw new Error("gotcha");
    };
    expect(safeSerialize(date)).toBe("2024-01-02T03:04:05.000Z");

    const map = new Map([["a", 1]]);
    map[Symbol.iterator] = () => {
      throw new Error("gotcha");
    };
    map.entries = map[Symbol.iterator];
    expect(safeSerialize(map)).toEqual({ _type: "Map", entries: [["a", 1]] });

    const regex = /x/g;
    regex.toString = () => {
      throw new Error("gotcha");
    };
    expect(safeSerialize(regex)).toBe("/x/g");
  });

  test("a throwing property getter poisons only that property", () => {
    const obj = { fine: 1 };
    Object.defineProperty(obj, "broken", {
      enumerable: true,
      get() {
        throw new Error("gotcha");
      },
    });
    expect(safeSerialize(obj)).toEqual({ fine: 1, broken: "[getter threw]" });

    const err = new Error("boom");
    Object.defineProperty(err, "status", {
      enumerable: true,
      get() {
        throw new Error("gotcha");
      },
    });
    expect(safeSerialize(err)).toEqual({
      name: "Error",
      message: "boom",
      status: "[getter threw]",
    });
  });

  test("a proxy that throws on re-enumeration cannot break the truncation fallback", () => {
    let calls = 0;
    const grudging = new Proxy(
      { data: "x".repeat(100) },
      {
        ownKeys(target) {
          calls++;
          if (calls > 1) throw new Error("second enumeration");
          return Reflect.ownKeys(target);
        },
      },
    );
    const result = safeSerialize(grudging, { maxDepth: 1, maxSize: 10 });
    expect(result._truncated).toBe(true);
    expect(result._previewKeys).toBeUndefined();
  });

  test("sparse arrays keep their holes", () => {
    const sparse = new Array(2);
    sparse[1] = 1;
    const result = safeSerialize(sparse);
    expect(result.length).toBe(2);
    expect(0 in result).toBe(false);
    expect(result[1]).toBe(1);
  });

  test("an enumerable __proto__ key survives without touching the prototype", () => {
    const parsed = JSON.parse('{"__proto__": {"x": 1}, "a": 2}');
    const result = safeSerialize(parsed);
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(result.a).toBe(2);
    expect(Object.getOwnPropertyDescriptor(result, "__proto__").value).toEqual({
      x: 1,
    });
    expect(JSON.stringify(result)).toBe('{"__proto__":{"x":1},"a":2}');
  });

  test("an enumerable __proto__ field on an Error survives too", () => {
    const err = new Error("boom");
    Object.defineProperty(err, "__proto__", {
      value: 42,
      enumerable: true,
      writable: true,
      configurable: true,
    });
    const result = safeSerialize(err);
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(result.name).toBe("Error");
    expect(Object.getOwnPropertyDescriptor(result, "__proto__").value).toBe(42);
  });

  test("a hostile proxy becomes a description, not a crash", () => {
    const hostile = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error("no keys for you");
        },
      },
    );
    expect(safeSerialize(hostile)).toBe("[unserializable: no keys for you]");
  });

  test("a megabyte-sized foreign-realm typed array collapses to a summary", () => {
    const big = runInNewContext("new Uint8Array(1024 * 1024)");
    expect(safeSerialize(big)).toBe("[Uint8Array: 1048576 bytes]");
    expect(safeSerialize({ payload: big })).toEqual({
      payload: "[Uint8Array: 1048576 bytes]",
    });
  });
});
