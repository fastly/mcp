import { expect, test } from "bun:test";
import { join } from "node:path";

const SCRIPT = join(import.meta.dir, "../scripts/bench-secrets.js");
const SIZE = 100_000;
const SCAN_LIMIT_MS = 250;
// Encrypting may take up to about 300 ms when a text is full of real tokens.
const ENCRYPT_LIMIT_MS = 1000;
const DEADLINE_MS = 30_000;

// A slow scan can't be interrupted from inside, so it would hang the test run instead of failing.
// That's why the texts are scanned in a separate process that gets stopped after a deadline.
for (const runtime of ["bun", "node"]) {
  test(
    `adversarial texts of 100 KB stay fast under ${runtime}`,
    async () => {
      const child = Bun.spawn(
        [
          runtime === "bun" ? process.execPath : Bun.which("node"),
          SCRIPT,
          "--guard",
          `${SIZE}`,
        ],
        { stdout: "pipe", stderr: "pipe" },
      );
      const timer = setTimeout(() => child.kill("SIGKILL"), DEADLINE_MS);
      const [output, errors, exitCode] = await Promise.all([
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
        child.exited,
      ]);
      clearTimeout(timer);

      const results = output
        .split("\n")
        .filter((line) => line.length > 0)
        .map((line) => JSON.parse(line));
      // Each result is printed as soon as it's ready, so after a kill the last name shows how far it got.
      expect({
        exitCode,
        signal: child.signalCode,
        errors,
        lastDone: results.at(-1)?.name,
      }).toEqual({
        exitCode: 0,
        signal: null,
        errors: "",
        lastDone: "mixed",
      });
      expect(results.length).toBe(16);
      const slow = results.flatMap(
        ({ name, scanMs, truncateMs, encryptMs }) => [
          ...(scanMs > SCAN_LIMIT_MS
            ? [`${name}: scan ${Math.round(scanMs)} ms`]
            : []),
          ...(truncateMs > SCAN_LIMIT_MS
            ? [`${name}: truncate ${Math.round(truncateMs)} ms`]
            : []),
          ...(encryptMs > ENCRYPT_LIMIT_MS
            ? [`${name}: encrypt ${Math.round(encryptMs)} ms`]
            : []),
        ],
      );
      expect(slow).toEqual([]);
    },
    DEADLINE_MS + 5000,
  );
}
