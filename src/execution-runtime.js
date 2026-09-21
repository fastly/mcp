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

const SOURCE_DIR = dirname(fileURLToPath(import.meta.url));
const SANDBOX_PATH = join(SOURCE_DIR, "sandbox.js");
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

function run(executable, args, env, input) {
  const child = spawnSync(executable, args, {
    env,
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

function readGrants(env) {
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
  if (env.NODE_EXTRA_CA_CERTS) {
    if (!statSync(env.NODE_EXTRA_CA_CERTS).isFile()) {
      throw new Error("NODE_EXTRA_CA_CERTS must name a certificate file");
    }
    add(env.NODE_EXTRA_CA_CERTS);
  }

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
  return [...paths].map((path) => `--allow-fs-read=${path}`);
}

export function resolveExecutionRuntime({
  requireNode = false,
  env = process.env,
  versions = process.versions,
  executable = process.execPath,
  warn = warnAboutBun,
} = {}) {
  const childEnv = {};
  for (const name of ["NODE_EXTRA_CA_CERTS", "NODE_USE_SYSTEM_CA"]) {
    if (env[name]) childEnv[name] = env[name];
  }
  const node = versions.bun ? findNode(env) : realpathSync(executable);
  let profile;
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
    profile = {
      name: "node",
      version: identity.node,
      executable: node,
      args: [
        "--permission",
        "--disable-sigusr1",
        "--experimental-vm-modules",
        ...readGrants(childEnv),
        ...(flags.has("--allow-net") ? ["--allow-net"] : []),
      ],
      env: childEnv,
    };
  } else {
    if (requireNode)
      throw new Error("Node.js is required for remote execution");
    profile = {
      name: "bun",
      version: versions.bun,
      executable,
      args: ["--no-env-file", "--no-install", "--no-addons"],
      env: {
        ...childEnv,
        BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0",
        DO_NOT_TRACK: "1",
      },
    };
  }
  const smoke = run(
    profile.executable,
    [...profile.args, SANDBOX_PATH],
    profile.env,
    JSON.stringify({ code: "return 1;" }),
  );
  if (smoke.ok !== true || smoke.result !== 1) {
    throw new Error(
      `Execution runtime preflight failed: ${smoke.error ?? "unexpected sandbox result"}`,
    );
  }
  if (profile.name === "bun") {
    warn(
      "Warning: Node.js was not found; local execution is using Bun with reduced isolation and no Node permission restrictions.",
    );
  }
  return Object.freeze({
    ...profile,
    args: Object.freeze(profile.args),
    env: Object.freeze(profile.env),
  });
}

export function getExecutionRuntime({ requireNode = false } = {}) {
  cachedRuntime ??= resolveExecutionRuntime({ requireNode });
  if (requireNode && cachedRuntime.name !== "node") {
    throw new Error("Node.js is required for remote execution");
  }
  return cachedRuntime;
}
