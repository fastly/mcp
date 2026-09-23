import { spawnSync } from "node:child_process";
import {
  accessSync,
  constants,
  lstatSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import { createRequire } from "node:module";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { prlimitArgs } from "./host-checks.js";

const SOURCE_DIR = dirname(fileURLToPath(import.meta.url));
export const SANDBOX_PATH = join(SOURCE_DIR, "sandbox.js");
const BUN_CONFIG_PATH = join(SOURCE_DIR, "sandbox-bunfig.toml");
const REQUIRED_FLAGS = [
  "--permission",
  "--allow-fs-read",
  "--allow-inspector",
  "--disable-sigusr1",
  "--experimental-vm-modules",
];
const PROBE = `console.log(JSON.stringify({
  node: process.versions.node,
  bun: process.versions.bun,
  executable: process.execPath,
  flags: ${JSON.stringify([...REQUIRED_FLAGS, "--allow-net"])}.filter(
    flag => process.allowedNodeEnvironmentFlags?.has(flag)
  ),
}));`;

let cachedRuntime;
let warnedAboutBun = false;

function warnAboutBun(message) {
  if (warnedAboutBun) return;
  warnedAboutBun = true;
  process.stderr.write(`${message}\n`);
}

function findNode(env) {
  const windows = process.platform === "win32";
  const pathKey = Object.keys(env).find((key) =>
    windows ? key.toLowerCase() === "path" : key === "PATH",
  );
  const path = pathKey ? env[pathKey] : windows ? "" : "/usr/bin:/bin";
  const directories = [
    ...(windows ? [process.cwd()] : []),
    ...path.split(delimiter),
  ];
  const extensions = windows
    ? (env.PATHEXT || ".EXE;.CMD;.BAT;.COM").split(";")
    : [""];
  let unusable;
  for (const directory of directories) {
    for (const extension of extensions) {
      const candidate = resolve(
        directory.replace(/^"(.*)"$/, "$1"),
        `node${extension}`,
      );
      try {
        lstatSync(candidate);
      } catch (error) {
        if (error.code === "ENOENT" || error.code === "ENOTDIR") continue;
        throw new Error(`Cannot inspect Node executable ${candidate}`, {
          cause: error,
        });
      }
      try {
        if (!statSync(candidate).isFile()) continue;
        accessSync(candidate, constants.X_OK);
        return realpathSync(candidate);
      } catch (error) {
        unusable ??= new Error(`Node executable is unusable: ${candidate}`, {
          cause: error,
        });
      }
    }
  }
  if (unusable) throw unusable;
  return null;
}

function run(executable, args, env, input, cwd) {
  const child = spawnSync(executable, args, {
    env,
    cwd,
    input,
    encoding: "utf8",
    timeout: 10000,
    maxBuffer: 1024 * 1024,
    windowsHide: true,
  });
  if (child.error || child.status !== 0) {
    throw new Error(
      `Execution runtime failed: ${executable}${child.stderr ? `: ${child.stderr.trim()}` : ""}`,
      { cause: child.error },
    );
  }
  try {
    return JSON.parse(child.stdout);
  } catch (error) {
    throw new Error(
      `Execution runtime returned invalid output: ${executable}`,
      {
        cause: error,
      },
    );
  }
}

// The extra CA file as an absolute path.
// Children start in the installation directory, so a relative path would
// point somewhere else for them.
function extraCaCerts(env) {
  if (!env.NODE_EXTRA_CA_CERTS) return undefined;
  const path = resolve(env.NODE_EXTRA_CA_CERTS);
  if (!statSync(path).isFile()) {
    throw new Error("NODE_EXTRA_CA_CERTS must name a certificate file");
  }
  return path;
}

function readGrants(extraFiles) {
  const paths = new Set();
  function add(path) {
    for (const value of [resolve(path), realpathSync(path)]) {
      if (value.includes("*")) {
        throw new Error(`Cannot safely grant a path containing '*': ${value}`);
      }
      paths.add(value);
    }
  }
  add(SOURCE_DIR);
  const manifest = join(SOURCE_DIR, "../package.json");
  add(manifest);
  for (const file of extraFiles) add(file);

  const visited = new Set();
  function visit(name, from, optional = false) {
    const search =
      createRequire(from).resolve.paths(`${name}/package.json`) ?? [];
    let packageFile;
    for (const directory of search) {
      const candidate = join(directory, name, "package.json");
      try {
        packageFile = realpathSync(candidate);
        add(dirname(candidate));
        break;
      } catch (error) {
        if (error.code !== "ENOENT" && error.code !== "ENOTDIR") throw error;
      }
    }
    if (!packageFile) {
      if (optional) return;
      throw new Error(`Cannot locate sandbox dependency ${name}`);
    }
    if (visited.has(packageFile)) return;
    visited.add(packageFile);
    const metadata = JSON.parse(readFileSync(packageFile, "utf8"));
    for (const dependency of Object.keys({
      ...metadata.dependencies,
      ...metadata.optionalDependencies,
    })) {
      visit(
        dependency,
        packageFile,
        Object.hasOwn(metadata.optionalDependencies ?? {}, dependency),
      );
    }
  }
  visit("fastly", manifest);
  // Error text is cut in the sandbox, which needs the token scanner to avoid cutting through a secret.
  visit("fast-cipher", manifest);
  return [...paths].map((path) => `--allow-fs-read=${path}`);
}

/**
 * Command line that runs one execution under a profile.
 * The startup preflight and `execute` both use it, so what was checked is
 * what runs.
 */
export function launchCommand(profile) {
  const args = [...profile.args];
  if (profile.heapMb) args.push(`--max-old-space-size=${profile.heapMb}`);
  args.push(profile.entry);
  if (!profile.prlimit) return [profile.executable, args];
  return [
    profile.prlimit.path,
    [...prlimitArgs(profile.prlimit), profile.executable, ...args],
  ];
}

function preflight(profile) {
  const [command, args] = launchCommand(profile);
  const smoke = run(
    command,
    args,
    profile.env,
    JSON.stringify({ code: "return 1;" }),
    profile.cwd,
  );
  if (smoke.ok !== true || smoke.result !== 1) {
    throw new Error(
      `Execution runtime preflight failed: ${smoke.error ?? "unexpected sandbox result"}`,
    );
  }
}

// Children start in the installation directory because Bun picks up a
// bunfig.toml from wherever it was launched.
function freezeProfile(profile) {
  return Object.freeze({
    entry: SANDBOX_PATH,
    cwd: SOURCE_DIR,
    ...profile,
    args: Object.freeze(profile.args),
    env: Object.freeze(profile.env),
  });
}

// The launch profile this host can offer, without running anything yet.
function describeExecutionRuntime({
  requireNode = false,
  env = process.env,
  versions = process.versions,
  executable = process.execPath,
  warn = warnAboutBun,
} = {}) {
  const childEnv = {};
  if (env.NODE_USE_SYSTEM_CA) {
    childEnv.NODE_USE_SYSTEM_CA = env.NODE_USE_SYSTEM_CA;
  }
  const certificates = extraCaCerts(env);
  if (certificates) childEnv.NODE_EXTRA_CA_CERTS = certificates;
  const node = versions.bun ? findNode(env) : realpathSync(executable);
  if (node) {
    const identity = run(node, ["--eval", PROBE], {
      BUN_OPTIONS: "--no-env-file --no-install --no-addons",
      BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0",
      DO_NOT_TRACK: "1",
    });
    if (identity.bun || !/^\d+\./.test(identity.node ?? "")) {
      throw new Error(`Expected Node.js, but ${node} is a different runtime`);
    }
    if (realpathSync(identity.executable) !== node) {
      throw new Error(`Node executable ${node} is a shim; use the Node binary`);
    }
    const flags = new Set(identity.flags);
    const missing = REQUIRED_FLAGS.filter((flag) => !flags.has(flag));
    const [major, minor] = identity.node.split(".").map(Number);
    if (major < 24 || (major === 24 && minor < 12) || missing.length) {
      throw new Error(
        `Unsupported Node.js ${identity.node}: requires Node.js 24.12.0 or newer with support for ${missing.join(", ") || REQUIRED_FLAGS.join(", ")}`,
      );
    }
    return freezeProfile({
      name: "node",
      version: identity.node,
      executable: node,
      args: [
        "--permission",
        "--disable-sigusr1",
        "--experimental-vm-modules",
        ...readGrants(certificates ? [certificates] : []),
        ...(flags.has("--allow-net") ? ["--allow-net"] : []),
      ],
      env: childEnv,
    });
  }
  if (requireNode) throw new Error("Node.js is required for remote execution");
  warn(
    "Warning: Node.js was not found; local execution is using Bun with reduced isolation and no Node permission restrictions.",
  );
  return freezeProfile({
    name: "bun",
    version: versions.bun,
    executable,
    args: [
      `--config=${BUN_CONFIG_PATH}`,
      "--no-env-file",
      "--no-install",
      "--no-addons",
    ],
    env: {
      ...childEnv,
      BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0",
      DO_NOT_TRACK: "1",
    },
  });
}

/** The local launch profile, checked with one sandbox run. */
export function resolveExecutionRuntime(options) {
  const profile = describeExecutionRuntime(options);
  preflight(profile);
  return profile;
}

/**
 * Launch profile for `--remote-http`: the Node profile with a V8 heap cap,
 * plus the OS limits when the host has them.
 * Nothing is run here; remote startup checks it with one real execution.
 */
export function resolveRemoteExecutionProfile({ heapMb }, { prlimit } = {}) {
  const runtime = describeExecutionRuntime({ requireNode: true });
  return Object.freeze({ ...runtime, heapMb, prlimit });
}

export function getExecutionRuntime() {
  cachedRuntime ??= resolveExecutionRuntime();
  return cachedRuntime;
}
