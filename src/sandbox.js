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
const { code } = JSON.parse(input);

if (process.env.FASTLY_API_TOKEN) {
  Fastly.ApiClient.instance.authenticate(process.env.FASTLY_API_TOKEN);
}

function lowerFirst(name) {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

// Pre-instantiate every Fastly.*Api class and expose each as a lowercased-
// first-letter global. Runtime discovery — adding a new Api class upstream
// surfaces here automatically without code changes.
const apiInstances = {};
for (const name of Object.keys(Fastly)) {
  if (!/Api$/.test(name)) continue;
  const Ctor = Fastly[name];
  if (typeof Ctor !== "function") continue;
  try {
    apiInstances[lowerFirst(name)] = new Ctor();
  } catch {
    // Construction failed — skip silently. User code can still do
    // `new Fastly.${name}()` explicitly if it needs to.
  }
}

const consoleLogs = [];
const sandboxConsole = {
  log: (...args) =>
    consoleLogs.push({ level: "log", text: args.map(String).join(" ") }),
  info: (...args) =>
    consoleLogs.push({ level: "info", text: args.map(String).join(" ") }),
  warn: (...args) =>
    consoleLogs.push({ level: "warn", text: args.map(String).join(" ") }),
  error: (...args) =>
    consoleLogs.push({ level: "error", text: args.map(String).join(" ") }),
  debug: (...args) =>
    consoleLogs.push({ level: "debug", text: args.map(String).join(" ") }),
};

function pick(name) {
  const v = globalThis[name];
  return typeof v === "undefined" ? undefined : v;
}

const exposed = {
  Fastly,
  ...apiInstances,
  console: sandboxConsole,

  fetch: pick("fetch"),
  Headers: pick("Headers"),
  Request: pick("Request"),
  Response: pick("Response"),
  FormData: pick("FormData"),
  Blob: pick("Blob"),
  File: pick("File"),
  WebSocket: pick("WebSocket"),
  EventSource: pick("EventSource"),

  URL: pick("URL"),
  URLSearchParams: pick("URLSearchParams"),

  TextEncoder: pick("TextEncoder"),
  TextDecoder: pick("TextDecoder"),
  TextEncoderStream: pick("TextEncoderStream"),
  TextDecoderStream: pick("TextDecoderStream"),
  atob: pick("atob"),
  btoa: pick("btoa"),

  ReadableStream: pick("ReadableStream"),
  WritableStream: pick("WritableStream"),
  TransformStream: pick("TransformStream"),
  ByteLengthQueuingStrategy: pick("ByteLengthQueuingStrategy"),
  CountQueuingStrategy: pick("CountQueuingStrategy"),
  CompressionStream: pick("CompressionStream"),
  DecompressionStream: pick("DecompressionStream"),

  AbortController: pick("AbortController"),
  AbortSignal: pick("AbortSignal"),

  Event: pick("Event"),
  EventTarget: pick("EventTarget"),
  CustomEvent: pick("CustomEvent"),
  MessageEvent: pick("MessageEvent"),
  ErrorEvent: pick("ErrorEvent"),
  CloseEvent: pick("CloseEvent"),
  DOMException: pick("DOMException"),

  MessageChannel: pick("MessageChannel"),
  MessagePort: pick("MessagePort"),
  BroadcastChannel: pick("BroadcastChannel"),

  crypto: pick("crypto"),
  structuredClone: pick("structuredClone"),

  performance: pick("performance"),
  PerformanceObserver: pick("PerformanceObserver"),

  reportError: pick("reportError"),

  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  setImmediate: pick("setImmediate"),
  clearImmediate: pick("clearImmediate"),
  queueMicrotask,

  Buffer: pick("Buffer"),
  WebAssembly: pick("WebAssembly"),
};

for (const k of Object.keys(exposed)) {
  if (exposed[k] === undefined) delete exposed[k];
}

const context = vm.createContext(exposed);

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

  const frameRe = /(?:user-code|evalmachine\.<anonymous>):(\d+):(\d+)/;
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
      line.includes("node:internal") ||
      line.includes("node:vm") ||
      /bunx-\d+/.test(line)
    ) {
      continue;
    }
    kept.push(line);
  }

  out.stack = kept.join("\n");

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
