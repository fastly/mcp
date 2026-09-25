import { describe, expect, test } from "bun:test";
import { MarkerError, SecretShield, shieldJson } from "../src/secrets.js";

// Fixed key for deterministic tests
const TEST_KEY = new Uint8Array([
  0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d,
  0x0e, 0x0f, 0x10,
]);

// A realistic GitHub PAT (40 chars: prefix 4 + body 36)
const GITHUB_PAT = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij";

// A realistic OpenAI key
const OPENAI_KEY = "sk-proj-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuv";

// A realistic SendGrid key (structured: SG.<22 BASE64URL chars>.<43 BASE64URL chars>)
const SENDGRID_KEY =
  "SG.ABCDEFGHIJKLMNOPQRSTUv.ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopq";
// These two share their "sk-" lead with OPENAI_KEY.
const ANTHROPIC_KEY =
  "sk-ant-api03-q8ZrT2mXw7LpK4vN9cYb3HsJ6dFg1RtU5eWo0iPa-_Qz8XyV2nMb7CkL4jHg9DfS3aWe6RtY1uIo5pZx0cVb";
const OPENAI_LEGACY_KEY = "sk-T3BlbkFJq8ZrT2mXw7LpK4vN9cYb3HsJ6dFg1RtU5eWo0iPa";
const FASTLY_TOKEN = "Ab3dEf7hIj1lMn0pQr2tUv4xYz6_B-9D";
const AWS_SECRET = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";

const WRAPPER = /\{ENCRYPTED:[0-9A-Za-z+/\-_.]+\}/g;

function wrappersIn(text) {
  return text.match(WRAPPER) ?? [];
}

function refusal(fn) {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error("expected a refusal");
}

describe("SecretShield", () => {
  test("a secret becomes a wrapper 20 characters longer, and decrypts back", () => {
    const shield = new SecretShield({ key: TEST_KEY });
    const original = `Use this token: ${GITHUB_PAT} to authenticate.`;
    const encrypted = shield.encrypt(original);
    expect(encrypted).not.toContain("ghp_");
    expect(encrypted.startsWith("Use this token: {ENCRYPTED:")).toBe(true);
    expect(encrypted.endsWith("} to authenticate.")).toBe(true);
    expect(shield.decrypt(encrypted)).toBe(original);

    for (const token of [GITHUB_PAT, SENDGRID_KEY, ANTHROPIC_KEY]) {
      const wrapped = shield.encrypt(token);
      expect(wrapped).toMatch(/^\{ENCRYPTED:[0-9A-Za-z+/\-_.]+\}$/);
      expect(wrapped).toHaveLength(token.length + 20);
    }
    shield.destroy();
  });

  test("every kind of token round trips, several to a text", () => {
    const shield = new SecretShield({ key: TEST_KEY });
    // Prefixed, structured and prefix-less tokens, some sharing their first characters.
    const tokens = [
      GITHUB_PAT,
      OPENAI_KEY,
      ANTHROPIC_KEY,
      OPENAI_LEGACY_KEY,
      SENDGRID_KEY,
      FASTLY_TOKEN,
      AWS_SECRET,
    ];
    const text = tokens.join(" and ");
    const encrypted = shield.encrypt(text);
    for (const token of tokens) expect(encrypted).not.toContain(token);
    expect(encrypted).not.toContain("SG.");
    expect(wrappersIn(encrypted)).toHaveLength(tokens.length);
    expect(shield.decrypt(encrypted)).toBe(text);
    shield.destroy();
  });

  test("text without wrappers, empty strings and non-strings pass through", () => {
    const shield = new SecretShield({ key: TEST_KEY });
    const text = "Hello world, this is plain text with no secrets.";
    expect(shield.encrypt(text)).toBe(text);
    expect(shield.decrypt(text)).toBe(text);
    expect(shield.decrypt(`use ${GITHUB_PAT}`)).toBe(`use ${GITHUB_PAT}`);
    expect(shield.encrypt("")).toBe("");
    expect(shield.decrypt("")).toBe("");
    expect(shield.encrypt(null)).toBe(null);
    expect(shield.decrypt(undefined)).toBe(undefined);
    expect(shield.encrypt(42)).toBe(42);
    shield.destroy();
  });

  test("a fresh instance with the same key gives the same wrappers and decrypts them", () => {
    const shield1 = new SecretShield({ key: TEST_KEY });
    const text = `token: ${GITHUB_PAT}`;
    const encrypted = shield1.encrypt(text);
    shield1.destroy();

    const shield2 = new SecretShield({ key: TEST_KEY });
    expect(shield2.encrypt(text)).toBe(encrypted);
    expect(shield2.decrypt(encrypted)).toBe(text);
    shield2.destroy();
  });

  test("a wrapper made with another tweak or key is refused", () => {
    const text = `token: ${GITHUB_PAT}`;
    const original = new SecretShield({
      key: TEST_KEY,
      tweak: new TextEncoder().encode("context-a"),
    });
    const encrypted = original.encrypt(text);
    for (const other of [
      new SecretShield({
        key: TEST_KEY,
        tweak: new TextEncoder().encode("context-b"),
      }),
      new SecretShield(),
    ]) {
      expect(other.encrypt(text)).not.toBe(encrypted);
      expect(() => other.decrypt(encrypted)).toThrow(MarkerError);
      other.destroy();
    }
    expect(original.decrypt(encrypted)).toBe(text);
    original.destroy();
  });

  test("malformed wrappers are refused by location, without echoing them", () => {
    const shield = new SecretShield({ key: TEST_KEY });
    const [wrapper] = wrappersIn(shield.encrypt(GITHUB_PAT));
    const payload = wrapper.slice("{ENCRYPTED:".length, -1);
    const flipped = payload.endsWith("A") ? "B" : "A";
    const cases = [
      // Framed correctly, but the check fails.
      `{ENCRYPTED:${payload.slice(0, -1)}${flipped}}`,
      wrapper.slice(0, -1),
      wrapper.slice(0, 20),
      "{ENCRYPTED:abc}",
      `{ENCRYPTED:${"A".repeat(530)}}`,
      `{ENCRYPTED:${payload.slice(0, 10)} ${payload.slice(11)}}`,
    ];
    for (const input of cases) {
      const error = refusal(() =>
        shield.decrypt(`${wrapper} then ${input}`, "code"),
      );
      expect(error).toBeInstanceOf(MarkerError);
      expect(error.message).toEndWith(" in code");
      expect(error.message).not.toContain(payload.slice(0, 12));
      expect(error.message).not.toContain("AAAA");
      expect(error.hint).toContain("Retrieve the original value again");
    }
    shield.destroy();
  });

  test("the local shield has no input budget", () => {
    const shield = new SecretShield({ key: TEST_KEY });
    // About 66,000 wrapper characters, more than a remote call may decrypt.
    const text = Array.from({ length: 1100 }, () => GITHUB_PAT).join(" ");
    const encrypted = shield.encrypt(text);
    expect(encrypted.length).toBeGreaterThan(60_000);
    expect(shield.decrypt(encrypted)).toBe(text);
    shield.destroy();
  });

  // Otherwise anyone who can write to the account could dress a secret up as a wrapper and have it shown in the clear.
  test("text that already contains an opener is refused", () => {
    const shield = new SecretShield({ key: TEST_KEY });
    const encrypted = shield.encrypt(`token: ${GITHUB_PAT}`);
    expect(() => shield.encrypt(encrypted)).toThrow();
    expect(() => shield.encrypt(`planted {ENCRYPTED:${GITHUB_PAT}}`)).toThrow();
    expect(() => shieldJson({ note: encrypted }, shield)).toThrow();
    expect(() => shieldJson({ [encrypted]: "value" }, shield)).toThrow();
    shield.destroy();
  });

  test("a token longer than 512 characters is refused", () => {
    const shield = new SecretShield({ key: TEST_KEY });
    const long = `sk-proj-${"A".repeat(505)}`;
    expect(long).toHaveLength(513);
    expect(() => shieldJson({ key: long }, shield)).toThrow();
    const fits = `sk-proj-${"A".repeat(504)}`;
    expect(shield.decrypt(shieldJson({ key: fits }, shield).key)).toBe(fits);
    shield.destroy();
  });

  test("structured shielding encrypts keys once and keeps distinct keys apart", () => {
    const shield = new SecretShield({ key: TEST_KEY });
    const value = [
      { [GITHUB_PAT]: 1, [`x${GITHUB_PAT}`]: 2, plain: GITHUB_PAT },
      { [GITHUB_PAT]: 3 },
    ];
    const shielded = shieldJson(value, shield);
    const firstKeys = Object.keys(shielded[0]);
    expect(firstKeys).toHaveLength(3);
    expect(Object.keys(shielded[1])).toEqual([firstKeys[0]]);
    expect(JSON.stringify(shielded)).not.toContain(GITHUB_PAT);
    expect(JSON.parse(shield.decrypt(JSON.stringify(shielded)))).toEqual(value);
    shield.destroy();
  });

  test("destroy lifecycle: encrypt and decrypt throw after destroy, even on plain or empty text", () => {
    const shield = new SecretShield({ key: TEST_KEY });
    shield.destroy();
    for (const input of ["test", "", GITHUB_PAT]) {
      expect(() => shield.encrypt(input)).toThrow(
        "SecretShield has been destroyed",
      );
      expect(() => shield.decrypt(input)).toThrow(
        "SecretShield has been destroyed",
      );
    }
  });

  test("a wrapper copied alone decrypts in a new context", () => {
    const shield = new SecretShield({ key: TEST_KEY });
    for (const token of [GITHUB_PAT, SENDGRID_KEY]) {
      // Letters right before the token don't stop it from being found.
      const encrypted = shield.encrypt(`X${token} done`);
      expect(encrypted.startsWith("X{ENCRYPTED:")).toBe(true);
      expect(shield.decrypt(encrypted)).toBe(`X${token} done`);
      const [wrapper] = wrappersIn(encrypted);
      expect(shield.decrypt(`Use this key: ${wrapper}`)).toBe(
        `Use this key: ${token}`,
      );
    }
    shield.destroy();
  });
});
