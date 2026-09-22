// The protections that hold on every platform, checked with a profile that
// has none of the Linux extras.
// test/linux-hardening.test.js covers the extras themselves.
import { describe, expect, test } from "bun:test";
import { resolveRemoteExecutionProfile } from "../src/execution-runtime.js";
import { executeWith } from "./remote-helpers.js";

describe("execution limits without the optional hardening", () => {
  const profile = resolveRemoteExecutionProfile({ memoryMb: 128, heapMb: 64 });
  const run = executeWith(profile);

  test("ordinary work runs under a profile with no Linux extras", async () => {
    expect(profile).toMatchObject({ name: "node", heapMb: 64 });
    expect(profile.prlimit).toBeUndefined();
    expect(profile.oomVictim).toBeUndefined();
    const result = await run("return typeof serviceApi.listServices;");
    expect(result.result).toBe("function");
  }, 30000);

  test("the heap cap stops retained memory", async () => {
    const result = await run(
      "const keep = []; for (;;) keep.push(new Array(100000).fill(Math.random()));",
    );
    expect(result.outcome).toBe("oom");
    expect(result.error).toContain("out of memory");
  }, 60000);
});
