import { spawn } from "node:child_process";
import { StringDecoder } from "node:string_decoder";
import {
  getExecutionRuntime,
  launchCommand,
  SANDBOX_PATH,
} from "../execution-runtime.js";

export { SANDBOX_PATH };

import {
  INLINE_RESULT_BYTES,
  PREVIEW_BYTES,
  RESULT_FILE_BYTES,
} from "../limits.js";
import { shieldJson, WITHHELD, WRAPPER_OPENER } from "../secrets.js";
import { setKey } from "../serializer.js";
import { sliceWhole, truncateOutsideSecrets } from "../truncate.js";

const TIMEOUT_MS = 30_000;
// Extra time a child gives itself past the parent's deadline, in case the
// parent is no longer there to kill it.
const CHILD_GRACE_MS = 5_000;
// The child may serialize up to a file's worth of result, so its whole stdout payload gets room above that.
const MAX_STDOUT = 8_000_000;
const MAX_STDERR = 100_000;
const CRASH_OUTPUT_SHOWN = 2000;
const MAX_CONSOLE = 100_000;

const ARRAY_PREVIEW_ITEMS = 10;
const OBJECT_PREVIEW_KEYS = 30;
const SMALL_CONTAINER_ENTRIES = 5;
const KEY_PREVIEW_BYTES = 200;
// With less room than this, opening a container just produces a tree of truncation notes, so it gets named instead.
const MIN_CONTAINER_BYTES = 128;

function jsonBytes(value) {
  return Buffer.byteLength(JSON.stringify(value) ?? "null");
}

// A cut encrypted value can't be decrypted, so the preview stops before it.
function withoutPartialWrapper(head) {
  const open = head.lastIndexOf(WRAPPER_OPENER);
  if (open !== -1 && !head.includes("}", open)) return head.slice(0, open);
  for (let n = Math.min(WRAPPER_OPENER.length - 1, head.length); n > 0; n--) {
    if (head.endsWith(WRAPPER_OPENER.slice(0, n))) return head.slice(0, -n);
  }
  return head;
}

// Cuts a string down to about `budget` bytes of JSON, note included.
// Measured on the escaped form, since that's what the response carries and a control character costs six bytes there.
function clipString(text, budget) {
  if (text.length + 2 <= budget && jsonBytes(text) <= budget) return text;
  const note = ` [${text.length} chars, truncated]`;
  const room = Math.max(0, budget - note.length);
  let head = text.slice(0, room);
  while (head.length) {
    const size = jsonBytes(head);
    const excess = size - room;
    if (excess <= 0) break;
    const perUnit = Math.max(1, size / head.length);
    head = head.slice(0, head.length - Math.ceil(excess / perUnit));
  }
  return withoutPartialWrapper(sliceWhole(head, head.length)) + note;
}

function describe(value, budget) {
  if (Array.isArray(value)) return `[Array: ${value.length} items]`;
  const keys = Object.keys(value);
  if (budget < MIN_CONTAINER_BYTES * 3) return `{Object: ${keys.length} keys}`;
  const shown = keys
    .slice(0, SMALL_CONTAINER_ENTRIES)
    .map((k) => clipString(k, 64));
  return `{Object: keys=${shown.join(", ")}... (${keys.length} total)}`;
}

// A property name can be as long as a value, so it comes out of the same share.
// Returns the name to show and what's left for the value.
function previewKey(key, share) {
  const name = clipString(key, Math.min(share, KEY_PREVIEW_BYTES));
  return [name, Math.max(0, share - jsonBytes(name) - 1)];
}

// Fills a copy of `value` with up to `limit` clipped entries, keeping an exact count of the bytes used.
// The first entry always gets in, clipped to its share; after that, an entry that would go over the budget ends the copy.
function clipEntries(value, budget, limit) {
  const isArray = Array.isArray(value);
  const keys = isArray ? null : Object.keys(value);
  const count = Math.min(isArray ? value.length : keys.length, limit);
  // Brackets and separators are paid for up front, so the shares are exact.
  const share = Math.floor(
    (budget - 2 - Math.max(0, count - 1)) / Math.max(1, count),
  );
  const out = isArray ? [] : {};
  let used = 2;
  for (let i = 0; i < count; i++) {
    const key = isArray ? i : keys[i];
    const [name, room] = isArray ? [null, share] : previewKey(key, share);
    const clipped = clip(value[key], room);
    let cost = jsonBytes(clipped) + (i ? 1 : 0);
    if (!isArray) cost += jsonBytes(name) + 1;
    if (used + cost > budget && i) break;
    used += cost;
    if (isArray) out.push(clipped);
    else setKey(out, name, clipped);
  }
  return out;
}

// Shrinks a value to about `budget` bytes of JSON.
// Strings get cut, small containers get opened and clipped inside, anything else too big gets named.
function clip(value, budget) {
  if (typeof value === "string") return clipString(value, budget);
  if (value === null || typeof value !== "object") return value;
  if (jsonBytes(value) <= budget) return value;
  const entries = Array.isArray(value)
    ? value.length
    : Object.keys(value).length;
  if (budget < MIN_CONTAINER_BYTES || entries > SMALL_CONTAINER_ENTRIES) {
    return describe(value, budget);
  }
  return clipEntries(value, budget, entries);
}

/**
 * A small stand-in for a result that is delivered some other way.
 * It is bounded in bytes, not just in entries: ten items of two megabytes each are not a preview of anything.
 */
function previewOf(value, hint) {
  if (value === null || value === undefined || typeof value !== "object") {
    const text = typeof value === "string" ? value : String(value);
    return {
      _type: typeof value,
      _length: text.length,
      _hint: hint,
      head: clipString(text, PREVIEW_BYTES),
    };
  }

  if (Array.isArray(value)) {
    const items = clipEntries(value, PREVIEW_BYTES, ARRAY_PREVIEW_ITEMS);
    return {
      _type: "array",
      _total: value.length,
      _showing: items.length,
      _hint: hint,
      items,
    };
  }

  const preview = clipEntries(value, PREVIEW_BYTES, OBJECT_PREVIEW_KEYS);
  return {
    _type: "object",
    _totalKeys: Object.keys(value).length,
    _showing: Object.keys(preview).length,
    _hint: hint,
    preview,
  };
}

function withConsole(response, logs) {
  return logs.length > 0 ? { ...response, console: logs } : response;
}

// Console output goes out with the response when both fit inline, and is dropped with a notice when only the response does.
function fitResponse(response, logs) {
  const complete = withConsole(response, logs);
  if (jsonBytes(complete) <= INLINE_RESULT_BYTES) return complete;
  if (logs.length === 0) return undefined;

  const notice =
    `Console output was omitted because its ${jsonBytes(logs)}-byte serialized form would make this response exceed ` +
    `the ${INLINE_RESULT_BYTES}-byte inline limit.`;
  const withoutLogs = {
    ...response,
    hint: response.hint ? `${response.hint} ${notice}` : notice,
  };
  return jsonBytes(withoutLogs) <= INLINE_RESULT_BYTES
    ? withoutLogs
    : undefined;
}

function fitOrRefuse(response, logs, what, advice) {
  return (
    fitResponse(response, logs) ??
    tooLarge(
      what,
      jsonBytes(withConsole(response, logs)),
      INLINE_RESULT_BYTES,
      advice,
    )
  );
}

const RETURN_LESS =
  "Return less data from your code, for example by selecting only the fields you need or by paginating.";

// The shield only sees this after it was cut, so it is cut outside secrets.
// That takes the whole output: a blind cut at the capture limit may already have gone through a token.
function crashOutput(stderr) {
  if (stderr.length > MAX_STDERR) {
    return `[error output omitted: more than ${MAX_STDERR} characters, too long to check for secrets]`;
  }
  return truncateOutsideSecrets(stderr, CRASH_OUTPUT_SHOWN);
}

const tooLargeError = (bytes) =>
  tooLarge(
    "error details",
    bytes,
    INLINE_RESULT_BYTES,
    "The snippet threw, and the error was too large to return. Catch the error and return a shorter description of it.",
  );

function tooLarge(what, bytes, max, advice) {
  return {
    error: `Output too large (${bytes} bytes of ${what}, max ${max}). ${advice}`,
    outcome: "output_too_large",
  };
}

const withheld = () => ({ error: WITHHELD, outcome: "withheld" });

// Never repeat the child's output here: it could hold part of a secret.
const unreadable = () => ({
  error: "The subprocess returned output this server could not read",
  outcome: "crashed",
});

const CONSOLE_LEVELS = new Set(["log", "info", "warn", "error", "debug"]);
const SUCCESS_FIELDS = new Set(["ok", "result", "reduced", "console"]);
const FAILURE_FIELDS = new Set([
  "ok",
  "error",
  "status",
  "statusText",
  "body",
  "hint",
  "stack",
  "line",
  "console",
]);

const isRecord = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const hasOnly = (value, fields) =>
  Object.keys(value).every((key) => fields.has(key));
const isCount = (value) => Number.isSafeInteger(value) && value >= 0;
const isOptionalString = (value) =>
  value === undefined || typeof value === "string";

function isConsoleEntry(entry) {
  return (
    isRecord(entry) &&
    hasOnly(entry, new Set(["level", "text"])) &&
    CONSOLE_LEVELS.has(entry.level) &&
    typeof entry.text === "string"
  );
}

function isReduced(reduced) {
  return (
    isRecord(reduced) &&
    hasOnly(reduced, new Set(["bytes", "depth", "cappedDepth"])) &&
    isCount(reduced.bytes) &&
    isCount(reduced.depth) &&
    (reduced.cappedDepth === undefined || isCount(reduced.cappedDepth))
  );
}

function isSourceLine(line) {
  return (
    isRecord(line) &&
    hasOnly(line, new Set(["number", "column", "source"])) &&
    Number.isSafeInteger(line.number) &&
    line.number >= 1 &&
    // The snippet can rewrite its stack, so the column can be any number, or null.
    (line.column === null ||
      (Number.isInteger(line.column) && line.column >= 0)) &&
    typeof line.source === "string"
  );
}

/**
 * Keeps only what the sandbox writes, and returns undefined for anything else.
 * That way a faulty child can't hand the shield more than it expects.
 */
function childOutput(raw) {
  if (!isRecord(raw)) return undefined;
  const logs = raw.console;
  if (
    logs !== undefined &&
    !(Array.isArray(logs) && logs.every(isConsoleEntry))
  ) {
    return undefined;
  }
  const out = { ok: raw.ok };
  if (raw.ok === true) {
    if (!hasOnly(raw, SUCCESS_FIELDS) || !Object.hasOwn(raw, "result")) {
      return undefined;
    }
    if (raw.reduced !== undefined && !isReduced(raw.reduced)) return undefined;
    out.result = raw.result;
    if (raw.reduced !== undefined) {
      const { bytes, depth, cappedDepth } = raw.reduced;
      out.reduced =
        cappedDepth === undefined
          ? { bytes, depth }
          : { bytes, depth, cappedDepth };
    }
  } else if (raw.ok === false) {
    const valid =
      hasOnly(raw, FAILURE_FIELDS) &&
      typeof raw.error === "string" &&
      (raw.status === undefined || Number.isFinite(raw.status)) &&
      (raw.statusText === undefined ||
        (typeof raw.statusText === "string" && raw.statusText.length > 0)) &&
      isOptionalString(raw.body) &&
      isOptionalString(raw.hint) &&
      isOptionalString(raw.stack) &&
      (raw.line === undefined || isSourceLine(raw.line));
    if (!valid) return undefined;
    for (const field of [
      "error",
      "status",
      "statusText",
      "body",
      "hint",
      "stack",
    ]) {
      if (raw[field] !== undefined) out[field] = raw[field];
    }
    if (raw.line !== undefined) {
      const { number, column, source } = raw.line;
      out.line = { number, column, source };
    }
  } else {
    return undefined;
  }
  if (logs !== undefined) {
    out.console = logs.map(({ level, text }) => ({ level, text }));
  }
  return out;
}

// Anything built from the child's output can hold a secret, so it goes through the shield before any of it is measured, stored or clipped.
// Returns undefined when a secret can't be encrypted, and the whole value is then withheld.
function protect(value, shield) {
  if (!shield) return value;
  try {
    return shieldJson(value, shield);
  } catch {
    return undefined;
  }
}

/**
 * Decides how a successful result goes out.
 *
 * Whatever fits goes out whole, no matter how many records it holds.
 * Only size can hold a result back, never item count: a list of 400 users is not a large result, and quietly returning 10 of them is worse than returning all 400.
 * What doesn't fit is written to a file and answered with its path.
 *
 * The result arrives with its secrets already encrypted, so the file and the preview only ever hold the encrypted form.
 * A token cut in half no longer looks like a token, so encrypting the preview afterwards would let most of it through.
 */
function deliver(value, { resultStore, resultBytes, reduced, logs }) {
  if (reduced) {
    // The sandbox had to cut nested values out to make this fit, so it is not the real result and must not be stored as if it were.
    const cut =
      reduced.depth > 0
        ? `values nested deeper than ${reduced.depth} level${reduced.depth === 1 ? "" : "s"} were replaced by "[truncated: max depth]"`
        : "only a description of it could be returned";
    const response = { result: value, truncated: true };
    if (reduced.cappedDepth !== undefined) {
      const reason =
        reduced.depth === reduced.cappedDepth
          ? `The result nested deeper than ${reduced.cappedDepth} levels, so ${cut}.`
          : `The result was ${reduced.bytes} bytes after values deeper than ${reduced.cappedDepth} levels were omitted, still above the ${resultBytes}-byte limit, so ${cut}.`;
      response.hint =
        `${reason} Its complete size is unknown, and it was not written to a file because the file would be incomplete. ` +
        "Return fewer fields, or page through the data and process it inside your code.";
    } else {
      response.resultBytes = reduced.bytes;
      response.hint =
        `The result is ${reduced.bytes} bytes at full depth, above the ${resultBytes}-byte limit, ` +
        `so ${cut}. It was not written to a file because the file would be incomplete. ` +
        "Return fewer fields, or page through the data and process it inside your code.";
    }
    return fitOrRefuse(
      response,
      logs,
      "result and console output",
      RETURN_LESS,
    );
  }

  const text = JSON.stringify(value);
  const bytes = text === undefined ? 0 : Buffer.byteLength(text);
  // A result over the limit on its own can't fit, however little console output comes with it.
  if (bytes <= INLINE_RESULT_BYTES) {
    const inline = fitResponse({ result: value }, logs);
    if (inline) return inline;
  }
  const responseBytes = jsonBytes(withConsole({ result: value }, logs));

  const stored = resultStore?.write(text);
  if (stored) {
    const hint =
      "Preview only. The complete result is in the file named by `resultFile`.";
    const response = {
      result: previewOf(value, hint),
      truncated: true,
      resultBytes: bytes,
      resultFile: stored.path,
      hint:
        `The complete response would be ${responseBytes} bytes, above the ${INLINE_RESULT_BYTES}-byte inline limit. ` +
        `The result itself is ${bytes} bytes, so all of it was written to ${stored.path} as JSON. Read that file to get every ` +
        "record; the preview in `result` is the first few entries only. The file is " +
        "temporary and is removed automatically after a few hours.",
    };
    return fitOrRefuse(
      response,
      logs,
      "result metadata and console output",
      "Log less, or return less data.",
    );
  }

  const reason = resultStore
    ? ` and could not be written to a file (${resultStore.lastError ?? "unknown error"})`
    : " and result files are disabled on this server";
  const response = {
    result: previewOf(
      value,
      "Preview only. The rest of the result was not kept.",
    ),
    truncated: true,
    resultBytes: bytes,
    hint:
      `The complete response would be ${responseBytes} bytes, above the ${INLINE_RESULT_BYTES}-byte inline limit. ` +
      `The result itself is ${bytes} bytes${reason}. ${RETURN_LESS}`,
  };
  return fitOrRefuse(
    response,
    logs,
    "result preview and console output",
    "Log less, or return less data.",
  );
}

const activeChildren = new Set();

function killTree(child) {
  // The child leads its own process group, so this also reaches anything a
  // launcher such as prlimit left behind.
  try {
    process.kill(-child.pid, "SIGKILL");
  } catch {
    child.kill("SIGKILL");
  }
}

export function killAllExecutions() {
  for (const child of activeChildren) killTree(child);
}

const OUT_OF_MEMORY = /out of memory|allocation failed|cannot allocate/i;

/**
 * Runs a snippet in a fresh child process.
 *
 * The token and the policy come from the caller; nothing here reads the
 * environment, and nothing in `code` can change either of them.
 * A failed result carries an `outcome` label for the audit log, not for the
 * model.
 */
export async function execute(
  code,
  { apiToken, remote = false, signal, profile, resultStore, shield } = {},
) {
  if (typeof code !== "string" || !code.trim()) {
    return { error: "code must be a non-empty string" };
  }
  if (signal?.aborted) {
    return { error: "Execution cancelled", outcome: "cancelled" };
  }

  if (remote && !profile) {
    return {
      error: "Remote executions need a launch profile",
      outcome: "launch_failed",
    };
  }
  let runtime = profile;
  try {
    runtime ??= getExecutionRuntime();
  } catch (error) {
    return { error: error.message, outcome: "launch_failed" };
  }

  // A local result may be as large as a file, whether or not one gets written: the parent can still preview it.
  // A remote caller only ever sees what fits inline.
  const resultBytes = remote ? INLINE_RESULT_BYTES : RESULT_FILE_BYTES;

  return new Promise((resolve) => {
    const [command, args] = launchCommand(runtime);
    const timeoutMs = runtime.timeoutMs ?? TIMEOUT_MS;
    const child = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: runtime.env,
      cwd: runtime.cwd,
      detached: process.platform !== "win32",
    });
    activeChildren.add(child);

    let stdout = "";
    let stdoutBytes = 0;
    let stderr = "";
    let killed = null;

    // Pipe chunks can split a multibyte character; the decoders carry the
    // partial sequence across chunks.
    const stdoutDecoder = new StringDecoder("utf8");
    const stderrDecoder = new StringDecoder("utf8");

    const kill = (result) => {
      if (killed) return;
      killed = result;
      killTree(child);
    };
    const onAbort = () =>
      kill({ error: "Execution cancelled", outcome: "cancelled" });
    signal?.addEventListener("abort", onAbort, { once: true });
    const timer = setTimeout(
      () =>
        kill({
          error: `Execution timed out after ${timeoutMs / 1000}s`,
          outcome: "timeout",
        }),
      timeoutMs,
    );

    let settled = false;
    const settle = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      activeChildren.delete(child);
      resolve(result);
    };

    child.stdout.on("data", (chunk) => {
      // The cap is a byte budget, so count raw chunk bytes, not decoded
      // string length.
      stdoutBytes += chunk.length;
      // Every kill path discards stdout, so decoding after one is wasted work.
      if (killed) return;
      stdout += stdoutDecoder.write(chunk);
      if (stdoutBytes > MAX_STDOUT) {
        kill(
          tooLarge(
            "output",
            stdoutBytes,
            MAX_STDOUT,
            "Reduce scope of your query.",
          ),
        );
      }
    });

    // One character past the limit is kept, which is how crashOutput tells that the output didn't fit.
    child.stderr.on("data", (chunk) => {
      if (stderr.length > MAX_STDERR) return;
      stderr += stderrDecoder
        .write(chunk)
        .slice(0, MAX_STDERR + 1 - stderr.length);
    });

    child.on("close", (exitCode, exitSignal) => {
      stdout += stdoutDecoder.end();
      if (stderr.length <= MAX_STDERR) {
        stderr += stderrDecoder.end().slice(0, MAX_STDERR + 1 - stderr.length);
      }

      if (killed) return settle(killed);

      if (!stdout) {
        // A SIGKILL we did not send is the kernel's OOM killer; the runtime
        // aborts on its own when its heap or an allocation limit runs out.
        if (exitSignal === "SIGKILL" || OUT_OF_MEMORY.test(stderr)) {
          return settle({
            error:
              "Execution ran out of memory. Process less data at a time, for example by filtering or paginating API results.",
            outcome: "oom",
          });
        }
        if (exitSignal === "SIGXCPU") {
          return settle({
            error: "Execution used too much CPU time",
            outcome: "cpu_limit",
          });
        }
        const crash = {
          error: stderr
            ? `Subprocess error: ${crashOutput(stderr)}`
            : `Subprocess exited with code ${exitCode} and no output`,
          outcome: "crashed",
        };
        return settle(protect(crash, shield) ?? withheld());
      }

      let raw;
      try {
        raw = childOutput(JSON.parse(stdout));
      } catch {}
      if (!raw) return settle(unreadable());

      try {
        // Console output is never stored, so it keeps its own small budget whether or not the snippet succeeded.
        // Measured on the serialized form, which is what the model receives: ten thousand empty entries cost real bytes even though their text is nothing.
        const logBytes = jsonBytes(raw.console ?? []);
        if (logBytes > MAX_CONSOLE) {
          return settle(
            tooLarge(
              "console output",
              logBytes,
              MAX_CONSOLE,
              "Log less, or return the data instead.",
            ),
          );
        }
        if (raw.ok) {
          // The sandbox keeps a result within the budget it was given, cut down or not, so anything larger came from a faulty child.
          const bytes = jsonBytes(raw.result);
          if (bytes > resultBytes) {
            return settle(tooLarge("result", bytes, resultBytes, RETURN_LESS));
          }
        } else {
          // Checked before encryption too, so the shield never gets more than a response can hold.
          const { ok: _ok, console: _console, ...failure } = raw;
          const failureBytes = jsonBytes(failure);
          if (failureBytes > INLINE_RESULT_BYTES) {
            return settle(tooLargeError(failureBytes));
          }
        }

        const payload = protect(raw, shield);
        if (!payload) return settle(withheld());
        const logs = payload.console ?? [];
        if (payload.ok) {
          return settle(
            deliver(payload.result, {
              resultStore,
              resultBytes,
              reduced: payload.reduced,
              logs,
            }),
          );
        }

        const { ok: _ok, console: _logs, ...out } = payload;
        // Failures are never stored either, so the error has to fit inline.
        const failureBytes = jsonBytes(out);
        if (failureBytes > INLINE_RESULT_BYTES) {
          return settle(tooLargeError(failureBytes));
        }
        return settle(
          fitOrRefuse(
            out,
            logs,
            "error details and console output",
            "Log less, and return a shorter error description.",
          ),
        );
      } catch (e) {
        const failure = {
          error: `Failed to process subprocess output: ${e.message}`,
          outcome: "crashed",
        };
        return settle(protect(failure, shield) ?? withheld());
      }
    });

    child.on("error", (err) => {
      settle({
        error: `Failed to spawn subprocess: ${err.message}`,
        outcome: "launch_failed",
      });
    });

    // The code and the token only go to a child that was first marked as the
    // preferred OOM victim.
    if (runtime.oomVictim && child.pid !== undefined) {
      try {
        runtime.oomVictim(child.pid);
      } catch {
        kill({
          error: "Failed to prepare the execution process",
          outcome: "launch_failed",
        });
        return;
      }
    }

    // A child that dies early closes its stdin under us.
    child.stdin.on("error", () => {});
    child.stdin.end(
      JSON.stringify({
        code,
        fastlyApiToken: apiToken,
        policy: {
          remote,
          resultBytes,
          deadlineMs: timeoutMs + CHILD_GRACE_MS,
        },
      }),
    );
  });
}
