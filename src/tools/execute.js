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
import { setKey } from "../serializer.js";

const TIMEOUT_MS = 30_000;
// Extra time a child gives itself past the parent's deadline, in case the
// parent is no longer there to kill it.
const CHILD_GRACE_MS = 5_000;
// The child may serialize up to a file's worth of result, so its whole stdout payload gets room above that.
const MAX_STDOUT = 8_000_000;
const MAX_STDERR = 100_000;
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
  const last = head.charCodeAt(head.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) head = head.slice(0, -1);
  return head + note;
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

function tooLarge(what, bytes, max, advice) {
  return {
    error: `Output too large (${bytes} bytes of ${what}, max ${max}). ${advice}`,
    outcome: "output_too_large",
  };
}

/**
 * Decides how a successful result goes out.
 *
 * Whatever fits goes out whole, no matter how many records it holds.
 * Only size can hold a result back, never item count: a list of 400 users is not a large result, and quietly returning 10 of them is worse than returning all 400.
 * What doesn't fit is written to a file and answered with its path.
 */
function deliver(value, { resultStore, resultBytes, reduced } = {}) {
  const json = JSON.stringify(value);
  if (json === undefined) return { result: value };
  const bytes = Buffer.byteLength(json);

  if (reduced) {
    // The sandbox had to cut nested values out to make this fit, so it is not the real result and must not be stored as if it were.
    const cut =
      reduced.depth > 0
        ? `values nested deeper than ${reduced.depth} level${reduced.depth === 1 ? "" : "s"} were replaced by "[truncated: max depth]"`
        : "only a description of it could be returned";
    return {
      result: value,
      truncated: true,
      resultBytes: reduced.bytes,
      hint:
        `The result is ${reduced.bytes} bytes at full depth, above the ${resultBytes}-byte limit, ` +
        `so ${cut}. It was not written to a file because the file would be incomplete. ` +
        "Return fewer fields, or page through the data and process it inside your code.",
    };
  }

  if (bytes <= INLINE_RESULT_BYTES) return { result: value };

  const stored = resultStore?.write(json);
  if (stored) {
    const hint =
      "Preview only. The complete result is in the file named by `resultFile`.";
    return {
      result: previewOf(value, hint),
      truncated: true,
      resultBytes: bytes,
      resultFile: stored.path,
      hint:
        `The result is ${bytes} bytes, above the ${INLINE_RESULT_BYTES}-byte inline limit, ` +
        `so all of it was written to ${stored.path} as JSON. Read that file to get every ` +
        "record; the preview in `result` is the first few entries only. The file is " +
        "temporary and is removed automatically after a few hours.",
    };
  }

  const reason = resultStore
    ? ` and could not be written to a file (${resultStore.lastError ?? "unknown error"})`
    : " and result files are disabled on this server";
  return {
    result: previewOf(
      value,
      "Preview only. The rest of the result was not kept.",
    ),
    truncated: true,
    resultBytes: bytes,
    hint:
      `The result is ${bytes} bytes, above the ${INLINE_RESULT_BYTES}-byte inline limit${reason}. ` +
      "Return less data from your code, for example by selecting only the fields you need " +
      "or by paginating.",
  };
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
  { apiToken, remote = false, signal, profile, resultStore } = {},
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

    child.stderr.on("data", (chunk) => {
      if (stderr.length >= MAX_STDERR) return;
      stderr += stderrDecoder.write(chunk).slice(0, MAX_STDERR - stderr.length);
    });

    child.on("close", (exitCode, exitSignal) => {
      stdout += stdoutDecoder.end();
      if (stderr.length < MAX_STDERR) {
        stderr += stderrDecoder.end().slice(0, MAX_STDERR - stderr.length);
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
        return settle({
          error: stderr
            ? `Subprocess error: ${stderr.slice(0, 2000)}`
            : `Subprocess exited with code ${exitCode} and no output`,
          outcome: "crashed",
        });
      }

      try {
        const raw = JSON.parse(stdout);
        const logs = raw.console ?? [];
        // Console output is never stored, so it keeps its own small budget whether or not the snippet succeeded.
        // Measured on the serialized form, which is what the model receives: ten thousand empty entries cost real bytes even though their text is nothing.
        const logBytes = jsonBytes(logs);
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
          const out = deliver(raw.result, {
            resultStore,
            resultBytes,
            reduced: raw.reduced,
          });
          if (logs.length) out.console = logs;
          return settle(out);
        }

        const { ok, console: _logs, error, ...failure } = raw;
        const out = { error: error ?? "Unknown error", ...failure };
        // Failures are never stored either, so the error has to fit inline.
        const failureBytes = jsonBytes(out);
        if (failureBytes > INLINE_RESULT_BYTES) {
          return settle(
            tooLarge(
              "error details",
              failureBytes,
              INLINE_RESULT_BYTES,
              "The snippet threw, and the error was too large to return. Catch the error and return a shorter description of it.",
            ),
          );
        }
        if (logs.length) out.console = logs;
        return settle(out);
      } catch (e) {
        return settle({
          error: `Failed to parse subprocess output: ${e.message}`,
          outcome: "crashed",
        });
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
