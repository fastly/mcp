import { describe, expect, test } from "bun:test";
import { buildIndex } from "../src/indexer.js";
import { operationsOf } from "../src/method-policy.js";
import {
  NGWAF_API_CLASSES,
  NgwafRulesApi,
  NgwafWorkspacesApi,
  ngwafMethods,
} from "../src/ngwaf.js";

// Written out here rather than read from the table, so a typo in the table cannot pass its own test.
const OPERATIONS = [
  ["NgwafRulesApi.listAccountRules", "/ngwaf/v1/rules", []],
  [
    "NgwafRulesApi.listWorkspaceRules",
    "/ngwaf/v1/workspaces/{workspace_id}/rules",
    ["workspace_id"],
  ],
  [
    "NgwafWorkspacesApi.getWorkspace",
    "/ngwaf/v1/workspaces/{workspace_id}",
    ["workspace_id"],
  ],
  ["NgwafSignalsApi.listAccountSignals", "/ngwaf/v1/signals", []],
  [
    "NgwafSignalsApi.listWorkspaceSignals",
    "/ngwaf/v1/workspaces/{workspace_id}/signals",
    ["workspace_id"],
  ],
  ["NgwafListsApi.listAccountLists", "/ngwaf/v1/lists", []],
  [
    "NgwafListsApi.listWorkspaceLists",
    "/ngwaf/v1/workspaces/{workspace_id}/lists",
    ["workspace_id"],
  ],
];

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

// Every owned method, driven by its metadata, so a new table entry is covered without a new test.
describe("every NGWAF adapter", () => {
  const SAMPLES = { String: "a/b ?#", Number: 7, Boolean: false };
  const WRONG = { String: 7, Number: "7", Boolean: "false" };
  const isPathParam = (entry, name) => entry.httpPath.includes(`{${name}}`);
  const call = (client, entry, options) =>
    new NGWAF_API_CLASSES[entry.apiClass](client)[entry.method](options);
  const optionsOf = (entry, names) =>
    Object.fromEntries(
      entry.params
        .filter((p) => names.includes(p.name))
        .map((p) => [p.name, SAMPLES[p.type]]),
    );

  test("the index advertises the expected paths and required options", () => {
    expect(
      ngwafMethods().map((entry) => [
        `${entry.apiClass}.${entry.method}`,
        entry.httpPath,
        entry.params.filter((p) => p.required).map((p) => p.name),
      ]),
    ).toEqual(OPERATIONS);
    for (const entry of ngwafMethods()) {
      expect(entry.httpMethod).toBe("GET");
      for (const name of entry.httpPath.match(/(?<=\{)\w+(?=\})/g) ?? []) {
        expect(entry.params.find((p) => p.name === name)?.required).toBe(true);
      }
    }
  });

  test("path options fill the path and every other option goes to the query", async () => {
    for (const entry of ngwafMethods()) {
      const client = recordingClient();
      const all = optionsOf(
        entry,
        entry.params.map((p) => p.name),
      );
      const result = await call(client, entry, all);
      expect(result).toEqual({ data: [], meta: { limit: 100, total: 0 } });
      const [args] = client.calls;
      const [path, verb, pathParams, reserved, query] = args;
      expect([path, verb, reserved]).toEqual([entry.httpPath, "GET", {}]);
      expect(args.slice(5)).toEqual([
        {},
        {},
        null,
        ["token"],
        [],
        ["application/json"],
        Object,
        "https://api.fastly.com",
      ]);
      const inPath = ([name]) => isPathParam(entry, name);
      expect(pathParams).toEqual(
        Object.fromEntries(Object.entries(all).filter(inPath)),
      );
      expect(query).toEqual(
        Object.fromEntries(Object.entries(all).filter((e) => !inPath(e))),
      );
    }
  });

  test("optional options are sent only when given", async () => {
    for (const entry of ngwafMethods()) {
      const required = entry.params.filter((p) => p.required);
      const client = recordingClient();
      const nulls = Object.fromEntries(
        entry.params.filter((p) => !p.required).map((p) => [p.name, null]),
      );
      await call(client, entry, {
        ...optionsOf(
          entry,
          required.map((p) => p.name),
        ),
        ...nulls,
      });
      const [, , pathParams, , query] = client.calls[0];
      expect(Object.keys({ ...pathParams, ...query }).sort()).toEqual(
        required.map((p) => p.name).sort(),
      );
      if (required.length === 0) {
        await call(client, entry);
        expect(client.calls[1][4]).toEqual({});
      }
    }
  });

  test("a missing, empty or dot-segment required option fails before any request", async () => {
    for (const entry of ngwafMethods()) {
      const client = recordingClient();
      const required = entry.params.filter((p) => p.required);
      const valid = optionsOf(
        entry,
        required.map((p) => p.name),
      );
      for (const { name } of required) {
        const missing = `Missing the required parameter '${name}'.`;
        const { [name]: _, ...without } = valid;
        await expect(call(client, entry, without)).rejects.toThrow(missing);
        await expect(
          call(client, entry, { ...valid, [name]: "" }),
        ).rejects.toThrow(missing);
        await expect(
          call(client, entry, { ...valid, [name]: null }),
        ).rejects.toThrow(missing);
        if (!isPathParam(entry, name)) continue;
        for (const id of [".", ".."]) {
          await expect(
            call(client, entry, { ...valid, [name]: id }),
          ).rejects.toThrow(`'${name}' must be an ID, not '${id}'.`);
        }
      }
      expect(client.calls).toEqual([]);
    }
  });

  test("unknown options and wrong types fail before any request", async () => {
    for (const entry of ngwafMethods()) {
      const client = recordingClient();
      const valid = optionsOf(
        entry,
        entry.params.filter((p) => p.required).map((p) => p.name),
      );
      const accepted = entry.params.length
        ? `Its options are ${entry.params.map((p) => p.name).join(", ")}.`
        : "It takes no options.";
      await expect(call(client, entry, { ...valid, q2: "x" })).rejects.toThrow(
        `${entry.method} does not accept 'q2'. ${accepted}`,
      );
      for (const param of entry.params) {
        await expect(
          call(client, entry, { ...valid, [param.name]: WRONG[param.type] }),
        ).rejects.toThrow(`'${param.name}' must be `);
      }
      await expect(call(client, entry, [])).rejects.toThrow(
        `${entry.method} takes a single options object.`,
      );
      expect(client.calls).toEqual([]);
    }
  });
});
