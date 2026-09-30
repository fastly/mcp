import { describe, expect, test } from "bun:test";
import { buildIndex } from "../src/indexer.js";
import { operationsOf } from "../src/method-policy.js";
import {
  NGWAF_API_CLASSES,
  NgwafRulesApi,
  NgwafWorkspacesApi,
  ngwafMethods,
} from "../src/ngwaf.js";

// Records adapter calls without sending requests.
function recordingClient() {
  const calls = [];
  return {
    calls,
    callApi(...args) {
      calls.push(args);
      return Promise.resolve({
        data: { data: [], meta: { limit: 100, total: 0 } },
        response: {},
      });
    },
  };
}

describe("NGWAF adapter metadata", () => {
  test("has the parser's shape", async () => {
    const [generated] = await buildIndex();
    const parsedKeys = [
      "apiClass",
      "method",
      "httpMethod",
      "httpPath",
      "description",
      "params",
      "constraints",
      "returnType",
    ];
    expect(Object.keys(generated)).toEqual(expect.arrayContaining(parsedKeys));
    for (const entry of ngwafMethods()) {
      expect(Object.keys(entry).sort()).toEqual([...parsedKeys].sort());
      for (const param of entry.params) {
        expect(Object.keys(param).sort()).toEqual([
          "description",
          "name",
          "required",
          "type",
        ]);
      }
    }
  });

  test("advertises exactly the adapters' own operations", () => {
    const advertised = {};
    for (const { apiClass, method } of ngwafMethods()) {
      advertised[apiClass] ??= [];
      advertised[apiClass].push(method);
    }
    expect(Object.keys(advertised).sort()).toEqual(
      Object.keys(NGWAF_API_CLASSES).sort(),
    );
    for (const [name, Ctor] of Object.entries(NGWAF_API_CLASSES)) {
      expect([...operationsOf(Ctor)].sort()).toEqual(advertised[name].sort());
    }
  });

  test("returns fresh objects on every call", () => {
    const first = ngwafMethods();
    first[0].params[0].name = "changed";
    expect(ngwafMethods()[0].params[0].name).toBe("action");
  });
});

describe("NGWAF adapter requests", () => {
  test("null and undefined options are omitted", async () => {
    const client = recordingClient();
    const rules = new NgwafRulesApi(client);
    await rules.listAccountRules({});
    await rules.listAccountRules({
      enabled: true,
      page: undefined,
      limit: null,
    });
    expect(client.calls.map((args) => args[4])).toEqual([
      {},
      { enabled: true },
    ]);
  });

  test("a missing workspace ID uses the SDK's wording", async () => {
    const client = recordingClient();
    const rules = new NgwafRulesApi(client);
    const workspaces = new NgwafWorkspacesApi(client);
    for (const attempt of [
      () => rules.listWorkspaceRules(),
      () => rules.listWorkspaceRules({ enabled: true }),
      () => rules.listWorkspaceRules({ workspace_id: "" }),
      () => workspaces.getWorkspace({ workspace_id: null }),
    ]) {
      await expect(attempt()).rejects.toThrow(
        "Missing the required parameter 'workspace_id'.",
      );
    }
    expect(client.calls).toEqual([]);
  });

  test("invalid options are refused before any request", async () => {
    const client = recordingClient();
    const rules = new NgwafRulesApi(client);
    for (const [options, message] of [
      [{ types: ["request", "signal"] }, "'types' must be a string."],
      [{ enabled: "true" }, "'enabled' must be a boolean."],
      [{ limit: "100" }, "'limit' must be an integer."],
      [{ page: 1.5 }, "'page' must be an integer."],
      [{ action: 1 }, "'action' must be a string."],
      [{ scope: "ws1" }, "listAccountRules does not accept 'scope'."],
      [{ workspace_id: "ws1" }, "does not accept 'workspace_id'"],
      [JSON.parse('{"__proto__": 1}'), "does not accept '__proto__'"],
      [{ constructor: "x" }, "does not accept 'constructor'"],
      [{ toString: "x" }, "does not accept 'toString'"],
      [[], "takes a single options object"],
      ["ws1", "takes a single options object"],
      [null, "takes a single options object"],
    ]) {
      await expect(rules.listAccountRules(options)).rejects.toThrow(message);
    }
    await expect(
      rules.listWorkspaceRules({ workspace_id: 42 }),
    ).rejects.toThrow("'workspace_id' must be a string.");
    for (const id of [".", ".."]) {
      await expect(
        rules.listWorkspaceRules({ workspace_id: id }),
      ).rejects.toThrow(`'workspace_id' must be an ID, not '${id}'.`);
      await expect(
        new NgwafWorkspacesApi(client).getWorkspace({ workspace_id: id }),
      ).rejects.toThrow(`'workspace_id' must be an ID, not '${id}'.`);
    }
    await expect(
      new NgwafWorkspacesApi(client).getWorkspace({
        workspace_id: "ws1",
        enabled: true,
      }),
    ).rejects.toThrow("getWorkspace does not accept 'enabled'.");
    expect(client.calls).toEqual([]);
  });
});
