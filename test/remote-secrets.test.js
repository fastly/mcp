import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { BUILTIN_PATTERNS, TokenEncryptor } from "fast-cipher/tokens";
import { deriveRemoteKey, MarkerError, SecretShield } from "../src/secrets.js";

const TOKEN_A = "synthetic-token-A";
const TOKEN_B = "synthetic-token-B";

const GITHUB_PAT = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij";
const SLACK_BOT = "xoxb-12345678-12345678-siXA";
const STRIPE_LIVE = "sk_live_F9ZJz11XNvB3i0RhazAEAbGJdznewI9VguEStDdFtyHK";
// GITHUB_PAT under TOKEN_A, the same under Node and Bun.
const PINNED_WRAPPER =
  "{ENCRYPTED:r.vX7nRKJyecNqhtgKoe0Vgs9ncAAt2OFOr877yMownSIh2X}";

function withShield(token, fn) {
  const shield = SecretShield.forCaller(token);
  try {
    return fn(shield);
  } finally {
    shield.destroy();
  }
}

const encryptWith = (token, text) =>
  withShield(token, (shield) => shield.encrypt(text));
const decryptWith = (token, text, location) =>
  withShield(token, (shield) => shield.decrypt(text, location));

function refusal(fn) {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error("expected a refusal");
}

describe("remote keys", () => {
  test("matches the fixed HKDF-SHA-256 vector and changes with the token", () => {
    // The vector was computed separately with Python's cryptography package,
    // as HKDF(SHA256, length=16, salt=b"@fastly/mcp/remote-secrets/v1",
    // info=b"fast-cipher/tokens").derive(b"synthetic-token-A").
    const key = deriveRemoteKey(TOKEN_A);
    expect(key).toBeInstanceOf(Buffer);
    expect(key.toString("hex")).toBe("c0aed68491879f45e3f56056c2d46cc2");
    expect(deriveRemoteKey(TOKEN_A).equals(key)).toBe(true);
    expect(deriveRemoteKey(TOKEN_B).equals(key)).toBe(false);
    expect(deriveRemoteKey(`${TOKEN_A} `).equals(key)).toBe(false);
    expect(deriveRemoteKey(TOKEN_A.toUpperCase()).equals(key)).toBe(false);
  });

  // Copies of the server must keep reading each other's wrappers; a deliberate change just updates this value.
  test("a known token gives a pinned wrapper under a known API token", () => {
    expect(encryptWith(TOKEN_A, GITHUB_PAT)).toBe(PINNED_WRAPPER);
    const direct = new TokenEncryptor(deriveRemoteKey(TOKEN_A));
    expect(direct.encryptWrapped(GITHUB_PAT, { maxTokenLength: 512 })).toBe(
      PINNED_WRAPPER,
    );
    direct.destroy();
    expect(decryptWith(TOKEN_A, PINNED_WRAPPER)).toBe(GITHUB_PAT);
  });

  test("another API token is refused instead of yielding another token", () => {
    const error = refusal(() => decryptWith(TOKEN_B, PINNED_WRAPPER, "code"));
    expect(error).toBeInstanceOf(MarkerError);
    expect(error.message).toBe("Encrypted token failed verification in code");
  });

  test("Node and Bun derive the same key and wrappers", () => {
    const script = `
      import { SecretShield, deriveRemoteKey } from ${JSON.stringify(join(import.meta.dir, "../src/secrets.js"))};
      const shield = SecretShield.forCaller(${JSON.stringify(TOKEN_A)});
      console.log(JSON.stringify({
        key: deriveRemoteKey(${JSON.stringify(TOKEN_A)}).toString("hex"),
        text: shield.encrypt(${JSON.stringify(`${SLACK_BOT} ${STRIPE_LIVE}`)}),
      }));`;
    const node = spawnSync(
      Bun.which("node"),
      ["--input-type=module", "-e", script],
      { encoding: "utf8" },
    );
    const fromNode = JSON.parse(node.stdout);
    expect(fromNode.key).toBe(deriveRemoteKey(TOKEN_A).toString("hex"));
    expect(fromNode.text).toBe(
      encryptWith(TOKEN_A, `${SLACK_BOT} ${STRIPE_LIVE}`),
    );
    expect(decryptWith(TOKEN_A, fromNode.text)).toBe(
      `${SLACK_BOT} ${STRIPE_LIVE}`,
    );
  });

  test("seeded random tokens of every built-in pattern survive a fresh shield", () => {
    let state = 0x2545f491;
    const random = (bound) => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      state >>>= 0;
      return state % bound;
    };
    const body = (alphabet, length) =>
      Array.from({ length }, () => alphabet[random(alphabet.length)]).join("");

    let checked = 0;
    for (const pattern of BUILTIN_PATTERNS) {
      if (pattern.kind !== "simple") continue;
      for (let round = 0; round < 4; round++) {
        const token =
          pattern.prefix +
          body(pattern.bodyAlphabet.chars, pattern.minBodyLength);
        const text = `é ${token} 日本 (${round})`;
        const apiToken = `synthetic-token-${random(1000)}`;
        const encrypted = encryptWith(apiToken, text);
        if (!encrypted.includes("{ENCRYPTED:")) continue;
        expect(encrypted).not.toContain(token);
        expect(decryptWith(apiToken, encrypted)).toBe(text);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(40);
  });
});

describe("remote budgets", () => {
  // The pinned wrapper is 60 characters long, and a call may decrypt 38,000.
  const fitting = Array(633).fill(PINNED_WRAPPER).join(" ");

  test("input is charged against the budget before anything is decrypted", () => {
    expect(633 * PINNED_WRAPPER.length).toBeLessThanOrEqual(38_000);
    expect(634 * PINNED_WRAPPER.length).toBeGreaterThan(38_000);
    expect(decryptWith(TOKEN_A, fitting)).toBe(
      Array(633).fill(GITHUB_PAT).join(" "),
    );

    // The damaged wrapper fails its check on its own, so refusing for the budget instead shows nothing was decrypted first.
    const damaged = PINNED_WRAPPER.replace("r.vX", "s.vX");
    const alone = refusal(() => decryptWith(TOKEN_A, damaged, "code"));
    expect(alone.message).toBe("Encrypted token failed verification in code");
    const over = refusal(() =>
      decryptWith(TOKEN_A, `${damaged} ${fitting}`, "code"),
    );
    expect(over).toBeInstanceOf(MarkerError);
    expect(over.message).toBe("Too many encrypted values in code");
  });

  test("the input charge adds up across the strings of one call", () => {
    const half = Array(400).fill(PINNED_WRAPPER).join(" ");
    const shield = SecretShield.forCaller(TOKEN_A);
    try {
      expect(shield.decrypt(half, "first")).toContain(GITHUB_PAT);
      const error = refusal(() => shield.decrypt(half, "second"));
      expect(error.message).toBe("Too many encrypted values in second");
    } finally {
      shield.destroy();
    }
  });

  test("an unterminated wrapper is charged to the end of its string", () => {
    const text = `{ENCRYPTED:${"x ".repeat(20_000)}`;
    const error = refusal(() => decryptWith(TOKEN_A, text, "code"));
    expect(error.message).toBe("Too many encrypted values in code");
  });

  test("the output budget adds up across the strings of one call", () => {
    const shield = SecretShield.forCaller(TOKEN_A);
    try {
      // 2,500 tokens of 40 characters use up the 100,000 characters.
      for (let i = 0; i < 2500; i++) shield.encrypt(GITHUB_PAT);
      expect(() => shield.encrypt(GITHUB_PAT)).toThrow("Too many secrets");
    } finally {
      shield.destroy();
    }
  });
});
