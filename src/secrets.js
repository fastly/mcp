import { hkdfSync, randomBytes } from "node:crypto";
import {
  BUILTIN_PATTERNS,
  scan,
  TokenEncryptor,
  TokenError,
} from "fast-cipher/tokens";
import { setKey } from "./serializer.js";

/** What a caller gets instead of a result that could not be encrypted. */
export const WITHHELD =
  "The result was withheld because a secret in it could not be encrypted, or because it already contained text that looks like an encrypted value ({ENCRYPTED:...}). Return less data, or leave that value out of the result.";

/** Every encrypted value starts with this and ends at the next `}`. */
export const WRAPPER_OPENER = "{ENCRYPTED:";
const MAX_TOKEN_LENGTH = 512;
// Keeps encrypting one remote result under about 300 ms.
const REMOTE_OUTPUT_BUDGET = 100_000;
// Keeps decrypting one remote request under about 100 ms.
// Decryption runs before any limit on the request applies, so it gets less time than encryption.
const REMOTE_INPUT_BUDGET = 38_000;
const REMOTE_KEY_SALT = "@fastly/mcp/remote-secrets/v1";
const REMOTE_KEY_INFO = "fast-cipher/tokens";

/**
 * An encrypted value in a tool argument could not be decrypted.
 * The message names where it was, never what it contained.
 */
export class MarkerError extends Error {
  hint =
    "Encrypted values only decrypt with the key that produced them, and must be copied whole. Retrieve the original value again.";
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

/**
 * Replaces secrets with `{ENCRYPTED:...}` values, and turns those values back into secrets.
 *
 * A value that was changed, cut short or made with another key fails to decrypt, instead of turning into a wrong secret.
 * A valid value can still be copied, moved or dropped without anyone noticing.
 *
 * A local server uses one shield for the whole session.
 * A remote server makes one per tool call with `forCaller()`, from the caller's token, so every copy of the server can decrypt what another one encrypted.
 */
export class SecretShield {
  #encryptor;
  #options;
  #outputBudget;
  #inputBudget;
  #destroyed = false;

  constructor({
    key,
    tweak,
    outputBudget = Infinity,
    inputBudget = Infinity,
  } = {}) {
    // The library keeps its own copy, so ours can be wiped right away.
    const ownKey = key ?? randomBytes(16);
    this.#encryptor = new TokenEncryptor(ownKey);
    if (!key) ownKey.fill(0);
    this.#options = { tweak, maxTokenLength: MAX_TOKEN_LENGTH };
    this.#outputBudget = outputBudget;
    this.#inputBudget = inputBudget;
  }

  static forCaller(apiToken) {
    const key = deriveRemoteKey(apiToken);
    try {
      return new SecretShield({
        key,
        outputBudget: REMOTE_OUTPUT_BUDGET,
        inputBudget: REMOTE_INPUT_BUDGET,
      });
    } finally {
      key.fill(0);
    }
  }

  #assertAlive() {
    if (this.#destroyed) throw new Error("SecretShield has been destroyed");
  }

  /** Throws when the text can't be encrypted safely, and the caller then withholds the result. */
  encrypt(text) {
    this.#assertAlive();
    if (typeof text !== "string" || text.length === 0) return text;
    if (this.#outputBudget !== Infinity) {
      for (const { start, end } of scan(text, BUILTIN_PATTERNS)) {
        this.#outputBudget -= end - start;
      }
      if (this.#outputBudget < 0) {
        throw new Error("Too many secrets in one result to encrypt safely");
      }
    }
    return this.#encryptor.encryptWrapped(text, this.#options);
  }

  decrypt(text, location = "input") {
    this.#assertAlive();
    if (typeof text !== "string" || !text.includes(WRAPPER_OPENER)) return text;
    if (this.#inputBudget !== Infinity) this.#charge(text, location);
    try {
      return this.#encryptor.decryptWrapped(text, this.#options);
    } catch (error) {
      if (!(error instanceof TokenError)) throw error;
      throw new MarkerError(`${error.message} in ${location}`);
    }
  }

  // Decryption can't be stopped once it starts, so its whole cost is counted first.
  #charge(text, location) {
    let close = -1;
    for (
      let at = text.indexOf(WRAPPER_OPENER);
      at !== -1;
      at = text.indexOf(WRAPPER_OPENER, at + WRAPPER_OPENER.length)
    ) {
      if (close < at) {
        close = text.indexOf("}", at);
        if (close === -1) close = text.length;
      }
      this.#inputBudget -= Math.min(close + 1, text.length) - at;
      if (this.#inputBudget < 0) {
        throw new MarkerError(`Too many encrypted values in ${location}`);
      }
    }
  }

  destroy() {
    this.#destroyed = true;
    this.#encryptor.destroy();
  }
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
      setKey(out, protectedKey, walk(item));
    }
    return out;
  };
  return walk(value);
}
