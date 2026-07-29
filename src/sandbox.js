import vm from "node:vm";
import Fastly from "fastly";
import { describeThrown } from "./errors.js";
import { safeSerialize } from "./serializer.js";

const input =
  typeof Bun !== "undefined"
    ? await Bun.stdin.text()
    : await new Promise((resolve) => {
        const chunks = [];
        process.stdin.on("data", (c) => chunks.push(c));
        process.stdin.on("end", () =>
          resolve(Buffer.concat(chunks).toString()),
        );
      });
const { code, fastlyApiToken } = JSON.parse(input);

if (fastlyApiToken) {
  Fastly.ApiClient.instance.authenticate(fastlyApiToken);
}

function lowerFirst(name) {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

const apiInstances = {};
const apiClasses = [];
for (const name of Object.keys(Fastly)) {
  if (!/Api$/.test(name)) continue;
  const Ctor = Fastly[name];
  if (typeof Ctor !== "function") continue;
  try {
    apiInstances[lowerFirst(name)] = new Ctor();
    apiClasses.push(name);
  } catch {
    // Construction failed — skip it from the sandbox facade.
  }
}

const consoleLogs = [];
const activeFetches = new Map();

const NO_TOKEN_HINT =
  "No Fastly API token is configured. Set FASTLY_API_TOKEN in the environment of the MCP server and restart it.";
const BAD_TOKEN_HINT =
  "Fastly rejected the API token. Check that FASTLY_API_TOKEN is current and has not been revoked.";
const FORBIDDEN_HINT =
  "The API token was accepted but is not allowed to perform this operation. Check its scope and whether it can reach this service or customer account.";

function authHint(status) {
  if (status !== 401 && status !== 403) return undefined;
  if (!fastlyApiToken) return NO_TOKEN_HINT;
  return status === 401 ? BAD_TOKEN_HINT : FORBIDDEN_HINT;
}

async function callFastly(payload) {
  const { apiClass, method, args } = JSON.parse(payload);
  const instance = apiInstances[lowerFirst(apiClass)];
  if (!instance || typeof instance[method] !== "function") {
    throw new Error(`Unknown Fastly API method: ${apiClass}.${method}`);
  }
  try {
    const result = await instance[method](...args);
    return JSON.stringify({ ok: true, value: safeSerialize(result) });
  } catch (err) {
    const failure = describeThrown(err);
    const hint = authHint(failure.status);
    if (hint) failure.hint = hint;
    return JSON.stringify({ ok: false, failure });
  }
}

async function hostBridge(kind, payload) {
  try {
    if (kind === "api") return await callFastly(payload);

    if (kind === "console") {
      const { level, text } = JSON.parse(payload);
      consoleLogs.push({ level, text });
      return JSON.stringify({ ok: true, value: null });
    }

    if (kind === "fetch") {
      const { url, options, bodyBase64, fetchId } = JSON.parse(payload);
      // An empty binary body encodes to "", so this must not be a truthiness check.
      if (bodyBase64 !== undefined) {
        options.body = Buffer.from(bodyBase64, "base64");
      }
      // A sandbox abort must cancel the real request, or a hung response
      // keeps this process alive until the parent's timeout. A fetch
      // without a signal can never abort, so it skips the bookkeeping.
      if (fetchId !== undefined) {
        const controller = new AbortController();
        options.signal = controller.signal;
        activeFetches.set(fetchId, controller);
      }
      try {
        const response = await fetch(url, options);
        return JSON.stringify({
          ok: true,
          value: {
            body: await response.text(),
            headers: [...response.headers],
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            url: response.url,
          },
        });
      } finally {
        activeFetches.delete(fetchId);
      }
    }

    if (kind === "fetch-abort") {
      const { fetchId } = JSON.parse(payload);
      activeFetches.get(fetchId)?.abort();
      return JSON.stringify({ ok: true, value: null });
    }

    if (kind === "digest") {
      const { algorithm, bytesBase64 } = JSON.parse(payload);
      const digest = await crypto.subtle.digest(
        algorithm,
        Buffer.from(bytesBase64, "base64"),
      );
      return JSON.stringify({ ok: true, value: [...new Uint8Array(digest)] });
    }

    throw new Error(`Unknown sandbox bridge operation: ${kind}`);
  } catch (err) {
    return JSON.stringify({ ok: false, failure: describeThrown(err) });
  }
}

const sandboxGlobals = {};
const context = vm.createContext(sandboxGlobals, {
  codeGeneration: { strings: false, wasm: false },
});

const installFacade = vm.runInContext(
  `
  (bridge, apiClasses) => {
    let nextFetchId = 1;
    const invoke = async (kind, payload) => {
      const reply = JSON.parse(await bridge(kind, JSON.stringify(payload)));
      if (reply.ok) return reply.value;
      const failure = reply.failure ?? {};
      const error = new Error(failure.error ?? "Unknown sandbox bridge failure");
      for (const field of ["status", "statusText", "body", "hint"]) {
        if (failure[field] !== undefined) error[field] = failure[field];
      }
      throw error;
    };

    const makeApi = (apiClass) => new Proxy({}, {
      get(_target, method) {
        if (method === "then" || method === "constructor") return undefined;
        return async (...args) => invoke("api", { apiClass, method: String(method), args });
      },
    });

    const FastlyFacade = new Proxy({}, {
      get(_target, name) {
        if (typeof name !== "string" || !apiClasses.includes(name)) return undefined;
        return new Proxy(function () {}, {
          construct() { return makeApi(name); },
        });
      },
    });

    class HeadersFacade {
      #entries = new Map();
      constructor(init = []) {
        if (init && typeof init[Symbol.iterator] === "function") {
          for (const [name, value] of init) this.append(name, value);
        } else if (init && typeof init === "object") {
          for (const name of Object.keys(init)) this.set(name, init[name]);
        }
      }
      get(name) { return this.#entries.get(String(name).toLowerCase()) ?? null; }
      has(name) { return this.#entries.has(String(name).toLowerCase()); }
      set(name, value) { this.#entries.set(String(name).toLowerCase(), String(value)); }
      append(name, value) {
        const key = String(name).toLowerCase();
        const prev = this.#entries.get(key);
        this.#entries.set(key, prev === undefined ? String(value) : prev + ", " + String(value));
      }
      delete(name) { this.#entries.delete(String(name).toLowerCase()); }
      forEach(fn, thisArg) {
        for (const [name, value] of this.#entries) fn.call(thisArg, value, name, this);
      }
      keys() { return this.#entries.keys(); }
      values() { return this.#entries.values(); }
      entries() { return this.#entries.entries(); }
      [Symbol.iterator]() { return this.#entries[Symbol.iterator](); }
    }

    class ResponseFacade {
      constructor(body = "", init = {}) {
        this._body = body;
        this.headers = new HeadersFacade(init.headers);
        this.status = init.status ?? 200;
        this.ok = this.status >= 200 && this.status < 300;
        this.statusText = init.statusText ?? "";
        this.url = init.url ?? "";
      }
      async text() { return this._body; }
      async json() { return JSON.parse(this._body); }
    }

    const asByteView = (data, what) => {
      if (data instanceof ArrayBuffer) return new Uint8Array(data);
      if (ArrayBuffer.isView(data)) {
        return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
      }
      throw new TypeError(what + " expects an ArrayBuffer or an ArrayBuffer view");
    };

    // Bytes cross the bridge as base64; a JSON number array would cost
    // several characters per byte.
    const BASE64_ALPHABET =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const bytesToBase64 = (bytes) => {
      let out = "";
      for (let i = 0; i < bytes.length; i += 3) {
        const a = bytes[i];
        const b = bytes[i + 1];
        const c = bytes[i + 2];
        out += BASE64_ALPHABET[a >> 2];
        out += BASE64_ALPHABET[((a & 3) << 4) | ((b ?? 0) >> 4)];
        out += b === undefined ? "=" : BASE64_ALPHABET[((b & 15) << 2) | ((c ?? 0) >> 6)];
        out += c === undefined ? "=" : BASE64_ALPHABET[c & 63];
      }
      return out;
    };

    class TextEncoderFacade {
      encoding = "utf-8";
      encode(input = "") {
        const str = String(input);
        let size = 0;
        for (const ch of str) {
          let cp = ch.codePointAt(0);
          if (cp >= 0xd800 && cp <= 0xdfff) cp = 0xfffd;
          size += cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
        }
        const out = new Uint8Array(size);
        let i = 0;
        for (const ch of str) {
          let cp = ch.codePointAt(0);
          if (cp >= 0xd800 && cp <= 0xdfff) cp = 0xfffd;
          if (cp < 0x80) {
            out[i++] = cp;
          } else if (cp < 0x800) {
            out[i++] = 0xc0 | (cp >> 6);
            out[i++] = 0x80 | (cp & 0x3f);
          } else if (cp < 0x10000) {
            out[i++] = 0xe0 | (cp >> 12);
            out[i++] = 0x80 | ((cp >> 6) & 0x3f);
            out[i++] = 0x80 | (cp & 0x3f);
          } else {
            out[i++] = 0xf0 | (cp >> 18);
            out[i++] = 0x80 | ((cp >> 12) & 0x3f);
            out[i++] = 0x80 | ((cp >> 6) & 0x3f);
            out[i++] = 0x80 | (cp & 0x3f);
          }
        }
        return out;
      }
    }

    const UTF8_LABELS = [
      "unicode-1-1-utf-8", "unicode11utf8", "unicode20utf8",
      "utf-8", "utf8", "x-unicode20utf8",
    ];

    class TextDecoderFacade {
      constructor(label = "utf-8", options = {}) {
        const normalized = String(label).trim().toLowerCase();
        if (!UTF8_LABELS.includes(normalized)) {
          throw new RangeError(
            "The sandbox TextDecoder only supports UTF-8; unsupported label " +
              JSON.stringify(String(label)),
          );
        }
        this.encoding = "utf-8";
        this.fatal = !!options.fatal;
        this.ignoreBOM = !!options.ignoreBOM;
      }
      #malformed() {
        if (this.fatal) {
          throw new TypeError("The encoded data was not valid UTF-8");
        }
        return "\\ufffd";
      }
      decode(input, options = {}) {
        if (options.stream) {
          throw new Error(
            "The sandbox TextDecoder does not support streaming decode",
          );
        }
        if (input === undefined) return "";
        const bytes = asByteView(input, "TextDecoder.decode");
        let out = "";
        let i =
          !this.ignoreBOM &&
          bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf
            ? 3
            : 0;
        while (i < bytes.length) {
          const b = bytes[i];
          let cp;
          let extra;
          if (b < 0x80) {
            cp = b;
            extra = 0;
          } else if (b >= 0xc2 && b <= 0xdf) {
            cp = b & 0x1f;
            extra = 1;
          } else if (b >= 0xe0 && b <= 0xef) {
            cp = b & 0x0f;
            extra = 2;
          } else if (b >= 0xf0 && b <= 0xf4) {
            cp = b & 0x07;
            extra = 3;
          } else {
            out += this.#malformed();
            i++;
            continue;
          }
          // The narrowed second-byte ranges rule out overlong forms and
          // surrogates.
          const contOk = (j, c) => {
            if (c === undefined || c < 0x80 || c > 0xbf) return false;
            if (j === 1) {
              if (b === 0xe0) return c >= 0xa0;
              if (b === 0xed) return c <= 0x9f;
              if (b === 0xf0) return c >= 0x90;
              if (b === 0xf4) return c <= 0x8f;
            }
            return true;
          };
          let valid = 0;
          for (let j = 1; j <= extra; j++) {
            const c = bytes[i + j];
            if (!contOk(j, c)) break;
            valid++;
            cp = (cp << 6) | (c & 0x3f);
          }
          if (valid < extra) {
            // One replacement per maximal subpart, as the Encoding
            // Standard prescribes.
            out += this.#malformed();
            i += 1 + valid;
            continue;
          }
          out += String.fromCodePoint(cp);
          i += extra + 1;
        }
        return out;
      }
    }

    class DOMExceptionFacade extends Error {
      constructor(message, name = "Error") {
        super(message);
        this.name = name;
      }
    }

    const abortErrorOf = (signal) => signal.reason !== undefined
      ? signal.reason
      : new DOMExceptionFacade("The operation was aborted", "AbortError");

    // Node validates listener options only on add: addEventListener
    // rejects any non-boolean primitive, removeEventListener coerces
    // anything to a boolean.
    const captureFlag = (options) => {
      if (options === undefined || options === null) return false;
      if (typeof options === "boolean") return options;
      if (typeof options === "object" || typeof options === "function") {
        return !!options.capture;
      }
      throw new TypeError('The "options" argument must be of type object');
    };
    const captureFlagLenient = (options) => {
      if (typeof options === "boolean") return options;
      if (options !== null && (typeof options === "object" || typeof options === "function")) {
        return !!options.capture;
      }
      return false;
    };
    // Node runs ToString on the event type: objects coerce, symbols throw.
    const toEventType = (type) => {
      if (typeof type === "symbol") {
        throw new TypeError("Value is a Symbol and cannot be converted to a string.");
      }
      return String(type);
    };

    let isAbortSignal;
    class AbortSignalFacade {
      aborted = false;
      reason = undefined;
      // Listener identity is the callback plus the capture flag.
      #listeners = [];
      #removedDuringDispatch = null;
      #onabort = null;
      #onabortRegistered = false;
      // The first onabort assignment, even of null, fixes the handler's
      // position in the listener list; the slot reads #onabort at
      // dispatch time.
      #onabortSlot = (event) => {
        const handler = this.#onabort;
        if (typeof handler === "function") handler.call(this, event);
      };
      // A brand check instanceof cannot fake, kept in a closure so
      // sandbox code cannot replace it.
      static {
        isAbortSignal = (value) =>
          typeof value === "object" && value !== null && #listeners in value;
      }
      get onabort() { return this.#onabort; }
      set onabort(handler) {
        if (!this.#onabortRegistered) {
          this.#onabortRegistered = true;
          this.#listeners.push({ listener: this.#onabortSlot, capture: false });
        }
        this.#onabort = handler;
      }
      addEventListener(type, listener, options) {
        // Native order: receiver brand first, then the options (even for
        // a null listener), then the type.
        if (!isAbortSignal(this)) {
          throw new TypeError('Value of "this" must be of type EventTarget');
        }
        const capture = captureFlag(options);
        if (listener === null || listener === undefined) return;
        if (toEventType(type) !== "abort") return;
        const exists = this.#listeners.some(
          (entry) => entry.listener === listener && entry.capture === capture,
        );
        if (!exists) this.#listeners.push({ listener, capture });
      }
      removeEventListener(type, listener, options) {
        // Remove differs from add: a null listener returns first, and the
        // type converts before the options are read.
        if (!isAbortSignal(this)) {
          throw new TypeError('Value of "this" must be of type EventTarget');
        }
        if (listener === null || listener === undefined) return;
        const eventType = toEventType(type);
        const capture = captureFlagLenient(options);
        if (eventType !== "abort") return;
        this.#listeners = this.#listeners.filter((entry) => {
          if (entry.listener !== listener || entry.capture !== capture) return true;
          this.#removedDuringDispatch?.add(entry);
          return false;
        });
      }
      throwIfAborted() {
        if (this.aborted) throw this.reason;
      }
      _abort(reason) {
        if (this.aborted) return;
        this.aborted = true;
        this.reason = reason !== undefined
          ? reason
          : new DOMExceptionFacade("This operation was aborted", "AbortError");
        const event = { type: "abort", target: this };
        // A listener removed by an earlier listener no longer runs, and
        // one added during dispatch waits for a future event.
        this.#removedDuringDispatch = new Set();
        for (const entry of [...this.#listeners]) {
          if (this.#removedDuringDispatch.has(entry)) continue;
          const listener = entry.listener;
          try {
            if (typeof listener === "function") listener.call(this, event);
            else listener.handleEvent(event);
          } catch {}
        }
        this.#removedDuringDispatch = null;
      }
    }
    class AbortControllerFacade {
      signal = new AbortSignalFacade();
      abort(reason) { this.signal._abort(reason); }
    }

    globalThis.Fastly = FastlyFacade;
    for (const apiClass of apiClasses) globalThis[apiClass[0].toLowerCase() + apiClass.slice(1)] = makeApi(apiClass);
    globalThis.console = Object.fromEntries(["log", "info", "warn", "error", "debug"].map((level) => [
      level,
      (...args) => invoke("console", { level, text: args.map(String).join(" ") }),
    ]));
    globalThis.fetch = async (url, options = {}) => {
      const signal = options.signal;
      // Native fetch rejects a signal-shaped impostor before sending
      // anything; only undefined, null, or a real signal get through.
      if (signal !== undefined && signal !== null && !isAbortSignal(signal)) {
        throw new TypeError(
          "The signal option must be an AbortSignal instance",
        );
      }
      if (signal?.aborted) {
        throw abortErrorOf(signal);
      }
      // The bridge JSON-serializes the options, which would flatten a
      // Headers facade to {} and mangle the signal; both are converted here.
      const { signal: _dropped, ...bridged } = options;
      const h = bridged.headers;
      if (h && !Array.isArray(h) && typeof h[Symbol.iterator] === "function") {
        bridged.headers = Object.fromEntries(h);
      }
      // Binary bodies would JSON-serialize to indexed objects, so their
      // bytes ride in a dedicated field. Other object bodies (FormData,
      // streams) have no working facade behind them.
      let bodyBase64;
      const body = bridged.body;
      if (body !== null && typeof body === "object") {
        if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
          bodyBase64 = bytesToBase64(asByteView(body, "fetch body"));
          delete bridged.body;
        } else {
          throw new TypeError(
            "The sandbox fetch only supports string, ArrayBuffer or ArrayBuffer-view request bodies",
          );
        }
      }
      // Without a signal no abort can ever cross the bridge.
      const fetchId = signal ? nextFetchId++ : undefined;
      const pending = invoke("fetch", { url: String(url), options: bridged, bodyBase64, fetchId });
      if (!signal) {
        const value = await pending;
        return new ResponseFacade(value.body, value);
      }
      // An abort rejects the caller's promise and also crosses the bridge to
      // cancel the real request, so a hung response cannot keep the sandbox
      // process alive. The loser of the race must not surface as unhandled.
      pending.catch(() => {});
      let onAbort;
      const aborted = new Promise((_resolve, reject) => {
        onAbort = () => {
          invoke("fetch-abort", { fetchId }).catch(() => {});
          reject(abortErrorOf(signal));
        };
        signal.addEventListener("abort", onAbort);
        // Reading the options can run user getters that abort synchronously,
        // after the entry check but before this listener existed.
        if (signal.aborted) onAbort();
      });
      try {
        const value = await Promise.race([pending, aborted]);
        return new ResponseFacade(value.body, value);
      } finally {
        signal.removeEventListener("abort", onAbort);
      }
    };
    globalThis.Headers = HeadersFacade;
    globalThis.Response = ResponseFacade;
    globalThis.Request = class RequestFacade {};
    globalThis.FormData = class FormDataFacade {};
    globalThis.Blob = class BlobFacade {};
    globalThis.File = class FileFacade {};
    globalThis.WebSocket = class WebSocketFacade {};
    globalThis.EventSource = class EventSourceFacade {};
    globalThis.URL = class URLFacade {};
    globalThis.URLSearchParams = class URLSearchParamsFacade {};
    globalThis.AbortController = AbortControllerFacade;
    globalThis.AbortSignal = AbortSignalFacade;
    globalThis.DOMException = DOMExceptionFacade;
    globalThis.ReadableStream = class ReadableStreamFacade {};
    globalThis.WritableStream = class WritableStreamFacade {};
    globalThis.TransformStream = class TransformStreamFacade {};
    globalThis.structuredClone = (value) => JSON.parse(JSON.stringify(value));
    globalThis.TextEncoder = TextEncoderFacade;
    globalThis.TextDecoder = TextDecoderFacade;
    globalThis.crypto = {
      subtle: {
        digest: async (algorithm, data) => Uint8Array.from(
          await invoke("digest", {
            algorithm,
            bytesBase64: bytesToBase64(asByteView(data, "crypto.subtle.digest")),
          }),
        ).buffer,
      },
    };
  }
`,
  context,
  { filename: "sandbox-facade" },
);
installFacade(hostBridge, apiClasses);

function rewriteError(err, source) {
  const out = describeThrown(err);
  if (!err || typeof err !== "object") return out;
  if (!err.stack || typeof err.stack !== "string") return out;

  const frameRe = /user-code:(\d+):(\d+)/;
  const lines = err.stack.split("\n");
  const kept = [];
  let firstUserFrame = null;

  if (lines.length > 0) kept.push(lines[0]);

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(frameRe);
    if (m) {
      const rawLine = parseInt(m[1], 10);
      const col = parseInt(m[2], 10);
      const userLine = Math.max(1, rawLine - 1);
      kept.push(line.replace(frameRe, `user-code:${userLine}:${col}`));
      if (!firstUserFrame) firstUserFrame = { number: userLine, column: col };
      continue;
    }
    if (
      line.includes("/sandbox.js") ||
      line.includes("sandbox-facade") ||
      line.includes("evalmachine.<anonymous>") ||
      line.includes("node:internal") ||
      line.includes("node:vm") ||
      line.includes("native:") ||
      line.includes("(unknown)") ||
      /bunx-\d+/.test(line)
    ) {
      continue;
    }
    kept.push(line);
  }

  // A stack whose frames were all internal says nothing the message did not.
  if (kept.length > 1) out.stack = kept.join("\n");

  if (firstUserFrame) {
    const srcLines = source.split("\n");
    const raw = srcLines[firstUserFrame.number - 1];
    if (raw !== undefined) {
      const trimmed = raw.length > 200 ? `${raw.slice(0, 200)}…` : raw;
      out.line = {
        number: firstUserFrame.number,
        column: firstUserFrame.column,
        source: trimmed,
      };
    }
  }

  return out;
}

// Exit as soon as the result is delivered; pending host work such as an
// unawaited fetch would otherwise hold the event loop open. Exiting from
// the write callback avoids truncating a result beyond the pipe buffer.
function writeResultAndExit(out) {
  if (consoleLogs.length > 0) out.console = consoleLogs;
  // A fatal unhandled rejection between event loop turns would kill the
  // process mid-write; the result is already decided, so nothing may
  // preempt its delivery. Strict mode promotes the rejection to an
  // uncaughtException, hence both listeners.
  process.on("unhandledRejection", () => {});
  process.on("uncaughtException", () => {});
  process.stdout.write(JSON.stringify(out), () => process.exit(0));
}

try {
  const wrapped = `(async () => {\n${code}\n})()`;
  const result = await vm.runInContext(wrapped, context, {
    filename: "user-code",
  });
  writeResultAndExit({ ok: true, result: safeSerialize(result) });
} catch (err) {
  writeResultAndExit({ ok: false, ...rewriteError(err, code) });
}
