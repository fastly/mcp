// Runs the sandbox with a Node parent draining its stdout pipe and reports
// what arrived. The truncation race this exists for never reproduces under
// a Bun parent, so a bun-test process cannot spawn the sandbox directly.
import { spawn } from "node:child_process";
import { SANDBOX_PATH } from "../../src/tools/execute.js";

const code = process.argv[2];

const child = spawn(process.execPath, [SANDBOX_PATH], {
  stdio: ["pipe", "pipe", "ignore"],
});
let stdout = "";
child.stdout.on("data", (c) => {
  stdout += c.toString();
});
child.on("close", (exitCode) => {
  process.stdout.write(JSON.stringify({ exitCode, stdout }));
});
child.stdin.write(JSON.stringify({ code }));
child.stdin.end();
