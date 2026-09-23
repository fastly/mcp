import { closeSync, fchmodSync, openSync, writeSync } from "node:fs";

const MAX_FIELD_LENGTH = 128;
const MAX_PENDING_RECORDS = 1000;
const MAX_DEPTH = 3;
const MAX_KEYS = 32;

const EVENTS = new Set([
  "startup",
  "request_rejected",
  "mcp_request",
  "execution",
  "internal_error",
  "audit_records_dropped",
]);

const MCP_METHODS = new Set([
  "initialize",
  "ping",
  "server/discover",
  "tools/list",
  "tools/call",
  "notifications/initialized",
  "notifications/cancelled",
  "logging/setLevel",
]);

const TOOLS = new Set(["search", "inspect", "execute"]);

/** Collapse a caller-chosen MCP method to a fixed label. */
export function methodLabel(method) {
  if (method === undefined) return undefined;
  return MCP_METHODS.has(method) ? method : "other";
}

/** Collapse a caller-chosen tool name to a fixed label. */
export function toolLabel(tool) {
  if (tool === undefined) return undefined;
  return TOOLS.has(tool) ? tool : "other";
}

// Control characters and the Unicode line separators could start a new line
// or hide text in a log viewer.
function isLineSafe(codePoint) {
  if (codePoint < 0x20 || (codePoint >= 0x7f && codePoint <= 0x9f))
    return false;
  return codePoint !== 0x2028 && codePoint !== 0x2029;
}

function bounded(value, depth = 0) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean" || value === null) return value;
  if (typeof value === "object") {
    if (depth >= MAX_DEPTH) return "[nested]";
    const out = {};
    for (const [name, item] of Object.entries(value).slice(0, MAX_KEYS)) {
      if (item !== undefined) out[bounded(name)] = bounded(item, depth + 1);
    }
    return out;
  }
  let text = "";
  for (const char of String(value).slice(0, MAX_FIELD_LENGTH)) {
    text += isLineSafe(char.codePointAt(0)) ? char : "?";
  }
  return text;
}

/**
 * Writes one JSON object per line to a sink.
 *
 * Call sites only pass identifiers, labels and numbers, never headers,
 * bodies, tool arguments or error messages.
 * Strings are still clipped and stripped of control characters, because
 * several fields start out as caller input.
 * When the sink stops accepting writes, records pile up in a bounded backlog
 * and whatever had to be dropped is counted, so a stuck sink cannot eat all
 * the memory.
 */
export function createAuditLog({
  sink,
  wallClock = () => new Date(),
  onSinkFailure = () => {},
} = {}) {
  const pending = [];
  let dropped = 0;
  let failing = false;

  function flush() {
    while (pending.length > 0) {
      try {
        if (sink.write(pending[0]) === false) return;
      } catch (error) {
        if (!failing) onSinkFailure(error);
        failing = true;
        return;
      }
      failing = false;
      pending.shift();
    }
  }

  function enqueue(record) {
    if (pending.length >= MAX_PENDING_RECORDS) {
      dropped++;
      return;
    }
    pending.push(`${JSON.stringify(record)}\n`);
  }

  function emit(event, fields = {}) {
    if (!EVENTS.has(event)) throw new Error(`Unknown audit event: ${event}`);
    flush();
    if (dropped > 0 && pending.length < MAX_PENDING_RECORDS) {
      enqueue({
        event: "audit_records_dropped",
        time: wallClock().toISOString(),
        count: dropped,
      });
      dropped = 0;
    }
    // Fixed fields go last so nothing a call site passes can replace them.
    enqueue({ ...bounded(fields), event, time: wallClock().toISOString() });
    flush();
  }

  sink.onDrain?.(flush);

  return {
    emit,
    flush,
    close: () => sink.close?.(),
    get droppedRecords() {
      return dropped;
    },
    get pendingRecords() {
      return pending.length;
    },
  };
}

/**
 * Sink for `--audit-log <path>`: an append-only file only the service user
 * can read.
 * Writes are synchronous so a record is on its way to disk before the request
 * it describes is answered.
 */
export function fileSink(path, { write = writeSync } = {}) {
  const fd = openSync(path, "a", 0o600);
  // The open mode only applies to a file created here; a log rotated back in
  // by another tool may be world-readable.
  fchmodSync(fd, 0o600);
  return {
    write: (line) => {
      const buffer = Buffer.from(line);
      let offset = 0;
      while (offset < buffer.length) {
        const written = write(fd, buffer, offset, buffer.length - offset);
        if (written <= 0) {
          throw new Error(
            `short write: ${offset} of ${buffer.length} audit bytes were stored`,
          );
        }
        offset += written;
      }
    },
    close: () => closeSync(fd),
  };
}

export function streamSink(stream) {
  let blocked = false;
  return {
    write: (line) => {
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
    close: () => {},
  };
}
