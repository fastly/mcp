import { hkdfSync, randomBytes } from "node:crypto";
import {
  BUILTIN_PATTERNS,
  MIN_SEGMENT_LENGTH,
  scan,
  TokenEncryptor,
} from "fast-cipher/tokens";
import { setKey } from "./serializer.js";

/** What a caller gets instead of a result that could not be encrypted. */
export const WITHHELD =
  "The result was withheld because a secret in it could not be encrypted. Return less data, or leave the secret out of the result.";

export class SecretShield {
  #encryptor;
  #registry = new Map();
  // Every ciphertext starts with its pattern's lead, so decrypt looks for leads and checks only these lengths after each one.
  #lengthsByLead = new Map();
  #tweak;
  #destroyed = false;

  // No custom patterns: text cut before the shield runs is only checked against the built-in ones.
  constructor({ key, tweak } = {}) {
    this.#encryptor = new TokenEncryptor(key ?? randomBytes(16));
    this.#tweak = tweak;
  }

  encrypt(text) {
    if (this.#destroyed) throw new Error("SecretShield has been destroyed");
    if (typeof text !== "string" || text.length === 0) return text;

    const plaintext = this.decrypt(text);
    const { text: encrypted, spans } = this.#encryptor.encryptWithSpans(
      plaintext,
      {
        tweak: this.#tweak,
      },
    );
    for (const span of spans) this.#register(span);
    return encrypted;
  }

  #register({ encrypted, original, patternName }) {
    this.#registry.set(encrypted, original);
    const lead = leadOf(PATTERNS.get(patternName));
    const lengths = this.#lengthsByLead.get(lead) ?? [];
    if (!lengths.includes(encrypted.length)) {
      lengths.push(encrypted.length);
      lengths.sort((a, b) => b - a);
      this.#lengthsByLead.set(lead, lengths);
    }
  }

  decrypt(text) {
    if (this.#destroyed) throw new Error("SecretShield has been destroyed");
    if (typeof text !== "string" || text.length === 0) return text;

    const matches = [];
    for (const [lead, lengths] of this.#lengthsByLead) {
      for (
        let at = text.indexOf(lead);
        at !== -1;
        at = text.indexOf(lead, at + 1)
      ) {
        for (const length of lengths) {
          const plaintext = this.#registry.get(text.slice(at, at + length));
          if (plaintext !== undefined) {
            matches.push({ start: at, end: at + length, plaintext });
            break;
          }
        }
      }
    }
    if (matches.length === 0) return text;
    matches.sort((a, b) => a.start - b.start || b.end - a.end);
    const selected = [];
    let cursor = 0;
    for (const match of matches) {
      if (match.start < cursor) continue;
      selected.push(match);
      cursor = match.end;
    }
    return replaceRanges(text, selected, (match) => match.plaintext);
  }

  destroy() {
    this.#encryptor.destroy();
    this.#registry.clear();
    this.#lengthsByLead.clear();
    this.#destroyed = true;
  }
}

const REMOTE_KEY_SALT = "@fastly/mcp/remote-secrets/v1";
const REMOTE_KEY_INFO = "fast-cipher/tokens";
const MARKER_OPEN = "{{fastly-encrypted:";
export const MAX_CIPHERTEXT_LENGTH = 512;
const MARKER = new RegExp(
  String.raw`\{\{fastly-encrypted:v1:([a-z0-9-]{1,64}):([^{}\s]{1,${MAX_CIPHERTEXT_LENGTH}})\}\}`,
  "y",
);
const MAX_INPUT_MARKERS = 256;
const MAX_OUTPUT_SPANS = 2000;
const MAX_OUTPUT_LENGTH = 1024 * 1024;
// The cost of a call is estimated before any cipher work runs.
// The numbers come from an arm64 laptop under Bun 1.3.11: a fresh instance
// derives its tables once per alphabet and segment length (about 6 ms plus
// 0.03 ms per character), and each token then costs about 2 us per character.
const MAX_CIPHER_WORK_MS = 300;
const SETUP_BASE_MS = 6;
const SETUP_MS_PER_CHAR = 0.03;
const TOKEN_MS_PER_CHAR = 0.002;
const PATTERNS = new Map(
  BUILTIN_PATTERNS.map((pattern) => [pattern.name, pattern]),
);

/**
 * An encrypted value in a tool argument could not be decrypted.
 * The message names where the marker was, never what it contained.
 */
export class MarkerError extends Error {
  hint =
    "Encrypted values only work with the Fastly API token that produced them, and must be copied whole. Retrieve the original value again.";
}

/** The 16-byte key every replica derives from a given Fastly API token. */
export function deriveRemoteKey(apiToken) {
  return Buffer.from(
    hkdfSync(
      "sha256",
      Buffer.from(apiToken, "utf8"),
      Buffer.from(REMOTE_KEY_SALT, "utf8"),
      Buffer.from(REMOTE_KEY_INFO, "utf8"),
      16,
    ),
  );
}

function markerAt(text, index) {
  MARKER.lastIndex = index;
  return MARKER.exec(text);
}

function leadOf(pattern) {
  return pattern.kind === "heuristic"
    ? `[ENCRYPTED:${pattern.name}]`
    : pattern.prefix;
}

/**
 * The (radix, length) pairs one token body needs.
 * The library builds and caches one table per pair.
 */
function cipherTables(pattern, body) {
  if (pattern.kind !== "structured") {
    return [[pattern.bodyAlphabet.radix, body.length]];
  }
  const parsed = pattern.parse(body);
  if (!parsed) return [];
  return parsed.segments.flatMap((segment, i) =>
    segment.length < MIN_SEGMENT_LENGTH
      ? []
      : [[parsed.alphabets[i].radix, segment.length]],
  );
}

// Tables already in `setups` cost nothing, and the ones this adds go into it.
function cipherWorkMs(tokens, setups = new Set()) {
  let work = 0;
  for (const { pattern, body } of tokens) {
    work += body.length * TOKEN_MS_PER_CHAR;
    for (const [radix, length] of cipherTables(pattern, body)) {
      const key = `${radix}:${length}`;
      if (setups.has(key)) continue;
      setups.add(key);
      work += SETUP_BASE_MS + length * SETUP_MS_PER_CHAR;
    }
  }
  return work;
}

/** Rebuild `text` with each of the sorted, disjoint ranges replaced. */
function replaceRanges(text, ranges, replacement) {
  const parts = [];
  let cursor = 0;
  ranges.forEach((range, i) => {
    parts.push(text.slice(cursor, range.start), replacement(range, i));
    cursor = range.end;
  });
  parts.push(text.slice(cursor));
  return parts.join("");
}

/**
 * A copy of a JSON value with the secrets in its strings and object keys encrypted.
 * Working on values rather than on serialized text keeps a match from reaching into an escape sequence.
 *
 * It throws when a secret can't be encrypted, and the caller then withholds the whole value.
 */
export function shieldJson(value, shield) {
  // Records repeat their keys, and each distinct key only needs encrypting once.
  const keys = new Map();
  const walk = (value) => {
    if (typeof value === "string") return shield.encrypt(value);
    if (Array.isArray(value)) return value.map(walk);
    if (value === null || typeof value !== "object") return value;
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      let protectedKey = keys.get(key);
      if (protectedKey === undefined) {
        protectedKey = shield.encrypt(key);
        keys.set(key, protectedKey);
      }
      if (Object.hasOwn(out, protectedKey)) {
        throw new Error("Secret protection made two object keys collide");
      }
      setKey(out, protectedKey, walk(item));
    }
    return out;
  };
  return walk(value);
}

/**
 * Secret shield for `--remote-http`.
 *
 * The key comes from the caller's token alone, so any replica can decrypt
 * what another one encrypted without a shared registry.
 * The `{{fastly-encrypted:v1:<pattern>:<ciphertext>}}` marker only tells
 * ciphertext apart from a token the caller typed in.
 * It authenticates nothing: the cipher is format preserving, so a wrong key
 * or an altered ciphertext decrypts to a different, well-formed token.
 *
 * One instance serves a single tool call.
 * The limits on how many secrets one result may hold add up across every string it encrypts.
 */
export class RemoteSecretShield {
  #encryptor;
  #outputSetups = new Set();
  #outputSpanCount = 0;
  #outputWork = 0;

  constructor(apiToken) {
    // The library keeps its own copy of the key and zeroes it on destroy.
    const key = deriveRemoteKey(apiToken);
    this.#encryptor = new TokenEncryptor(key);
    key.fill(0);
  }

  /**
   * Wrap every recognized secret in a marker.
   *
   * Marker-shaped text in the input gets no special treatment.
   * Arguments were decrypted before the handler ran, so such a marker can
   * only come from upstream data, and leaving it alone would let anyone who
   * can write to a Fastly account smuggle a secret past encryption.
   * A real marker stored upstream ends up nested; `decrypt` unwraps one
   * layer, which stores it back unchanged.
   */
  encrypt(text) {
    if (typeof text !== "string" || text.length === 0) return text;

    const spans = scan(text, BUILTIN_PATTERNS);
    if (spans.length === 0) return text;
    const spanCount = this.#outputSpanCount + spans.length;
    if (spanCount > MAX_OUTPUT_SPANS) {
      throw new Error("Too many secrets in one result to encrypt safely");
    }
    const tooLong = ({ pattern, body }) =>
      leadOf(pattern).length + body.length > MAX_CIPHERTEXT_LENGTH;
    if (spans.some(tooLong)) {
      throw new Error("A secret in the result is too long to encrypt");
    }
    const setups = new Set(this.#outputSetups);
    const work = this.#outputWork + cipherWorkMs(spans, setups);
    if (work > MAX_CIPHER_WORK_MS) {
      throw new Error(
        "Too many kinds of secrets in one result to encrypt safely",
      );
    }

    const encrypted = replaceRanges(text, spans, (span) => {
      const name = span.pattern.name;
      const ciphertext = this.#encryptor.encryptToken(
        text.slice(span.start, span.end),
        name,
      );
      const marker = `${MARKER_OPEN}v1:${name}:${ciphertext}}}`;
      // What goes out must be what `decrypt` takes back.
      if (!markerAt(marker, 0)) {
        throw new Error("A secret in the result cannot be encrypted");
      }
      return marker;
    });
    if (encrypted.length > MAX_OUTPUT_LENGTH) {
      throw new Error("Result too large after encrypting its secrets");
    }
    this.#outputSetups = setups;
    this.#outputSpanCount = spanCount;
    this.#outputWork = work;
    return encrypted;
  }

  /**
   * Replace each marker with the token it stands for.
   * The recovered text is never rescanned, so a plaintext that happens to look
   * like a marker stays as it is.
   */
  decrypt(text, location = "input") {
    if (typeof text !== "string" || text.length === 0) return text;

    const markers = [];
    const tooMany = () =>
      new MarkerError(`Too many encrypted values in ${location}`);
    const malformed = () =>
      new MarkerError(
        `Malformed or unsupported encrypted value in ${location}, marker ${markers.length + 1}`,
      );
    let cursor = 0;
    let candidates = 0;
    for (;;) {
      const at = text.indexOf(MARKER_OPEN, cursor);
      if (at === -1) break;
      // Every opener counts, so nesting cannot buy more work than markers do.
      if (++candidates > MAX_INPUT_MARKERS) throw tooMany();
      const marker = markerAt(text, at);
      if (!marker) {
        // An opener with another opener before any closer is the outer layer
        // of a nested marker and stays as it is.
        const inner = text.indexOf(MARKER_OPEN, at + MARKER_OPEN.length);
        if (inner !== -1 && !text.slice(at, inner).includes("}}")) {
          cursor = inner;
          continue;
        }
        throw malformed();
      }
      const [whole, patternName, ciphertext] = marker;
      const pattern = PATTERNS.get(patternName);
      if (!pattern) throw malformed();
      markers.push({
        start: at,
        end: at + whole.length,
        pattern,
        ciphertext,
        body: ciphertext.slice(leadOf(pattern).length),
      });
      cursor = at + whole.length;
    }
    if (cipherWorkMs(markers) > MAX_CIPHER_WORK_MS) throw tooMany();

    return replaceRanges(text, markers, (marker, i) => {
      try {
        return this.#encryptor.decryptToken(
          marker.ciphertext,
          marker.pattern.name,
        );
      } catch {
        throw new MarkerError(
          `Undecryptable encrypted value in ${location}, marker ${i + 1}`,
        );
      }
    });
  }

  destroy() {
    this.#encryptor.destroy();
  }
}
