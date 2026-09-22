/** Per-customer and per-token ceilings and queues scaled from one number. */
export function admissionLimits(maxRunning) {
  return {
    maxRunning,
    maxRunningPerCustomer: Math.max(1, Math.floor(maxRunning / 2)),
    maxRunningPerToken: Math.max(1, Math.floor(maxRunning / 4)),
    maxQueued: maxRunning * 4,
    maxQueuedPerCustomer: maxRunning,
    maxQueuedPerToken: Math.max(1, Math.floor(maxRunning / 2)),
    maxQueueWaitMs: 10_000,
  };
}

export const DEFAULT_ADMISSION_LIMITS = Object.freeze(admissionLimits(8));

export class AdmissionError extends Error {
  constructor(category, message) {
    super(message);
    this.category = category;
  }
}

/**
 * Hands out execution permits under a global ceiling, a per-customer one and
 * a per-token one, with a bounded queue at each level.
 *
 * A freed slot goes to the next customer in turn, and within that customer
 * to the next token, so minting more tokens buys nobody extra capacity.
 * A customer or token is forgotten only once it has nothing running and
 * nothing queued, so nothing can reset a budget that is still in use.
 */
export function createAdmission({
  limits = DEFAULT_ADMISSION_LIMITS,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
} = {}) {
  const customers = new Map();
  let running = 0;
  let queued = 0;

  function customerOf(customerId) {
    let customer = customers.get(customerId);
    if (!customer) {
      customer = { running: 0, queued: 0, tokens: new Map() };
      customers.set(customerId, customer);
    }
    return customer;
  }

  function tokenOf(customer, tokenId) {
    let token = customer.tokens.get(tokenId);
    if (!token) {
      token = { running: 0, waiters: [] };
      customer.tokens.set(tokenId, token);
    }
    return token;
  }

  function forget(customerId, tokenId) {
    const customer = customers.get(customerId);
    const token = customer.tokens.get(tokenId);
    if (token.running === 0 && token.waiters.length === 0) {
      customer.tokens.delete(tokenId);
    }
    if (customer.tokens.size === 0) customers.delete(customerId);
  }

  // Re-inserting a key moves it to the back of a Map's iteration order.
  function rotate(map, key) {
    const value = map.get(key);
    map.delete(key);
    map.set(key, value);
  }

  function nextWaiter() {
    for (const [customerId, customer] of customers) {
      if (customer.queued === 0) continue;
      if (customer.running >= limits.maxRunningPerCustomer) continue;
      for (const [tokenId, token] of customer.tokens) {
        if (token.waiters.length === 0) continue;
        if (token.running >= limits.maxRunningPerToken) continue;
        rotate(customer.tokens, tokenId);
        rotate(customers, customerId);
        return { customer, waiter: token.waiters.shift() };
      }
    }
    return undefined;
  }

  function dispatch() {
    while (running < limits.maxRunning) {
      const next = nextWaiter();
      if (!next) return;
      queued--;
      next.customer.queued--;
      next.waiter.start();
    }
  }

  function grant(customerId, tokenId) {
    const customer = customerOf(customerId);
    const token = tokenOf(customer, tokenId);
    running++;
    customer.running++;
    token.running++;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      running--;
      customer.running--;
      token.running--;
      forget(customerId, tokenId);
      dispatch();
    };
  }

  return {
    get running() {
      return running;
    },
    get queued() {
      return queued;
    },
    get trackedCustomers() {
      return customers.size;
    },

    /**
     * Resolves with a release function once the execution may start.
     * Call it once the child is gone; calling it again does nothing.
     */
    acquire({ customerId, tokenId, signal }) {
      if (signal?.aborted) {
        return Promise.reject(
          new AdmissionError("cancelled", "The request was cancelled."),
        );
      }
      // A refused caller must leave no trace, so nothing is recorded until it
      // holds a permit or a place in the queue.
      const known = customers.get(customerId);
      const knownToken = known?.tokens.get(tokenId);

      // Every release dispatches the waiters it made eligible, so a free slot
      // here cannot belong to anyone already queued.
      const free =
        running < limits.maxRunning &&
        (known?.running ?? 0) < limits.maxRunningPerCustomer &&
        (knownToken?.running ?? 0) < limits.maxRunningPerToken;
      if (free) return Promise.resolve(grant(customerId, tokenId));

      if (
        queued >= limits.maxQueued ||
        (known?.queued ?? 0) >= limits.maxQueuedPerCustomer ||
        (knownToken?.waiters.length ?? 0) >= limits.maxQueuedPerToken
      ) {
        return Promise.reject(
          new AdmissionError(
            "queue_full",
            "Too many executions are already waiting. Try again shortly.",
          ),
        );
      }

      const customer = customerOf(customerId);
      const token = tokenOf(customer, tokenId);
      return new Promise((resolve, reject) => {
        const leave = (category, message) => {
          const at = token.waiters.indexOf(waiter);
          if (at === -1) return;
          token.waiters.splice(at, 1);
          queued--;
          customer.queued--;
          cleanup();
          forget(customerId, tokenId);
          reject(new AdmissionError(category, message));
        };
        const onAbort = () => leave("cancelled", "The request was cancelled.");
        const timer = setTimer(
          () =>
            leave(
              "queue_timeout",
              "The execution waited too long for a free slot. Try again shortly.",
            ),
          limits.maxQueueWaitMs,
        );
        const cleanup = () => {
          clearTimer(timer);
          signal?.removeEventListener("abort", onAbort);
        };
        const waiter = {
          start: () => {
            cleanup();
            resolve(grant(customerId, tokenId));
          },
        };
        signal?.addEventListener("abort", onAbort, { once: true });
        token.waiters.push(waiter);
        queued++;
        customer.queued++;
      });
    },
  };
}
