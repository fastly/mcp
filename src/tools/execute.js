import { spawn } from "node:child_process";
import { StringDecoder } from "node:string_decoder";
import {
  getExecutionRuntime,
  launchCommand,
  SANDBOX_PATH,
} from "../execution-runtime.js";

export { SANDBOX_PATH };

import { setKey } from "../serializer.js";

const TIMEOUT_MS = 30_000;
// Extra time a child gives itself past the parent's deadline, in case the
// parent is no longer there to kill it.
const CHILD_GRACE_MS = 5_000;
const MAX_STDOUT = 100_000;
const MAX_STDERR = 100_000;

const ARRAY_SUMMARY_THRESHOLD = 10;
const OBJECT_KEY_THRESHOLD = 30;
const AUTO_SUMMARY_SIZE = 20_000;

function jsonByteSize(value) {
  return Buffer.byteLength(JSON.stringify(value));
}

function smartSummarize(value) {
  if (value === null || value === undefined || typeof value !== "object") {
    return { value, wasTruncated: false };
  }

  if (Array.isArray(value)) {
    // Measuring costs a full serialization pass, so skip it when the
    // count alone already forces a summary.
    const tooMany = value.length > ARRAY_SUMMARY_THRESHOLD;
    const jsonBytes = tooMany ? null : jsonByteSize(value);
    if (tooMany || jsonBytes > AUTO_SUMMARY_SIZE) {
      const preview = value.slice(0, ARRAY_SUMMARY_THRESHOLD);
      return {
        value: {
          _type: "array",
          _total: value.length,
          _showing: Math.min(ARRAY_SUMMARY_THRESHOLD, value.length),
          _hint: tooMany
            ? `Showing first ${ARRAY_SUMMARY_THRESHOLD} of ${value.length} items. Filter in your code to reduce output.`
            : `Array items are large (${jsonBytes} bytes serialized). Showing all ${value.length} items but nested values may be truncated.`,
          items: preview,
        },
        wasTruncated: true,
      };
    }
    return { value, wasTruncated: false };
  }

  const keys = Object.keys(value);
  const tooManyKeys = keys.length > OBJECT_KEY_THRESHOLD;
  const jsonBytes = tooManyKeys ? null : jsonByteSize(value);
  if (tooManyKeys || jsonBytes > AUTO_SUMMARY_SIZE) {
    const previewKeys = keys.slice(0, OBJECT_KEY_THRESHOLD);
    const preview = {};
    for (const k of previewKeys) {
      const v = value[k];
      if (typeof v === "object" && v !== null) {
        if (Array.isArray(v)) {
          setKey(preview, k, `[Array: ${v.length} items]`);
        } else {
          const subKeys = Object.keys(v);
          setKey(
            preview,
            k,
            subKeys.length <= 5
              ? v
              : `{Object: keys=${subKeys.slice(0, 5).join(", ")}... (${subKeys.length} total)}`,
          );
        }
      } else {
        setKey(preview, k, v);
      }
    }

    return {
      value: {
        _type: "object",
        _totalKeys: keys.length,
        _showing: previewKeys.length,
        _hint: tooManyKeys
          ? `Large object with ${keys.length} keys. Showing first ${OBJECT_KEY_THRESHOLD}. Access specific keys in your code.`
          : `Object serializes to ${jsonBytes} bytes. Nested values summarized. Access specific keys in your code.`,
        preview,
      },
      wasTruncated: true,
    };
  }

  return { value, wasTruncated: false };
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
  { apiToken, remote = false, signal, profile } = {},
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
        kill({
          error: `Output too large (${stdoutBytes} bytes, max ${MAX_STDOUT}). Reduce scope of your query.`,
          outcome: "output_too_large",
        });
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

        if (raw.ok) {
          const { value, wasTruncated } = smartSummarize(raw.result);
          const out = { result: value };
          if (wasTruncated) out.truncated = true;
          if (raw.console?.length) out.console = raw.console;
          return settle(out);
        }
        const { ok, console: logs, error, ...failure } = raw;
        const out = { error: error ?? "Unknown error", ...failure };
        if (logs?.length) out.console = logs;
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
        policy: { remote, deadlineMs: timeoutMs + CHILD_GRACE_MS },
      }),
    );
  });
}
