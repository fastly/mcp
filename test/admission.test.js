import { describe, expect, test } from "bun:test";
import { setImmediate as settle } from "node:timers/promises";
import {
  AdmissionError,
  createAdmission,
  DEFAULT_ADMISSION_LIMITS,
} from "../src/admission.js";

const ROOMY = {
  maxRunning: 100,
  maxRunningPerCustomer: 100,
  maxRunningPerToken: 100,
  maxQueued: 100,
  maxQueuedPerCustomer: 100,
  maxQueuedPerToken: 100,
  maxQueueWaitMs: 10_000,
};

function fakeTimers() {
  const timers = new Map();
  let nextId = 1;
  return {
    setTimer(callback, delay) {
      const id = nextId++;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimer(id) {
      timers.delete(id);
    },
    get pending() {
      return timers.size;
    },
    delays: () => [...timers.values()].map((timer) => timer.delay),
    fireOldest() {
      const [id, timer] = timers.entries().next().value;
      timers.delete(id);
      timer.callback();
    },
  };
}

// An admission controller plus a record of who got in, in what order.
function harness(overrides = {}) {
  const timers = fakeTimers();
  const admission = createAdmission({
    limits: { ...ROOMY, ...overrides },
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer,
  });
  const started = [];
  const entries = [];

  function request(customerId, tokenId, signal) {
    const entry = { label: `${customerId}/${tokenId}` };
    entries.push(entry);
    entry.settled = admission.acquire({ customerId, tokenId, signal }).then(
      (release) => {
        entry.release = release;
        started.push(entry.label);
      },
      (error) => {
        entry.error = error;
      },
    );
    return entry;
  }

  // Finishes executions one at a time, oldest first, until nothing is left.
  async function drain() {
    for (;;) {
      await settle();
      const running = entries.find((entry) => entry.release && !entry.done);
      if (!running) return;
      running.done = true;
      running.release();
    }
  }

  return { admission, timers, started, request, drain };
}

function expectIdle(admission) {
  expect({
    running: admission.running,
    queued: admission.queued,
    trackedCustomers: admission.trackedCustomers,
  }).toEqual({ running: 0, queued: 0, trackedCustomers: 0 });
}

describe("admission ceilings", () => {
  test("the defaults admit a first execution at once", async () => {
    const admission = createAdmission();
    const release = await admission.acquire({
      customerId: "customerA",
      tokenId: "tokenA1",
    });
    expect(admission.running).toBe(1);
    release();
    expectIdle(admission);
    expect(Object.isFrozen(DEFAULT_ADMISSION_LIMITS)).toBe(true);
  });

  test("the global ceiling holds across customers", async () => {
    const { admission, started, request } = harness({ maxRunning: 2 });
    const a = request("customerA", "tokenA1");
    const b = request("customerB", "tokenB1");
    const c = request("customerC", "tokenC1");
    await settle();
    expect(started).toEqual(["customerA/tokenA1", "customerB/tokenB1"]);
    expect(admission.running).toBe(2);
    expect(admission.queued).toBe(1);

    a.release();
    await settle();
    expect(started).toEqual([
      "customerA/tokenA1",
      "customerB/tokenB1",
      "customerC/tokenC1",
    ]);
    expect(admission.running).toBe(2);

    b.release();
    c.release();
    expectIdle(admission);
  });

  test("the per-token ceiling holds while a sibling token proceeds", async () => {
    const { admission, started, request } = harness({ maxRunningPerToken: 1 });
    const first = request("customerA", "tokenA1");
    const second = request("customerA", "tokenA1");
    const sibling = request("customerA", "tokenA2");
    await settle();
    expect(started).toEqual(["customerA/tokenA1", "customerA/tokenA2"]);
    expect(admission.queued).toBe(1);

    first.release();
    await settle();
    expect(started).toHaveLength(3);
    expect(admission.running).toBe(2);

    second.release();
    sibling.release();
    expectIdle(admission);
  });

  test("tokens of one customer share its ceiling while another customer proceeds", async () => {
    const { admission, started, request } = harness({
      maxRunningPerCustomer: 2,
      maxRunningPerToken: 1,
    });
    const entries = [
      request("customerA", "tokenA1"),
      request("customerA", "tokenA2"),
      request("customerA", "tokenA3"),
      request("customerA", "tokenA4"),
      request("customerB", "tokenB1"),
    ];
    await settle();
    expect(started).toEqual([
      "customerA/tokenA1",
      "customerA/tokenA2",
      "customerB/tokenB1",
    ]);
    expect(admission.running).toBe(3);
    expect(admission.queued).toBe(2);

    // Customer B's freed slot must not let customer A past its own cap.
    entries[4].release();
    await settle();
    expect(started).toHaveLength(3);

    entries[0].release();
    await settle();
    expect(started).toEqual([
      "customerA/tokenA1",
      "customerA/tokenA2",
      "customerB/tokenB1",
      "customerA/tokenA3",
    ]);

    entries[1].release();
    await settle();
    entries[2].release();
    entries[3].release();
    expectIdle(admission);
  });
});

describe("admission fairness", () => {
  test("freed slots rotate between customers", async () => {
    const { admission, started, request, drain } = harness({ maxRunning: 1 });
    request("customerX", "tokenX1");
    request("customerA", "tokenA1");
    request("customerA", "tokenA1");
    request("customerA", "tokenA1");
    request("customerB", "tokenB1");
    request("customerC", "tokenC1");
    await settle();
    expect(admission.queued).toBe(5);

    await drain();
    expect(started).toEqual([
      "customerX/tokenX1",
      "customerA/tokenA1",
      "customerB/tokenB1",
      "customerC/tokenC1",
      "customerA/tokenA1",
      "customerA/tokenA1",
    ]);
    expectIdle(admission);
  });

  test("a customer's share rotates between its tokens", async () => {
    const { admission, started, request, drain } = harness({ maxRunning: 1 });
    request("customerA", "holder");
    request("customerA", "tokenA1");
    request("customerA", "tokenA1");
    request("customerA", "tokenA1");
    request("customerA", "tokenA2");
    request("customerA", "tokenA3");

    await drain();
    expect(started).toEqual([
      "customerA/holder",
      "customerA/tokenA1",
      "customerA/tokenA2",
      "customerA/tokenA3",
      "customerA/tokenA1",
      "customerA/tokenA1",
    ]);
    expectIdle(admission);
  });

  test("minting tokens does not buy a customer more turns", async () => {
    const { admission, started, request, drain } = harness({ maxRunning: 1 });
    request("customerX", "tokenX1");
    for (let i = 1; i <= 4; i++) request("customerA", `tokenA${i}`);
    request("customerB", "tokenB1");
    request("customerB", "tokenB1");

    await drain();
    expect(started.map((label) => label.split("/")[0])).toEqual([
      "customerX",
      "customerA",
      "customerB",
      "customerA",
      "customerB",
      "customerA",
      "customerA",
    ]);
    expectIdle(admission);
  });

  test("waiters of one token start in arrival order", async () => {
    const { admission, request, drain } = harness({ maxRunningPerToken: 1 });
    const order = [];
    request("customerA", "tokenA1");
    for (const name of ["first", "second", "third"]) {
      request("customerA", "tokenA1").settled.then(() => order.push(name));
    }

    await drain();
    expect(order).toEqual(["first", "second", "third"]);
    expectIdle(admission);
  });

  test("a waiter blocked by its own ceilings does not block the others", async () => {
    const { admission, started, request } = harness({
      maxRunning: 2,
      maxRunningPerToken: 1,
    });
    const holder = request("customerA", "tokenA1");
    const other = request("customerB", "tokenB1");
    const blocked = request("customerA", "tokenA1");
    const later = request("customerC", "tokenC1");
    await settle();
    expect(admission.queued).toBe(2);

    other.release();
    await settle();
    expect(started).toEqual([
      "customerA/tokenA1",
      "customerB/tokenB1",
      "customerC/tokenC1",
    ]);

    holder.release();
    await settle();
    expect(started).toHaveLength(4);
    blocked.release();
    later.release();
    expectIdle(admission);
  });
});

describe("admission queues", () => {
  test("a full global queue rejects with queue_full", async () => {
    const { admission, started, request, drain } = harness({
      maxRunning: 1,
      maxQueued: 2,
    });
    request("customerX", "tokenX1");
    request("customerA", "tokenA1");
    request("customerB", "tokenB1");
    const refused = request("customerC", "tokenC1");
    await settle();

    expect(refused.error).toBeInstanceOf(AdmissionError);
    expect(refused.error.category).toBe("queue_full");
    expect(admission.queued).toBe(2);
    expect(admission.trackedCustomers).toBe(3);

    await drain();
    expect(started).toHaveLength(3);
    expectIdle(admission);
  });

  test("a full customer queue rejects that customer only", async () => {
    const { admission, started, request, drain } = harness({
      maxRunning: 1,
      maxQueuedPerCustomer: 2,
    });
    request("customerX", "tokenX1");
    request("customerA", "tokenA1");
    request("customerA", "tokenA2");
    const refused = request("customerA", "tokenA3");
    const other = request("customerB", "tokenB1");
    await settle();

    expect(refused.error?.category).toBe("queue_full");
    expect(other.error).toBeUndefined();
    expect(admission.queued).toBe(3);

    await drain();
    expect(started).toHaveLength(4);
    expectIdle(admission);
  });

  test("a full token queue rejects that token only", async () => {
    const { admission, started, request, drain } = harness({
      maxRunning: 1,
      maxQueuedPerToken: 1,
    });
    request("customerA", "tokenA1");
    request("customerA", "tokenA1");
    const refused = request("customerA", "tokenA1");
    const sibling = request("customerA", "tokenA2");
    await settle();

    expect(refused.error?.category).toBe("queue_full");
    expect(refused.error.message).toMatch(/Try again/);
    expect(sibling.error).toBeUndefined();
    expect(admission.queued).toBe(2);

    await drain();
    expect(started).toHaveLength(3);
    expectIdle(admission);
  });

  test("a rejection leaves nothing behind for an unknown customer", async () => {
    const { admission, request } = harness({ maxRunning: 1, maxQueued: 0 });
    const holder = request("customerX", "tokenX1");
    for (let i = 0; i < 50; i++) request(`customer${i}`, `token${i}`);
    await settle();
    expect(admission.trackedCustomers).toBe(1);
    expect(admission.queued).toBe(0);
    holder.release();
    expectIdle(admission);
  });

  test("a waiter that times out is rejected with queue_timeout", async () => {
    const { admission, timers, started, request } = harness({
      maxRunning: 1,
      maxQueueWaitMs: 1234,
    });
    const holder = request("customerX", "tokenX1");
    const slow = request("customerA", "tokenA1");
    const patient = request("customerB", "tokenB1");
    await settle();
    expect(timers.delays()).toEqual([1234, 1234]);

    timers.fireOldest();
    await settle();
    expect(slow.error).toBeInstanceOf(AdmissionError);
    expect(slow.error.category).toBe("queue_timeout");
    expect(admission.queued).toBe(1);
    expect(admission.trackedCustomers).toBe(2);

    holder.release();
    await settle();
    expect(started).toEqual(["customerX/tokenX1", "customerB/tokenB1"]);
    expect(timers.pending).toBe(0);
    patient.release();
    expectIdle(admission);
  });

  test("an admitted execution is never timed out", async () => {
    const pendingCallbacks = [];
    const admission = createAdmission({
      limits: { ...ROOMY, maxRunning: 1 },
      setTimer: (callback) => {
        pendingCallbacks.push(callback);
        return pendingCallbacks.length;
      },
      clearTimer: () => {},
    });
    const holder = await admission.acquire({
      customerId: "customerA",
      tokenId: "tokenA1",
    });
    const waiting = admission.acquire({
      customerId: "customerB",
      tokenId: "tokenB1",
    });
    holder();
    const release = await waiting;

    // This fake ignores clearTimer, so the callback fires late on purpose.
    for (const callback of pendingCallbacks) callback();
    expect(admission.running).toBe(1);
    expect(admission.queued).toBe(0);
    release();
    expectIdle(admission);
  });
});

describe("admission cancellation", () => {
  test("an already aborted signal is refused without any bookkeeping", async () => {
    const { admission, timers, request } = harness();
    const entry = request("customerA", "tokenA1", AbortSignal.abort());
    await settle();
    expect(entry.error).toBeInstanceOf(AdmissionError);
    expect(entry.error.category).toBe("cancelled");
    expect(timers.pending).toBe(0);
    expectIdle(admission);
  });

  test("aborting a queued waiter frees its place and keeps the counts right", async () => {
    const { admission, timers, started, request } = harness({ maxRunning: 1 });
    const controller = new AbortController();
    const holder = request("customerX", "tokenX1");
    const leaving = request("customerA", "tokenA1", controller.signal);
    const staying = request("customerB", "tokenB1");
    await settle();
    expect(admission.queued).toBe(2);

    controller.abort();
    await settle();
    expect(leaving.error).toBeInstanceOf(AdmissionError);
    expect(leaving.error.category).toBe("cancelled");
    expect(admission.queued).toBe(1);
    expect(admission.running).toBe(1);
    expect(admission.trackedCustomers).toBe(2);
    expect(timers.pending).toBe(1);

    holder.release();
    await settle();
    expect(started).toEqual(["customerX/tokenX1", "customerB/tokenB1"]);
    expect(admission.running).toBe(1);
    staying.release();
    expectIdle(admission);
  });

  test("aborting after admission does not give the slot away", async () => {
    const { admission, request } = harness({ maxRunning: 1 });
    const direct = new AbortController();
    const queued = new AbortController();
    const holder = request("customerA", "tokenA1", direct.signal);
    const waiting = request("customerB", "tokenB1", queued.signal);
    await settle();

    direct.abort();
    await settle();
    expect(admission.running).toBe(1);
    expect(admission.queued).toBe(1);

    holder.release();
    await settle();
    queued.abort();
    await settle();
    expect(waiting.error).toBeUndefined();
    expect(admission.running).toBe(1);
    waiting.release();
    expectIdle(admission);
  });

  test("release is idempotent and never over-admits", async () => {
    const { admission, started, request } = harness({ maxRunning: 1 });
    const holder = request("customerX", "tokenX1");
    const waiting = [
      request("customerA", "tokenA1"),
      request("customerB", "tokenB1"),
    ];
    await settle();

    holder.release();
    holder.release();
    holder.release();
    await settle();
    expect(started).toEqual(["customerX/tokenX1", "customerA/tokenA1"]);
    expect(admission.running).toBe(1);
    expect(admission.queued).toBe(1);

    waiting[0].release();
    await settle();
    holder.release();
    waiting[0].release();
    expect(admission.running).toBe(1);
    waiting[1].release();
    waiting[1].release();
    expectIdle(admission);
  });

  test("nothing leaks after a mix of rejections, timeouts and cancellations", async () => {
    const { admission, timers, request, drain } = harness({
      maxRunning: 2,
      maxRunningPerCustomer: 2,
      maxRunningPerToken: 1,
      maxQueued: 6,
      maxQueuedPerCustomer: 3,
      maxQueuedPerToken: 2,
    });
    const controllers = [];
    const entries = [];
    for (let round = 0; round < 4; round++) {
      for (const customer of ["customerA", "customerB", "customerC"]) {
        for (const token of ["token1", "token2"]) {
          const controller = new AbortController();
          controllers.push(controller);
          entries.push(request(customer, token, controller.signal));
        }
      }
    }
    await settle();
    expect(admission.running).toBe(2);
    expect(admission.queued).toBe(6);
    expect(entries.filter((entry) => entry.error).length).toBe(16);

    timers.fireOldest();
    timers.fireOldest();
    controllers.forEach((controller, i) => {
      if (i % 3 === 0) controller.abort();
    });
    await settle();

    await drain();
    const categories = new Set(entries.map((entry) => entry.error?.category));
    expect(categories).toEqual(
      new Set([undefined, "queue_full", "queue_timeout", "cancelled"]),
    );
    expect(timers.pending).toBe(0);
    expectIdle(admission);
  });
});
