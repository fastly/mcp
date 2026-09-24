import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { once } from "node:events";
import {
  callTool,
  childrenOf,
  rawRequest,
  rpc,
  sleep,
  spawnRemoteServer,
  startMockFastly,
  TOKEN_A,
  TOKEN_A2,
  TOKEN_B,
  until,
} from "./remote-helpers.js";

const HANG = "return await serviceApi.getService({ service_id: 'hang' });";

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

describe("until", () => {
  test("an async condition is awaited, so a pending promise never counts as met", async () => {
    let polls = 0;
    const waited = until(async () => {
      polls++;
      return false;
    }, 200);
    await expect(waited).rejects.toThrow("condition not met in time");
    expect(polls).toBeGreaterThan(1);
    expect(await until(async () => "ready", 200)).toBe("ready");
  });
});

describe("source addresses and prevalidation budgets", () => {
  let trusting;
  let plain;

  beforeAll(async () => {
    [trusting, plain] = await Promise.all([
      spawnRemoteServer({ args: ["--http-trusted-proxy", "127.0.0.0/8"] }),
      spawnRemoteServer(),
    ]);
  }, 30000);

  afterAll(async () => {
    await Promise.all([trusting?.close(), plain?.close()]);
  });

  function list(server, token, forwardedFor) {
    return rpc(
      server.url,
      { jsonrpc: "2.0", id: 1, method: "tools/list" },
      {
        "Fastly-Key": token,
        ...(forwardedFor && { "X-Forwarded-For": forwardedFor }),
      },
    );
  }

  test("forwarding headers count only from a trusted proxy, and a bad chain is refused", async () => {
    await list(trusting, TOKEN_A, "6.6.6.6, 203.0.113.7");
    await list(plain, TOKEN_A, "203.0.113.7");
    const seenBy = (server) =>
      server
        .auditRecords()
        .filter((record) => record.event === "mcp_request")
        .map((record) => record.sourceIp);
    await until(() => seenBy(trusting).length > 0 && seenBy(plain).length > 0);
    expect(seenBy(trusting)).toEqual(["203.0.113.7"]);
    expect(seenBy(plain)).toEqual(["127.0.0.1"]);

    const malformed = await list(trusting, TOKEN_A, "203.0.113.7, not-an-ip");
    expect(malformed.status).toBe(400);
    const ignored = await list(plain, TOKEN_A, "not-an-ip");
    expect(ignored.status).toBe(200);
  }, 15000);

  test("malformed request targets are admitted and audited as fixed rejections", async () => {
    for (const target of ["//[", "/mcp#fragment", "/x\\../mcp", "/%GG"]) {
      const status = await rawRequest(
        trusting.url,
        [`Fastly-Key: ${TOKEN_A}`],
        "{}",
        { target },
      );
      expect(status).toBe(400);
    }
    const record = await trusting.auditRecord(
      (entry) => entry.category === "request_target_malformed",
    );
    expect(record).toMatchObject({
      event: "request_rejected",
      sourceIp: "127.0.0.1",
      status: 400,
    });
    expect(record.requestId).toMatch(/^[0-9a-f-]{36}$/);
  }, 15000);

  test("routing compares the raw origin-form path", async () => {
    for (const target of [
      "////",
      "/a/../mcp",
      "/%2e%2e/mcp",
      "/mcp/%2e%2e/healthz",
    ]) {
      const status = await rawRequest(
        trusting.url,
        [`Fastly-Key: ${TOKEN_A}`],
        "{}",
        { target },
      );
      expect(status).toBe(404);
    }

    const query = await rawRequest(
      trusting.url,
      [`Fastly-Key: ${TOKEN_A}`, "Accept: application/json, text/event-stream"],
      JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
      { target: "/mcp?tenant=x" },
    );
    expect(query).toBe(200);
  }, 15000);

  test("absolute-form targets use their authority and reach the MCP adapter", async () => {
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
    });
    const status = await rawRequest(
      trusting.url,
      [`Fastly-Key: ${TOKEN_A}`, "Accept: application/json, text/event-stream"],
      body,
      { target: trusting.url, hostHeader: "evil.example" },
    );
    expect(status).toBe(200);

    const httpsStatus = await rawRequest(
      trusting.url,
      [`Fastly-Key: ${TOKEN_A}`, "Accept: application/json, text/event-stream"],
      body,
      { target: trusting.url.replace("http:", "https:") },
    );
    expect(httpsStatus).toBe(200);

    const disallowed = await rawRequest(
      trusting.url,
      [`Fastly-Key: ${TOKEN_A}`],
      "{}",
      { target: "http://evil.example/mcp" },
    );
    expect(disallowed).toBe(421);

    // The authority is compared as written, like a Host header, so other spellings of an allowed address are refused too.
    const { port } = new URL(trusting.url);
    for (const host of ["127.1", "2130706433", "0x7f.0.0.1"]) {
      const status = await rawRequest(trusting.url, [], "{}", {
        target: `http://${host}:${port}/mcp`,
      });
      expect(status).toBe(421);
    }
    const userinfo = await rawRequest(trusting.url, [], "{}", {
      target: `http://user@127.0.0.1:${port}/mcp`,
    });
    expect(userinfo).toBe(400);
  }, 15000);

  test("closed audit and diagnostic pipes do not crash the remote server", async () => {
    const server = await spawnRemoteServer();
    try {
      server.child.stdout.destroy();
      server.child.stderr.destroy();
      const response = await rpc(
        server.url,
        { jsonrpc: "2.0", id: 1, method: "tools/list" },
        { "Fastly-Key": TOKEN_A },
      );
      expect(response.status).toBe(200);
      await sleep(100);
      expect(isAlive(server.child.pid)).toBe(true);
    } finally {
      await server.close();
    }
  }, 30000);

  test("a flood of random keys cannot buy more than the failure budget upstream", async () => {
    const before = trusting.upstreamValidations();
    const statuses = [];
    for (let i = 0; i < 40; i++) {
      const res = await list(
        trusting,
        `synthetic-random-key-${i}-${Math.random().toString(36).slice(2)}`,
        "198.51.100.9",
      );
      statuses.push(res.status);
      if (res.status === 429) {
        expect(Number(res.headers.get("retry-after"))).toBeGreaterThanOrEqual(
          1,
        );
      }
    }
    expect(statuses.filter((status) => status === 401).length).toBe(5);
    expect(statuses.filter((status) => status === 429).length).toBe(35);
    expect(trusting.upstreamValidations() - before).toBe(5);

    // Someone else behind the same proxy is not affected.
    const neighbor = await list(trusting, TOKEN_B, "198.51.100.10");
    expect(neighbor.status).toBe(200);

    const rejected = await until(() => {
      const found = trusting
        .auditRecords()
        .filter((record) => record.category === "validation_budget_exhausted");
      return found.length === 35 ? found : undefined;
    });
    expect(rejected.every((record) => record.sourceIp === "198.51.100.9")).toBe(
      true,
    );
  }, 30000);
});

describe("execution fairness and cleanup (Node parent)", () => {
  let mock;
  let server;

  beforeAll(async () => {
    mock = await startMockFastly();
    server = await spawnRemoteServer({
      runtime: "node",
      mockFastlyUrl: mock.url,
      args: ["--remote-max-executions", "2"],
    });
  }, 30000);

  afterAll(async () => {
    await server?.close();
    await mock?.close();
  });

  const hangs = () => mock.calls.filter((call) => call.path.includes("hang"));

  test("a customer's second token waits for the customer budget while another customer runs", async () => {
    const first = new AbortController();
    const second = new AbortController();
    const hungA = callTool(
      server.url,
      TOKEN_A,
      "execute",
      { code: HANG },
      { signal: first.signal },
    ).catch(() => "aborted");
    await until(() => hangs().length === 1);

    // Customer A is at its ceiling of one, so its other token has to queue.
    const queuedA2 = callTool(
      server.url,
      TOKEN_A2,
      "execute",
      { code: HANG },
      { signal: second.signal },
    ).catch(() => "aborted");
    await sleep(500);
    expect(hangs().length).toBe(1);

    const overflow = await callTool(server.url, TOKEN_A2, "execute", {
      code: "return 1;",
    });
    expect(overflow.isError).toBe(true);
    expect(overflow.parsed.error).toContain("already waiting");

    const other = await callTool(server.url, TOKEN_B, "execute", {
      code: "return 'B runs';",
    });
    expect(other.parsed.result).toBe("B runs");

    first.abort();
    await hungA;
    await until(() => hangs().length === 2);
    expect(hangs()[1].key).toBe(TOKEN_A2);

    second.abort();
    await queuedA2;
    await until(
      () =>
        server
          .auditRecords()
          .filter(
            (record) =>
              record.event === "execution" && record.outcome === "cancelled",
          ).length === 2,
    );
    const after = await callTool(server.url, TOKEN_A, "execute", {
      code: "return 'free again';",
    });
    expect(after.parsed.result).toBe("free again");

    const refused = server
      .auditRecords()
      .find((record) => record.outcome === "queue_full");
    expect(refused.decision).toBe("refused");
    expect(refused.customerId).toBe("customerA");
  }, 60000);

  test("shutting down kills running executions instead of orphaning them", async () => {
    const before = hangs().length;
    const hung = callTool(server.url, TOKEN_B, "execute", { code: HANG }).catch(
      () => undefined,
    );
    await until(() => hangs().length === before + 1);
    const children = childrenOf(server.child.pid);
    expect(children.length).toBeGreaterThan(0);

    server.child.kill("SIGHUP");
    await once(server.child, "exit");
    await hung;
    await until(() => children.every((pid) => !isAlive(pid)));
    expect(server.getStderr()).toContain("Shutting down (SIGHUP)");
    // The interrupted call must not be replayed against Fastly.
    expect(hangs().length).toBe(before + 1);
  }, 30000);
});

describe("held-open requests", () => {
  let server;

  beforeAll(async () => {
    server = await spawnRemoteServer({
      env: {
        FASTLY_MCP_TEST_BODY_TIMEOUT_MS: "1000",
        FASTLY_MCP_TEST_MAX_IN_FLIGHT: "3",
      },
    });
  }, 30000);

  afterAll(async () => {
    await server?.close();
  });

  // A valid key with a body that never finishes arriving, so the server has
  // to hold the request open.
  function trickle(extra = {}) {
    return rawRequest(server.url, [`Fastly-Key: ${TOKEN_A}`], '{"jsonrpc":', {
      withhold: 80,
      ...extra,
    });
  }

  test("clients that hang up mid-body give their slots back, even without disconnect events", async () => {
    // Bun 1.3.11 never reports these hangups, so the slots have to come back
    // by the time the body deadline ends the request at the latest.
    await Promise.all(
      Array.from({ length: 3 }, () => trickle({ hangUpAfterMs: 100 })),
    );
    await until(async () => {
      const after = await callTool(server.url, TOKEN_A, "search", {
        query: "purge",
      });
      return after.status === 200;
    }, 5000);
  }, 15000);

  test("a body that never arrives is cut off at the deadline", async () => {
    const startedAt = Date.now();
    const status = await trickle();
    const ms = Date.now() - startedAt;
    expect(status).toBe(408);
    expect(ms).toBeGreaterThanOrEqual(900);
    expect(ms).toBeLessThan(5000);
  }, 15000);

  test("beyond the in-flight ceiling, new requests are refused at once", async () => {
    const held = [trickle(), trickle(), trickle()];
    await sleep(200);
    const refused = await callTool(server.url, TOKEN_A, "search", {
      query: "purge",
    });
    expect(refused.status).toBe(503);
    const outcomes = await Promise.all(held);
    expect(outcomes.every((status) => status === 408)).toBe(true);

    const after = await callTool(server.url, TOKEN_A, "search", {
      query: "purge",
    });
    expect(after.status).toBe(200);
    expect(
      server
        .auditRecords()
        .filter((record) => record.category === "server_busy"),
    ).toHaveLength(1);
  }, 20000);
});
