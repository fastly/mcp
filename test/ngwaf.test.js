import { describe, expect, test } from "bun:test";
import { buildIndex } from "../src/indexer.js";
import { operationsOf } from "../src/method-policy.js";
import {
  NGWAF_API_CLASSES,
  NgwafRulesApi,
  NgwafWorkspacesApi,
  ngwafMethods,
} from "../src/ngwaf.js";

// Records what an adapter hands the SDK's ApiClient and answers with `data`.
function recordingClient(data = { data: [], meta: { limit: 100, total: 0 } }) {
  const calls = [];
  return {
    calls,
    callApi(...args) {
      calls.push(args);
      return Promise.resolve({ data, response: {} });
    },
  };
}

const call = (args) => {
  const [path, method, pathParams, allowReserved, query] = args;
  return { path, method, pathParams, allowReserved, query };
};

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
      expect(entry.returnType).toBe("Object");
      expect(entry.constraints).toEqual([]);
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

  test("names the documented options and requires only workspace_id", () => {
    const byMethod = Object.fromEntries(
      ngwafMethods().map((entry) => [entry.method, entry]),
    );
    const options = ["action", "enabled", "limit", "page", "types"];
    const names = (method) => byMethod[method].params.map((p) => p.name);
    const required = (method) =>
      byMethod[method].params.filter((p) => p.required).map((p) => p.name);
    expect(names("listAccountRules")).toEqual(options);
    expect(required("listAccountRules")).toEqual([]);
    expect(names("listWorkspaceRules")).toEqual(["workspace_id", ...options]);
    expect(required("listWorkspaceRules")).toEqual(["workspace_id"]);
    expect(names("getWorkspace")).toEqual(["workspace_id"]);
    expect(names("listAccountRules")).not.toContain("scope");
  });
});

describe("NGWAF adapter requests", () => {
  test("list account rules on the fixed endpoint with only the options given", async () => {
    const client = recordingClient();
    const rules = new NgwafRulesApi(client);
    await rules.listAccountRules();
    await rules.listAccountRules({});
    await rules.listAccountRules({
      action: "block",
      enabled: false,
      limit: 5,
      page: 0,
      types: "request,signal",
    });
    await rules.listAccountRules({
      enabled: true,
      page: undefined,
      limit: null,
    });

    expect(client.calls.map(call)).toEqual([
      {
        path: "/ngwaf/v1/rules",
        method: "GET",
        pathParams: {},
        allowReserved: {},
        query: {},
      },
      {
        path: "/ngwaf/v1/rules",
        method: "GET",
        pathParams: {},
        allowReserved: {},
        query: {},
      },
      {
        path: "/ngwaf/v1/rules",
        method: "GET",
        pathParams: {},
        allowReserved: {},
        query: {
          action: "block",
          enabled: false,
          limit: 5,
          page: 0,
          types: "request,signal",
        },
      },
      {
        path: "/ngwaf/v1/rules",
        method: "GET",
        pathParams: {},
        allowReserved: {},
        query: { enabled: true },
      },
    ]);
    const [, , , , , headers, form, body, auth, types, accepts, ret, base] =
      client.calls[0];
    expect({ headers, form, body, auth, types, accepts }).toEqual({
      headers: {},
      form: {},
      body: null,
      auth: ["token"],
      types: [],
      accepts: ["application/json"],
    });
    expect(ret).toBe(Object);
    expect(base).toBe("https://api.fastly.com");
  });

  test("workspace calls put the ID in the path, never in the query", async () => {
    const client = recordingClient();
    await new NgwafRulesApi(client).listWorkspaceRules({
      workspace_id: "ws/1 ?",
      enabled: true,
    });
    await new NgwafWorkspacesApi(client).getWorkspace({ workspace_id: "ws1" });
    expect(client.calls.map(call)).toEqual([
      {
        path: "/ngwaf/v1/workspaces/{workspace_id}/rules",
        method: "GET",
        pathParams: { workspace_id: "ws/1 ?" },
        allowReserved: {},
        query: { enabled: true },
      },
      {
        path: "/ngwaf/v1/workspaces/{workspace_id}",
        method: "GET",
        pathParams: { workspace_id: "ws1" },
        allowReserved: {},
        query: {},
      },
    ]);
  });

  test("the response data comes back as it is", async () => {
    const data = { data: [{ id: "r1", extra: { kept: true } }], other: 1 };
    const client = recordingClient(data);
    expect(await new NgwafRulesApi(client).listAccountRules()).toBe(data);
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

  test("an adapter refuses to start without the SDK client", () => {
    expect(() => new NgwafRulesApi()).toThrow("ApiClient");
    expect(() => new NgwafWorkspacesApi({})).toThrow("ApiClient");
  });
});
