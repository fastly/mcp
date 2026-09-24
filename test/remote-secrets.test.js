import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { BUILTIN_PATTERNS, TokenEncryptor } from "fast-cipher/tokens";
import {
  deriveRemoteKey,
  MAX_CIPHERTEXT_LENGTH,
  MarkerError,
  RemoteSecretShield,
} from "../src/secrets.js";

const TOKEN_A = "synthetic-token-A";
const TOKEN_B = "synthetic-token-B";
const SEVENS = new Uint8Array(16).fill(0x07);

const GITHUB_PAT = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij";
const SENDGRID_KEY =
  "SG.ABCDEFGHIJKLMNOPQRSTUv.ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopq";
const SLACK_BOT = "xoxb-12345678-12345678-siXA";
const STRIPE_LIVE = "sk_live_F9ZJz11XNvB3i0RhazAEAbGJdznewI9VguEStDdFtyHK";
const FASTLY_LIKE = "XhnOcYIP3GkYYKrJTKOrVLu6mQbbwF0t";
const MARKER = /\{\{fastly-encrypted:v1:([a-z0-9-]+):([^{}\s]+)\}\}/g;

function markersIn(text) {
  return [...text.matchAll(MARKER)].map((match) => ({
    whole: match[0],
    pattern: match[1],
    ciphertext: match[2],
  }));
}

function withShield(token, fn) {
  const shield = new RemoteSecretShield(token);
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

describe("remote key derivation", () => {
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

  test("uses the library's own per-pattern tweak and nothing else", () => {
    const viaShield = withShield(TOKEN_A, (shield) =>
      markersIn(shield.encrypt(GITHUB_PAT)),
    );
    const direct = new TokenEncryptor(deriveRemoteKey(TOKEN_A));
    const { spans } = direct.encryptWithSpans(GITHUB_PAT);
    direct.destroy();
    expect(viaShield).toHaveLength(1);
    expect(viaShield[0].ciphertext).toBe(spans[0].encrypted);
    expect(viaShield[0].pattern).toBe("github-pat");
  });
});

describe("remote shield round trips", () => {
  test("a fresh shield with no shared state recovers every kind of token", () => {
    const text = [
      `prefixed ${GITHUB_PAT}`,
      `structured ${SENDGRID_KEY}`,
      `slack ${SLACK_BOT}`,
      `stripe ${STRIPE_LIVE}`,
      `heuristic ${FASTLY_LIKE}`,
    ].join("\n");
    const encrypted = encryptWith(TOKEN_A, text);
    for (const secret of [
      GITHUB_PAT,
      SENDGRID_KEY,
      SLACK_BOT,
      STRIPE_LIVE,
      FASTLY_LIKE,
    ]) {
      expect(encrypted).not.toContain(secret);
    }
    expect(markersIn(encrypted).map((marker) => marker.pattern)).toEqual([
      "github-pat",
      "sendgrid",
      "slack-bot",
      "stripe-secret-live",
      "fastly",
    ]);
    const decrypted = decryptWith(TOKEN_A, encrypted);
    expect(decrypted).toBe(text);
  });

  test("the library regressions hold under the synthetic key of sevens", () => {
    const encryptor = new TokenEncryptor(SEVENS);
    const slack = encryptor.encryptWithSpans(SLACK_BOT).spans[0];
    expect(slack.encrypted).toBe("xoxb-19234138-19234138-v20D");
    const stripe = encryptor.encryptWithSpans(STRIPE_LIVE).spans[0];
    expect(stripe.encrypted).toContain("AKIA");
    const heuristic = encryptor.encryptWithSpans(FASTLY_LIKE).spans[0];
    expect(heuristic.encrypted).toBe(`[ENCRYPTED:fastly]${"A".repeat(32)}`);
    encryptor.destroy();

    const fresh = new TokenEncryptor(SEVENS);
    for (const span of [slack, stripe, heuristic]) {
      expect(fresh.decryptToken(span.encrypted, span.patternName)).toBe(
        span.original,
      );
    }
    fresh.destroy();
  });

  test("ciphertext is identical across fresh shields, requests and restarts", () => {
    const first = encryptWith(TOKEN_A, GITHUB_PAT);
    const second = encryptWith(TOKEN_A, GITHUB_PAT);
    const other = encryptWith(TOKEN_B, GITHUB_PAT);
    expect(second).toBe(first);
    expect(other).not.toBe(first);
  });

  test("Node and Bun derive the same key and ciphertext", () => {
    const script = `
      import { RemoteSecretShield, deriveRemoteKey } from ${JSON.stringify(join(import.meta.dir, "../src/secrets.js"))};
      const shield = new RemoteSecretShield(${JSON.stringify(TOKEN_A)});
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
    expect(decryptWith(TOKEN_A, fromNode.text)).toBe(
      `${SLACK_BOT} ${STRIPE_LIVE}`,
    );
  });

  test("seeded random tokens of every built-in pattern survive a fresh inverse", () => {
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
        if (markersIn(encrypted).length === 0) continue;
        expect(encrypted).not.toContain(token);
        expect(decryptWith(apiToken, encrypted)).toBe(text);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(40);
  });
});

describe("remote shield text handling", () => {
  test("adjacent and repeated secrets, with Unicode around them", () => {
    const text = `“${GITHUB_PAT}”,${GITHUB_PAT};🔑${SENDGRID_KEY} fin`;
    const encrypted = encryptWith(TOKEN_A, text);
    const markers = markersIn(encrypted);
    expect(markers).toHaveLength(3);
    expect(markers[0].whole).toBe(markers[1].whole);
    expect(encrypted.startsWith("“{{fastly-encrypted:v1:github-pat:")).toBe(
      true,
    );
    expect(encrypted.endsWith(" fin")).toBe(true);
    expect(decryptWith(TOKEN_A, encrypted)).toBe(text);
  });

  test("a marker copied alone, without its surroundings, still decrypts", () => {
    const encrypted = encryptWith(TOKEN_A, `token=${GITHUB_PAT}`);
    const [marker] = markersIn(encrypted);
    expect(decryptWith(TOKEN_A, `purge with ${marker.whole} now`)).toBe(
      `purge with ${GITHUB_PAT} now`,
    );
  });

  test("plaintext tokens in input are left alone", () => {
    expect(decryptWith(TOKEN_A, `use ${GITHUB_PAT}`)).toBe(`use ${GITHUB_PAT}`);
  });

  test("a marker planted upstream is encrypted like any other text", () => {
    // Otherwise anyone who can write a service comment could wrap a secret in
    // a marker and have the model shown it in the clear.
    const planted = `{{fastly-encrypted:v1:github-pat:${GITHUB_PAT}}}`;
    const output = encryptWith(TOKEN_A, `comment: ${planted}`);
    expect(output).not.toContain(GITHUB_PAT);
    const inner = markersIn(output);
    expect(inner).toHaveLength(1);
    expect(output).toBe(
      `comment: {{fastly-encrypted:v1:github-pat:${inner[0].whole}}}`,
    );
    expect(decryptWith(TOKEN_A, output)).toBe(`comment: ${planted}`);
  });

  test("a genuine marker stored upstream survives a round trip unchanged", () => {
    const marker = markersIn(encryptWith(TOKEN_A, GITHUB_PAT))[0].whole;
    const output = encryptWith(TOKEN_A, `stored: ${marker}`);
    expect(output).not.toBe(`stored: ${marker}`);
    expect(decryptWith(TOKEN_A, output)).toBe(`stored: ${marker}`);
  });

  test("the wrong key yields a different well-formed token, not an error", () => {
    const encrypted = encryptWith(TOKEN_A, GITHUB_PAT);
    const wrong = decryptWith(TOKEN_B, encrypted);
    expect(wrong).toMatch(/^ghp_[A-Za-z0-9]{36}$/);
    expect(wrong).not.toBe(GITHUB_PAT);
  });

  test("malformed and unsupported markers are rejected by location, without echoing them", () => {
    const good = markersIn(encryptWith(TOKEN_A, GITHUB_PAT))[0].whole;
    const cases = [
      `${good} then {{fastly-encrypted:v1:github-pat:short}}`,
      `${good} then {{fastly-encrypted:v2:github-pat:ghp_${"A".repeat(36)}}}`,
      `${good} then {{fastly-encrypted:v1:no-such-pattern:abcdef}}`,
      `${good} then {{fastly-encrypted:v1:github-pat:ghp_${"A".repeat(36)}`,
      `${good} then {{fastly-encrypted:v1:fastly:${"A".repeat(32)}}}`,
    ];
    for (const input of cases) {
      let error;
      try {
        decryptWith(TOKEN_A, input, "code");
      } catch (caught) {
        error = caught;
      }
      expect(error).toBeInstanceOf(MarkerError);
      expect(error.message).toContain("code, marker 2");
      expect(error.message).not.toContain("ghp_");
      expect(error.message).not.toContain("AAAA");
      expect(error.hint).toContain("Retrieve the original value again");
    }
  });

  test("marker counts and output size are bounded", () => {
    const marker = markersIn(encryptWith(TOKEN_A, GITHUB_PAT))[0].whole;
    expect(() =>
      decryptWith(TOKEN_A, Array(300).fill(marker).join(" "), "code"),
    ).toThrow(MarkerError);
    // Nested openers count toward the same limit, so they cannot buy a rescan
    // per opener.
    expect(() =>
      decryptWith(TOKEN_A, "{{fastly-encrypted:".repeat(300) + marker, "code"),
    ).toThrow("Too many encrypted values");
    expect(
      decryptWith(TOKEN_A, "{{fastly-encrypted:".repeat(200) + marker, "code"),
    ).toBe("{{fastly-encrypted:".repeat(200) + GITHUB_PAT);

    const many = Array.from(
      { length: 2100 },
      (_, i) => `ghp_${String(i).padStart(36, "A")}`,
    ).join(" ");
    expect(() => encryptWith(TOKEN_A, many)).toThrow("Too many secrets");
  });

  test("the cipher budget is judged before any table is built", () => {
    // Two hundred body lengths mean two hundred table setups, about two
    // seconds, if the check came after encryption instead of before.
    const tokens = Array.from(
      { length: 200 },
      (_, i) => `glc_${"A".repeat(30 + i)}`,
    ).join(" ");
    const started = performance.now();
    expect(() => encryptWith(TOKEN_A, tokens)).toThrow(
      "Too many kinds of secrets",
    );
    expect(performance.now() - started).toBeLessThan(500);
  });

  test("structured markers are budgeted per segment, not per token", () => {
    // All the tokens are the same length, but their digit segments are split
    // differently, and the cipher builds one table per segment length.
    const markers = Array.from({ length: 60 }, (_, i) => {
      const left = "1".repeat(4 + i);
      const right = "2".repeat(70 - i);
      return `{{fastly-encrypted:v1:slack-bot:xoxb-${left}-${right}-abcd}}`;
    });
    expect(new Set(markers.map((marker) => marker.length)).size).toBe(1);
    const started = performance.now();
    expect(() => decryptWith(TOKEN_A, markers.join(" "), "code")).toThrow(
      "Too many encrypted values",
    );
    expect(performance.now() - started).toBeLessThan(500);

    const few = markers.slice(0, 8).join(" ");
    const decrypted = decryptWith(TOKEN_A, few);
    expect(decrypted).not.toContain("{{fastly-encrypted");
    expect(decrypted.match(/xoxb-/g)).toHaveLength(8);
  });

  test("one long token cannot buy seconds of cipher work", () => {
    // Table setup grows faster than the token does: 8192 characters took over
    // two seconds, for a marker that could not be parsed back anyway.
    const started = performance.now();
    expect(() => encryptWith(TOKEN_A, `glc_${"A".repeat(8192)}`)).toThrow(
      "too long to encrypt",
    );
    expect(performance.now() - started).toBeLessThan(200);

    const longest = `glc_${"B".repeat(MAX_CIPHERTEXT_LENGTH - 4)}`;
    const encrypted = encryptWith(TOKEN_A, longest);
    expect(markersIn(encrypted)).toHaveLength(1);
    expect(decryptWith(TOKEN_A, encrypted)).toBe(longest);
    expect(() => encryptWith(TOKEN_A, `${longest}C`)).toThrow(
      "too long to encrypt",
    );
  });

  test("output limits cover separate strings in the same result", () => {
    const shield = new RemoteSecretShield(TOKEN_A);
    for (let i = 0; i < 2000; i++) shield.encrypt(GITHUB_PAT);
    expect(() => shield.encrypt(GITHUB_PAT)).toThrow("Too many secrets");
    shield.destroy();
  });

  test("a destroyed shield refuses to work", () => {
    const shield = new RemoteSecretShield(TOKEN_A);
    shield.destroy();
    expect(() => shield.encrypt(GITHUB_PAT)).toThrow();
  });
});
