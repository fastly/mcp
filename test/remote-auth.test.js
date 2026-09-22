import { describe, expect, test } from "bun:test";
import {
  createTokenValidator,
  KEY_HINT,
  RemoteAuthError,
  readFastlyKey,
} from "../src/remote-auth.js";

const TOKEN_A = "synthetic-token-A";
const TOKEN_B = "synthetic-token-B";
const TOKEN_SELF_URL = "https://api.fastly.com/tokens/self";
const CURRENT_CUSTOMER_URL = "https://api.fastly.com/current_customer";
const WALL_START = Date.parse("2026-09-22T00:00:00Z");

function json(body, status = 200, headers = {}) {
  return Response.json(body, { status, headers });
}

function selfBody(extra = {}) {
  return { id: "tokenA1", customer_id: "customerA1", ...extra };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

// A validator wired to a scripted Fastly API, with clocks the test moves by hand.
function harness(respond = () => json(selfBody()), limits) {
  const state = { mono: 5000, wall: WALL_START };
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url, init });
    return respond(url, init.headers["Fastly-Key"], calls.length);
  };
  const validator = createTokenValidator({
    fetch,
    now: () => state.mono,
    wallClock: () => state.wall,
    ...(limits ? { limits } : {}),
  });
  return {
    validator,
    calls,
    advance(ms) {
      state.mono += ms;
      state.wall += ms;
    },
    advanceMonotonicOnly(ms) {
      state.mono += ms;
    },
    advanceWallOnly(ms) {
      state.wall += ms;
    },
  };
}

async function rejection(promise) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected a rejection");
}

function thrownBy(run) {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error("expected a throw");
}

function expectAuthError(error, status, category) {
  expect(error).toBeInstanceOf(RemoteAuthError);
  expect({ status: error.status, category: error.category }).toEqual({
    status,
    category,
  });
}

describe("readFastlyKey", () => {
  test("the header name is case-insensitive, the value keeps its case", () => {
    for (const name of [
      "fastly-key",
      "FASTLY-KEY",
      "Fastly-Key",
      "fAsTlY-kEy",
    ]) {
      expect(readFastlyKey(["Host", "x.test", name, "MiXeD-Case-Token"])).toBe(
        "MiXeD-Case-Token",
      );
    }
  });

  test("a missing, empty or lookalike header is a 401 that says what to configure", () => {
    const missing = [
      ["Host", "x.test"],
      [],
      ["Fastly-Key", ""],
      ["Authorization", `Bearer ${TOKEN_A}`],
      ["X-Fastly-Key", TOKEN_A],
      ["Fastly-Key-2", TOKEN_A],
      ["Cookie", `Fastly-Key=${TOKEN_A}`],
    ];
    for (const rawHeaders of missing) {
      const error = thrownBy(() => readFastlyKey(rawHeaders));
      expectAuthError(error, 401, "key_missing");
      expect(error.message).toContain(KEY_HINT);
    }
  });

  test("two fields are a 400, even when they agree", () => {
    const conflicting = ["Fastly-Key", TOKEN_A, "fastly-key", TOKEN_B];
    const repeated = [
      "Fastly-Key",
      TOKEN_A,
      "Host",
      "x.test",
      "Fastly-Key",
      TOKEN_A,
    ];
    for (const rawHeaders of [conflicting, repeated]) {
      expectAuthError(
        thrownBy(() => readFastlyKey(rawHeaders)),
        400,
        "key_duplicated",
      );
    }
  });

  test("a comma, whitespace, control or non-ASCII character in the value is a 400", () => {
    const values = [
      `${TOKEN_A},${TOKEN_B}`,
      `${TOKEN_A},`,
      `,${TOKEN_A}`,
      "synthetic token",
      "synthetic\ttoken",
      " synthetic-token",
      "synthetic-token ",
      "synthetic\ntoken",
      "synthetic\r\ntoken",
      "synthetic\0token",
      "synthetic\x1btoken",
      "synthetic\x7ftoken",
      "synthétic-token",
      "synthetic\u00a0token",
      "synthetic\u2003token",
      "synthetic-token-\u{1f511}",
    ];
    for (const value of values) {
      expectAuthError(
        thrownBy(() => readFastlyKey(["Fastly-Key", value])),
        400,
        "key_malformed",
      );
    }
  });

  test("4096 characters are accepted, 4097 are a 400", () => {
    const longest = "k".repeat(4096);
    expect(readFastlyKey(["Fastly-Key", longest])).toBe(longest);
    expectAuthError(
      thrownBy(() => readFastlyKey(["Fastly-Key", `${longest}k`])),
      400,
      "key_too_long",
    );
  });

  test("no token length or encoding is guessed", () => {
    const unusual = [
      "x",
      "not-hex-zz",
      "abc",
      "====",
      "a.b_c~d!e*f'g(h)i;j:k@l&m=n+o$p/q?r#s[t]u",
      '"quoted"',
      "{json:true}",
      "%41%42",
    ];
    for (const value of unusual) {
      expect(readFastlyKey(["Fastly-Key", value])).toBe(value);
    }
  });

  test("error messages never repeat the key", () => {
    const sentinel = "synthetic-sentinel-Zq7";
    const bad = [
      ["Fastly-Key", sentinel, "Fastly-Key", sentinel],
      ["Fastly-Key", `${sentinel},${sentinel}`],
      ["Fastly-Key", `${sentinel} ${sentinel}`],
      ["Fastly-Key", `${sentinel}é`],
      ["Fastly-Key", sentinel.repeat(300)],
    ];
    for (const rawHeaders of bad) {
      const error = thrownBy(() => readFastlyKey(rawHeaders));
      expect(error).toBeInstanceOf(RemoteAuthError);
      expect(`${error.message} ${error.category}`).not.toContain(sentinel);
    }
  });
});

describe("token validation against Fastly", () => {
  test("a customer id in /tokens/self needs exactly one upstream call", async () => {
    const { validator, calls } = harness();
    const { identity, cache } = await validator.validate(TOKEN_A);

    expect(cache).toBe("miss");
    expect(identity).toEqual({
      tokenId: "tokenA1",
      customerId: "customerA1",
      expiresAt: Number.POSITIVE_INFINITY,
    });
    expect(calls).toHaveLength(1);
    const [{ url, init }] = calls;
    expect(url).toBe(TOKEN_SELF_URL);
    expect(init.method).toBe("GET");
    expect(init.headers).toEqual({
      Accept: "application/json",
      "Fastly-Key": TOKEN_A,
    });
    expect(init.redirect).toBe("manual");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.signal.aborted).toBe(false);
    expect(init.body).toBeUndefined();
  });

  test("a token that looks like a URL cannot retarget validation", async () => {
    const { validator, calls } = harness();
    await validator.validate("https://attacker.example.test/tokens/self");
    expect(calls.map((call) => call.url)).toEqual([TOKEN_SELF_URL]);
  });

  test("a missing or unusable customer id falls back to /current_customer", async () => {
    const unusable = [undefined, "", "../admin", "has space", 42, null, {}];
    for (const customerId of unusable) {
      const { validator, calls } = harness((url) =>
        url === TOKEN_SELF_URL
          ? json({ id: "tokenA1", user_id: "userA1", customer_id: customerId })
          : json({ id: "customerA1", name: "Synthetic Co" }),
      );
      const { identity } = await validator.validate(TOKEN_A);

      expect(identity.customerId).toBe("customerA1");
      expect(calls.map((call) => call.url)).toEqual([
        TOKEN_SELF_URL,
        CURRENT_CUSTOMER_URL,
      ]);
      expect(calls[1].init.headers["Fastly-Key"]).toBe(TOKEN_A);
      expect(calls[1].init.redirect).toBe("manual");
    }
  });

  test("a denied fallback leaves a valid identity without a customer, and a user id is no substitute", async () => {
    for (const status of [401, 403]) {
      const { validator } = harness((url) =>
        url === TOKEN_SELF_URL
          ? json({ id: "tokenA1", user_id: "userA1" })
          : json({ msg: "denied" }, status),
      );
      const { identity, cache } = await validator.validate(TOKEN_A);
      expect(cache).toBe("miss");
      expect(identity).toEqual({
        tokenId: "tokenA1",
        customerId: null,
        expiresAt: Number.POSITIVE_INFINITY,
      });
    }
  });

  test("a fallback that answers 200 without a usable id is an outage", async () => {
    for (const body of [
      {},
      { id: 7 },
      { id: "bad id" },
      { customer_id: "x" },
    ]) {
      const { validator } = harness((url) =>
        url === TOKEN_SELF_URL ? json({ id: "tokenA1" }) : json(body),
      );
      expectAuthError(
        await rejection(validator.validate(TOKEN_A)),
        503,
        "validation_unavailable",
      );
      expect(validator.cacheSize).toBe(0);
    }
  });

  test("a failing fallback is an outage or a rate limit, not a rejection", async () => {
    const outage = harness((url) =>
      url === TOKEN_SELF_URL
        ? json({ id: "tokenA1" })
        : new Response("oops", { status: 500 }),
    );
    expectAuthError(
      await rejection(outage.validator.validate(TOKEN_A)),
      503,
      "validation_unavailable",
    );

    const limited = harness((url) =>
      url === TOKEN_SELF_URL
        ? json({ id: "tokenA1" })
        : new Response(null, { status: 429, headers: { "Retry-After": "7" } }),
    );
    const error = await rejection(limited.validator.validate(TOKEN_A));
    expectAuthError(error, 429, "validation_rate_limited");
    expect(error.retryAfter).toBe(7);
  });

  test("401 and 403 on /tokens/self both reject the key", async () => {
    for (const status of [401, 403]) {
      const { validator, calls } = harness(() =>
        json({ msg: "Provided credentials are missing or invalid" }, status),
      );
      const error = await rejection(validator.validate(TOKEN_A));
      expectAuthError(error, 401, "key_rejected");
      expect(error.message).toContain(KEY_HINT);
      expect(calls).toHaveLength(1);
    }
  });

  test("an already expired token is refused", async () => {
    const expired = [
      new Date(WALL_START - 1000).toISOString(),
      new Date(WALL_START).toISOString(),
      "2020-01-01T00:00:00Z",
    ];
    for (const expiresAt of expired) {
      const { validator, calls } = harness(() =>
        json(selfBody({ expires_at: expiresAt })),
      );
      const error = await rejection(validator.validate(TOKEN_A));
      expectAuthError(error, 401, "key_expired");
      expect(error.message).toContain(KEY_HINT);
      expect(calls).toHaveLength(1);
      expect(validator.cacheSize).toBe(0);
    }
  });

  test("a future expiration is reported on the identity", async () => {
    const expiresAt = new Date(WALL_START + 3_600_000).toISOString();
    const { validator } = harness(() =>
      json(selfBody({ expires_at: expiresAt })),
    );
    const { identity } = await validator.validate(TOKEN_A);
    expect(identity.expiresAt).toBe(WALL_START + 3_600_000);
  });

  test("an expiration that cannot be read is an outage, not a pass", async () => {
    for (const expiresAt of ["soon", 1_900_000_000, true, {}]) {
      const { validator } = harness(() =>
        json(selfBody({ expires_at: expiresAt })),
      );
      expectAuthError(
        await rejection(validator.validate(TOKEN_A)),
        503,
        "validation_unavailable",
      );
    }
  });

  test("429 keeps a safe Retry-After", async () => {
    const cases = [
      ["120", 120],
      ["1", 1],
      ["300", 300],
      ["301", 300],
      ["999999", 300],
      [undefined, 60],
      ["", 60],
      ["0", 60],
      ["-5", 60],
      ["1.5", 60],
      ["soon", 60],
      ["Wed, 21 Oct 2026 07:28:00 GMT", 60],
    ];
    for (const [header, expected] of cases) {
      const headers = header === undefined ? {} : { "Retry-After": header };
      const { validator } = harness(
        () => new Response("slow down", { status: 429, headers }),
      );
      const error = await rejection(validator.validate(TOKEN_A));
      expectAuthError(error, 429, "validation_rate_limited");
      expect(error.retryAfter).toBe(expected);
    }
  });

  test("upstream errors, redirects and odd statuses are outages", async () => {
    const responses = [
      () => new Response("boom", { status: 500 }),
      () => new Response("bad gateway", { status: 502 }),
      () => new Response(null, { status: 204 }),
      () => json(selfBody(), 201),
      () => new Response("missing", { status: 404 }),
      () =>
        new Response(null, {
          status: 302,
          headers: { Location: "https://attacker.example.test/tokens/self" },
        }),
      () =>
        new Response(null, {
          status: 307,
          headers: { Location: CURRENT_CUSTOMER_URL },
        }),
    ];
    for (const respond of responses) {
      const { validator, calls } = harness(respond);
      expectAuthError(
        await rejection(validator.validate(TOKEN_A)),
        503,
        "validation_unavailable",
      );
      expect(calls).toHaveLength(1);
      expect(validator.cacheSize).toBe(0);
    }
  });

  test("a hanging upstream is cut off by a five second timeout", async () => {
    const originalTimeout = AbortSignal.timeout;
    const requestedDelays = [];
    const timer = new AbortController();
    AbortSignal.timeout = (delay) => {
      requestedDelays.push(delay);
      return timer.signal;
    };
    try {
      const fastly = harness(
        () =>
          new Promise((_, reject) => {
            const { signal } = fastly.calls.at(-1).init;
            signal.addEventListener("abort", () => reject(signal.reason));
          }),
      );
      const pending = fastly.validator.validate(TOKEN_A);
      await settle();
      timer.abort(new DOMException("The operation timed out.", "TimeoutError"));
      expectAuthError(await rejection(pending), 503, "validation_unavailable");
      expect(requestedDelays).toEqual([5000]);
      expect(fastly.validator.cacheSize).toBe(0);
    } finally {
      AbortSignal.timeout = originalTimeout;
    }
  });

  test("a network failure or a timeout is an outage", async () => {
    const failures = [
      new TypeError("fetch failed"),
      new DOMException("The operation timed out.", "TimeoutError"),
      `connection reset while sending ${TOKEN_A}`,
    ];
    for (const failure of failures) {
      const { validator } = harness(() => {
        throw failure;
      });
      const error = await rejection(validator.validate(TOKEN_A));
      expectAuthError(error, 503, "validation_unavailable");
      expect(error.message).not.toContain(TOKEN_A);
    }
  });

  test("a body that is not the expected JSON is an outage", async () => {
    const bodies = [
      "<html>maintenance</html>",
      "",
      '{"id": "tokenA1"',
      "null",
      "[]",
      '"tokenA1"',
      "42",
    ];
    for (const body of bodies) {
      const { validator } = harness(() => new Response(body, { status: 200 }));
      expectAuthError(
        await rejection(validator.validate(TOKEN_A)),
        503,
        "validation_unavailable",
      );
    }
  });

  test("a missing or malformed token id is an outage", async () => {
    const ids = [
      undefined,
      null,
      "",
      7,
      ["tokenA1"],
      "token id",
      "token/id",
      "token\nid",
      "t".repeat(129),
    ];
    for (const id of ids) {
      const { validator } = harness(() => json({ ...selfBody(), id }));
      expectAuthError(
        await rejection(validator.validate(TOKEN_A)),
        503,
        "validation_unavailable",
      );
      expect(validator.cacheSize).toBe(0);
    }
  });

  test("a body over 64 KiB is refused, one of exactly 64 KiB is read", async () => {
    const bodyOfSize = (bytes) => {
      const empty = JSON.stringify(selfBody({ padding: "" }));
      return JSON.stringify(
        selfBody({ padding: "p".repeat(bytes - empty.length) }),
      );
    };
    expect(bodyOfSize(65_536)).toHaveLength(65_536);

    const atLimit = harness(() => new Response(bodyOfSize(65_536)));
    const { identity } = await atLimit.validator.validate(TOKEN_A);
    expect(identity.tokenId).toBe("tokenA1");

    const overLimit = harness(() => new Response(bodyOfSize(65_537)));
    expectAuthError(
      await rejection(overLimit.validator.validate(TOKEN_A)),
      503,
      "validation_unavailable",
    );
  });

  test("an oversized streamed body stops being read once over the limit", async () => {
    let pulled = 0;
    let cancelled = false;
    const chunk = new Uint8Array(16 * 1024).fill(0x20);
    const endless = new ReadableStream({
      pull(controller) {
        pulled++;
        if (pulled > 1000) controller.close();
        else controller.enqueue(chunk);
      },
      cancel() {
        cancelled = true;
      },
    });
    const { validator } = harness(() => new Response(endless));
    expectAuthError(
      await rejection(validator.validate(TOKEN_A)),
      503,
      "validation_unavailable",
    );
    // The limit is crossed by the fifth chunk; a stream may run one pull ahead.
    expect(pulled).toBeLessThanOrEqual(6);
    expect(cancelled).toBe(true);
  });

  test("only the identity is retained from the token metadata", async () => {
    const { validator } = harness(() =>
      json(
        selfBody({
          access_token: TOKEN_A,
          name: "synthetic automation token",
          scope: "global",
          user_id: "userA1",
          services: ["serviceA1"],
        }),
      ),
    );
    const { identity } = await validator.validate(TOKEN_A);
    expect(Object.keys(identity).sort()).toEqual([
      "customerId",
      "expiresAt",
      "tokenId",
    ]);
    const hit = await validator.validate(TOKEN_A);
    expect(hit.cache).toBe("hit");
    expect(JSON.stringify(hit)).not.toContain(TOKEN_A);
  });
});

describe("validation cache", () => {
  test("a hit answers without calling Fastly", async () => {
    const { validator, calls } = harness();
    const first = await validator.validate(TOKEN_A);
    const second = await validator.validate(TOKEN_A);
    expect(first.cache).toBe("miss");
    expect(second.cache).toBe("hit");
    expect(second.identity).toEqual(first.identity);
    expect(Object.isFrozen(second.identity)).toBe(true);
    expect(calls).toHaveLength(1);
    expect(validator.cacheSize).toBe(1);
  });

  test("hits never extend the 60 second lifetime, only a real validation restarts it", async () => {
    const { validator, calls, advance } = harness();
    await validator.validate(TOKEN_A);
    advance(59_000);
    expect((await validator.validate(TOKEN_A)).cache).toBe("hit");
    advance(999);
    expect((await validator.validate(TOKEN_A)).cache).toBe("hit");
    advance(1);
    expect((await validator.validate(TOKEN_A)).cache).toBe("miss");
    advance(59_999);
    expect((await validator.validate(TOKEN_A)).cache).toBe("hit");
    expect(calls).toHaveLength(2);
  });

  test("the lifetime is capped by the token expiration", async () => {
    const expiresAt = new Date(WALL_START + 10_000).toISOString();
    const { validator, calls, advanceMonotonicOnly } = harness(() =>
      json(selfBody({ expires_at: expiresAt })),
    );
    await validator.validate(TOKEN_A);
    advanceMonotonicOnly(9999);
    expect((await validator.validate(TOKEN_A)).cache).toBe("hit");

    // The wall clock stands still, so only the capped deadline can end this entry.
    advanceMonotonicOnly(1);
    expect((await validator.validate(TOKEN_A)).cache).toBe("miss");
    expect(calls).toHaveLength(2);
  });

  test("absolute expiration wins over a later monotonic deadline", async () => {
    const expiresAt = new Date(WALL_START + 30_000).toISOString();
    const { validator, calls, advanceMonotonicOnly, advanceWallOnly } = harness(
      () => json(selfBody({ expires_at: expiresAt })),
    );
    await validator.validate(TOKEN_A);

    // Like a host coming back from sleep: little monotonic time passed, but the
    // token is dead.
    advanceMonotonicOnly(1000);
    advanceWallOnly(30_000);
    expectAuthError(
      await rejection(validator.validate(TOKEN_A)),
      401,
      "key_expired",
    );
    expect(calls).toHaveLength(2);
    expect(validator.cacheSize).toBe(0);
  });

  test("failed validations are never cached", async () => {
    const statuses = [401, 403, 429, 500];
    for (const status of statuses) {
      const { validator, calls } = harness((_url, _token, count) =>
        count === 1 ? new Response(null, { status }) : json(selfBody()),
      );
      await rejection(validator.validate(TOKEN_A));
      expect(validator.cacheSize).toBe(0);
      const retry = await validator.validate(TOKEN_A);
      expect(retry.cache).toBe("miss");
      expect(calls).toHaveLength(2);
    }
  });

  test("an expired entry is not served during an outage", async () => {
    let down = false;
    const { validator, calls, advance } = harness(() => {
      if (down) throw new TypeError("fetch failed");
      return json(selfBody());
    });
    await validator.validate(TOKEN_A);
    down = true;
    advance(59_999);
    expect((await validator.validate(TOKEN_A)).cache).toBe("hit");

    advance(1);
    for (let i = 0; i < 2; i++) {
      expectAuthError(
        await rejection(validator.validate(TOKEN_A)),
        503,
        "validation_unavailable",
      );
    }
    expect(calls).toHaveLength(3);
    expect(validator.cacheSize).toBe(0);
  });

  test("evict and clear force the next request to revalidate", async () => {
    const { validator, calls } = harness((_url, token) =>
      json(selfBody({ id: token === TOKEN_A ? "tokenA1" : "tokenB1" })),
    );
    await validator.validate(TOKEN_A);
    await validator.validate(TOKEN_B);

    validator.evict(TOKEN_A);
    expect(validator.cacheSize).toBe(1);
    expect((await validator.validate(TOKEN_B)).cache).toBe("hit");
    expect((await validator.validate(TOKEN_A)).cache).toBe("miss");
    expect(calls).toHaveLength(3);

    validator.evict("synthetic-token-never-seen");
    expect(validator.cacheSize).toBe(2);

    validator.clear();
    expect(validator.cacheSize).toBe(0);
    expect((await validator.validate(TOKEN_A)).cache).toBe("miss");
    expect(calls).toHaveLength(4);
  });

  test("tokens that differ only by case or by a suffix each get their own entry", async () => {
    const { validator, calls } = harness((_url, _token, count) =>
      json({ id: `token${count}`, customer_id: `customer${count}` }),
    );
    const variants = [
      TOKEN_A,
      TOKEN_A.toUpperCase(),
      `${TOKEN_A}x`,
      TOKEN_A.slice(0, -1),
    ];
    const first = [];
    for (const token of variants) first.push(await validator.validate(token));
    expect(first.map((result) => result.cache)).toEqual(
      variants.map(() => "miss"),
    );
    expect(calls.map((call) => call.init.headers["Fastly-Key"])).toEqual(
      variants,
    );

    for (const [i, token] of variants.entries()) {
      const { identity, cache } = await validator.validate(token);
      expect(cache).toBe("hit");
      expect(identity).toEqual(first[i].identity);
      expect(identity.customerId).toBe(`customer${i + 1}`);
    }
    expect(calls).toHaveLength(4);
  });

  test("separate validators do not share a cache", async () => {
    const first = harness();
    const second = harness();
    await first.validator.validate(TOKEN_A);
    expect((await second.validator.validate(TOKEN_A)).cache).toBe("miss");
  });

  test("the cache is bounded and drops its oldest entry first", async () => {
    const { validator, calls } = harness(() => json(selfBody()), {
      maxCacheEntries: 3,
      maxConcurrent: 4,
      maxQueued: 4,
    });
    for (let i = 1; i <= 5; i++) {
      await validator.validate(`synthetic-token-${i}`);
      expect(validator.cacheSize).toBeLessThanOrEqual(3);
    }
    expect(validator.cacheSize).toBe(3);
    expect((await validator.validate("synthetic-token-5")).cache).toBe("hit");
    expect((await validator.validate("synthetic-token-3")).cache).toBe("hit");
    expect((await validator.validate("synthetic-token-1")).cache).toBe("miss");
    expect(validator.cacheSize).toBe(3);
    expect(calls).toHaveLength(6);
  });

  test("nothing reachable from the validator holds the credential", async () => {
    const { validator } = harness();
    const result = await validator.validate(TOKEN_A);
    const reachable = [
      JSON.stringify(validator),
      JSON.stringify(result),
      Bun.inspect(validator, { depth: 10 }),
      Bun.inspect(result, { depth: 10 }),
      Object.getOwnPropertyNames(validator).join(" "),
    ].join("\n");
    expect(reachable).not.toContain(TOKEN_A);
  });

  test("no error on any path repeats the credential", async () => {
    const echo = { msg: `token ${TOKEN_A} is not valid`, token: TOKEN_A };
    const scripts = [
      () => json(echo, 401),
      () => json(echo, 403),
      () => json(echo, 429),
      () => json(echo, 500),
      () => json({ ...echo, id: TOKEN_A, expires_at: "2020-01-01T00:00:00Z" }),
      () => json({ ...echo, id: `${TOKEN_A} ` }),
      () => new Response(`not json ${TOKEN_A}`),
      () => {
        throw new Error(`could not send ${TOKEN_A}`);
      },
    ];
    for (const respond of scripts) {
      const { validator } = harness(respond);
      const error = await rejection(validator.validate(TOKEN_A));
      expect(error).toBeInstanceOf(RemoteAuthError);
      const visible = [
        error.message,
        error.category,
        error.stack,
        String(error.cause),
        JSON.stringify(error),
        Bun.inspect(error),
      ].join("\n");
      expect(visible).not.toContain(TOKEN_A);
    }
  });
});

describe("concurrent validations", () => {
  test("simultaneous misses for one token share one upstream call", async () => {
    const gate = deferred();
    const { validator, calls } = harness(() => gate.promise);
    const waiters = [
      validator.validate(TOKEN_A),
      validator.validate(TOKEN_A),
      validator.validate(TOKEN_A),
    ];
    await settle();
    expect(calls).toHaveLength(1);

    gate.resolve(json(selfBody()));
    const results = await Promise.all(waiters);
    expect(results.map((result) => result.cache)).toEqual([
      "miss",
      "coalesced",
      "coalesced",
    ]);
    for (const result of results) {
      expect(result.identity).toEqual(results[0].identity);
    }
    expect(calls).toHaveLength(1);
    expect((await validator.validate(TOKEN_A)).cache).toBe("hit");
  });

  test("different tokens are not coalesced", async () => {
    const gate = deferred();
    const { validator, calls } = harness(() =>
      gate.promise.then(() => json(selfBody())),
    );
    const waiters = [validator.validate(TOKEN_A), validator.validate(TOKEN_B)];
    await settle();
    expect(calls).toHaveLength(2);
    gate.resolve();
    const results = await Promise.all(waiters);
    expect(results.map((result) => result.cache)).toEqual(["miss", "miss"]);
  });

  test("a shared failure reaches every waiter and is not remembered", async () => {
    const gate = deferred();
    const { validator, calls } = harness((_url, _token, count) =>
      count === 1 ? gate.promise : json(selfBody()),
    );
    const waiters = [validator.validate(TOKEN_A), validator.validate(TOKEN_A)];
    await settle();
    gate.resolve(new Response(null, { status: 401 }));
    for (const waiter of waiters) {
      expectAuthError(await rejection(waiter), 401, "key_rejected");
    }
    expect(calls).toHaveLength(1);
    expect((await validator.validate(TOKEN_A)).cache).toBe("miss");
  });

  test("admitMiss runs once per real miss, not for hits or coalesced waiters", async () => {
    const gate = deferred();
    const { validator, advance } = harness(() =>
      gate.promise.then(() => json(selfBody())),
    );
    let admitted = 0;
    const admitMiss = () => {
      admitted++;
    };
    const waiters = [
      validator.validate(TOKEN_A, { admitMiss }),
      validator.validate(TOKEN_A, { admitMiss }),
      validator.validate(TOKEN_A, { admitMiss }),
    ];
    await settle();
    expect(admitted).toBe(1);
    gate.resolve();
    await Promise.all(waiters);

    await validator.validate(TOKEN_A, { admitMiss });
    expect(admitted).toBe(1);

    await validator.validate(TOKEN_B, { admitMiss });
    expect(admitted).toBe(2);

    advance(60_000);
    await validator.validate(TOKEN_A, { admitMiss });
    expect(admitted).toBe(3);
  });

  test("a refusal from admitMiss sends nothing upstream", async () => {
    const { validator, calls } = harness();
    const refusal = new RemoteAuthError(429, "budget_exhausted", "Slow down.");
    const error = await rejection(
      validator.validate(TOKEN_A, {
        admitMiss: () => {
          throw refusal;
        },
      }),
    );
    expect(error).toBe(refusal);
    await settle();
    expect(calls).toHaveLength(0);
    expect(validator.cacheSize).toBe(0);

    // A refusal that stayed in the in-flight table would poison every retry.
    expect((await validator.validate(TOKEN_A)).cache).toBe("miss");
    expect(calls).toHaveLength(1);
  });

  test("aborting a coalesced waiter releases that waiter only", async () => {
    const gate = deferred();
    const { validator, calls } = harness(() => gate.promise);
    const leaving = new AbortController();
    const first = validator.validate(TOKEN_A);
    const second = validator.validate(TOKEN_A, { signal: leaving.signal });
    await settle();

    const reason = new Error("client went away");
    leaving.abort(reason);
    expect(await rejection(second)).toBe(reason);

    gate.resolve(json(selfBody()));
    expect((await first).identity.tokenId).toBe("tokenA1");
    expect(calls).toHaveLength(1);
  });

  test("aborting the waiter that started the lookup does not cancel it", async () => {
    const gate = deferred();
    const { validator, calls } = harness(() => gate.promise);
    const leaving = new AbortController();
    const first = validator.validate(TOKEN_A, { signal: leaving.signal });
    const second = validator.validate(TOKEN_A);
    await settle();

    leaving.abort();
    const error = await rejection(first);
    expect(error.name).toBe("AbortError");
    expect(calls[0].init.signal.aborted).toBe(false);

    gate.resolve(json(selfBody()));
    expect(await second).toEqual({
      identity: {
        tokenId: "tokenA1",
        customerId: "customerA1",
        expiresAt: Number.POSITIVE_INFINITY,
      },
      cache: "coalesced",
    });
    expect((await validator.validate(TOKEN_A)).cache).toBe("hit");
    expect(calls).toHaveLength(1);
  });

  test("a caller that already left costs nothing upstream", async () => {
    const { validator, calls } = harness();
    const reason = new Error("client went away");
    let admitted = 0;
    const error = await rejection(
      validator.validate(TOKEN_A, {
        signal: AbortSignal.abort(reason),
        admitMiss: () => admitted++,
      }),
    );
    expect(error).toBe(reason);

    await settle();
    expect(admitted).toBe(0);
    expect(calls).toHaveLength(0);
    expect((await validator.validate(TOKEN_A)).cache).toBe("miss");
  });

  test("an abort after completion changes nothing", async () => {
    const { validator } = harness();
    const controller = new AbortController();
    const result = await validator.validate(TOKEN_A, {
      signal: controller.signal,
    });
    controller.abort();
    expect(result.cache).toBe("miss");
    expect((await validator.validate(TOKEN_A)).cache).toBe("hit");
  });

  test("upstream concurrency and the waiting line are both bounded", async () => {
    const gates = new Map();
    let active = 0;
    let peak = 0;
    const { validator, calls } = harness(
      async (_url, token) => {
        active++;
        peak = Math.max(peak, active);
        const gate = deferred();
        gates.set(token, gate);
        await gate.promise;
        active--;
        return json(selfBody());
      },
      { maxCacheEntries: 100, maxConcurrent: 2, maxQueued: 1 },
    );

    const running = [
      validator.validate("synthetic-token-1"),
      validator.validate("synthetic-token-2"),
    ];
    const queued = validator.validate("synthetic-token-3");
    const refused = await rejection(validator.validate("synthetic-token-4"));
    expectAuthError(refused, 429, "validation_queue_full");
    expect(refused.retryAfter).toBeGreaterThanOrEqual(1);

    await settle();
    expect(calls).toHaveLength(2);
    expect(gates.has("synthetic-token-3")).toBe(false);

    gates.get("synthetic-token-1").resolve();
    await running[0];
    await settle();
    expect(gates.has("synthetic-token-3")).toBe(true);

    gates.get("synthetic-token-2").resolve();
    gates.get("synthetic-token-3").resolve();
    await Promise.all([running[1], queued]);
    expect(peak).toBe(2);
    expect(calls).toHaveLength(3);

    const retry = validator.validate("synthetic-token-4");
    await settle();
    gates.get("synthetic-token-4").resolve();
    expect((await retry).cache).toBe("miss");
  });

  test("slots are returned after failures", async () => {
    const { validator } = harness(
      (_url, _token, count) => {
        if (count === 1) throw new TypeError("fetch failed");
        if (count === 2) return new Response(null, { status: 401 });
        return json(selfBody());
      },
      { maxCacheEntries: 100, maxConcurrent: 1, maxQueued: 0 },
    );
    await rejection(validator.validate(TOKEN_A));
    await rejection(validator.validate(TOKEN_A));
    expect((await validator.validate(TOKEN_A)).cache).toBe("miss");
  });

  test("with no waiting line, a second distinct miss is refused at once", async () => {
    const gate = deferred();
    const { validator, calls } = harness(() => gate.promise, {
      maxCacheEntries: 100,
      maxConcurrent: 1,
      maxQueued: 0,
    });
    const first = validator.validate(TOKEN_A);
    const coalesced = validator.validate(TOKEN_A);
    expectAuthError(
      await rejection(validator.validate(TOKEN_B)),
      429,
      "validation_queue_full",
    );
    gate.resolve(json(selfBody()));
    expect((await first).cache).toBe("miss");
    expect((await coalesced).cache).toBe("coalesced");
    expect(calls).toHaveLength(1);
  });
});
