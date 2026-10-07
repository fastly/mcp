import { createHmac, randomBytes } from "node:crypto";
import { rawHeaderValues } from "./client-address.js";
import {
  checkFastlyKey,
  lookUpIdentity,
  RemoteAuthError,
  VALIDATION_CACHE_LABEL,
  VALIDATION_CACHE_TTL_MS,
  VALIDATION_TIMEOUT_MS,
} from "./fastly-identity.js";

export function readFastlyKey(rawHeaders) {
  return checkFastlyKey(rawHeaderValues(rawHeaders, "fastly-key"));
}

function raceAbort(promise, signal) {
  if (!signal) return promise;
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(resolve, reject).finally(() => {
      signal.removeEventListener("abort", onAbort);
    });
  });
}

export const DEFAULT_VALIDATION_LIMITS = Object.freeze({
  maxCacheEntries: 10_000,
  maxConcurrent: 16,
  maxQueued: 64,
});

/**
 * Validates Fastly-Key values against the Fastly API, behind a small cache
 * of successful lookups.
 *
 * The cache never holds a credential: entries are keyed by a keyed hash
 * under a secret that lives only in this process.
 * `fetch`, `now` and `wallClock` exist for tests; nothing a caller sends can
 * change where validation requests go.
 */
export function createTokenValidator({
  fetch: fetchImpl = globalThis.fetch,
  now = () => performance.now(),
  wallClock = () => Date.now(),
  limits = DEFAULT_VALIDATION_LIMITS,
} = {}) {
  // Each upstream request gets its own deadline, so a hanging API cannot hold a validation slot for long.
  const timedFetch = (url, init) =>
    fetchImpl(url, {
      ...init,
      signal: AbortSignal.timeout(VALIDATION_TIMEOUT_MS),
    });
  const cacheKey = randomBytes(32);
  const cache = new Map();
  const inFlight = new Map();
  const waiting = [];
  let running = 0;

  function fingerprint(token) {
    return createHmac("sha256", cacheKey)
      .update(VALIDATION_CACHE_LABEL)
      .update("\0")
      .update(token, "utf8")
      .digest("hex");
  }

  function fresh(print) {
    const entry = cache.get(print);
    if (!entry) return undefined;
    if (now() < entry.freshUntil && wallClock() < entry.identity.expiresAt) {
      return entry.identity;
    }
    cache.delete(print);
    return undefined;
  }

  function remember(print, identity) {
    const lifetime = Math.min(
      VALIDATION_CACHE_TTL_MS,
      identity.expiresAt - wallClock(),
    );
    if (lifetime <= 0) return;
    while (cache.size >= limits.maxCacheEntries) {
      cache.delete(cache.keys().next().value);
    }
    cache.set(print, { identity, freshUntil: now() + lifetime });
  }

  async function withSlot(task) {
    if (running >= limits.maxConcurrent) {
      if (waiting.length >= limits.maxQueued) {
        throw new RemoteAuthError(
          429,
          "validation_queue_full",
          "Too many token validations are pending. Try again shortly.",
          { retryAfter: 1 },
        );
      }
      await new Promise((resolve) => waiting.push(resolve));
    } else {
      running++;
    }
    try {
      return await task();
    } finally {
      const next = waiting.shift();
      if (next) next();
      else running--;
    }
  }

  return {
    get cacheSize() {
      return cache.size;
    },

    clear() {
      cache.clear();
    },

    /** Drop a cached admission after Fastly itself rejected the credential. */
    evict(token) {
      cache.delete(fingerprint(token));
    },

    /**
     * Resolves with `{ identity, cache }`, where `cache` is "hit", "miss" or
     * "coalesced".
     * `admitMiss` runs before any upstream request and may throw to refuse it.
     * Aborting `signal` releases this caller only; a shared lookup keeps going
     * for whoever else waits on it.
     */
    async validate(token, { signal, admitMiss } = {}) {
      signal?.throwIfAborted();
      const print = fingerprint(token);
      const cached = fresh(print);
      if (cached) return { identity: cached, cache: "hit" };

      let shared = inFlight.get(print);
      const outcome = shared ? "coalesced" : "miss";
      if (!shared) {
        admitMiss?.();
        shared = withSlot(() => lookUpIdentity(timedFetch, token, wallClock))
          .then((identity) => {
            remember(print, Object.freeze(identity));
            return identity;
          })
          .finally(() => inFlight.delete(print));
        shared.catch(() => {});
        inFlight.set(print, shared);
      }
      return { identity: await raceAbort(shared, signal), cache: outcome };
    },
  };
}
