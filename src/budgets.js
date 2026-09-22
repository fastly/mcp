const MAX_RETRY_SECONDS = 60;

/** Token bucket on a caller-supplied monotonic clock, in milliseconds. */
export class TokenBucket {
  #capacity;
  #refillPerMs;
  #tokens;
  #updatedAt;

  constructor({ capacity, refillPerSecond }, now) {
    this.#capacity = capacity;
    this.#refillPerMs = refillPerSecond / 1000;
    this.#tokens = capacity;
    this.#updatedAt = now;
  }

  #refill(now) {
    const elapsed = Math.max(0, now - this.#updatedAt);
    this.#tokens = Math.min(
      this.#capacity,
      this.#tokens + elapsed * this.#refillPerMs,
    );
    this.#updatedAt = Math.max(this.#updatedAt, now);
  }

  has(count, now) {
    this.#refill(now);
    return this.#tokens >= count;
  }

  take(count, now) {
    if (!this.has(count, now)) return false;
    this.#tokens -= count;
    return true;
  }

  /** Spend even when the bucket cannot cover it; used to record failures. */
  drain(count, now) {
    this.#refill(now);
    this.#tokens = Math.max(0, this.#tokens - count);
  }

  isFull(now) {
    this.#refill(now);
    return this.#tokens >= this.#capacity;
  }

  retryAfterSeconds(count, now) {
    this.#refill(now);
    const missing = Math.max(0, count - this.#tokens);
    const seconds = Math.ceil(missing / this.#refillPerMs / 1000);
    return Math.min(MAX_RETRY_SECONDS, Math.max(1, seconds));
  }
}

const SWEEP_STEP = 64;

/**
 * One bucket per key, with a hard cap on how many keys are remembered.
 *
 * Only idle buckets are dropped, so flooding the table cannot reset an
 * exhausted budget.
 * A full table is swept a few entries at a time, so a flood cannot make
 * every later request pay for a whole scan.
 * Once every remembered key is active, newcomers share one overflow bucket.
 */
export class KeyedBuckets {
  #shape;
  #maxKeys;
  #buckets = new Map();
  #overflow;
  #sweep;

  constructor(shape, { maxKeys }, now) {
    this.#shape = shape;
    this.#maxKeys = maxKeys;
    this.#overflow = new TokenBucket(shape, now);
  }

  get size() {
    return this.#buckets.size;
  }

  #dropIdle(now) {
    this.#sweep ??= this.#buckets.entries();
    for (let i = 0; i < SWEEP_STEP; i++) {
      const { value, done } = this.#sweep.next();
      if (done) {
        this.#sweep = undefined;
        return;
      }
      const [name, bucket] = value;
      if (bucket.isFull(now)) this.#buckets.delete(name);
    }
  }

  bucket(key, now) {
    const existing = this.#buckets.get(key);
    if (existing) return existing;
    if (this.#buckets.size >= this.#maxKeys) this.#dropIdle(now);
    if (this.#buckets.size >= this.#maxKeys) return this.#overflow;
    const bucket = new TokenBucket(this.#shape, now);
    this.#buckets.set(key, bucket);
    return bucket;
  }
}

export const DEFAULT_PREVALIDATION_LIMITS = Object.freeze({
  requestsPerSource: { capacity: 60, refillPerSecond: 20 },
  requestsGlobal: { capacity: 600, refillPerSecond: 200 },
  validationsPerSource: { capacity: 10, refillPerSecond: 10 / 60 },
  validationsGlobal: { capacity: 120, refillPerSecond: 2 },
  failuresPerSource: { capacity: 5, refillPerSecond: 5 / 60 },
  maxSources: 50_000,
});

function rejection(bucket, now) {
  return { ok: false, retryAfter: bucket.retryAfterSeconds(1, now) };
}

/**
 * Budgets that apply before a Fastly-Key has been validated.
 *
 * Everything here is keyed by the source address, never by the presented key,
 * so a flood of different random keys draws on one allowance.
 */
export function createPrevalidationBudgets({
  limits = DEFAULT_PREVALIDATION_LIMITS,
  now = () => performance.now(),
} = {}) {
  const start = now();
  const keyed = (shape) =>
    new KeyedBuckets(shape, { maxKeys: limits.maxSources }, start);
  const requests = keyed(limits.requestsPerSource);
  const validations = keyed(limits.validationsPerSource);
  const failures = keyed(limits.failuresPerSource);
  const requestsGlobal = new TokenBucket(limits.requestsGlobal, start);
  const validationsGlobal = new TokenBucket(limits.validationsGlobal, start);

  return {
    admitRequest(source) {
      const at = now();
      const own = requests.bucket(source, at);
      if (!own.take(1, at)) return rejection(own, at);
      if (!requestsGlobal.take(1, at)) return rejection(requestsGlobal, at);
      return { ok: true };
    },

    /** Called on a validation cache miss, before anything is sent upstream. */
    admitValidation(source) {
      const at = now();
      const failed = failures.bucket(source, at);
      if (!failed.has(1, at)) return rejection(failed, at);
      const own = validations.bucket(source, at);
      if (!own.has(1, at)) return rejection(own, at);
      if (!validationsGlobal.take(1, at)) {
        return rejection(validationsGlobal, at);
      }
      own.take(1, at);
      return { ok: true };
    },

    recordFailure(source) {
      const at = now();
      failures.bucket(source, at).drain(1, at);
    },
  };
}
