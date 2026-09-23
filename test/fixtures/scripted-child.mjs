// Stands in for the sandbox and does exactly what the test scripts in `code`: write each `stderr` piece on its own, then `stdout`, then exit.
// The pause between pieces makes it likely that each one reaches the parent as a separate chunk.
import { setTimeout } from "node:timers/promises";

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const { stderr = [], stdout } = JSON.parse(
  JSON.parse(Buffer.concat(chunks)).code,
);
for (const piece of stderr) {
  await new Promise((resolve) => process.stderr.write(piece, resolve));
  await setTimeout(20);
}
if (stdout === undefined) process.exit(1);
process.stdout.write(stdout, () => process.exit(0));
