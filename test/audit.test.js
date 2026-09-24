import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { EventEmitter } from "node:events";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeSync as writeFileChunk,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createAuditLog,
  fileSink,
  methodLabel,
  streamSink,
  toolLabel,
} from "../src/audit.js";

const FIXED_TIME = "2026-09-22T10:20:30.456Z";
const wallClock = () => new Date(FIXED_TIME);
const LINE_SEPARATOR = String.fromCodePoint(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCodePoint(0x2029);

// A sink the test can block, break and repair.
function memorySink() {
  const sink = {
    lines: [],
    accepting: true,
    failure: undefined,
    write(line) {
      if (sink.failure) throw sink.failure;
      if (!sink.accepting) return false;
      sink.lines.push(line);
      return true;
    },
    onDrain(resume) {
      sink.drain = resume;
    },
  };
  return sink;
}

function logTo(sink, options = {}) {
  return createAuditLog({ sink, wallClock, ...options });
}

function recordsOf(sink) {
  return sink.lines.map((line) => JSON.parse(line));
}

function requestIdsOf(sink) {
  return recordsOf(sink).map((record) => record.requestId);
}

describe("audit records", () => {
  test("each record is one JSON object on one line", () => {
    const sink = memorySink();
    const log = logTo(sink);
    log.emit("mcp_request", { requestId: "req-1", status: 200, cached: true });
    log.emit("execution", { requestId: "req-2", durationMs: 12.5 });

    expect(sink.lines).toHaveLength(2);
    for (const line of sink.lines) {
      expect(line.endsWith("\n")).toBe(true);
      expect(line.indexOf("\n")).toBe(line.length - 1);
    }
    expect(recordsOf(sink)).toEqual([
      {
        event: "mcp_request",
        time: FIXED_TIME,
        requestId: "req-1",
        status: 200,
        cached: true,
      },
      {
        event: "execution",
        time: FIXED_TIME,
        requestId: "req-2",
        durationMs: 12.5,
      },
    ]);
  });

  test("the default clock stamps an ISO time", () => {
    const sink = memorySink();
    createAuditLog({ sink }).emit("startup");
    const [record] = recordsOf(sink);
    expect(record.time).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
    expect(new Date(record.time).toISOString()).toBe(record.time);
    expect(Object.keys(record)).toEqual(["event", "time"]);
  });

  test("every fixed event name is accepted", () => {
    const sink = memorySink();
    const log = logTo(sink);
    const events = [
      "startup",
      "request_rejected",
      "mcp_request",
      "execution",
      "internal_error",
      "audit_records_dropped",
    ];
    for (const event of events) log.emit(event);
    expect(recordsOf(sink).map((record) => record.event)).toEqual(events);
  });

  test("an unknown event name throws and writes nothing", () => {
    const sink = memorySink();
    const log = logTo(sink);
    for (const event of [
      "tool_call",
      "",
      "startup\n",
      "constructor",
      undefined,
    ]) {
      expect(() => log.emit(event, { requestId: "req-1" })).toThrow(
        /Unknown audit event/,
      );
    }
    expect(sink.lines).toHaveLength(0);
    expect(log.pendingRecords).toBe(0);
  });

  test("a field cannot replace the event name or the timestamp", () => {
    const sink = memorySink();
    logTo(sink).emit("request_rejected", {
      event: "startup",
      time: "1970-01-01T00:00:00.000Z",
    });
    const [record] = recordsOf(sink);
    expect(record.event).toBe("request_rejected");
    expect(record.time).toBe(FIXED_TIME);
  });

  test("strings are clipped to 128 characters", () => {
    const sink = memorySink();
    logTo(sink).emit("request_rejected", {
      tool: "t".repeat(5000),
      short: "s".repeat(128),
    });
    const [record] = recordsOf(sink);
    expect(record.tool).toBe("t".repeat(128));
    expect(record.short).toBe("s".repeat(128));
    expect(sink.lines[0].length).toBeLessThan(400);
  });

  test("a value cannot inject a second log line", () => {
    const sink = memorySink();
    const forged = '{"event":"startup","time":"forged"}';
    const breaks = [
      "\n",
      "\r",
      "\u0085",
      LINE_SEPARATOR,
      PARAGRAPH_SEPARATOR,
      "\v",
      "\f",
    ];
    const fields = {};
    breaks.forEach((character, i) => {
      fields[`field${i}`] = `x${character}${forged}`;
    });
    fields.crlf = `x\r\n${forged}`;
    logTo(sink).emit("request_rejected", fields);

    expect(sink.lines).toHaveLength(1);
    const [line] = sink.lines;
    for (const character of breaks) {
      expect(line.slice(0, -1)).not.toContain(character);
    }
    const [record] = recordsOf(sink);
    expect(record.event).toBe("request_rejected");
    breaks.forEach((_, i) => {
      expect(record[`field${i}`]).toBe(`x?${forged}`);
    });
    expect(record.crlf).toBe(`x??${forged}`);
  });

  test("control characters are replaced, printable text is kept", () => {
    const sink = memorySink();
    logTo(sink).emit("mcp_request", {
      controls: "a\0b\tc\x1bd\x7fe\x9ff",
      printable: 'café "quoted" \\ back \u{1f511} ~',
    });
    const [record] = recordsOf(sink);
    expect(record.controls).toBe("a?b?c?d?e?f");
    expect(record.printable).toBe('café "quoted" \\ back \u{1f511} ~');
  });

  test("a clip that splits a surrogate pair still yields valid JSON", () => {
    const sink = memorySink();
    logTo(sink).emit("mcp_request", { tool: `${"a".repeat(127)}\u{1f511}` });
    const [record] = recordsOf(sink);
    expect(record.tool.length).toBeLessThanOrEqual(128);
    expect(record.tool.startsWith("a".repeat(127))).toBe(true);
    expect(sink.lines[0]).toMatch(/^[\x20-\x7e]+\n$/);
  });

  test("nested objects are bounded too, names included", () => {
    const sink = memorySink();
    logTo(sink).emit("startup", {
      limits: {
        label: "l".repeat(300),
        "bad\nname": `v${LINE_SEPARATOR}w`,
        inner: { deep: "d".repeat(300), count: 3 },
      },
      [`${"n".repeat(200)}`]: 1,
    });
    const [record] = recordsOf(sink);
    expect(record.limits).toEqual({
      label: "l".repeat(128),
      "bad?name": "v?w",
      inner: { deep: "d".repeat(128), count: 3 },
    });
    expect(record["n".repeat(128)]).toBe(1);
    expect(sink.lines[0].indexOf("\n")).toBe(sink.lines[0].length - 1);
  });

  test("undefined fields are omitted, other scalars survive", () => {
    const sink = memorySink();
    logTo(sink).emit("mcp_request", {
      tokenId: undefined,
      customerId: null,
      ok: false,
      count: 0,
      ratio: Number.NaN,
      huge: Number.POSITIVE_INFINITY,
      big: 12n,
      nested: { gone: undefined, kept: "yes" },
    });
    const [record] = recordsOf(sink);
    expect(record).toEqual({
      event: "mcp_request",
      time: FIXED_TIME,
      customerId: null,
      ok: false,
      count: 0,
      ratio: null,
      huge: null,
      big: "12",
      nested: { kept: "yes" },
    });
    expect("tokenId" in record).toBe(false);
  });
});

describe("audit labels", () => {
  test("known MCP methods are kept, anything else collapses", () => {
    const known = [
      "initialize",
      "ping",
      "server/discover",
      "tools/list",
      "tools/call",
      "notifications/initialized",
      "notifications/cancelled",
      "logging/setLevel",
    ];
    for (const method of known) expect(methodLabel(method)).toBe(method);
    const chosen = [
      "resources/list",
      "tools/call\n",
      "TOOLS/CALL",
      "",
      "x".repeat(10_000),
      "constructor",
      "__proto__",
      null,
      42,
      {},
    ];
    for (const method of chosen) expect(methodLabel(method)).toBe("other");
    expect(methodLabel(undefined)).toBeUndefined();
  });

  test("the three tools are kept, anything else collapses", () => {
    for (const tool of ["search", "inspect", "execute"]) {
      expect(toolLabel(tool)).toBe(tool);
    }
    const chosen = [
      "Execute",
      "execute ",
      "purge_all",
      '{"event":"startup"}\n',
      "toString",
      "",
      null,
      7,
      ["execute"],
    ];
    for (const tool of chosen) expect(toolLabel(tool)).toBe("other");
    expect(toolLabel(undefined)).toBeUndefined();
  });
});

describe("audit sink backpressure and failures", () => {
  test("records wait while the sink pushes back and flush in order", () => {
    const sink = memorySink();
    const log = logTo(sink);
    log.emit("mcp_request", { requestId: "req-1" });

    sink.accepting = false;
    log.emit("mcp_request", { requestId: "req-2" });
    log.emit("mcp_request", { requestId: "req-3" });
    log.emit("mcp_request", { requestId: "req-4" });
    expect(sink.lines).toHaveLength(1);
    expect(log.pendingRecords).toBe(3);
    expect(log.droppedRecords).toBe(0);

    sink.accepting = true;
    sink.drain();
    expect(log.pendingRecords).toBe(0);
    expect(requestIdsOf(sink)).toEqual(["req-1", "req-2", "req-3", "req-4"]);
  });

  test("a later emit flushes the backlog first, keeping the order", () => {
    const sink = memorySink();
    const log = logTo(sink);
    sink.accepting = false;
    log.emit("mcp_request", { requestId: "req-1" });
    log.emit("mcp_request", { requestId: "req-2" });

    sink.accepting = true;
    log.emit("mcp_request", { requestId: "req-3" });
    expect(requestIdsOf(sink)).toEqual(["req-1", "req-2", "req-3"]);
    expect(log.pendingRecords).toBe(0);
  });

  test("a throwing sink is reported once per failure streak", () => {
    const sink = memorySink();
    const failures = [];
    const log = logTo(sink, { onSinkFailure: (error) => failures.push(error) });

    const diskFull = new Error("ENOSPC");
    sink.failure = diskFull;
    for (let i = 1; i <= 5; i++) {
      expect(() =>
        log.emit("mcp_request", { requestId: `req-${i}` }),
      ).not.toThrow();
    }
    expect(failures).toEqual([diskFull]);
    expect(log.pendingRecords).toBe(5);
    expect(sink.lines).toHaveLength(0);

    sink.failure = undefined;
    log.emit("mcp_request", { requestId: "req-6" });
    expect(log.pendingRecords).toBe(0);
    expect(requestIdsOf(sink)).toEqual([
      "req-1",
      "req-2",
      "req-3",
      "req-4",
      "req-5",
      "req-6",
    ]);

    const readOnly = new Error("EROFS");
    sink.failure = readOnly;
    log.emit("mcp_request", { requestId: "req-7" });
    log.emit("mcp_request", { requestId: "req-8" });
    expect(failures).toEqual([diskFull, readOnly]);
  });

  test("flush can be called by hand after a repair", () => {
    const sink = memorySink();
    const log = logTo(sink);
    sink.failure = new Error("EIO");
    log.emit("internal_error", { requestId: "req-1" });
    sink.failure = undefined;
    log.flush();
    expect(log.pendingRecords).toBe(0);
    expect(sink.lines).toHaveLength(1);
  });

  test("the backlog is capped at 1000 records and the rest is counted", () => {
    const sink = memorySink();
    const log = logTo(sink);
    sink.accepting = false;
    for (let i = 0; i < 1005; i++) log.emit("mcp_request", { sequence: i });
    expect(log.pendingRecords).toBe(1000);
    expect(log.droppedRecords).toBe(5);

    for (let i = 0; i < 5000; i++) log.emit("mcp_request", { sequence: -1 });
    expect(log.pendingRecords).toBe(1000);
    expect(log.droppedRecords).toBe(5005);
  });

  test("dropped records are reported once the sink recovers", () => {
    const sink = memorySink();
    const log = logTo(sink);
    sink.accepting = false;
    for (let i = 0; i < 1005; i++) log.emit("mcp_request", { sequence: i });

    sink.accepting = true;
    sink.drain();
    expect(sink.lines).toHaveLength(1000);
    expect(log.droppedRecords).toBe(5);

    log.emit("mcp_request", { sequence: 2000 });
    const records = recordsOf(sink);
    expect(records).toHaveLength(1002);
    expect(records.slice(0, 1000).map((record) => record.sequence)).toEqual(
      Array.from({ length: 1000 }, (_, i) => i),
    );
    expect(records[1000]).toEqual({
      event: "audit_records_dropped",
      time: FIXED_TIME,
      count: 5,
    });
    expect(records[1001].sequence).toBe(2000);
    expect(log.droppedRecords).toBe(0);

    log.emit("mcp_request", { sequence: 2001 });
    expect(recordsOf(sink).filter((record) => record.count)).toHaveLength(1);
  });

  test("close is forwarded to the sink when it has one", () => {
    let closed = 0;
    const sink = {
      ...memorySink(),
      close: () => {
        closed++;
      },
    };
    logTo(sink).close();
    expect(closed).toBe(1);
    expect(() => logTo(memorySink()).close()).not.toThrow();
  });
});

describe("streamSink", () => {
  function fakeStream() {
    const stream = new EventEmitter();
    stream.chunks = [];
    stream.full = false;
    stream.write = (chunk) => {
      stream.chunks.push(chunk);
      return !stream.full;
    };
    return stream;
  }

  test("records pass straight through, queue after backpressure and resume on drain, in order", () => {
    const stream = fakeStream();
    const log = logTo(streamSink(stream));
    log.emit("mcp_request", { requestId: "req-1" });
    expect(stream.chunks).toHaveLength(1);
    expect(log.pendingRecords).toBe(0);

    stream.full = true;
    log.emit("mcp_request", { requestId: "req-2" });
    log.emit("mcp_request", { requestId: "req-3" });
    log.emit("mcp_request", { requestId: "req-4" });
    // The stream still took the write that reported backpressure.
    expect(stream.chunks).toHaveLength(2);
    expect(log.pendingRecords).toBe(2);

    stream.full = false;
    stream.emit("drain");
    expect(log.pendingRecords).toBe(0);
    expect(stream.chunks.map((chunk) => JSON.parse(chunk).requestId)).toEqual([
      "req-1",
      "req-2",
      "req-3",
      "req-4",
    ]);
  });

  test("a stream that stays slow takes one record per drain", () => {
    const stream = fakeStream();
    const log = logTo(streamSink(stream));
    stream.full = true;
    for (let i = 1; i <= 3; i++) log.emit("mcp_request", { sequence: i });

    stream.emit("drain");
    expect(stream.chunks).toHaveLength(2);
    stream.emit("drain");
    expect(stream.chunks).toHaveLength(3);
    expect(log.pendingRecords).toBe(0);
  });

  test("an asynchronous stream error is consumed and bounds later records", () => {
    const stream = fakeStream();
    const failures = [];
    const log = logTo(streamSink(stream), {
      onSinkFailure: (error) => failures.push(error),
    });
    log.emit("startup");

    const brokenPipe = Object.assign(new Error("broken pipe"), {
      code: "EPIPE",
    });
    expect(() => stream.emit("error", brokenPipe)).not.toThrow();
    for (let i = 0; i < 1010; i++) log.emit("mcp_request", { sequence: i });

    expect(failures).toEqual([brokenPipe]);
    expect(log.pendingRecords).toBe(1000);
    expect(log.droppedRecords).toBe(10);
  });
});

describe("fileSink", () => {
  let directory;

  beforeAll(() => {
    directory = mkdtempSync(join(tmpdir(), "fastly-mcp-audit-"));
  });

  afterAll(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  test.skipIf(process.platform === "win32")(
    "creates the file readable by its owner only",
    () => {
      const path = join(directory, "mode.log");
      const log = logTo(fileSink(path));
      log.emit("startup");
      log.close();
      const mode = statSync(path).mode;
      expect(mode & 0o077).toBe(0);
      expect(mode & 0o600).not.toBe(0);
    },
  );

  test.skipIf(process.platform === "win32")(
    "a file that already exists and that others can read is tightened or refused",
    () => {
      const path = join(directory, "permissive.log");
      writeFileSync(path, "");
      chmodSync(path, 0o644);
      let sink;
      try {
        sink = fileSink(path);
      } catch {
        return;
      }
      sink.close();
      expect(statSync(path).mode & 0o077).toBe(0);
    },
  );

  test("appends across reopenings instead of truncating", () => {
    const path = join(directory, "append.log");
    const first = logTo(fileSink(path));
    first.emit("startup", { run: 1 });
    first.emit("mcp_request", { requestId: "req-1" });
    first.close();

    const second = logTo(fileSink(path));
    second.emit("startup", { run: 2 });
    second.close();

    const text = readFileSync(path, "utf8");
    expect(text.endsWith("\n")).toBe(true);
    const records = text
      .trimEnd()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(records.map((record) => record.event)).toEqual([
      "startup",
      "mcp_request",
      "startup",
    ]);
    expect(records[2].run).toBe(2);
  });

  test("an incomplete final record keeps its own line and nothing is deleted", () => {
    const path = join(directory, "partial-tail.log");
    writeFileSync(path, '{"event":"startup","run":1}\n{"event":"mcp_');

    const second = logTo(fileSink(path));
    second.emit("startup", { run: 2 });
    second.close();

    const lines = readFileSync(path, "utf8").trimEnd().split("\n");
    expect(lines).toHaveLength(3);
    expect(JSON.parse(lines[0]).run).toBe(1);
    expect(lines[1]).toBe('{"event":"mcp_');
    expect(JSON.parse(lines[2]).run).toBe(2);
  });

  test("a file without any newline is left whole", () => {
    const path = join(directory, "no-newline.log");
    writeFileSync(path, "precious data without newline");

    const log = logTo(fileSink(path));
    log.emit("startup");
    log.close();

    const lines = readFileSync(path, "utf8").trimEnd().split("\n");
    expect(lines[0]).toBe("precious data without newline");
    expect(JSON.parse(lines[1]).event).toBe("startup");
  });

  test("finishes a short write before accepting the record", () => {
    const path = join(directory, "short-write.log");
    let writes = 0;
    const sink = fileSink(path, {
      write(fd, buffer, offset, length) {
        writes++;
        return writeFileChunk(fd, buffer, offset, Math.min(length, 3));
      },
    });
    sink.write('{"event":"startup"}\n');
    sink.close();
    expect(writes).toBeGreaterThan(1);
    expect(readFileSync(path, "utf8")).toBe('{"event":"startup"}\n');
  });

  test("resumes after a partial write error without duplicating the prefix", () => {
    const path = join(directory, "partial-error.log");
    let calls = 0;
    const sink = fileSink(path, {
      write(fd, buffer, offset, length) {
        calls++;
        if (calls === 1) {
          return writeFileChunk(fd, buffer, offset, Math.min(length, 3));
        }
        if (calls === 2) throw new Error("EIO");
        return writeFileChunk(fd, buffer, offset, length);
      },
    });
    const log = logTo(sink);
    log.emit("startup", { run: 1 });
    expect(log.pendingRecords).toBe(1);
    log.flush();
    log.close();

    const text = readFileSync(path, "utf8");
    expect(text.split("\n")).toHaveLength(2);
    expect(JSON.parse(text)).toMatchObject({ event: "startup", run: 1 });
  });

  test("a path that cannot be opened fails at startup, not at the first record", () => {
    expect(() => fileSink(join(directory, "missing", "audit.log"))).toThrow();
  });
});
