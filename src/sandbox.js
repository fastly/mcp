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

try {
  const wrapped = `(async () => { ${code} })()`;
  const result = await vm.runInContext(wrapped, context);
  const out = { ok: true, result: safeSerialize(result) };
  if (consoleLogs.length > 0) out.console = consoleLogs;
  process.stdout.write(JSON.stringify(out));
} catch (err) {
  const out = {
    ok: false,
    error: err.message,
    stack: err.stack,
  };
  if (consoleLogs.length > 0) out.console = consoleLogs;
  process.stdout.write(JSON.stringify(out));
}
