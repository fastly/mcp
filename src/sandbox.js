import vm from "node:vm";
import Fastly from "fastly";
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

async function hostBridge(kind, payload) {
  try {
    if (kind === "api") {
      const { apiClass, method, args } = JSON.parse(payload);
      const instance = apiInstances[lowerFirst(apiClass)];
      if (!instance || typeof instance[method] !== "function") {
        throw new Error(`Unknown Fastly API method: ${apiClass}.${method}`);
      }
      const result = await instance[method](...args);
      return JSON.stringify({ ok: true, value: safeSerialize(result) });
    }

    if (kind === "console") {
      const { level, text } = JSON.parse(payload);
      consoleLogs.push({ level, text });
      return "";
    }

    if (kind === "fetch") {
      const { url, options } = JSON.parse(payload);
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
    }

    if (kind === "digest") {
      const { algorithm, bytes } = JSON.parse(payload);
      const digest = await crypto.subtle.digest(
        algorithm,
        Uint8Array.from(bytes),
      );
      return JSON.stringify({ ok: true, value: [...new Uint8Array(digest)] });
    }

    throw new Error(`Unknown sandbox bridge operation: ${kind}`);
  } catch (err) {
    return JSON.stringify({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

const sandboxGlobals = {};
const context = vm.createContext(sandboxGlobals, {
  codeGeneration: { strings: false, wasm: false },
});

const installFacade = vm.runInContext(
  `
  (bridge, apiClasses) => {
    const invoke = async (kind, payload) => {
      const reply = JSON.parse(await bridge(kind, JSON.stringify(payload)));
      if (!reply.ok) throw new Error(reply.error);
      return reply.value;
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
      #entries;
      constructor(entries = []) { this.#entries = new Map(entries); }
      get(name) { return this.#entries.get(String(name).toLowerCase()) ?? null; }
      has(name) { return this.#entries.has(String(name).toLowerCase()); }
      entries() { return this.#entries.entries(); }
      [Symbol.iterator]() { return this.#entries[Symbol.iterator](); }
    }

    class ResponseFacade {
      constructor(body = "", init = {}) {
        this._body = body;
        this.headers = new HeadersFacade(init.headers);
        this.ok = init.ok ?? (init.status >= 200 && init.status < 300);
        this.status = init.status ?? 200;
        this.statusText = init.statusText ?? "";
        this.url = init.url ?? "";
      }
      async text() { return this._body; }
      async json() { return JSON.parse(this._body); }
    }

    class AbortSignalFacade {
      aborted = false;
    }
    class AbortControllerFacade {
      signal = new AbortSignalFacade();
      abort() { this.signal.aborted = true; }
    }
    class DOMExceptionFacade extends Error {
      constructor(message, name = "Error") {
        super(message);
        this.name = name;
      }
    }

    globalThis.Fastly = FastlyFacade;
    for (const apiClass of apiClasses) globalThis[apiClass[0].toLowerCase() + apiClass.slice(1)] = makeApi(apiClass);
    globalThis.console = Object.fromEntries(["log", "info", "warn", "error", "debug"].map((level) => [
      level,
      (...args) => invoke("console", { level, text: args.map(String).join(" ") }),
    ]));
    globalThis.fetch = async (url, options = {}) => {
      if (options.signal?.aborted) throw new DOMException("The operation was aborted", "AbortError");
      const value = await invoke("fetch", { url: String(url), options });
      return new ResponseFacade(value.body, value);
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
    globalThis.crypto = {
      subtle: {
        digest: async (algorithm, data) => Uint8Array.from(
          await invoke("digest", { algorithm, bytes: Array.from(new Uint8Array(data)) }),
        ).buffer,
      },
    };
  }
`,
  context,
);
installFacade(hostBridge, apiClasses);

function describeThrown(err) {
  if (err === null) return { error: "null was thrown" };
  if (err === undefined) return { error: "undefined was thrown" };
  if (typeof err === "string") return { error: err };
  if (typeof err !== "object") return { error: String(err) };

  const out = {};

  if (typeof err.message === "string" && err.message) {
    out.error = err.message;
  } else if (typeof err.statusText === "string" && err.statusText) {
    const status = typeof err.status === "number" ? `${err.status} ` : "";
    out.error = `HTTP ${status}${err.statusText}`.trim();
  } else if (typeof err.status === "number") {
    out.error = `HTTP ${err.status}`;
  } else if (err.error && typeof err.error.message === "string") {
    out.error = err.error.message;
  } else if (err.constructor && err.constructor.name !== "Object") {
    out.error = `${err.constructor.name} (no message)`;
  } else {
    try {
      const dump = JSON.stringify(err);
      out.error =
        dump && dump !== "{}" ? dump : "Unknown error (empty object thrown)";
    } catch {
      out.error = "Unknown error (unserializable value thrown)";
    }
  }

  if (typeof err.status === "number") out.status = err.status;
  if (typeof err.statusText === "string" && err.statusText) {
    out.statusText = err.statusText;
  }
  if (err.body !== undefined) {
    try {
      const body =
        typeof err.body === "string" ? err.body : JSON.stringify(err.body);
      if (body)
        out.body = body.length > 2000 ? `${body.slice(0, 2000)}…` : body;
    } catch {}
  }

  return out;
}

function rewriteError(err, source) {
  const out = describeThrown(err);
  if (!err || typeof err !== "object") return out;
  if (!err.stack || typeof err.stack !== "string") return out;

  const frameRe = /(?:user-code|evalmachine\\.<anonymous>):(\\d+):(\\d+)/;
  const lines = err.stack.split("\\n");
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
      line.includes("node:internal") ||
      line.includes("node:vm") ||
      /bunx-\\d+/.test(line)
    ) {
      continue;
    }
    kept.push(line);
  }

  out.stack = kept.join("\\n");

  if (firstUserFrame) {
    const srcLines = source.split("\\n");
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

try {
  const wrapped = `(async () => {\n${code}\n})()`;
  const result = await vm.runInContext(wrapped, context, {
    filename: "user-code",
  });
  const out = { ok: true, result: safeSerialize(result) };
  if (consoleLogs.length > 0) out.console = consoleLogs;
  process.stdout.write(JSON.stringify(out));
} catch (err) {
  const out = { ok: false, ...rewriteError(err, code) };
  if (consoleLogs.length > 0) out.console = consoleLogs;
  process.stdout.write(JSON.stringify(out));
}
