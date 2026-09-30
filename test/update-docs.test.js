import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tempDir } from "./helpers.js";

const ROOT = join(import.meta.dir, "..");
const SCRIPT = join(ROOT, "scripts/update-docs.sh");
const PINNED = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"))
  .dependencies.fastly;

const dirs = [];
afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

// A git that records its arguments and fails, so nothing is ever cloned or copied.
function run(script, args = []) {
  const work = tempDir("update-docs");
  dirs.push(work);
  const bin = join(work, "bin");
  const scratch = join(work, "scratch");
  mkdirSync(bin);
  mkdirSync(scratch);
  const log = join(work, "git-args");
  writeFileSync(
    join(bin, "git"),
    `#!/bin/sh\nprintf '%s\\n' "$@" > "${log}"\nexit 1\n`,
  );
  chmodSync(join(bin, "git"), 0o755);
  const result = spawnSync("bash", [script, ...args], {
    cwd: work,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      TMPDIR: scratch,
    },
  });
  return {
    status: result.status,
    stderr: result.stderr,
    gitArgs: existsSync(log)
      ? readFileSync(log, "utf8").split("\n")
      : undefined,
    leftovers: readdirSync(scratch),
  };
}

const branchOf = (gitArgs) => gitArgs[gitArgs.indexOf("--branch") + 1];

describe("update-docs.sh", () => {
  test("the SDK pin is an exact version", () => {
    expect(PINNED).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test("the default ref follows package.json, wherever the script is run from", () => {
    const out = run(SCRIPT);
    expect(out.status).not.toBe(0);
    expect(out.gitArgs[0]).toBe("clone");
    expect(branchOf(out.gitArgs)).toBe(`release/v${PINNED}`);
    expect(out.leftovers).toEqual([]);
  });

  test("an explicit branch or tag is used as given", () => {
    const out = run(SCRIPT, ["release/v99.0.0"]);
    expect(branchOf(out.gitArgs)).toBe("release/v99.0.0");
    expect(out.leftovers).toEqual([]);
  });

  test("a version range fails before git runs", () => {
    const repo = tempDir("update-docs-repo");
    dirs.push(repo);
    mkdirSync(join(repo, "scripts"));
    copyFileSync(SCRIPT, join(repo, "scripts/update-docs.sh"));
    writeFileSync(
      join(repo, "package.json"),
      JSON.stringify({ dependencies: { fastly: `^${PINNED}` } }),
    );
    const out = run(join(repo, "scripts/update-docs.sh"));
    expect(out.status).toBe(1);
    expect(out.stderr).toContain("exact version");
    expect(out.stderr).toContain(`^${PINNED}`);
    expect(out.gitArgs).toBeUndefined();
    expect(existsSync(join(repo, "docs"))).toBe(false);
  });
});
