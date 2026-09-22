import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  chmodSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  preferAsOomVictim,
  requireNoInspector,
  requireYama,
  resolvePrlimit,
} from "../src/host-checks.js";

const NODE_PARENT = { node: "24.12.0", v8: "13.6" };
const BUN_PARENT = { node: "24.3.0", bun: "1.3.11" };

describe("requireYama", () => {
  const yamaSet = (text) => requireYama({ readFile: () => text });

  test("scopes 1, 2 and 3 are accepted as the kernel prints them, from the sysctl file only", () => {
    const paths = new Set();
    const readAs = (text) =>
      requireYama({
        readFile: (path) => {
          paths.add(path);
          return text;
        },
      });
    expect(readAs("1\n")).toBe(1);
    expect(readAs("2\n")).toBe(2);
    expect(readAs("3\n")).toBe(3);
    expect(readAs("1")).toBe(1);
    expect(readAs(Buffer.from("2\n"))).toBe(2);
    expect([...paths]).toEqual(["/proc/sys/kernel/yama/ptrace_scope"]);
  });

  test("anything that is not exactly 1, 2 or 3 is refused, quoting the value and what to set", () => {
    const refused = [
      "0\n",
      "",
      "\n",
      "4",
      "-1",
      "11",
      "1 2",
      "01",
      "1.0",
      "0x1",
      "yes",
    ];
    for (const text of refused) {
      const check = () => yamaSet(text);
      expect(check).toThrow(/ptrace_scope to be 1, 2 or 3/);
      expect(check).toThrow(`"${text.trim()}"`);
      expect(check).toThrow(/sysctl/);
    }
  });

  test("an unreadable file is refused with a way forward", () => {
    const unreadable = () =>
      requireYama({
        readFile: () => {
          throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
        },
      });
    expect(unreadable).toThrow(/cannot be read/);
    expect(unreadable).toThrow(/ptrace_scope to 1 or higher/);
  });

  test.skipIf(process.platform === "linux")(
    "the real check fails closed on a host without Yama",
    () => {
      expect(() => requireYama()).toThrow(/cannot be read/);
    },
  );
});

describe("requireNoInspector", () => {
  // The SIGUSR1 answer is faked so these cases never spawn a process.
  // The last test asks a real Node instead.
  const check = (versions, execArgv, env = {}, extra = {}) =>
    requireNoInspector({
      versions,
      execArgv,
      env,
      platform: "linux",
      sigusr1Opens: () => false,
      ...extra,
    });
  const nodeParent = (execArgv, env, extra) =>
    check(NODE_PARENT, execArgv, env, extra);
  const bunParent = (execArgv, env, extra) =>
    check(BUN_PARENT, execArgv, env, extra);

  const inspectorOptions = [
    "--inspect",
    "--inspect=0.0.0.0:9229",
    "--inspect-brk",
    "--inspect-brk=0",
    "--inspect-port=1",
    "--inspect-wait",
    "--inspect-publish-uid=http",
    "--debug",
    "--debug-brk",
    "--debug-port=5858",
  ];

  test("a clean parent is accepted, even with options that merely resemble --inspect", () => {
    const harmless = [
      "--inspector-free",
      "--no-deprecation",
      "inspect",
      "-i",
      "--title=inspect",
    ];
    expect(() => nodeParent(["--disable-sigusr1", ...harmless])).not.toThrow();
    expect(() =>
      nodeParent([], { NODE_OPTIONS: "--max-old-space-size=512" }),
    ).not.toThrow();
    expect(() => bunParent([], { BUN_OPTIONS: "--smol" })).not.toThrow();
  });

  test("Inspector options are refused wherever and however they appear", () => {
    for (const option of inspectorOptions) {
      expect(() => nodeParent([option])).toThrow(/Inspector option/);
      expect(() =>
        nodeParent([], { NODE_OPTIONS: `--max-old-space-size=512 ${option}` }),
      ).toThrow(/Inspector option/);
      expect(() => bunParent([], { NODE_OPTIONS: option })).toThrow(
        /Inspector option/,
      );
      expect(() => bunParent([], { BUN_OPTIONS: `${option} --smol` })).toThrow(
        /Inspector option/,
      );
      expect(() => nodeParent([], { BUN_OPTIONS: option })).toThrow(
        /Inspector option/,
      );
      // Node reads a quoted or underscore-spelled option the same way.
      expect(() =>
        nodeParent([], { NODE_OPTIONS: `"${option}" --disable-sigusr1` }),
      ).toThrow(/Inspector option/);
      expect(() => nodeParent([option.replaceAll("-", "_")])).toThrow(
        /Inspector option/,
      );
    }
  });

  test("any BUN_INSPECT variable is refused, and named", () => {
    const names = [
      "BUN_INSPECT",
      "BUN_INSPECT_CONNECT_TO",
      "BUN_INSPECT_NOTIFY",
      "BUN_INSPECT_PRELOAD",
    ];
    for (const name of names) {
      for (const value of ["ws://127.0.0.1:6499/", "1", ""]) {
        const env = { PATH: "/usr/bin", [name]: value };
        expect(() => bunParent([], env)).toThrow(name);
        expect(() => nodeParent(["--disable-sigusr1"], env)).toThrow(name);
      }
    }
  });

  test("an Inspector that is already listening is refused", () => {
    for (const parent of [nodeParent, bunParent]) {
      expect(() =>
        parent(
          ["--disable-sigusr1"],
          {},
          {
            inspectorUrl: () => "ws://127.0.0.1:9229/synthetic",
          },
        ),
      ).toThrow(/already listening/);
    }
  });

  test("a Bun parent has no SIGUSR1 handler and Windows has no SIGUSR1, so neither is asked", () => {
    const sigusr1Opens = () => {
      throw new Error("must not be called");
    };
    expect(() => bunParent([], {}, { sigusr1Opens })).not.toThrow();
    expect(() =>
      nodeParent([], {}, { platform: "win32", sigusr1Opens }),
    ).not.toThrow();
  });

  test("a probe that cannot answer fails closed", () => {
    expect(() =>
      nodeParent(
        [],
        {},
        {
          sigusr1Opens: () => {
            throw new Error("synthetic probe failure");
          },
        },
      ),
    ).toThrow(/synthetic probe failure/);
  });

  test.skipIf(process.platform === "win32")(
    "the real probe lets Node apply its own quoting, aliases and precedence",
    () => {
      const real = (execArgv, env = {}) =>
        requireNoInspector({
          versions: NODE_PARENT,
          execArgv,
          env,
          executable: Bun.which("node"),
        });
      expect(() => real([])).toThrow(/--disable-sigusr1/);
      expect(() => real(["--disable-sigusr1"])).not.toThrow();
      expect(() => real(["--disable_sigusr1"])).not.toThrow();
      expect(() => real(["--disable-sigusr1", "--no_disable_sigusr1"])).toThrow(
        /--disable-sigusr1/,
      );
      expect(() =>
        real([], { NODE_OPTIONS: '"--disable-sigusr1"' }),
      ).not.toThrow();
      // Node applies the command line after NODE_OPTIONS, so the command line wins.
      expect(() =>
        real(["--no-disable-sigusr1"], { NODE_OPTIONS: "--disable-sigusr1" }),
      ).toThrow(/--disable-sigusr1/);
      // A parent started as an ES module passes that on to the probe.
      expect(() =>
        real(["--input-type=module", "--disable-sigusr1"]),
      ).not.toThrow();
      expect(() => real(["--input-type=module"])).toThrow(/--disable-sigusr1/);
    },
    30000,
  );
});

describe("prlimit", () => {
  const LIMITS = { dataBytes: 536_870_912, cpuSeconds: 30 };
  let directory;
  let executable;
  let plainFile;
  let link;
  let missing;

  beforeAll(() => {
    directory = mkdtempSync(join(tmpdir(), "fastly-mcp-prlimit-"));
    executable = join(directory, "prlimit");
    plainFile = join(directory, "not-executable");
    link = join(directory, "prlimit-link");
    missing = join(directory, "missing", "prlimit");
    writeFileSync(executable, "#!/bin/sh\nexit 0\n");
    chmodSync(executable, 0o755);
    writeFileSync(plainFile, "#!/bin/sh\nexit 0\n");
    chmodSync(plainFile, 0o644);
    symlinkSync(executable, link);
  });

  afterAll(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  function limitsReport({
    dataSoft = LIMITS.dataBytes,
    dataHard = LIMITS.dataBytes,
    cpuSoft = LIMITS.cpuSeconds,
    cpuHard = LIMITS.cpuSeconds,
  } = {}) {
    const row = (name, soft, hard, units) =>
      `${name.padEnd(26)}${String(soft).padEnd(21)}${String(hard).padEnd(21)}${units.padEnd(10)}`;
    return `${[
      row("Limit", "Soft Limit", "Hard Limit", "Units"),
      row("Max cpu time", cpuSoft, cpuHard, "seconds"),
      row("Max file size", "unlimited", "unlimited", "bytes"),
      row("Max data size", dataSoft, dataHard, "bytes"),
      row("Max stack size", 8_388_608, "unlimited", "bytes"),
      row("Max core file size", 0, "unlimited", "bytes"),
      row("Max resident set", "unlimited", "unlimited", "bytes"),
      row("Max processes", 63_304, 63_304, "processes"),
      row("Max open files", 1024, 524_288, "files"),
      row("Max locked memory", 8_388_608, 8_388_608, "bytes"),
      row("Max address space", "unlimited", "unlimited", "bytes"),
    ].join("\n")}\n`;
  }

  function probeReturning(result) {
    const probe = { runs: [] };
    probe.run = (path, args, options) => {
      probe.runs.push({ path, args, options });
      return result;
    };
    return probe;
  }

  test("the first executable candidate is probed by its real path, with pinned limits, an empty environment and a timeout", () => {
    const probe = probeReturning({ status: 0, stdout: limitsReport() });
    const path = resolvePrlimit(LIMITS, {
      candidates: [missing, plainFile, link, executable],
      run: probe.run,
    });

    expect(path).toEqual({ ...LIMITS, path: realpathSync(executable) });
    expect(probe.runs).toHaveLength(1);
    const [{ path: probed, args, options }] = probe.runs;
    expect(probed).toBe(realpathSync(executable));
    expect(args).toEqual([
      "--data=536870912:536870912",
      "--cpu=30:30",
      "--",
      "cat",
      "/proc/self/limits",
    ]);
    expect(options.env).toEqual({});
    expect(options.timeout).toBeGreaterThan(0);
    expect(options.timeout).toBeLessThanOrEqual(10_000);
    expect(options.shell).toBeFalsy();
  });

  test("limits that do not match the configured ones are refused", () => {
    const mismatches = [
      { dataSoft: LIMITS.dataBytes - 1 },
      { dataHard: LIMITS.dataBytes + 4096 },
      { dataHard: "unlimited" },
      { dataSoft: "unlimited", dataHard: "unlimited" },
      { cpuSoft: 10 },
      { cpuHard: 60 },
      { cpuHard: "unlimited" },
      { cpuSoft: "unlimited", cpuHard: "unlimited" },
    ];
    for (const mismatch of mismatches) {
      const probe = probeReturning({
        status: 0,
        stdout: limitsReport(mismatch),
      });
      expect(() =>
        resolvePrlimit(LIMITS, { candidates: [executable], run: probe.run }),
      ).toThrow(/do not match the configured ones/);
    }
  });

  test("a failed or silent probe is refused, naming the binary that was tried", () => {
    const results = [
      { status: 1, stdout: limitsReport() },
      { status: 1, stdout: "" },
      { status: null, signal: "SIGTERM", stdout: limitsReport() },
      { status: 0, stdout: "" },
      { status: 0, stdout: null },
      { status: 0 },
      { status: null, stdout: null, error: new Error("spawn ENOENT") },
      { status: 0, stdout: "prlimit: unrecognized option: data\n" },
      { status: 0, stdout: "Max data size\nMax cpu time\n" },
    ];
    for (const result of results) {
      const probe = probeReturning(result);
      const resolve = () =>
        resolvePrlimit(LIMITS, { candidates: [executable], run: probe.run });
      expect(resolve).toThrow(/cannot enforce execution limits/);
      expect(resolve).toThrow(realpathSync(executable));
    }
  });

  test("no usable candidate is an actionable startup error", () => {
    const probe = probeReturning({ status: 0, stdout: limitsReport() });
    for (const candidates of [[], [missing], [missing, plainFile]]) {
      expect(() =>
        resolvePrlimit(LIMITS, { candidates, run: probe.run }),
      ).toThrow(/util-linux/);
    }
    expect(probe.runs).toHaveLength(0);
  });

  test.skipIf(process.platform === "linux")(
    "the default candidates find nothing on a host without util-linux",
    () => {
      expect(() => resolvePrlimit(LIMITS)).toThrow(/prlimit.*was not found/);
    },
  );
});

describe("preferAsOomVictim", () => {
  function fakeProc(readBack) {
    const proc = { writes: [], reads: [] };
    proc.writeFile = (path, text) => {
      proc.writes.push([path, text]);
    };
    proc.readFile = (path) => {
      proc.reads.push(path);
      return readBack;
    };
    return proc;
  }

  test("writes the maximum score for that pid and confirms it", () => {
    for (const readBack of ["1000\n", Buffer.from("1000\n")]) {
      const proc = fakeProc(readBack);
      expect(() => preferAsOomVictim(4242, proc)).not.toThrow();
      expect(proc.writes).toEqual([["/proc/4242/oom_score_adj", "1000"]]);
      expect(proc.reads).toEqual(["/proc/4242/oom_score_adj"]);
    }
  });

  test("a score that did not take is refused", () => {
    for (const readBack of [
      "0\n",
      "999\n",
      "-1000\n",
      "",
      "10000\n",
      "1000 0",
    ]) {
      expect(() => preferAsOomVictim(4242, fakeProc(readBack))).toThrow(
        /OOM score adjustment did not take effect/,
      );
    }
  });

  test("a failing write or read-back is not swallowed", () => {
    const unwritable = fakeProc("1000\n");
    unwritable.writeFile = () => {
      throw Object.assign(new Error("EACCES"), { code: "EACCES" });
    };
    expect(() => preferAsOomVictim(4242, unwritable)).toThrow("EACCES");
    expect(unwritable.reads).toHaveLength(0);

    const unreadable = fakeProc("1000\n");
    unreadable.readFile = () => {
      throw Object.assign(new Error("ESRCH"), { code: "ESRCH" });
    };
    expect(() => preferAsOomVictim(4242, unreadable)).toThrow("ESRCH");
  });
});
