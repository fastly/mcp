import { randomBytes } from "node:crypto";
import {
  closeSync,
  lstatSync,
  mkdirSync,
  openSync,
  readdirSync,
  rmSync,
  writeSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describeThrown } from "./errors.js";
import { RESULT_FILE_BYTES } from "./limits.js";

/**
 * Where results that are too big for a tool response get parked.
 *
 * The sandbox can't write files, so the parent does it after the result comes back.
 * One file per result, in a directory we own, and old ones get cleaned up so a server that runs for days doesn't pile up copies of customer data.
 */

const PREFIX = "result-";
const DEFAULT_MAX_FILES = 20;
const DEFAULT_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const DEFAULT_SWEEP_INTERVAL_MS = 10 * 60 * 1000;

export const DEFAULT_RESULT_DIR = join(tmpdir(), "fastly-mcp-results");

// Cleanup only ever touches files we wrote.
// Someone may point --result-dir at a directory that already has a "result-something.json" in it.
const RESULT_NAME = /^result-(\d{14})-[0-9a-f]{12}\.json$/;

// A symlink where the directory should be would let someone else pick where our files go and what a sweep deletes, so it's rejected outright.
// So is a directory other local users can write to, since they could swap a file after we wrote it.
function validateDirectory(dir) {
  const stats = lstatSync(dir);
  if (!stats.isDirectory()) {
    throw new Error(`${dir} is not a directory`);
  }
  if (process.getuid && stats.uid !== process.getuid()) {
    throw new Error(`${dir} is not owned by this user`);
  }
  if (process.platform !== "win32" && stats.mode & 0o022) {
    throw new Error(`${dir} is writable by other users`);
  }
}

function prepareDirectory(dir) {
  try {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  } catch {
    // Whatever is in the way gets a proper name from the check below.
  }
  validateDirectory(dir);
}

// A single write can stop short, at a file size limit for instance, and a file missing its tail would be read back as a complete result.
function writeFully(fd, buffer) {
  let offset = 0;
  while (offset < buffer.length) {
    const written = writeSync(fd, buffer, offset, buffer.length - offset);
    if (written <= 0) {
      throw new Error(
        `short write: ${offset} of ${buffer.length} bytes were stored`,
      );
    }
    offset += written;
  }
}

/**
 * `write` never throws.
 * A good result shouldn't fail because the disk did, so it returns null and the caller falls back to describing the result.
 *
 * `seal` runs over the text before it is written, which is where secret encryption plugs in.
 *
 * Old files are swept after each write and on a timer, so they expire even when the server sits idle.
 */
export function createResultStore({
  dir = DEFAULT_RESULT_DIR,
  maxFiles = DEFAULT_MAX_FILES,
  maxBytes = RESULT_FILE_BYTES,
  maxAgeMs = DEFAULT_MAX_AGE_MS,
  sweepIntervalMs = DEFAULT_SWEEP_INTERVAL_MS,
  seal = (text) => text,
  now = Date.now,
} = {}) {
  const directory = resolve(dir);
  let lastError;

  // `spare` is the file whose path is about to be handed out.
  // It must survive even if the clock went backwards and it sorts as the oldest.
  const prune = (spare) => {
    // Checked every time, not once: the directory can be swapped for a symlink between two sweeps.
    let names;
    try {
      validateDirectory(directory);
      names = readdirSync(directory)
        .filter((name) => RESULT_NAME.test(name) && name !== spare)
        .sort();
    } catch {
      return;
    }
    // Names start with a zero-padded timestamp, so sorted names are sorted by age.
    const cutoff = now() - maxAgeMs;
    const room = Math.max(0, spare ? maxFiles - 1 : maxFiles);
    names.forEach((name, i) => {
      const stamp = Number(RESULT_NAME.exec(name)[1]);
      if (i >= names.length - room && stamp >= cutoff) return;
      try {
        rmSync(join(directory, name), { force: true });
      } catch {
        // Not being able to delete an old file is no reason to fail.
      }
    });
  };

  // Leftovers from an earlier run expire on the same schedule.
  prune();
  const sweeper =
    sweepIntervalMs > 0 ? setInterval(() => prune(), sweepIntervalMs) : null;
  sweeper?.unref?.();

  return {
    directory,

    /** Why the last write failed, for the hint sent to the model. */
    get lastError() {
      return lastError;
    },

    /** Returns `{ path, bytes }`, or null when the result could not be stored. */
    write(text) {
      let path;
      try {
        const buffer = Buffer.from(seal(text));
        if (buffer.length > maxBytes) {
          throw new Error(
            `the result is ${buffer.length} bytes, above the ${maxBytes}-byte limit for one file`,
          );
        }
        // Every time, since the directory may have been removed or replaced since the last write.
        prepareDirectory(directory);
        const stamp = String(now()).padStart(14, "0");
        const name = `${PREFIX}${stamp}-${randomBytes(6).toString("hex")}.json`;
        path = join(directory, name);
        // "wx" refuses to follow a symlink or overwrite anything.
        const fd = openSync(path, "wx", 0o600);
        try {
          writeFully(fd, buffer);
        } finally {
          closeSync(fd);
        }
        lastError = undefined;
        prune(name);
        return { path, bytes: buffer.length };
      } catch (error) {
        lastError = describeThrown(error).error;
        if (path) {
          try {
            rmSync(path, { force: true });
          } catch {
            // Nothing more to do; the write has already failed.
          }
        }
        return null;
      }
    },

    sweep() {
      prune();
    },

    close() {
      if (sweeper) clearInterval(sweeper);
    },
  };
}

/** Builds the store from the flag or the environment; "off" disables it. */
export function resolveResultStore({ env = process.env, dir, seal } = {}) {
  const configured = dir ?? env.FASTLY_MCP_RESULT_DIR;
  if (configured === "off" || configured === "none") return null;
  return createResultStore({ dir: configured || undefined, seal });
}
