import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  getExecutionRuntime,
  resolveExecutionRuntime,
} from "../src/execution-runtime.js";

const ROOT = join(import.meta.dir, "..");
const NODE = Bun.which("node");
const NODE_NAME = process.platform === "win32" ? "node.exe" : "node";
let directory;
let nodeDirectory;
let emptyDirectory;

beforeAll(() => {
  expect(NODE).not.toBeNull();
  mkdirSync(join(ROOT, "tmp"), { recursive: true });
  directory = mkdtempSync(join(ROOT, "tmp/execution-runtime-"));
  nodeDirectory = join(directory, "node-bin");
  emptyDirectory = join(directory, "empty-bin");
  mkdirSync(nodeDirectory);
  mkdirSync(emptyDirectory);
  symlinkSync(NODE, join(nodeDirectory, NODE_NAME));
});

afterAll(() => {
  if (directory) rmSync(directory, { recursive: true, force: true });
});

function fromBun(path, extra = {}) {
  return resolveExecutionRuntime({
    versions: { bun: Bun.version },
    executable: process.execPath,
    env: { PATH: path },
    ...extra,
  });
}

function hostProbe(profile, code) {
  const child = spawnSync(
    profile.executable,
    [...profile.args, "--input-type=module", "--eval", code],
    { env: profile.env, encoding: "utf8", timeout: 10000 },
  );
  expect(child.error).toBeUndefined();
  expect(child.status).toBe(0);
  return JSON.parse(child.stdout);
}

describe("execution runtime selection", () => {
  test("a Bun server selects real Node and scrubs the child environment", () => {
    const profile = fromBun(nodeDirectory, {
      env: {
        PATH: nodeDirectory,
        FASTLY_API_TOKEN: "synthetic-secret",
        NODE_OPTIONS: "--inspect",
        BUN_OPTIONS: "--inspect",
      },
    });
    expect(profile.name).toBe("node");
    expect(profile.executable).toBe(realpathSync(NODE));
    expect(profile.args).toContain("--permission");
    expect(profile.args).toContain("--experimental-vm-modules");
    expect(profile.args).toContain("--disable-sigusr1");
    expect(profile.env).toEqual({});
    expect(Object.isFrozen(profile)).toBe(true);
    expect(Object.isFrozen(profile.args)).toBe(true);
  });

  test("a Node server uses its own executable without a PATH entry", () => {
    const profile = resolveExecutionRuntime({
      versions: { node: "24.12.0" },
      executable: NODE,
      env: { PATH: emptyDirectory },
    });
    expect(profile.name).toBe("node");
    expect(profile.executable).toBe(realpathSync(NODE));
  });

  test("the default preflight caches its protected profile", () => {
    expect(getExecutionRuntime()).toBe(getExecutionRuntime());
    expect(getExecutionRuntime({ requireNode: true }).name).toBe("node");
  });

  test("only absent Node permits a warned local Bun fallback", () => {
    const warnings = [];
    const profile = fromBun(emptyDirectory, {
      warn: (message) => warnings.push(message),
    });
    expect(profile.name).toBe("bun");
    expect(profile.args).toContain("--no-env-file");
    expect(profile.env.BUN_RUNTIME_TRANSPILER_CACHE_PATH).toBe("0");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/Node.js was not found.*reduced isolation/);
    expect(() =>
      fromBun(emptyDirectory, { requireNode: true, warn: () => {} }),
    ).toThrow("Node.js is required for remote execution");
  });

  test("cached Bun fallback warns once and cannot satisfy remote execution", () => {
    const moduleUrl = pathToFileURL(
      join(ROOT, "src/execution-runtime.js"),
    ).href;
    const child = spawnSync(
      process.execPath,
      [
        "--no-env-file",
        "--no-install",
        "--input-type=module",
        "--eval",
        `
          import { getExecutionRuntime } from ${JSON.stringify(moduleUrl)};
          const first = getExecutionRuntime();
          const second = getExecutionRuntime();
          let remoteError;
          try { getExecutionRuntime({requireNode:true}); }
          catch (error) { remoteError = error.message; }
          console.log(JSON.stringify({name:first.name,cached:first===second,remoteError}));
        `,
      ],
      {
        env: {
          PATH: emptyDirectory,
          BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0",
          DO_NOT_TRACK: "1",
        },
        encoding: "utf8",
        timeout: 10000,
      },
    );
    expect(child.status).toBe(0);
    expect(JSON.parse(child.stdout)).toEqual({
      name: "bun",
      cached: true,
      remoteError: "Node.js is required for remote execution",
    });
    expect(child.stderr.trim().split("\n")).toHaveLength(1);
    expect(child.stderr).toContain("reduced isolation");
  });

  test("a Bun shim named node fails instead of falling back", () => {
    const bin = join(directory, "bun-shim");
    mkdirSync(bin);
    symlinkSync(process.execPath, join(bin, NODE_NAME));
    const warnings = [];
    expect(() =>
      fromBun(bin, { warn: (message) => warnings.push(message) }),
    ).toThrow("different runtime");
    expect(warnings).toEqual([]);
  });

  test("a broken Node executable fails instead of falling back", () => {
    const bin = join(directory, "broken-node");
    mkdirSync(bin);
    writeFileSync(join(bin, NODE_NAME), "not an executable\n", {
      mode: 0o755,
    });
    const warnings = [];
    expect(() =>
      fromBun(bin, { warn: (message) => warnings.push(message) }),
    ).toThrow(/Execution runtime/);
    expect(warnings).toEqual([]);
  });

  const testScript = process.platform === "win32" ? test.skip : test;
  testScript(
    "unsupported Node versions and missing permission capabilities fail",
    () => {
      for (const [name, version, flags] of [
        [
          "old-node",
          "24.11.0",
          [
            "--permission",
            "--allow-fs-read",
            "--allow-inspector",
            "--disable-sigusr1",
            "--experimental-vm-modules",
          ],
        ],
        [
          "missing-capability",
          "26.9.0",
          [
            "--permission",
            "--allow-fs-read",
            "--disable-sigusr1",
            "--experimental-vm-modules",
          ],
        ],
      ]) {
        const bin = join(directory, name);
        mkdirSync(bin);
        const executable = join(bin, NODE_NAME);
        const identity = { node: version, executable, flags };
        writeFileSync(
          executable,
          `#!${NODE}\nprocess.stdout.write(${JSON.stringify(JSON.stringify(identity))});\n`,
          { mode: 0o755 },
        );
        expect(() => fromBun(bin, { warn: () => {} })).toThrow(
          "Unsupported Node.js",
        );
      }
    },
  );

  test("startup rejects broken Node and Bun shims while help and version work", () => {
    for (const shim of [false, true]) {
      const bin = join(directory, shim ? "startup-shim" : "startup-broken");
      mkdirSync(bin);
      if (shim) symlinkSync(process.execPath, join(bin, NODE_NAME));
      else
        writeFileSync(join(bin, NODE_NAME), "broken executable\n", {
          mode: 0o755,
        });
      for (const args of [[], ["--help"], ["--version"]]) {
        const child = spawnSync(
          process.execPath,
          [
            "--no-env-file",
            "--no-install",
            join(ROOT, "src/index.js"),
            ...args,
          ],
          {
            env: {
              PATH: bin,
              BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0",
              DO_NOT_TRACK: "1",
            },
            input: "",
            encoding: "utf8",
            timeout: 10000,
          },
        );
        expect(child.error).toBeUndefined();
        expect(child.status).toBe(args.length ? 0 : 2);
        if (!args.length) {
          expect(child.stderr).toMatch(/Execution runtime|different runtime/);
          expect(child.stderr).not.toContain("started");
        }
      }
    }
  }, 15000);

  test("configured certificate reads grant a file, never its directory", () => {
    const certificate = join(directory, "extra-ca.pem");
    writeFileSync(certificate, "");
    const profile = fromBun(nodeDirectory, {
      env: { PATH: nodeDirectory, NODE_EXTRA_CA_CERTS: certificate },
    });
    expect(profile.env.NODE_EXTRA_CA_CERTS).toBe(certificate);
    expect(profile.args).toContain(`--allow-fs-read=${certificate}`);
    expect(profile.args).not.toContain(`--allow-fs-read=${directory}`);
    expect(() =>
      fromBun(nodeDirectory, {
        env: { PATH: nodeDirectory, NODE_EXTRA_CA_CERTS: directory },
      }),
    ).toThrow("NODE_EXTRA_CA_CERTS must name a certificate file");
  });

  test("permissions deny unrelated reads, writes, processes, and workers", () => {
    const profile = fromBun(nodeDirectory);
    const outside = join(directory, "outside.txt");
    writeFileSync(outside, "synthetic fixture");
    const result = hostProbe(
      profile,
      `
        import { readFileSync, writeFileSync } from "node:fs";
        import { spawnSync } from "node:child_process";
        import { Worker } from "node:worker_threads";
        const outcomes = {};
        for (const [name, action] of Object.entries({
          read: () => readFileSync(${JSON.stringify(outside)}),
          write: () => writeFileSync(${JSON.stringify(outside)}, "changed"),
          process: () => spawnSync(process.execPath, ["--eval", "0"]),
          worker: () => new Worker("0", { eval: true }),
          inspector: () => {
            const { Session } = process.getBuiltinModule("node:inspector");
            const session = new Session();
            try { session.connect(); } finally { session.disconnect(); }
          },
        })) {
          try { action(); outcomes[name] = "allowed"; }
          catch (error) { outcomes[name] = error.code; }
        }
        outcomes.addon = process.permission.has("addon");
        console.log(JSON.stringify(outcomes));
      `,
    );
    expect(result).toEqual({
      read: "ERR_ACCESS_DENIED",
      write: "ERR_ACCESS_DENIED",
      process: "ERR_ACCESS_DENIED",
      worker: "ERR_ACCESS_DENIED",
      addon: false,
      inspector: "ERR_ACCESS_DENIED",
    });
    expect(readFileSync(outside, "utf8")).toBe("synthetic fixture");
  });

  test("hoisted and symlinked dependencies work without granting the cache", async () => {
    const cache = join(directory, "package-cache");
    const packageDirectory = join(cache, "node_modules/@fastly/mcp");
    mkdirSync(packageDirectory, { recursive: true });
    cpSync(join(ROOT, "src"), join(packageDirectory, "src"), {
      recursive: true,
    });
    copyFileSync(
      join(ROOT, "package.json"),
      join(packageDirectory, "package.json"),
    );
    symlinkSync(
      join(ROOT, "node_modules/fastly"),
      join(cache, "node_modules/fastly"),
      "junction",
    );
    const installed = await import(
      pathToFileURL(join(packageDirectory, "src/execution-runtime.js")).href
    );
    const profile = installed.resolveExecutionRuntime({
      versions: { node: "24.12.0" },
      executable: NODE,
      env: {},
    });
    expect(profile.name).toBe("node");
    expect(profile.args).toContain(
      `--allow-fs-read=${realpathSync(join(ROOT, "node_modules/fastly"))}`,
    );
    expect(profile.args).not.toContain(`--allow-fs-read=${cache}`);
    expect(profile.args).not.toContain(`--allow-fs-read=${directory}`);
  });
});
