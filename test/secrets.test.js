import { describe, expect, test } from "bun:test";
import { SecretShield } from "../src/secrets.js";

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

describe("SecretShield", () => {
  test("round-trip: encrypt then decrypt returns original", () => {
    const shield = new SecretShield({ key: TEST_KEY });
    const original = `Use this token: ${GITHUB_PAT} to authenticate.`;
    const encrypted = shield.encrypt(original);

    expect(encrypted).not.toBe(original);
    expect(encrypted).toContain("ghp_");
    expect(encrypted).not.toContain(GITHUB_PAT);

    const decrypted = shield.decrypt(encrypted);
    expect(decrypted).toBe(original);
    shield.destroy();
  });

  test("multi-token: encrypts and decrypts multiple tokens", () => {
    const shield = new SecretShield({ key: TEST_KEY });
    const original = `GitHub: ${GITHUB_PAT}\nOpenAI: ${OPENAI_KEY}`;
    const encrypted = shield.encrypt(original);

    expect(encrypted).not.toContain(GITHUB_PAT);
    expect(encrypted).not.toContain(OPENAI_KEY);

    const decrypted = shield.decrypt(encrypted);
    expect(decrypted).toBe(original);
    shield.destroy();
  });

  test("no-op for clean text: text without tokens passes through unchanged", () => {
    const shield = new SecretShield({ key: TEST_KEY });
    const text = "Hello world, this is plain text with no secrets.";
    expect(shield.encrypt(text)).toBe(text);
    expect(shield.decrypt(text)).toBe(text);
    shield.destroy();
  });

  test("empty and non-string input passes through", () => {
    const shield = new SecretShield({ key: TEST_KEY });
    expect(shield.encrypt("")).toBe("");
    expect(shield.decrypt("")).toBe("");
    expect(shield.encrypt(null)).toBe(null);
    expect(shield.decrypt(undefined)).toBe(undefined);
    expect(shield.encrypt(42)).toBe(42);
    shield.destroy();
  });

  test("determinism: same token always produces same ciphertext", () => {
    const shield = new SecretShield({ key: TEST_KEY });
    const text = `token: ${GITHUB_PAT}`;
    const enc1 = shield.encrypt(text);
    const enc2 = shield.encrypt(text);
    expect(enc1).toBe(enc2);
    shield.destroy();
  });

  test("destroy lifecycle: encrypt and decrypt throw after destroy", () => {
    const shield = new SecretShield({ key: TEST_KEY });
    shield.destroy();
    expect(() => shield.encrypt("test")).toThrow(
      "SecretShield has been destroyed",
    );
    expect(() => shield.decrypt("test")).toThrow(
      "SecretShield has been destroyed",
    );
  });

  test("tweak isolation: different tweaks produce different ciphertext", () => {
    const tweak1 = new TextEncoder().encode("context-a");
    const tweak2 = new TextEncoder().encode("context-b");
    const shield1 = new SecretShield({ key: TEST_KEY, tweak: tweak1 });
    const shield2 = new SecretShield({ key: TEST_KEY, tweak: tweak2 });

    const text = `token: ${GITHUB_PAT}`;
    const enc1 = shield1.encrypt(text);
    const enc2 = shield2.encrypt(text);

    expect(enc1).not.toBe(enc2);
    expect(enc1).not.toBe(text);
    expect(enc2).not.toBe(text);

    // Each decrypts its own
    expect(shield1.decrypt(enc1)).toBe(text);
    expect(shield2.decrypt(enc2)).toBe(text);

    shield1.destroy();
    shield2.destroy();
  });

  test("ephemeral key: no key provided generates random key", () => {
    const shield1 = new SecretShield();
    const shield2 = new SecretShield();
    const text = `token: ${GITHUB_PAT}`;

    // Different random keys produce different ciphertext
    const enc1 = shield1.encrypt(text);
    const enc2 = shield2.encrypt(text);
    expect(enc1).not.toBe(enc2);

    shield1.destroy();
    shield2.destroy();
  });

  test("fresh instance with same key cannot decrypt (empty registry)", () => {
    const shield1 = new SecretShield({ key: TEST_KEY });
    const text = `token: ${GITHUB_PAT}`;
    const encrypted = shield1.encrypt(text);
    shield1.destroy();

    // New instance with SAME key but empty registry
    const shield2 = new SecretShield({ key: TEST_KEY });
    const attempted = shield2.decrypt(encrypted);
    // Registry is empty — should not recover original
    expect(attempted).toBe(encrypted);
    shield2.destroy();
  });

  test("encrypt preserves token prefix format", () => {
    const shield = new SecretShield({ key: TEST_KEY });
    const encrypted = shield.encrypt(GITHUB_PAT);

    expect(encrypted).toMatch(/^ghp_/);
    expect(encrypted).toHaveLength(GITHUB_PAT.length);
    expect(encrypted).not.toBe(GITHUB_PAT);

    shield.destroy();
  });

  test("structured token round-trip: SendGrid SG.seg1.seg2", () => {
    const shield = new SecretShield({ key: TEST_KEY });
    const original = `key: ${SENDGRID_KEY}`;
    const encrypted = shield.encrypt(original);

    expect(encrypted).not.toBe(original);
    expect(encrypted).toContain("SG.");
    expect(encrypted).not.toContain(SENDGRID_KEY);

    const decrypted = shield.decrypt(encrypted);
    expect(decrypted).toBe(original);
    shield.destroy();
  });

  test("structured token: isolated ciphertext decrypts", () => {
    const shield = new SecretShield({ key: TEST_KEY });
    const encrypted = shield.encrypt(`key: ${SENDGRID_KEY}`);

    // Extract just the encrypted SendGrid token from the output
    const encToken = encrypted.slice("key: ".length);
    expect(encToken).toMatch(/^SG\./);
    expect(encToken).not.toBe(SENDGRID_KEY);

    // Agent copies the isolated token into a new context
    const agentInput = `Use this key: ${encToken}`;
    const decrypted = shield.decrypt(agentInput);
    expect(decrypted).toBe(`Use this key: ${SENDGRID_KEY}`);
    shield.destroy();
  });

  test("custom pattern round-trip", () => {
    const { ALPHANUMERIC } = require("fast-cipher/tokens");
    const shield = new SecretShield({
      key: TEST_KEY,
      extraPatterns: [
        {
          kind: "simple",
          name: "custom-test",
          prefix: "cust_",
          bodyRegex: "[A-Za-z0-9]{20}",
          bodyAlphabet: ALPHANUMERIC,
          minBodyLength: 20,
        },
      ],
    });

    const token = "cust_ABCDEFGHIJKLMNOPQRST";
    const original = `custom: ${token}`;
    const encrypted = shield.encrypt(original);

    expect(encrypted).not.toBe(original);
    expect(encrypted).toContain("cust_");
    expect(encrypted).not.toContain(token);

    const decrypted = shield.decrypt(encrypted);
    expect(decrypted).toBe(original);
    shield.destroy();
  });

  test("custom pattern: isolated ciphertext decrypts", () => {
    const { ALPHANUMERIC } = require("fast-cipher/tokens");
    const shield = new SecretShield({
      key: TEST_KEY,
      extraPatterns: [
        {
          kind: "simple",
          name: "custom-test",
          prefix: "cust_",
          bodyRegex: "[A-Za-z0-9]{20}",
          bodyAlphabet: ALPHANUMERIC,
          minBodyLength: 20,
        },
      ],
    });

    const token = "cust_ABCDEFGHIJKLMNOPQRST";
    const encrypted = shield.encrypt(`custom: ${token}`);
    const encToken = encrypted.slice("custom: ".length);

    // Agent copies isolated encrypted token into new context
    const decrypted = shield.decrypt(`use ${encToken} here`);
    expect(decrypted).toBe(`use ${token} here`);
    shield.destroy();
  });

  test("adjacent context: token preceded by alphanumeric chars", () => {
    const shield = new SecretShield({ key: TEST_KEY });
    // Token preceded by alphanumeric 'X', followed by space (scanner still matches)
    const original = `X${GITHUB_PAT} done`;
    const encrypted = shield.encrypt(original);

    expect(encrypted).not.toContain(GITHUB_PAT);

    // Full string round-trip
    expect(shield.decrypt(encrypted)).toBe(original);

    // Extract just the encrypted ghp_ token (without the leading X)
    const ghpIdx = encrypted.indexOf("ghp_");
    const encToken = encrypted.slice(ghpIdx, ghpIdx + GITHUB_PAT.length);
    expect(shield.decrypt(`isolated: ${encToken}`)).toBe(
      `isolated: ${GITHUB_PAT}`,
    );
    shield.destroy();
  });

  test("simple token: isolated ciphertext decrypts", () => {
    const shield = new SecretShield({ key: TEST_KEY });
    const encrypted = shield.encrypt(`token: ${GITHUB_PAT}`);
    const encToken = encrypted.slice("token: ".length);

    // Agent copies the isolated token to a different context
    const decrypted = shield.decrypt(`auth: ${encToken}`);
    expect(decrypted).toBe(`auth: ${GITHUB_PAT}`);
    shield.destroy();
  });

  test("provenance: bare encrypted body without prefix is NOT decrypted", () => {
    const shield = new SecretShield({ key: TEST_KEY });
    const encrypted = shield.encrypt(`token: ${GITHUB_PAT}`);

    // Extract just the encrypted BODY (without ghp_ prefix)
    const encToken = encrypted.slice("token: ".length);
    const bareBody = encToken.slice("ghp_".length);

    // Bare body should NOT be reversed — it was never emitted standalone
    expect(shield.decrypt(bareBody)).toBe(bareBody);

    // Surrounded by other text should also not be reversed
    expect(shield.decrypt(`x${bareBody}y`)).toBe(`x${bareBody}y`);
    shield.destroy();
  });

  test("provenance: bare encrypted body of structured token is NOT decrypted", () => {
    const shield = new SecretShield({ key: TEST_KEY });
    const encrypted = shield.encrypt(`key: ${SENDGRID_KEY}`);

    // Extract the encrypted SendGrid token
    const encToken = encrypted.slice("key: ".length);
    // Strip the SG. prefix to get the bare encrypted segments
    const bareSegments = encToken.slice("SG.".length);

    // Bare segments should NOT be reversed
    expect(shield.decrypt(bareSegments)).toBe(bareSegments);
    shield.destroy();
  });
});
