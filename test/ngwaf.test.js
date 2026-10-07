import { describe, expect, test } from "bun:test";
import { buildIndex } from "../src/indexer.js";
import { enrichMethod } from "../src/method-entry.js";
import { operationsOf } from "../src/method-policy.js";
import { NGWAF_API_CLASSES, ngwafMethods } from "../src/ngwaf.js";
import { ngwafOptions } from "./helpers.js";

// Written out by hand, so a typo in the operation table can't pass its own test.
// Each entry has the path, the required options and the type of each optional one.
const RULE_FILTERS = {
  action: "String",
  enabled: "Boolean",
  limit: "Number",
  page: "Number",
  types: "String",
};
const OPERATIONS = [
  ["NgwafRulesApi.listAccountRules", "/ngwaf/v1/rules", [], RULE_FILTERS],
  [
    "NgwafRulesApi.listWorkspaceRules",
    "/ngwaf/v1/workspaces/{workspace_id}/rules",
    ["workspace_id"],
    RULE_FILTERS,
  ],
  [
    "NgwafWorkspacesApi.getWorkspace",
    "/ngwaf/v1/workspaces/{workspace_id}",
    ["workspace_id"],
    {},
  ],
  [
    "NgwafWorkspacesApi.getTopAttacks",
    "/ngwaf/v1/workspaces/{workspace_id}/top-attacks",
    ["workspace_id", "field", "from"],
    { to: "String", limit: "Number" },
  ],
  [
    "NgwafSignalsApi.listAccountSignals",
    "/ngwaf/v1/signals",
    [],
    { limit: "Number" },
  ],
  [
    "NgwafSignalsApi.listWorkspaceSignals",
    "/ngwaf/v1/workspaces/{workspace_id}/signals",
    ["workspace_id"],
    { limit: "Number" },
  ],
  ["NgwafListsApi.listAccountLists", "/ngwaf/v1/lists", [], {}],
  [
    "NgwafListsApi.listWorkspaceLists",
    "/ngwaf/v1/workspaces/{workspace_id}/lists",
    ["workspace_id"],
    {},
  ],
  [
    "NgwafEventsApi.listEvents",
    "/ngwaf/v1/workspaces/{workspace_id}/events",
    ["workspace_id", "from"],
    {
      to: "String",
      ip: "String",
      signal: "String",
      status: "String",
      limit: "Number",
      page: "Number",
    },
  ],
  [
    "NgwafEventsApi.getEvent",
    "/ngwaf/v1/workspaces/{workspace_id}/events/{event_id}",
    ["workspace_id", "event_id"],
    {},
  ],
  [
    "NgwafRequestsApi.searchWorkspaceRequests",
    "/ngwaf/v1/workspaces/{workspace_id}/requests",
    ["workspace_id"],
    { q: "String", limit: "Number", page: "Number" },
  ],
  [
    "NgwafRequestsApi.getRequest",
    "/ngwaf/v1/workspaces/{workspace_id}/requests/{request_id}",
    ["workspace_id", "request_id"],
    {},
  ],
  [
    "NgwafTimeseriesApi.getWorkspaceTimeseries",
    "/ngwaf/v1/workspaces/{workspace_id}/timeseries",
    ["workspace_id", "start", "metrics"],
    { end: "String", granularity: "Number" },
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

  test("lists the expected paths and options", () => {
    const methods = ngwafMethods().map(enrichMethod);
    expect(
      methods.map((entry) => [
        `${entry.apiClass}.${entry.method}`,
        entry.httpPath,
        entry.requiredParams,
        Object.fromEntries(
          entry.params.filter((p) => !p.required).map((p) => [p.name, p.type]),
        ),
      ]),
    ).toEqual(OPERATIONS);
    // Usage examples show '...' for every required option, which only fits strings.
    for (const entry of methods) {
      for (const param of entry.params.filter((p) => p.required)) {
        expect(param.type).toBe("String");
      }
    }
  });
});

// Runs every owned method through the same checks, so a new table entry needs no new test.
describe("every NGWAF adapter", () => {
  const WRONG = {
    String: [7],
    Number: ["7", 1.5],
    Boolean: ["false"],
  };
  const EXPECTED = {
    String: "a string",
    Number: "an integer",
    Boolean: "a boolean",
  };
  const methods = () => ngwafMethods().map(enrichMethod);
  const call = (client, entry, options) =>
    new NGWAF_API_CLASSES[entry.apiClass](client)[entry.method](options);

  test("path options fill the path and the rest go to the query", async () => {
    for (const entry of methods()) {
      const client = recordingClient();
      const all = ngwafOptions(entry);
      const result = await call(client, entry, all);
      expect(result).toEqual({ data: [], meta: { limit: 100, total: 0 } });
      const [args] = client.calls;
      expect(args).toEqual([
        entry.httpPath,
        "GET",
        expect.any(Object),
        {},
        expect.any(Object),
        {},
        {},
        null,
        ["token"],
        [],
        ["application/json"],
        Object,
        "https://api.fastly.com",
      ]);
      const inPath = ([name]) => entry.pathParams.includes(name);
      const entries = Object.entries(all);
      expect(args[2]).toEqual(Object.fromEntries(entries.filter(inPath)));
      expect(args[4]).toEqual(
        Object.fromEntries(entries.filter((e) => !inPath(e))),
      );
    }
  });

  test("optional options that are left out, null or undefined are not sent", async () => {
    for (const entry of methods()) {
      const client = recordingClient();
      const required = ngwafOptions(entry, entry.requiredParams);
      const optional = entry.params.filter((p) => !p.required);
      for (const unset of [null, undefined]) {
        await call(client, entry, {
          ...required,
          ...Object.fromEntries(optional.map((p) => [p.name, unset])),
        });
      }
      if (entry.requiredParams.length === 0) await call(client, entry);
      for (const [, , pathParams, , query] of client.calls) {
        expect(Object.keys({ ...pathParams, ...query }).sort()).toEqual(
          [...entry.requiredParams].sort(),
        );
      }
    }
  });

  test("a missing, empty or dot-segment required option is refused before any request", async () => {
    for (const entry of methods()) {
      const client = recordingClient();
      const valid = ngwafOptions(entry, entry.requiredParams);
      const [first] = entry.requiredParams;
      if (first) {
        await expect(call(client, entry)).rejects.toThrow(
          `Missing the required parameter '${first}'.`,
        );
      }
      for (const name of entry.requiredParams) {
        const missing = `Missing the required parameter '${name}'.`;
        const { [name]: _, ...without } = valid;
        for (const options of [
          without,
          { ...valid, [name]: "" },
          { ...valid, [name]: null },
        ]) {
          await expect(call(client, entry, options)).rejects.toThrow(missing);
        }
        if (!entry.pathParams.includes(name)) continue;
        for (const id of [".", ".."]) {
          await expect(
            call(client, entry, { ...valid, [name]: id }),
          ).rejects.toThrow(`'${name}' must be an ID, not '${id}'.`);
        }
      }
      expect(client.calls).toEqual([]);
    }
  });

  test("unknown options, wrong types and non-objects are refused before any request", async () => {
    for (const entry of methods()) {
      const client = recordingClient();
      const valid = ngwafOptions(entry, entry.requiredParams);
      const accepted = entry.params.length
        ? `Its options are ${entry.params.map((p) => p.name).join(", ")}.`
        : "It takes no options.";
      // Object.prototype names must not count as options.
      for (const name of ["q2", "__proto__", "constructor", "toString"]) {
        const options = JSON.parse(`{"${name}": "x"}`);
        await expect(
          call(client, entry, { ...valid, ...options }),
        ).rejects.toThrow(
          `${entry.method} does not accept '${name}'. ${accepted}`,
        );
      }
      for (const param of entry.params) {
        for (const wrong of WRONG[param.type]) {
          await expect(
            call(client, entry, { ...valid, [param.name]: wrong }),
          ).rejects.toThrow(`'${param.name}' must be ${EXPECTED[param.type]}.`);
        }
      }
      for (const options of [[], "ws1", null]) {
        await expect(call(client, entry, options)).rejects.toThrow(
          `${entry.method} takes a single options object.`,
        );
      }
      expect(client.calls).toEqual([]);
    }
  });
});
