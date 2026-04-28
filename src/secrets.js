import { randomBytes } from "node:crypto";
import { TokenEncryptor } from "fast-cipher/tokens";

export class SecretShield {
  #encryptor;
  #registry = new Map();
  #tweak;
  #destroyed = false;

  constructor({ key, tweak, extraPatterns } = {}) {
    this.#encryptor = new TokenEncryptor(key ?? randomBytes(16));
    this.#tweak = tweak;
    if (extraPatterns) {
      for (const p of extraPatterns) {
        this.#encryptor.register(p);
      }
    }
  }

  encrypt(text) {
    if (this.#destroyed) throw new Error("SecretShield has been destroyed");
    if (typeof text !== "string" || text.length === 0) return text;

    const { text: encrypted, spans } = this.#encryptor.encryptWithSpans(text, {
      tweak: this.#tweak,
    });
    for (const span of spans) {
      this.#registry.set(span.encrypted, span.original);
    }
    return encrypted;
  }

  decrypt(text) {
    if (this.#destroyed) throw new Error("SecretShield has been destroyed");
    if (typeof text !== "string" || text.length === 0) return text;

    let result = text;
    for (const [ct, pt] of this.#registry) {
      result = result.replaceAll(ct, pt);
    }
    return result;
  }

  destroy() {
    this.#encryptor.destroy();
    this.#registry.clear();
    this.#destroyed = true;
  }
}
