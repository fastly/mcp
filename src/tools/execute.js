import { spawn } from "node:child_process";
import { join } from "node:path";

const SANDBOX_PATH = join(
  import.meta.dirname ?? import.meta.dir,
  "../sandbox.js",
);
const TIMEOUT_MS = 30_000;
const MAX_STDOUT = 100_000;
const MAX_STDERR = 100_000;

const ARRAY_SUMMARY_THRESHOLD = 10;
const OBJECT_KEY_THRESHOLD = 30;
const AUTO_SUMMARY_SIZE = 20_000;

function smartSummarize(value) {
  if (value === null || value === undefined || typeof value !== "object") {
    return { value, wasTruncated: false };
  }

  if (Array.isArray(value)) {
    const json = JSON.stringify(value);
    const tooMany = value.length > ARRAY_SUMMARY_THRESHOLD;
    const tooLarge = json.length > AUTO_SUMMARY_SIZE;
    if (tooMany || tooLarge) {
      const preview = value.slice(0, ARRAY_SUMMARY_THRESHOLD);
      return {
        value: {
          _type: "array",
          _total: value.length,
          _showing: Math.min(ARRAY_SUMMARY_THRESHOLD, value.length),
          _hint: tooMany
            ? `Showing first ${ARRAY_SUMMARY_THRESHOLD} of ${value.length} items. Filter in your code to reduce output.`
            : `Array items are large (${json.length} bytes serialized). Showing all ${value.length} items but nested values may be truncated.`,
          items: preview,
        },
        wasTruncated: true,
      };
    }
    return { value, wasTruncated: false };
  }

  const keys = Object.keys(value);
  const json = JSON.stringify(value);
  if (keys.length > OBJECT_KEY_THRESHOLD || json.length > AUTO_SUMMARY_SIZE) {
    const previewKeys = keys.slice(0, OBJECT_KEY_THRESHOLD);
    const preview = {};
    for (const k of previewKeys) {
      const v = value[k];
      if (typeof v === "object" && v !== null) {
        if (Array.isArray(v)) {
          preview[k] = `[Array: ${v.length} items]`;
        } else {
          const subKeys = Object.keys(v);
          preview[k] =
            subKeys.length <= 5
              ? v
              : `{Object: keys=${subKeys.slice(0, 5).join(", ")}... (${subKeys.length} total)}`;
        }
      } else {
        preview[k] = v;
      }
    }

    return {
      value: {
        _type: "object",
        _totalKeys: keys.length,
        _showing: previewKeys.length,
        _hint:
          keys.length > OBJECT_KEY_THRESHOLD
            ? `Large object with ${keys.length} keys. Showing first ${OBJECT_KEY_THRESHOLD}. Access specific keys in your code.`
            : json.length > AUTO_SUMMARY_SIZE
              ? `Object serializes to ${json.length} bytes. Nested values summarized. Access specific keys in your code.`
              : undefined,
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
    if (process.env.FASTLY_API_TOKEN) {
      childEnv.FASTLY_API_TOKEN = process.env.FASTLY_API_TOKEN;
    }

    const child = spawn(process.execPath, [SANDBOX_PATH], {
      stdio: ["pipe", "pipe", "pipe"],
      env: childEnv,
    });

    let stdout = "";
    let stderr = "";
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      child.kill("SIGKILL");
    }, TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      if (!killed && stdout.length > MAX_STDOUT) {
        killed = true;
        child.kill("SIGKILL");
      }
    });

    child.stderr.on("data", (chunk) => {
      if (stderr.length >= MAX_STDERR) return;
      stderr += chunk.toString().slice(0, MAX_STDERR - stderr.length);
    });

    child.on("close", (exitCode) => {
      clearTimeout(timer);

      if (killed && stdout.length > MAX_STDOUT) {
        return resolve({
          error: `Output too large (${stdout.length} bytes, max ${MAX_STDOUT}). Reduce scope of your query.`,
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
        const out = { error: raw.error };
        if (raw.stack) out.stack = raw.stack;
        if (raw.console?.length) out.console = raw.console;
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

    child.stdin.write(JSON.stringify({ code }));
    child.stdin.end();
  });
}
