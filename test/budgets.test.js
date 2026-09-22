import { describe, expect, test } from "bun:test";
import {
  createPrevalidationBudgets,
  DEFAULT_PREVALIDATION_LIMITS,
  KeyedBuckets,
  TokenBucket,
} from "../src/budgets.js";

function fakeClock(start = 1000) {
  let at = start;
  return {
    now: () => at,
    advance: (ms) => {
      at += ms;
    },
  };
}

function takeAll(bucket, now) {
  let taken = 0;
  while (bucket.take(1, now)) taken++;
  return taken;
}

describe("TokenBucket", () => {
  test("starts full and refuses once empty", () => {
    const bucket = new TokenBucket({ capacity: 3, refillPerSecond: 1 }, 0);
    expect(takeAll(bucket, 0)).toBe(3);
    expect(bucket.take(1, 0)).toBe(false);
    expect(bucket.has(1, 0)).toBe(false);
  });

  test("refills in proportion to the elapsed time", () => {
    const bucket = new TokenBucket({ capacity: 10, refillPerSecond: 2 }, 0);
    expect(takeAll(bucket, 0)).toBe(10);
    expect(bucket.take(1, 499)).toBe(false);
    expect(bucket.take(1, 500)).toBe(true);
    expect(bucket.take(1, 500)).toBe(false);
    expect(bucket.has(3, 1999)).toBe(false);
    expect(bucket.take(3, 2000)).toBe(true);
    expect(bucket.take(1, 2000)).toBe(false);
  });

  test("a refused take spends nothing", () => {
    const bucket = new TokenBucket({ capacity: 4, refillPerSecond: 1 }, 0);
    expect(bucket.take(5, 0)).toBe(false);
    expect(bucket.take(4, 0)).toBe(true);
  });

  test("never holds more than its capacity", () => {
    const bucket = new TokenBucket({ capacity: 5, refillPerSecond: 100 }, 0);
    expect(bucket.has(6, 3_600_000)).toBe(false);
    expect(takeAll(bucket, 3_600_000)).toBe(5);
    expect(bucket.isFull(3_600_000)).toBe(false);
    expect(bucket.isFull(3_600_050)).toBe(true);
  });

  test("a clock that steps backwards mints nothing, even once it recovers", () => {
    const bucket = new TokenBucket({ capacity: 2, refillPerSecond: 1 }, 5000);
    expect(takeAll(bucket, 5000)).toBe(2);
    expect(bucket.take(1, 1000)).toBe(false);
    expect(bucket.take(1, 5000)).toBe(false);
    expect(bucket.take(1, 6000)).toBe(true);
  });

  test("drain records a spend even past empty, without going negative", () => {
    const bucket = new TokenBucket({ capacity: 2, refillPerSecond: 1 }, 0);
    bucket.drain(1, 0);
    expect(bucket.isFull(0)).toBe(false);
    bucket.drain(10, 0);
    expect(bucket.has(1, 0)).toBe(false);
    expect(bucket.take(1, 1000)).toBe(true);
  });

  test("retryAfterSeconds is the time to the next token, rounded up", () => {
    const bucket = new TokenBucket({ capacity: 4, refillPerSecond: 0.1 }, 0);
    takeAll(bucket, 0);
    expect(bucket.retryAfterSeconds(1, 0)).toBe(10);
    expect(bucket.retryAfterSeconds(3, 0)).toBe(30);
    expect(bucket.retryAfterSeconds(1, 500)).toBe(10);
    expect(bucket.retryAfterSeconds(1, 1000)).toBe(9);
    expect(bucket.retryAfterSeconds(1, 10_000)).toBe(1);
  });

  test("retryAfterSeconds stays between 1 and 60", () => {
    const slow = new TokenBucket({ capacity: 1, refillPerSecond: 1 / 3600 }, 0);
    takeAll(slow, 0);
    expect(slow.retryAfterSeconds(1, 0)).toBe(60);

    const fast = new TokenBucket({ capacity: 1, refillPerSecond: 1000 }, 0);
    expect(fast.retryAfterSeconds(1, 0)).toBe(1);
    takeAll(fast, 0);
    expect(fast.retryAfterSeconds(1, 0)).toBe(1);
  });
});

describe("KeyedBuckets", () => {
  const shape = { capacity: 2, refillPerSecond: 1 };

  test("each key gets its own bucket and keeps it", () => {
    const table = new KeyedBuckets(shape, { maxKeys: 10 }, 0);
    const a = table.bucket("a", 0);
    expect(table.bucket("a", 0)).toBe(a);
    expect(table.bucket("b", 0)).not.toBe(a);
    expect(table.size).toBe(2);

    expect(takeAll(a, 0)).toBe(2);
    expect(table.bucket("b", 0).take(1, 0)).toBe(true);
  });

  test("a full table of active keys never evicts and shares one overflow", () => {
    const table = new KeyedBuckets(shape, { maxKeys: 2 }, 0);
    const a = table.bucket("a", 0);
    const b = table.bucket("b", 0);
    takeAll(a, 0);
    b.take(1, 0);

    const c = table.bucket("c", 0);
    const d = table.bucket("d", 0);
    expect(c).toBe(d);
    expect(c).not.toBe(a);
    expect(c).not.toBe(b);
    expect(table.size).toBe(2);

    expect(table.bucket("a", 0)).toBe(a);
    expect(a.take(1, 0)).toBe(false);
    expect(table.bucket("b", 0)).toBe(b);

    expect(takeAll(c, 0)).toBe(2);
    expect(table.bucket("e", 0).take(1, 0)).toBe(false);
  });

  test("idle buckets are evicted to make room", () => {
    const table = new KeyedBuckets(shape, { maxKeys: 2 }, 0);
    const a = table.bucket("a", 0);
    const b = table.bucket("b", 0);
    takeAll(a, 0);
    takeAll(b, 0);

    // Two seconds refill both completely, so both count as idle.
    const c = table.bucket("c", 2000);
    expect(c.take(2, 2000)).toBe(true);
    expect(table.size).toBe(1);
    expect(table.bucket("a", 2000)).not.toBe(a);
  });

  test("only the idle buckets go, a partly refilled one stays", () => {
    const table = new KeyedBuckets(shape, { maxKeys: 2 }, 0);
    const idle = table.bucket("idle", 0);
    const busy = table.bucket("busy", 0);
    takeAll(busy, 0);

    const fresh = table.bucket("fresh", 1000);
    expect(fresh).not.toBe(idle);
    expect(fresh).not.toBe(busy);
    expect(table.size).toBe(2);
    expect(table.bucket("busy", 1000)).toBe(busy);
    expect(busy.take(2, 1000)).toBe(false);
  });
});

describe("createPrevalidationBudgets", () => {
  const limits = {
    requestsPerSource: { capacity: 3, refillPerSecond: 1 },
    requestsGlobal: { capacity: 5, refillPerSecond: 1 },
    validationsPerSource: { capacity: 2, refillPerSecond: 0.001 },
    validationsGlobal: { capacity: 4, refillPerSecond: 1 },
    failuresPerSource: { capacity: 2, refillPerSecond: 0.1 },
    maxSources: 1000,
  };

  function admitted(count, admit) {
    let ok = 0;
    for (let i = 0; i < count; i++) if (admit(i).ok) ok++;
    return ok;
  }

  function budgetsWith(overrides = {}) {
    const clock = fakeClock();
    const budgets = createPrevalidationBudgets({
      limits: { ...limits, ...overrides },
      now: clock.now,
    });
    return { budgets, clock };
  }

  test("the defaults are usable as they are", () => {
    const budgets = createPrevalidationBudgets();
    expect(budgets.admitRequest("192.0.2.1")).toEqual({ ok: true });
    expect(budgets.admitValidation("192.0.2.1")).toEqual({ ok: true });
    expect(Object.isFrozen(DEFAULT_PREVALIDATION_LIMITS)).toBe(true);
  });

  test("one source is held to its own request limit", () => {
    const { budgets } = budgetsWith();
    expect(admitted(10, () => budgets.admitRequest("192.0.2.1"))).toBe(3);
    expect(budgets.admitRequest("192.0.2.1")).toEqual({
      ok: false,
      retryAfter: 1,
    });
    expect(budgets.admitRequest("192.0.2.2")).toEqual({ ok: true });
  });

  test("all sources together are held to the global request limit", () => {
    const { budgets, clock } = budgetsWith();
    expect(admitted(100, (i) => budgets.admitRequest(`192.0.2.${i}`))).toBe(5);
    expect(budgets.admitRequest("198.51.100.1")).toEqual({
      ok: false,
      retryAfter: 1,
    });

    clock.advance(2000);
    expect(admitted(100, (i) => budgets.admitRequest(`203.0.113.${i}`))).toBe(
      2,
    );
  });

  test("a flood of different sources cannot exceed the validation budget", () => {
    const { budgets } = budgetsWith();
    expect(
      admitted(500, (i) => budgets.admitValidation(`2001:db8:0:${i}::/64`)),
    ).toBe(4);
    const refused = budgets.admitValidation("192.0.2.1");
    expect(refused.ok).toBe(false);
    expect(refused.retryAfter).toBeGreaterThanOrEqual(1);
    expect(refused.retryAfter).toBeLessThanOrEqual(60);
  });

  test("one source is held to its own validation limit", () => {
    const { budgets } = budgetsWith();
    expect(admitted(10, () => budgets.admitValidation("192.0.2.1"))).toBe(2);
    expect(budgets.admitValidation("192.0.2.1")).toEqual({
      ok: false,
      retryAfter: 60,
    });
    expect(budgets.admitValidation("192.0.2.2")).toEqual({ ok: true });
  });

  test("a global refusal does not charge the source's own allowance", () => {
    const { budgets, clock } = budgetsWith();
    expect(admitted(4, (i) => budgets.admitValidation(`192.0.2.${i}`))).toBe(4);
    expect(admitted(10, () => budgets.admitValidation("198.51.100.1"))).toBe(0);

    // The per-source bucket barely refills in two seconds, so getting two
    // through proves the ten refusals above cost this source nothing.
    clock.advance(2000);
    expect(admitted(10, () => budgets.admitValidation("198.51.100.1"))).toBe(2);
  });

  test("repeated failures block a source while the others proceed", () => {
    const { budgets } = budgetsWith();
    expect(budgets.admitValidation("192.0.2.1")).toEqual({ ok: true });
    budgets.recordFailure("192.0.2.1");
    budgets.recordFailure("192.0.2.1");

    expect(budgets.admitValidation("192.0.2.1")).toEqual({
      ok: false,
      retryAfter: 10,
    });
    expect(budgets.admitValidation("192.0.2.2")).toEqual({ ok: true });
    expect(budgets.admitRequest("192.0.2.1")).toEqual({ ok: true });

    for (let i = 0; i < 50; i++) budgets.recordFailure("192.0.2.1");
    expect(budgets.admitValidation("192.0.2.1").retryAfter).toBe(10);
  });

  test("a blocked source does not consume the global validation budget", () => {
    const { budgets } = budgetsWith();
    budgets.recordFailure("192.0.2.1");
    budgets.recordFailure("192.0.2.1");
    expect(admitted(50, () => budgets.admitValidation("192.0.2.1"))).toBe(0);
    expect(admitted(50, (i) => budgets.admitValidation(`203.0.113.${i}`))).toBe(
      4,
    );
  });

  test("the failure budget refills and service resumes", () => {
    const { budgets, clock } = budgetsWith();
    budgets.recordFailure("192.0.2.1");
    budgets.recordFailure("192.0.2.1");
    expect(budgets.admitValidation("192.0.2.1").ok).toBe(false);

    clock.advance(9000);
    expect(budgets.admitValidation("192.0.2.1")).toEqual({
      ok: false,
      retryAfter: 1,
    });
    clock.advance(1000);
    expect(budgets.admitValidation("192.0.2.1")).toEqual({ ok: true });
  });

  test("new sources share one allowance once the table is full of active ones", () => {
    const { budgets } = budgetsWith({
      requestsGlobal: { capacity: 1000, refillPerSecond: 1 },
      maxSources: 2,
    });
    expect(admitted(3, () => budgets.admitRequest("192.0.2.1"))).toBe(3);
    expect(admitted(3, () => budgets.admitRequest("192.0.2.2"))).toBe(3);
    expect(admitted(100, (i) => budgets.admitRequest(`203.0.113.${i}`))).toBe(
      3,
    );
    expect(budgets.admitRequest("192.0.2.1").ok).toBe(false);
  });
});
