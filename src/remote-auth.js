import { createHmac, randomBytes } from "node:crypto";
import { rawHeaderValues } from "./client-address.js";

const TOKEN_SELF_URL = "https://api.fastly.com/tokens/self";
const CURRENT_CUSTOMER_URL = "https://api.fastly.com/current_customer";
const UPSTREAM_TIMEOUT_MS = 5000;
const MAX_UPSTREAM_BODY_BYTES = 64 * 1024;
const MAX_KEY_LENGTH = 4096;
const CACHE_TTL_MS = 60_000;
const CACHE_LABEL = "@fastly/mcp/validation-cache/v1";
const MAX_RETRY_AFTER_SECONDS = 300;
const IDENTIFIER = /^[A-Za-z0-9_-]{1,128}$/;
const VISIBLE_ASCII = /^[\x21-\x7e]+$/;

export const KEY_HINT =
  "Update the Fastly-Key header in your MCP client configuration with a valid Fastly API token.";

/**
 * A request that cannot be admitted.
 * `status` is the HTTP status to answer with and `category` a fixed label
 * that is safe to log; the message never quotes the credential or Fastly.
 */
export class RemoteAuthError extends Error {
  constructor(status, category, message, { retryAfter } = {}) {
    super(message);
    this.status = status;
    this.category = category;
    this.retryAfter = retryAfter;
  }
}

export function readFastlyKey(rawHeaders) {
  const values = rawHeaderValues(rawHeaders, "fastly-key");
  if (values.length === 0 || values[0] === "") {
    throw new RemoteAuthError(
      401,
      "key_missing",
      `A Fastly-Key header is required. ${KEY_HINT}`,
    );
  }
  if (values.length > 1) {
    throw new RemoteAuthError(
      400,
      "key_duplicated",
      "Send exactly one Fastly-Key header.",
    );
  }
  const [key] = values;
  if (key.length > MAX_KEY_LENGTH) {
    throw new RemoteAuthError(
      400,
      "key_too_long",
      "The Fastly-Key header is too long.",
    );
  }
  if (key.includes(",") || !VISIBLE_ASCII.test(key)) {
    throw new RemoteAuthError(
      400,
      "key_malformed",
      "The Fastly-Key header must hold a single token, without spaces, commas or control characters.",
    );
  }
  return key;
}

function retryAfterOf(response) {
  const seconds = Number(response.headers.get("retry-after"));
  if (!Number.isInteger(seconds) || seconds < 1) return undefined;
  return Math.min(seconds, MAX_RETRY_AFTER_SECONDS);
}

async function readBoundedJson(response) {
  const chunks = [];
  let total = 0;
  for await (const chunk of response.body ?? []) {
    total += chunk.length;
    if (total > MAX_UPSTREAM_BODY_BYTES) {
      throw new Error("upstream body too large");
    }
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function unavailable() {
  return new RemoteAuthError(
    503,
    "validation_unavailable",
    "The Fastly API could not be reached to validate the Fastly-Key header. Try again shortly.",
  );
}

async function fetchJson(fetchImpl, url, token) {
  let response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      headers: { "Fastly-Key": token, Accept: "application/json" },
      redirect: "manual",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    throw unavailable();
  }
  if (response.status === 200) {
    try {
      return { status: 200, body: await readBoundedJson(response) };
    } catch {
      throw unavailable();
    }
  }
  await response.body?.cancel?.().catch(() => {});
  if (response.status === 429) {
    throw new RemoteAuthError(
      429,
      "validation_rate_limited",
      "Fastly is rate limiting token validation. Try again later.",
      { retryAfter: retryAfterOf(response) ?? 60 },
    );
  }
  if (response.status === 401 || response.status === 403) {
    return { status: response.status };
  }
  throw unavailable();
}

function expirationOf(value) {
  if (value === null || value === undefined) return Number.POSITIVE_INFINITY;
  const parsed = typeof value === "string" ? Date.parse(value) : Number.NaN;
  if (Number.isNaN(parsed)) throw unavailable();
  return parsed;
}

async function lookUpIdentity(fetchImpl, token, wallClock) {
  const self = await fetchJson(fetchImpl, TOKEN_SELF_URL, token);
  if (self.status !== 200) {
    throw new RemoteAuthError(
      401,
      "key_rejected",
      `Fastly rejected the API token. ${KEY_HINT}`,
    );
  }
  const { id, customer_id: customerId, expires_at: expiry } = self.body ?? {};
  if (typeof id !== "string" || !IDENTIFIER.test(id)) throw unavailable();
  const expiresAt = expirationOf(expiry);
  if (expiresAt <= wallClock()) {
    throw new RemoteAuthError(
      401,
      "key_expired",
      `The Fastly API token has expired. ${KEY_HINT}`,
    );
  }

  const identity = { tokenId: id, customerId: null, expiresAt };
  if (typeof customerId === "string" && IDENTIFIER.test(customerId)) {
    identity.customerId = customerId;
    return identity;
  }
  // Some token types cannot read their account.
  // They stay valid for discovery; execution is refused later for lack of a
  // customer to charge.
  const customer = await fetchJson(fetchImpl, CURRENT_CUSTOMER_URL, token);
  const fallbackId = customer.body?.id;
  if (typeof fallbackId === "string" && IDENTIFIER.test(fallbackId)) {
    identity.customerId = fallbackId;
  } else if (customer.status === 200) {
    throw unavailable();
  }
  return identity;
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
  const cacheKey = randomBytes(32);
  const cache = new Map();
  const inFlight = new Map();
  const waiting = [];
  let running = 0;

  function fingerprint(token) {
    return createHmac("sha256", cacheKey)
      .update(CACHE_LABEL)
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
    const lifetime = Math.min(CACHE_TTL_MS, identity.expiresAt - wallClock());
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
        shared = withSlot(() => lookUpIdentity(fetchImpl, token, wallClock))
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
