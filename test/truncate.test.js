import { describe, expect, test } from "bun:test";
import { BUILTIN_PATTERNS, scan } from "fast-cipher/tokens";
import { truncateOutsideSecrets } from "../src/truncate.js";
import { GITHUB_PAT } from "./helpers.js";

// One of each kind the scanner knows: fixed length, open ended, structured, and the two heuristics.
const TOKENS = {
  github: GITHUB_PAT,
  stripe: `sk_live_${"Ab1Cd2Ef3".repeat(4)}`,
  slack: "xoxb-1234567890-9876543210-AbCdEfGhIjKlMnOpQrStUvWx",
  sendgrid: `SG.${"AbCdEfGhIjKlMnOpQrSt12"}.${"aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789-_AbCdE"}`,
  fastly: "Ab3dEf7hIj1lMn0pQr2tUv4xYz6_B-9D",
  "aws-secret-key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
};

const spansOf = (text) =>
  scan(text, BUILTIN_PATTERNS).map(({ start, end }) => [start, end]);

describe("truncateOutsideSecrets", () => {
  test("text within the limit comes back as it is", () => {
    expect(truncateOutsideSecrets("short", 10)).toBe("short");
    expect(truncateOutsideSecrets("exactly10!", 10)).toBe("exactly10!");
  });

  test("text without secrets is cut at the limit", () => {
    expect(truncateOutsideSecrets("x".repeat(50), 20)).toBe("x".repeat(20));
  });

  test("a cut never splits a character in two", () => {
    expect(truncateOutsideSecrets(`${"x".repeat(1999)}😀`, 2000)).toBe(
      "x".repeat(1999),
    );
  });

  test("a cut through a secret moves to just before it", () => {
    for (const token of Object.values(TOKENS)) {
      const text = `lead ${token} tail`;
      const end = 5 + token.length;
      expect(spansOf(text)).toEqual([[5, end]]);
      for (let limit = 6; limit < end; limit++) {
        expect(truncateOutsideSecrets(text, limit)).toBe("lead ");
      }
    }
  });

  // What's kept still has to be recognized, or the shield would let it through.
  test("a secret that ends at the limit is kept whole and still recognized", () => {
    for (const token of Object.values(TOKENS)) {
      const text = `lead ${token} tail`;
      const head = truncateOutsideSecrets(text, 5 + token.length);
      expect(head).toBe(`lead ${token}`);
      expect(spansOf(`${head}…`)).toEqual([[5, head.length]]);
    }
  });

  test("of two secrets written together, a cut through the second keeps the first", () => {
    const first = TOKENS.github;
    const second = "ghp_ZYXWVUTSRQPONMLKJIHGFEDCBAzyxwvutsrq";
    const text = first + second;
    expect(spansOf(text)).toEqual([
      [0, first.length],
      [first.length, text.length],
    ]);
    expect(truncateOutsideSecrets(text, first.length + 10)).toBe(first);
  });
});
