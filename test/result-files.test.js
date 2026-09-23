import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { RESULT_FILE_BYTES } from "../src/limits.js";
import { tempDir } from "./helpers.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

import {
  createResultStore,
  DEFAULT_RESULT_DIR,
  resolveResultStore,
} from "../src/result-files.js";

describe("result files", () => {
  let base;

  beforeEach(() => {
    base = tempDir("result-files");
  });

  test("writes a result and reports its path and size", () => {
    const dir = join(base, "results");
    const store = createResultStore({ dir });
    const text = JSON.stringify({ users: ["a", "b"] });
    const written = store.write(text);
    expect(written.path).toStartWith(dir);
    expect(written.bytes).toBe(Buffer.byteLength(text));
    expect(readFileSync(written.path, "utf8")).toBe(text);
  });

  test("creates a private directory and private files", () => {
    const dir = join(base, "results");
    const store = createResultStore({ dir });
    const { path } = store.write("{}");
    expect(lstatSync(dir).mode & 0o777).toBe(0o700);
    expect(lstatSync(path).mode & 0o777).toBe(0o600);
  });

  test("each write gets its own file", () => {
    const store = createResultStore({ dir: join(base, "results") });
    const first = store.write('{"n":1}');
    const second = store.write('{"n":2}');
    expect(second.path).not.toBe(first.path);
    expect(readFileSync(first.path, "utf8")).toBe('{"n":1}');
  });

  test("a name collision does not delete the existing result", () => {
    const dir = join(base, "results");
    const store = createResultStore({
      dir,
      now: () => 1_000_000,
      random: () => Buffer.alloc(6, 0xab),
    });
    const first = store.write('{"n":1}');
    expect(store.write('{"n":2}')).toBeNull();
    expect(store.lastError).toContain("EEXIST");
    expect(readFileSync(first.path, "utf8")).toBe('{"n":1}');
  });

  test("keeps only the newest files", () => {
    let clock = 1_000_000;
    const store = createResultStore({
      dir: join(base, "results"),
      maxFiles: 3,
      now: () => clock++,
    });
    const paths = [];
    for (let i = 0; i < 6; i++) paths.push(store.write(`{"n":${i}}`).path);
    const kept = readdirSync(join(base, "results"));
    expect(kept).toHaveLength(3);
    expect(readFileSync(paths[5], "utf8")).toBe('{"n":5}');
  });

  test("drops files past the age limit", () => {
    let clock = 1_000_000;
    const dir = join(base, "results");
    const store = createResultStore({
      dir,
      maxFiles: 50,
      maxAgeMs: 100,
      now: () => clock,
    });
    store.write('{"old":true}');
    clock += 5_000;
    const fresh = store.write('{"new":true}');
    expect(readdirSync(dir)).toEqual([fresh.path.split("/").pop()]);
  });

  test("a result over the file limit is refused, not stored", () => {
    const dir = join(base, "results");
    const store = createResultStore({ dir, maxBytes: 1_000 });
    expect(store.write("x".repeat(1_000)).bytes).toBe(1_000);
    expect(store.write("x".repeat(1_001))).toBeNull();
    expect(store.lastError).toContain("1000-byte limit");
    expect(readdirSync(dir)).toHaveLength(1);
  });

  test("the default file limit matches what the sandbox may serialize", () => {
    const store = createResultStore({ dir: join(base, "results") });
    expect(store.write("x".repeat(RESULT_FILE_BYTES + 1))).toBeNull();
    expect(store.lastError).toContain(`${RESULT_FILE_BYTES}-byte limit`);
  });

  // The file size limit is set in a child shell because ulimit can only lower it, never raise it back.
  test.skipIf(process.platform === "win32")(
    "a write cut short by the filesystem is a failure with no file left",
    () => {
      const dir = join(base, "results");
      const script = `
        import { createResultStore } from ${JSON.stringify(join(import.meta.dir, "../src/result-files.js"))};
        const store = createResultStore({ dir: ${JSON.stringify(dir)}, sweepIntervalMs: 0 });
        const written = store.write("x".repeat(100_000));
        console.log(JSON.stringify({ written, lastError: store.lastError }));
      `;
      const run = spawnSync(
        "sh",
        ["-c", 'ulimit -f 1 && exec bun -e "$0"', script],
        { encoding: "utf8" },
      );
      expect(run.status).toBe(0);
      const { written, lastError } = JSON.parse(run.stdout.trim());
      expect(written).toBeNull();
      expect(lastError).toMatch(/EFBIG|short write/);
      expect(readdirSync(dir)).toEqual([]);
    },
  );

  test("the newest file survives pruning whatever the clock does", () => {
    let clock = 1_000_000;
    const dir = join(base, "results");
    const store = createResultStore({
      dir,
      maxFiles: 3,
      now: () => clock,
    });
    for (let i = 0; i < 3; i++) store.write(`{"n":${i}}`);
    // A clock stepping backwards makes the next file sort as the oldest.
    clock = 500_000;
    const written = store.write('{"latest":true}');
    expect(readFileSync(written.path, "utf8")).toBe('{"latest":true}');
    expect(readdirSync(dir)).toHaveLength(3);
  });

  test("expired files are swept while the server is idle", async () => {
    let clock = 1_000_000;
    const dir = join(base, "results");
    const store = createResultStore({
      dir,
      maxAgeMs: 100,
      sweepIntervalMs: 10,
      now: () => clock,
    });
    try {
      store.write('{"n":1}');
      expect(readdirSync(dir)).toHaveLength(1);
      clock += 1_000;
      await sleep(80);
      expect(readdirSync(dir)).toEqual([]);
    } finally {
      store.close();
    }
  });

  test("files left by an earlier run expire on creation", () => {
    const dir = join(base, "results");
    const earlier = createResultStore({ dir, now: () => 1_000_000 });
    earlier.write('{"stale":true}');
    earlier.close();
    const later = createResultStore({
      dir,
      maxAgeMs: 100,
      now: () => 2_000_000,
    });
    later.close();
    expect(readdirSync(dir)).toEqual([]);
  });

  // Pointing --result-dir at a link must not delete files elsewhere.
  test("a sweep never reaches through a symlinked directory", async () => {
    const target = join(base, "elsewhere");
    const link = join(base, "link");
    const victim = createResultStore({ dir: target, now: () => 1_000_000 });
    victim.write('{"theirs":true}');
    victim.close();
    symlinkSync(target, link);
    const store = createResultStore({
      dir: link,
      maxAgeMs: 100,
      sweepIntervalMs: 10,
      now: () => 2_000_000,
    });
    try {
      store.sweep();
      await sleep(40);
      expect(readdirSync(target)).toHaveLength(1);
    } finally {
      store.close();
    }
  });

  test("only files it wrote are ever removed", () => {
    const dir = join(base, "results");
    const store = createResultStore({ dir, maxFiles: 1, now: () => 2_000_000 });
    store.write("{}");
    writeFileSync(join(dir, "result-2026-09-22.json"), "theirs");
    writeFileSync(join(dir, "result-00000000000001-abcdef.json"), "theirs");
    store.write("{}");
    store.sweep();
    const names = readdirSync(dir).sort();
    expect(names).toContain("result-2026-09-22.json");
    expect(names).toContain("result-00000000000001-abcdef.json");
    expect(names.filter((n) => n.endsWith("-abcdef.json"))).toHaveLength(1);
    expect(names).toHaveLength(3);
  });

  test("a directory swapped for a symlink stops sweeps and writes", () => {
    const dir = join(base, "results");
    const target = join(base, "elsewhere");
    const other = createResultStore({ dir: target, now: () => 1_000_000 });
    other.write('{"theirs":true}');
    other.close();
    const store = createResultStore({
      dir,
      maxAgeMs: 100,
      now: () => 2_000_000,
    });
    store.write("{}");
    rmSync(dir, { recursive: true });
    symlinkSync(target, dir);
    store.sweep();
    expect(readdirSync(target)).toHaveLength(1);
    expect(store.write("{}")).toBeNull();
    expect(store.lastError).toContain("not a directory");
    expect(readdirSync(target)).toHaveLength(1);
    store.close();
  });

  test("a removed directory is recreated by the next write", () => {
    const dir = join(base, "results");
    const store = createResultStore({ dir });
    store.write("{}");
    rmSync(dir, { recursive: true });
    const written = store.write('{"again":true}');
    expect(written).not.toBeNull();
    expect(readFileSync(written.path, "utf8")).toBe('{"again":true}');
    expect(lstatSync(dir).mode & 0o777).toBe(0o700);
  });

  test.skipIf(process.platform === "win32")(
    "refuses a directory other users can write to",
    () => {
      const dir = join(base, "shared");
      mkdirSync(dir, { mode: 0o777 });
      chmodSync(dir, 0o777);
      const store = createResultStore({ dir });
      expect(store.write("{}")).toBeNull();
      expect(store.lastError).toContain("writable by other users");
      expect(readdirSync(dir)).toEqual([]);
    },
  );

  test("refuses a symlink where the result directory should be", () => {
    const target = join(base, "elsewhere");
    const link = join(base, "link");
    symlinkSync(target, link);
    const store = createResultStore({ dir: link });
    const written = store.write("{}");
    expect(written).toBeNull();
    expect(store.lastError).toContain("not a directory");
  });

  test("a write failure is reported, not thrown", () => {
    const blocked = join(base, "blocked");
    writeFileSync(blocked, "not a directory");
    const store = createResultStore({ dir: join(blocked, "results") });
    expect(store.write("{}")).toBeNull();
    expect(typeof store.lastError).toBe("string");
  });

  test("resolveResultStore defaults to a temporary directory", () => {
    const store = resolveResultStore({ env: {} });
    expect(store.directory).toBe(DEFAULT_RESULT_DIR);
  });

  test("resolveResultStore honours the environment and the off switch", () => {
    const dir = join(base, "from-env");
    expect(
      resolveResultStore({ env: { FASTLY_MCP_RESULT_DIR: dir } }).directory,
    ).toBe(dir);
    expect(
      resolveResultStore({ env: { FASTLY_MCP_RESULT_DIR: "off" } }),
    ).toBeNull();
    expect(resolveResultStore({ env: {}, dir: "none" })).toBeNull();
  });

  test("a flag beats the environment", () => {
    const dir = join(base, "from-flag");
    const store = resolveResultStore({
      env: { FASTLY_MCP_RESULT_DIR: join(base, "from-env") },
      dir,
    });
    expect(store.directory).toBe(dir);
  });

  afterEach(() => {
    rmSync(base, { recursive: true, force: true });
  });
});
