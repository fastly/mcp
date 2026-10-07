import {
  closeSync,
  fchmodSync,
  fstatSync,
  openSync,
  readSync,
  writeSync,
} from "node:fs";

/**
 * Sink for `--audit-log <path>`: an append-only file only the service user can read.
 * Writes are synchronous so a record is on its way to disk before the request it describes is answered.
 */
export function fileSink(path, { write = writeSync } = {}) {
  const fd = openSync(path, "a+", 0o600);
  try {
    // The open mode only applies to a file created here; a log rotated back in by another tool may be world-readable.
    fchmodSync(fd, 0o600);
    // A record cut short by a crash or a failed write keeps its line to itself, so the next record still parses.
    if (endsMidLine(fd)) writeSync(fd, "\n");
  } catch (error) {
    closeSync(fd);
    throw error;
  }
  // The queue retries the record a failed write was working on, so the retry carries on from where that write stopped.
  let offset = 0;
  return {
    write: (line) => {
      const buffer = Buffer.from(line);
      while (offset < buffer.length) {
        const written = write(fd, buffer, offset, buffer.length - offset);
        if (written <= 0) {
          throw new Error(
            `short write: ${offset} of ${buffer.length} audit bytes were stored`,
          );
        }
        offset += written;
      }
      offset = 0;
    },
    close: () => closeSync(fd),
  };
}

function endsMidLine(fd) {
  const { size } = fstatSync(fd);
  if (size === 0) return false;
  const last = Buffer.alloc(1);
  readSync(fd, last, 0, 1, size - 1);
  return last[0] !== 0x0a;
}

export function streamSink(stream) {
  let blocked = false;
  let failed;
  // An 'error' event nobody listens to would crash the process.
  stream.on("error", (error) => {
    failed = error;
  });
  return {
    write: (line) => {
      if (failed) throw failed;
      if (blocked) return false;
      blocked = !stream.write(line);
      return true;
    },
    onDrain: (resume) => {
      stream.on("drain", () => {
        blocked = false;
        resume();
      });
    },
    onError: (onError) => stream.on("error", onError),
    close: () => {},
  };
}
