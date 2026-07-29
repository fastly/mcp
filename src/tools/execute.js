import { spawn } from "node:child_process";
import { join } from "node:path";
import { StringDecoder } from "node:string_decoder";
import { setKey } from "../serializer.js";

export const SANDBOX_PATH = join(
  import.meta.dirname ?? import.meta.dir,
  "../sandbox.js",
);
const TIMEOUT_MS = 30_000;
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

export async function execute(code) {
  if (typeof code !== "string" || !code.trim()) {
    return { error: "code must be a non-empty string" };
  }

  return new Promise((resolve) => {
    const childEnv = {};
    if (process.env.NODE_EXTRA_CA_CERTS) {
      childEnv.NODE_EXTRA_CA_CERTS = process.env.NODE_EXTRA_CA_CERTS;
    }
    if (process.env.NODE_USE_SYSTEM_CA) {
      childEnv.NODE_USE_SYSTEM_CA = process.env.NODE_USE_SYSTEM_CA;
    }

    const child = spawn(process.execPath, [SANDBOX_PATH], {
      stdio: ["pipe", "pipe", "pipe"],
      env: childEnv,
    });

    let stdout = "";
    let stdoutBytes = 0;
    let stderr = "";
    let killed = false;

    // Pipe chunks can split a multibyte character; the decoders carry the
    // partial sequence across chunks.
    const stdoutDecoder = new StringDecoder("utf8");
    const stderrDecoder = new StringDecoder("utf8");

    const timer = setTimeout(() => {
      killed = true;
      child.kill("SIGKILL");
    }, TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      // The cap is a byte budget, so count raw chunk bytes, not decoded
      // string length.
      stdoutBytes += chunk.length;
      // Both kill paths discard stdout, so decoding after one is wasted work.
      if (killed) return;
      stdout += stdoutDecoder.write(chunk);
      if (stdoutBytes > MAX_STDOUT) {
        killed = true;
        child.kill("SIGKILL");
      }
    });

    child.stderr.on("data", (chunk) => {
      if (stderr.length >= MAX_STDERR) return;
      stderr += stderrDecoder.write(chunk).slice(0, MAX_STDERR - stderr.length);
    });

    child.on("close", (exitCode) => {
      clearTimeout(timer);
      stdout += stdoutDecoder.end();
      if (stderr.length < MAX_STDERR) {
        stderr += stderrDecoder.end().slice(0, MAX_STDERR - stderr.length);
      }

      if (killed && stdoutBytes > MAX_STDOUT) {
        return resolve({
          error: `Output too large (${stdoutBytes} bytes, max ${MAX_STDOUT}). Reduce scope of your query.`,
        });
      }

      if (killed) {
        return resolve({
          error: `Execution timed out after ${TIMEOUT_MS / 1000}s`,
        });
      }

      if (!stdout) {
        return resolve({
          error: stderr
            ? `Subprocess error: ${stderr.slice(0, 2000)}`
            : `Subprocess exited with code ${exitCode} and no output`,
        });
      }

      try {
        const raw = JSON.parse(stdout);

        if (raw.ok) {
          const { value, wasTruncated } = smartSummarize(raw.result);
          const out = { result: value };
          if (wasTruncated) out.truncated = true;
          if (raw.console?.length) out.console = raw.console;
          return resolve(out);
        }
        const { ok, console: logs, error, ...failure } = raw;
        const out = { error: error ?? "Unknown error", ...failure };
        if (logs?.length) out.console = logs;
        return resolve(out);
      } catch (e) {
        return resolve({
          error: `Failed to parse subprocess output: ${e.message}`,
        });
      }
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        error: `Failed to spawn subprocess: ${err.message}`,
      });
    });

    child.stdin.write(
      JSON.stringify({ code, fastlyApiToken: process.env.FASTLY_API_TOKEN }),
    );
    child.stdin.end();
  });
}
