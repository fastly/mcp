import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { execute } from "../src/tools/execute.js";
import { startLocalServer } from "./helpers.js";

let echoServer;
let echoUrl;

beforeAll(async () => {
  echoServer = await startLocalServer((req, res) => {
    if (req.url === "/slow") {
      const timer = setTimeout(() => {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("late");
      }, 8000);
      res.on("close", () => clearTimeout(timer));
      return;
    }
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          headers: req.headers,
          body: Buffer.concat(chunks).toString("utf8"),
        }),
      );
    });
  });
  echoUrl = `${echoServer.url}/`;
});

afterAll(async () => {
  if (echoServer) await echoServer.close();
});

async function hostSha256Hex(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes));
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const TO_HEX =
  "const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');";

describe("crypto.subtle.digest in the sandbox", () => {
  test("hashing TextEncoder output matches the real SHA-256", async () => {
    const expected = await hostSha256Hex([0x61, 0x62, 0x63]);
    const result = await execute(`
      ${TO_HEX}
      const bytes = new TextEncoder().encode("abc");
      return hex(await crypto.subtle.digest("SHA-256", bytes));
    `);
    expect(result.result).toBe(expected);
  }, 15000);

  test("a Uint16Array is hashed by its underlying bytes, not its elements", async () => {
    const result = await execute(`
      ${TO_HEX}
      const u16 = new Uint16Array([0x6261, 0x6463]);
      const viaView = hex(await crypto.subtle.digest("SHA-256", u16));
      const viaBytes = hex(await crypto.subtle.digest("SHA-256", new Uint8Array(u16.buffer)));
      return { viaView, viaBytes };
    `);
    expect(result.result.viaView).toBe(result.result.viaBytes);
    expect(result.result.viaView).toBe(
      await hostSha256Hex([0x61, 0x62, 0x63, 0x64]),
    );
  }, 15000);

  test("a DataView with an offset hashes only the bytes it covers", async () => {
    const expected = await hostSha256Hex([3, 4, 5]);
    const result = await execute(`
      ${TO_HEX}
      const buf = Uint8Array.from([1, 2, 3, 4, 5, 6]).buffer;
      return hex(await crypto.subtle.digest("SHA-256", new DataView(buf, 2, 3)));
    `);
    expect(result.result).toBe(expected);
  }, 15000);

  test("a bare ArrayBuffer is accepted", async () => {
    const expected = await hostSha256Hex([0, 0, 0, 0]);
    const result = await execute(`
      ${TO_HEX}
      return hex(await crypto.subtle.digest("SHA-256", new ArrayBuffer(4)));
    `);
    expect(result.result).toBe(expected);
  }, 15000);
});

describe("TextEncoder and TextDecoder in the sandbox", () => {
  test("multibyte text round-trips through encode and decode", async () => {
    const result = await execute(`
      const text = "héllo \\u{1F30D}";
      const bytes = new TextEncoder().encode(text);
      return { byteLength: bytes.byteLength, back: new TextDecoder().decode(bytes) };
    `);
    expect(result.result.back).toBe("héllo \u{1F30D}");
    expect(result.result.byteLength).toBe(11);
  }, 15000);

  test("decode respects the bounds of a subarray view", async () => {
    const result = await execute(`
      const bytes = new TextEncoder().encode("abcdef");
      return new TextDecoder().decode(bytes.subarray(2, 4));
    `);
    expect(result.result).toBe("cd");
  }, 15000);

  test("invalid UTF-8 decodes to replacement characters instead of throwing", async () => {
    const result = await execute(`
      return new TextDecoder().decode(Uint8Array.from([0x61, 0xff, 0x62]));
    `);
    expect(result.result).toBe("a�b");
  }, 15000);

  test("a leading UTF-8 BOM is stripped like the real TextDecoder does", async () => {
    const result = await execute(`
      return new TextDecoder().decode(Uint8Array.from([0xef, 0xbb, 0xbf, 0x61]));
    `);
    expect(result.result).toBe("a");
  }, 15000);

  test("a truncated sequence produces one replacement per maximal subpart", async () => {
    const cases = [
      [0xe0, 0xa0, 0x41], // lead + one continuation, then ASCII
      [0xf0, 0x9f, 0x8c, 0x41], // 4-byte lead cut short before its last byte
      [0xe0, 0x80, 0x61], // overlong start: E0 requires A0-BF next
      [0xed, 0xa0, 0x80], // encoded surrogate
    ];
    const result = await execute(`
      return ${JSON.stringify(cases)}.map((c) => new TextDecoder().decode(Uint8Array.from(c)));
    `);
    const expected = cases.map((c) =>
      new TextDecoder().decode(Uint8Array.from(c)),
    );
    expect(result.result).toEqual(expected);
  }, 15000);
});

describe("TextDecoder options in the sandbox", () => {
  test("fatal mode throws on malformed input instead of substituting", async () => {
    const result = await execute(`
      try {
        new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from([0xff]));
        return "no throw";
      } catch (e) {
        return e.name;
      }
    `);
    expect(result.result).toBe("TypeError");
  }, 15000);

  test("ignoreBOM keeps the BOM in the output", async () => {
    const result = await execute(`
      const bytes = Uint8Array.from([0xef, 0xbb, 0xbf, 0x61]);
      return new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);
    `);
    expect(result.result).toBe("﻿a");
  }, 15000);

  test("non-UTF-8 labels are rejected instead of mis-decoding", async () => {
    const result = await execute(`
      const outcomes = [];
      for (const label of ["utf-16le", "latin1", "nonsense"]) {
        try {
          new TextDecoder(label);
          outcomes.push("accepted");
        } catch (e) {
          outcomes.push(e.name);
        }
      }
      return outcomes;
    `);
    expect(result.result).toEqual(["RangeError", "RangeError", "RangeError"]);
  }, 15000);

  test("streaming decode is refused explicitly", async () => {
    const result = await execute(`
      try {
        new TextDecoder().decode(Uint8Array.from([0x61]), { stream: true });
        return "no throw";
      } catch (e) {
        return e.message;
      }
    `);
    expect(result.result).toMatch(/does not support streaming/);
  }, 15000);
});

describe("Headers facade in the sandbox", () => {
  test("lookups are case-insensitive regardless of how the name was stored", async () => {
    const result = await execute(`
      const h = new Headers([["Content-Type", "application/json"]]);
      return [h.get("content-type"), h.get("CONTENT-TYPE"), h.has("Content-Type")];
    `);
    expect(result.result).toEqual([
      "application/json",
      "application/json",
      true,
    ]);
  }, 15000);

  test("plain-object init and set/append/delete behave like real Headers", async () => {
    const result = await execute(`
      const h = new Headers({ "X-Foo": "1" });
      h.append("x-foo", "2");
      h.set("X-Bar", "3");
      h.delete("X-BAR");
      return { foo: h.get("x-foo"), bar: h.get("x-bar") };
    `);
    expect(result.result).toEqual({ foo: "1, 2", bar: null });
  }, 15000);

  test("a Headers instance passed to fetch reaches the wire", async () => {
    const result = await execute(`
      const res = await fetch("${echoUrl}", {
        headers: new Headers({ "X-Test": "present" }),
      });
      const body = await res.json();
      return body.headers["x-test"];
    `);
    expect(result.result).toBe("present");
  }, 15000);

  test("plain-object and pair-array headers still reach the wire", async () => {
    const result = await execute(`
      const asObject = await (await fetch("${echoUrl}", { headers: { "X-A": "1" } })).json();
      const asPairs = await (await fetch("${echoUrl}", { headers: [["X-B", "2"]] })).json();
      return [asObject.headers["x-a"], asPairs.headers["x-b"]];
    `);
    expect(result.result).toEqual(["1", "2"]);
  }, 15000);
});

describe("fetch bodies and abort in the sandbox", () => {
  test("binary bodies reach the wire byte for byte", async () => {
    const result = await execute(`
      const encoded = await (await fetch("${echoUrl}", {
        method: "POST",
        body: new TextEncoder().encode("abc"),
      })).json();
      const buffer = await (await fetch("${echoUrl}", {
        method: "POST",
        body: Uint8Array.from([0x64, 0x65, 0x66]).buffer,
      })).json();
      return [encoded.body, buffer.body];
    `);
    expect(result.result).toEqual(["abc", "def"]);
  }, 15000);

  test("string bodies still work", async () => {
    const result = await execute(`
      const echoed = await (await fetch("${echoUrl}", { method: "POST", body: "hello" })).json();
      return echoed.body;
    `);
    expect(result.result).toBe("hello");
  }, 15000);

  test("unsupported object bodies are rejected with a clear error", async () => {
    const result = await execute(`
      try {
        await fetch("${echoUrl}", { method: "POST", body: new FormData() });
        return "no throw";
      } catch (e) {
        return e.name + ": " + e.message;
      }
    `);
    expect(result.result).toMatch(
      /^TypeError: The sandbox fetch only supports/,
    );
  }, 15000);

  test("aborting after fetch starts rejects with AbortError", async () => {
    const result = await execute(`
      const controller = new AbortController();
      const pending = fetch("${echoUrl}", { signal: controller.signal });
      Promise.resolve().then(() => controller.abort());
      try {
        await pending;
        return "no throw";
      } catch (e) {
        return e.name;
      }
    `);
    expect(result.result).toBe("AbortError");
  }, 15000);

  test("an already-aborted signal rejects before any request is made", async () => {
    const result = await execute(`
      const controller = new AbortController();
      controller.abort();
      try {
        await fetch("http://127.0.0.1:1/", { signal: controller.signal });
        return "no throw";
      } catch (e) {
        return e.name;
      }
    `);
    expect(result.result).toBe("AbortError");
  }, 15000);

  test("an unaborted signal does not interfere with the response", async () => {
    const result = await execute(`
      const controller = new AbortController();
      const res = await fetch("${echoUrl}", { signal: controller.signal });
      return res.ok;
    `);
    expect(result.result).toBe(true);
  }, 15000);

  test("an abort fired from an options getter is not lost", async () => {
    const result = await execute(`
      const controller = new AbortController();
      const options = {
        signal: controller.signal,
        get headers() {
          controller.abort();
          return {};
        },
      };
      try {
        await fetch("${echoUrl}", options);
        return "no throw";
      } catch (e) {
        return e.name;
      }
    `);
    expect(result.result).toBe("AbortError");
  }, 15000);

  test("an explicit abort reason is preserved on both abort paths", async () => {
    const result = await execute(`
      const early = new AbortController();
      early.abort(new Error("sentinel-early"));
      let earlyMessage;
      try {
        await fetch("${echoUrl}", { signal: early.signal });
      } catch (e) {
        earlyMessage = e.message;
      }

      const late = new AbortController();
      const pending = fetch("${echoUrl}", { signal: late.signal });
      Promise.resolve().then(() => late.abort(new Error("sentinel-late")));
      let lateMessage;
      try {
        await pending;
      } catch (e) {
        lateMessage = e.message;
      }
      return [earlyMessage, lateMessage];
    `);
    expect(result.result).toEqual(["sentinel-early", "sentinel-late"]);
  }, 15000);

  test("listener changes during abort dispatch follow native semantics", async () => {
    const result = await execute(`
      const controller = new AbortController();
      const ran = [];
      function later() { ran.push("later"); }
      function added() { ran.push("added"); }
      function first() {
        ran.push("first");
        controller.signal.removeEventListener("abort", later);
        controller.signal.addEventListener("abort", later);
        controller.signal.addEventListener("abort", added);
      }
      controller.signal.addEventListener("abort", first);
      controller.signal.addEventListener("abort", later);
      controller.abort();
      return ran;
    `);
    expect(result.result).toEqual(["first"]);
  }, 15000);

  test("aborting a hung request returns promptly instead of waiting out the server", async () => {
    const start = performance.now();
    const result = await execute(`
      const controller = new AbortController();
      const pending = fetch("${echoUrl}slow", { signal: controller.signal });
      Promise.resolve().then(() => controller.abort());
      try {
        await pending;
        return "no throw";
      } catch (e) {
        return e.name;
      }
    `);
    const elapsed = performance.now() - start;
    expect(result.result).toBe("AbortError");
    expect(elapsed).toBeLessThan(5000);
  }, 15000);

  test("an unawaited fetch does not keep the subprocess alive", async () => {
    const started = performance.now();
    const result = await execute(`
      fetch("${echoUrl}slow");
      return "done";
    `);
    const elapsed = performance.now() - started;
    expect(result.result).toBe("done");
    expect(elapsed).toBeLessThan(5000);
  }, 15000);

  test("handleEvent listeners and onabort run in registration order", async () => {
    const result = await execute(`
      const controller = new AbortController();
      const ran = [];
      controller.signal.addEventListener("abort", {
        handleEvent() { ran.push("object"); },
      });
      controller.signal.onabort = () => ran.push("onabort");
      controller.signal.addEventListener("abort", () => ran.push("listener"));
      controller.abort();
      return ran;
    `);
    expect(result.result).toEqual(["object", "onabort", "listener"]);
  }, 15000);

  test("onabort keeps its registration slot across reassignment and null resets", async () => {
    const result = await execute(`
      const keep = new AbortController();
      const kept = [];
      keep.signal.onabort = () => kept.push("old");
      keep.signal.addEventListener("abort", () => kept.push("listener"));
      keep.signal.onabort = () => kept.push("new");
      keep.abort();

      const move = new AbortController();
      const moved = [];
      move.signal.onabort = () => moved.push("onabort");
      move.signal.addEventListener("abort", () => moved.push("listener"));
      move.signal.onabort = null;
      move.signal.onabort = () => moved.push("onabort");
      move.abort();
      return { kept, moved };
    `);
    expect(result.result).toEqual({
      kept: ["new", "listener"],
      moved: ["onabort", "listener"],
    });
  }, 15000);

  test("assigning onabort null first still reserves its dispatch slot", async () => {
    const result = await execute(`
      const controller = new AbortController();
      const ran = [];
      controller.signal.onabort = null;
      controller.signal.addEventListener("abort", () => ran.push("listener"));
      controller.signal.onabort = () => ran.push("handler");
      controller.abort();
      return ran;
    `);
    expect(result.result).toEqual(["handler", "listener"]);
  }, 15000);

  test("the capture flag is part of listener identity", async () => {
    const result = await execute(`
      const controller = new AbortController();
      let count = 0;
      function fn() { count++; }
      controller.signal.addEventListener("abort", fn);
      controller.signal.addEventListener("abort", fn, true);
      controller.signal.addEventListener("abort", fn, { capture: true });
      controller.signal.removeEventListener("abort", fn, true);
      controller.abort();
      return count;
    `);
    expect(result.result).toBe(1);
  }, 15000);

  test("a prototype-forged signal is rejected before any request is made", async () => {
    const result = await execute(`
      try {
        await fetch("http://127.0.0.1:1/", {
          signal: Object.create(AbortSignal.prototype),
        });
        return "no throw";
      } catch (e) {
        return e.name + ": " + e.message;
      }
    `);
    expect(result.result).toBe(
      "TypeError: The signal option must be an AbortSignal instance",
    );
  }, 15000);

  test("non-boolean primitive listener options are rejected like Node does", async () => {
    const result = await execute(`
      const controller = new AbortController();
      const outcomes = [];
      const fnOptions = () => {};
      for (const opts of [1, "true", 0, null, undefined, fnOptions]) {
        try {
          controller.signal.addEventListener("abort", () => {}, opts);
          outcomes.push("accepted");
        } catch (e) {
          outcomes.push(e.name);
        }
      }
      return outcomes;
    `);
    expect(result.result).toEqual([
      "TypeError",
      "TypeError",
      "TypeError",
      "accepted",
      "accepted",
      "accepted",
    ]);
  }, 15000);

  test("options are validated on add even for a null listener, never on remove", async () => {
    const result = await execute(`
      const controller = new AbortController();
      const outcomes = [];
      try {
        controller.signal.addEventListener("abort", null, 1);
        outcomes.push("accepted");
      } catch (e) {
        outcomes.push(e.name);
      }
      let count = 0;
      const fn = () => { count++; };
      controller.signal.addEventListener("abort", fn);
      try {
        controller.signal.removeEventListener("abort", fn, 1);
        outcomes.push("accepted");
      } catch (e) {
        outcomes.push(e.name);
      }
      controller.abort();
      outcomes.push(count);
      return outcomes;
    `);
    expect(result.result).toEqual(["TypeError", "accepted", 0]);
  }, 15000);

  test("event types go through ToString like native EventTarget", async () => {
    const result = await execute(`
      const a = new AbortController();
      let viaObjectType = 0;
      a.signal.addEventListener({ toString: () => "abort" }, () => { viaObjectType++; });
      a.abort();

      const b = new AbortController();
      let survived = 0;
      const fn = () => { survived++; };
      b.signal.addEventListener("abort", fn);
      b.signal.removeEventListener({ toString: () => "abort" }, fn);

      const outcomes = [];
      for (const attempt of [
        () => b.signal.addEventListener(Symbol("x"), fn),
        () => b.signal.addEventListener(Symbol("x"), null),
        () => b.signal.removeEventListener(Symbol("x"), fn),
        () => b.signal.removeEventListener(Symbol("x"), null),
      ]) {
        try {
          attempt();
          outcomes.push("ok");
        } catch (e) {
          outcomes.push(e.name);
        }
      }
      b.abort();
      return [viaObjectType, survived, ...outcomes];
    `);
    expect(result.result).toEqual([1, 0, "TypeError", "ok", "TypeError", "ok"]);
  }, 15000);

  test("borrowed listener methods reject a foreign receiver before anything else", async () => {
    const result = await execute(`
      const reads = [];
      const type = { toString() { reads.push("type"); return "abort"; } };
      const opts = { get capture() { reads.push("capture"); return false; } };
      const outcomes = [];
      for (const attempt of [
        () => AbortSignal.prototype.addEventListener.call({}, type, () => {}, opts),
        () => AbortSignal.prototype.removeEventListener.call({}, "other", () => {}, opts),
        () => AbortSignal.prototype.removeEventListener.call({}, type, null, opts),
      ]) {
        try {
          attempt();
          outcomes.push("ok");
        } catch (e) {
          outcomes.push(e.message);
        }
      }
      return { outcomes, reads };
    `);
    const receiverError = 'Value of "this" must be of type EventTarget';
    expect(result.result).toEqual({
      outcomes: [receiverError, receiverError, receiverError],
      reads: [],
    });
  }, 15000);

  test("remove with a null listener never touches the options", async () => {
    const result = await execute(`
      const controller = new AbortController();
      const boom = { get capture() { throw new Error("capture read"); } };
      const outcomes = [];
      for (const attempt of [
        () => controller.signal.removeEventListener("abort", null, boom),
        () => controller.signal.removeEventListener("abort", () => {}, boom),
      ]) {
        try {
          attempt();
          outcomes.push("ok");
        } catch (e) {
          outcomes.push(e.message);
        }
      }
      return outcomes;
    `);
    expect(result.result).toEqual(["ok", "capture read"]);
  }, 15000);

  test("tampering with AbortSignal statics cannot smuggle an impostor into fetch", async () => {
    const result = await execute(`
      for (const key of Object.getOwnPropertyNames(AbortSignal)) {
        try { AbortSignal[key] = () => true; } catch {}
      }
      AbortSignal._isSignal = () => true;
      try {
        await fetch("http://127.0.0.1:1/", { signal: { addEventListener() {} } });
        return "no throw";
      } catch (e) {
        return e.name + ": " + e.message;
      }
    `);
    expect(result.result).toBe(
      "TypeError: The signal option must be an AbortSignal instance",
    );
  }, 15000);

  test("a null signal is accepted like native fetch", async () => {
    const result = await execute(`
      const res = await fetch("${echoUrl}", { signal: null });
      return res.ok;
    `);
    expect(result.result).toBe(true);
  }, 15000);

  test("abort listeners deduplicate and run with the signal as this", async () => {
    const result = await execute(`
      const controller = new AbortController();
      let count = 0;
      let self = null;
      function onAbort() {
        count++;
        self = this;
      }
      controller.signal.addEventListener("abort", onAbort);
      controller.signal.addEventListener("abort", onAbort);
      controller.abort();
      return { count, isSignal: self === controller.signal };
    `);
    expect(result.result).toEqual({ count: 1, isSignal: true });
  }, 15000);
});

describe("Response facade in the sandbox", () => {
  test("a default Response is ok with status 200", async () => {
    const result = await execute(`
      const r = new Response("hi");
      return [r.ok, r.status, r.statusText, await r.text()];
    `);
    expect(result.result).toEqual([true, 200, "", "hi"]);
  }, 15000);

  test("ok tracks the status", async () => {
    const result = await execute(`
      return [new Response("", { status: 404 }).ok, new Response("", { status: 204 }).ok];
    `);
    expect(result.result).toEqual([false, true]);
  }, 15000);
});

describe("sandbox results that used to serialize badly", () => {
  test("returning a Date yields its ISO string", async () => {
    const result = await execute('return new Date("2024-01-02T03:04:05Z");');
    expect(result.result).toBe("2024-01-02T03:04:05.000Z");
  }, 15000);

  test("returning a large typed array yields a summary, not a giant object", async () => {
    const result = await execute("return new Uint8Array(1024 * 1024);");
    expect(result.result).toBe("[Uint8Array: 1048576 bytes]");
  }, 15000);

  test("returning a Map keeps its entries", async () => {
    const result = await execute('return new Map([["a", 1]]);');
    expect(result.result).toEqual({ _type: "Map", entries: [["a", 1]] });
  }, 15000);
});
