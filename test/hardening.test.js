import { describe, expect, test } from "bun:test";
import { detectHardening } from "../src/main.js";

const LIMITS = { dataBytes: 1024 * 1024 * 1024, cpuSeconds: 30 };
const PRLIMIT = { ...LIMITS, path: "/usr/bin/prlimit" };
const EVERYTHING = {
  yamaPtraceScope: 1,
  prlimit: PRLIMIT,
  disconnectDetection: true,
};

const failing = (message) => () => {
  throw new Error(message);
};

describe("detectHardening", () => {
  test("each missing piece is listed on its own and the others stay", async () => {
    const noYama = { requireYama: failing("no yama") };
    const noPrlimit = { resolvePrlimit: failing("no prlimit") };
    const noClose = { requireDisconnectDetection: failing("no close") };
    const cases = [
      [{}, EVERYTHING, []],
      [noYama, { ...EVERYTHING, yamaPtraceScope: null }, ["Yama: no yama"]],
      [noPrlimit, { ...EVERYTHING, prlimit: null }, ["prlimit: no prlimit"]],
      [
        noClose,
        { ...EVERYTHING, disconnectDetection: false },
        ["disconnect detection: no close"],
      ],
      [
        { ...noYama, ...noPrlimit, ...noClose },
        { yamaPtraceScope: null, prlimit: null, disconnectDetection: false },
        [
          "Yama: no yama",
          "prlimit: no prlimit",
          "disconnect detection: no close",
        ],
      ],
    ];
    for (const [broken, hardening, missing] of cases) {
      const checks = {
        requireYama: () => 1,
        resolvePrlimit: (limits) => ({ ...limits, path: PRLIMIT.path }),
        requireDisconnectDetection: async () => true,
        ...broken,
      };
      expect(await detectHardening(LIMITS, checks)).toEqual({
        hardening,
        missing,
      });
    }
  });
});
