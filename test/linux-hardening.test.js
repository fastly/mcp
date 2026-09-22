// Linux-only checks of the remote execution profile, using the real host checks.
// A Linux host that fails these cannot start remote mode either.
import { beforeAll, describe, expect, test } from "bun:test";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolveRemoteExecutionProfile } from "../src/execution-runtime.js";
import {
  preferAsOomVictim,
  requireYama,
  resolvePrlimit,
} from "../src/host-checks.js";
import { execute } from "../src/tools/execute.js";
import { childrenOf, executeWith, until } from "./remote-helpers.js";

const LINUX = process.platform === "linux";
const OS_LIMITS = { dataBytes: 1024 * 1024 * 1024, cpuSeconds: 30 };
const LIMITS = { memoryMb: 1024, heapMb: 512, cpuSeconds: 30 };
const hardened = (limits = LIMITS, prlimit = resolvePrlimit(OS_LIMITS)) => ({
  ...resolveRemoteExecutionProfile(limits, { prlimit }),
  oomVictim: preferAsOomVictim,
});

describe.skipIf(!LINUX)("Yama process isolation", () => {
  test("this host enforces a ptrace scope remote mode accepts", () => {
    expect([1, 2, 3]).toContain(requireYama());
  });

  test("a child cannot open the memory or syscall files of its live parent or sibling", () => {
    const sibling = spawn("sleep", ["30"], { stdio: "ignore" });
    try {
      // Plain Node without the permission model, so only the kernel stands
      // between this child and the two targets.
      const probe = spawnSync(
        Bun.which("node"),
        [
          "-e",
          `const fs = require("node:fs");
           const out = {};
           for (const pid of process.argv.slice(1)) {
             for (const file of ["mem", "syscall"]) {
               try {
                 const fd = fs.openSync("/proc/" + pid + "/" + file, "r");
                 const buffer = Buffer.alloc(16);
                 fs.readSync(fd, buffer, 0, 16, file === "mem" ? 0x400000 : 0);
                 out[pid + "/" + file] = "readable";
               } catch (error) {
                 out[pid + "/" + file] = error.code;
               }
             }
           }
           console.log(JSON.stringify(out));`,
          String(process.pid),
          String(sibling.pid),
        ],
        { encoding: "utf8" },
      );
      const result = JSON.parse(probe.stdout);
      expect(Object.keys(result)).toHaveLength(4);
      for (const outcome of Object.values(result)) {
        expect(["EACCES", "EPERM"]).toContain(outcome);
      }
      expect(sibling.exitCode).toBeNull();
    } finally {
      sibling.kill("SIGKILL");
    }
  });
});

describe.skipIf(!LINUX)("remote execution profile", () => {
  let profile;

  beforeAll(() => {
    profile = hardened();
  });

  const run = (code, overrides) => executeWith(profile)(code, overrides);

  test("Node runs through prlimit with a heap cap, and ordinary work fits inside the limits", async () => {
    expect(profile.name).toBe("node");
    expect(profile.prlimit.path).toMatch(/\/prlimit$/);
    expect(profile.prlimit.dataBytes).toBe(1024 * 1024 * 1024);
    expect(profile.args).toContain("--permission");
    const result = await run(
      "const big = new Uint8Array(64 * 1024 * 1024).fill(7); return [typeof serviceApi.listServices, big.length];",
    );
    expect(result.result).toEqual(["function", 64 * 1024 * 1024]);
  }, 30000);

  test("the child is the preferred OOM victim before it gets any input, and the parent is untouched", async () => {
    const own = readFileSync("/proc/self/oom_score_adj", "utf8").trim();
    const before = new Set(childrenOf(process.pid));
    const controller = new AbortController();
    // A busy loop, because Node exits right away when all it has left is a
    // pending promise.
    const pending = execute("for (;;) {}", {
      apiToken: "synthetic-token",
      remote: true,
      signal: controller.signal,
      profile,
    });
    const child = await until(() =>
      childrenOf(process.pid).find((pid) => !before.has(pid)),
    );
    expect(readFileSync(`/proc/${child}/oom_score_adj`, "utf8").trim()).toBe(
      "1000",
    );
    expect(readFileSync("/proc/self/oom_score_adj", "utf8").trim()).toBe(own);
    controller.abort();
    expect((await pending).outcome).toBe("cancelled");
  }, 30000);

  test("no input is sent when the OOM handshake fails", async () => {
    const result = await run("return 'should never run';", {
      oomVictim: () => {
        throw new Error("synthetic handshake failure");
      },
    });
    expect(result.outcome).toBe("launch_failed");
    expect(result.result).toBeUndefined();
  }, 30000);

  test("retained JavaScript heap is stopped by the heap cap", async () => {
    const result = await run(
      "const keep = []; for (;;) keep.push(new Array(100000).fill(Math.random()));",
    );
    expect(result.outcome).toBe("oom");
    expect(result.error).toContain("out of memory");
  }, 60000);

  for (const [kind, allocate] of [
    ["ArrayBuffer", "new Uint8Array(64 * 1024 * 1024)"],
    [
      "SharedArrayBuffer",
      "new Uint8Array(new SharedArrayBuffer(64 * 1024 * 1024))",
    ],
  ]) {
    test(`touched ${kind} memory is stopped by the allocation limit`, async () => {
      const result = await run(
        `const keep = [];
         for (let i = 0; i < 64; i++) { const block = ${allocate}; block.fill(1); keep.push(block); }
         return keep.length;`,
      );
      expect(result.result).toBeUndefined();
      expect(result.error).toBeDefined();
    }, 60000);
  }

  test("CPU time is bounded independently of the wall clock", async () => {
    const limits = { ...profile.prlimit, cpuSeconds: 2 };
    const started = Date.now();
    const result = await run("for (;;) {}", { prlimit: limits });
    expect(Date.now() - started).toBeLessThan(15_000);
    expect(["cpu_limit", "oom"]).toContain(result.outcome);
  }, 30000);

  test("permissions still hold under the launcher", async () => {
    const result = await run(
      "return [typeof process, typeof require, typeof fetch === 'function'];",
    );
    expect(result.result).toEqual(["undefined", "undefined", true]);
    const fetched = await run("return await fetch('http://127.0.0.1:1/');");
    expect(fetched.error).toContain("fetch is not available");
  }, 30000);

  test("limits too small for the SDK to load fail the proving execution", async () => {
    const tiny = hardened(
      { memoryMb: 64, heapMb: 32 },
      { ...resolvePrlimit(OS_LIMITS), dataBytes: 64 * 1024 * 1024 },
    );
    const result = await executeWith(tiny)("return 1;");
    expect(result.result).toBeUndefined();
    expect(result.outcome).toBeDefined();
  }, 30000);
});
