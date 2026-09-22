import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  callTool,
  spawnRemoteServer,
  startMockFastly,
  TOKEN_A,
  TOKEN_B,
  UPSTREAM_SECRET,
} from "./remote-helpers.js";

const MARKER = /\{\{fastly-encrypted:v1:[a-z0-9-]+:[^{}\s]+\}\}/g;

describe("encrypted values move between replicas", () => {
  let mock;
  let marker;
  const logs = [];

  beforeAll(async () => {
    mock = await startMockFastly();
  });

  afterAll(async () => {
    await mock?.close();
  });

  async function onFreshReplica(runtime, fn) {
    const replica = await spawnRemoteServer({
      runtime,
      mockFastlyUrl: mock.url,
    });
    try {
      return await fn(replica);
    } finally {
      await replica.close();
      logs.push(replica.rawAudit() + replica.getStderr());
    }
  }

  test("replica one, under Bun, only ever shows the model a marker", async () => {
    await onFreshReplica("bun", async (replica) => {
      const result = await callTool(replica.url, TOKEN_A, "execute", {
        code: `const service = await serviceApi.getService({ service_id: "one" });
               console.log("logged", service.comment);
               return service;`,
      });
      expect(result.isError).toBeFalsy();
      expect(result.text).not.toContain(UPSTREAM_SECRET);
      const markers = result.text.match(MARKER);
      expect(markers).toHaveLength(2);
      expect(markers[0]).toBe(markers[1]);
      [marker] = markers;
      expect(result.parsed.console[0].text).toBe(`logged token: ${marker}`);

      const thrown = await callTool(replica.url, TOKEN_A, "execute", {
        code: `const service = await serviceApi.getService({ service_id: "one" });
               throw new Error("failed with " + service.comment);`,
      });
      expect(thrown.isError).toBe(true);
      expect(thrown.text).not.toContain(UPSTREAM_SECRET);
      expect(thrown.parsed.error).toContain(marker);
    });
  }, 60000);

  test("replica two, a fresh Node process, decrypts it with nothing but the header", async () => {
    expect(marker).toBeDefined();
    await onFreshReplica("node", async (replica) => {
      const before = mock.calls.length;
      const result = await callTool(replica.url, TOKEN_A, "execute", {
        code: `return await serviceApi.getService({ service_id: "${marker}" });`,
      });
      expect(result.isError).toBeFalsy();
      const [call] = mock.calls.slice(before);
      expect(decodeURIComponent(call.path)).toContain(UPSTREAM_SECRET);
      expect(result.text).not.toContain(UPSTREAM_SECRET);
      expect(result.parsed.result.comment).toBe(`token: ${marker}`);
    });
  }, 60000);

  test("another caller's key turns the marker into a different token, silently", async () => {
    await onFreshReplica("bun", async (replica) => {
      const before = mock.calls.length;
      const result = await callTool(replica.url, TOKEN_B, "execute", {
        code: `return (await serviceApi.getService({ service_id: "${marker}" })).id;`,
      });
      expect(result.isError).toBeFalsy();
      const path = decodeURIComponent(mock.calls.slice(before)[0].path);
      expect(path).toMatch(/ghp_[A-Za-z0-9]{36}/);
      expect(path).not.toContain(UPSTREAM_SECRET);
    });
  }, 60000);

  test("a damaged marker is refused by location before anything runs", async () => {
    await onFreshReplica("bun", async (replica) => {
      const before = mock.calls.length;
      const damaged = marker.slice(0, -6);
      const result = await callTool(replica.url, TOKEN_A, "execute", {
        code: `const ok = "${marker}"; return await serviceApi.getService({ service_id: "${damaged}" });`,
      });
      expect(result.isError).toBe(true);
      expect(result.parsed.error).toContain("code, marker 2");
      expect(result.parsed.hint).toContain("Retrieve the original value again");
      expect(result.text).not.toContain(UPSTREAM_SECRET);
      expect(result.text).not.toContain(damaged);
      expect(mock.calls.length).toBe(before);

      const search = await callTool(replica.url, TOKEN_A, "search", {
        query: `purge ${UPSTREAM_SECRET}`,
      });
      expect(search.text).not.toContain(UPSTREAM_SECRET);
    });
  }, 60000);

  test("no replica wrote the secret or a key to its logs", () => {
    expect(logs.length).toBe(4);
    for (const log of logs) {
      expect(log).not.toContain(UPSTREAM_SECRET);
      expect(log).not.toContain(TOKEN_A);
      expect(log).not.toContain(TOKEN_B);
    }
  });
});
