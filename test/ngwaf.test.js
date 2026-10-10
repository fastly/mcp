import { describe, expect, test } from "bun:test";
import { enrichMethod } from "../src/method-entry.js";
import { NGWAF_API_CLASSES, ngwafMethods } from "../src/ngwaf.js";
import {
  describeAdapterContract,
  recordingClient,
} from "./adapter-contract.js";
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

describeAdapterContract({
  name: "NGWAF",
  methods: ngwafMethods,
  classes: NGWAF_API_CLASSES,
  operations: OPERATIONS,
  firstParam: "action",
  sampleOptions: ngwafOptions,
});

describe("every NGWAF adapter", () => {
  const methods = () => ngwafMethods().map(enrichMethod);
  const call = (client, entry, options) =>
    new NGWAF_API_CLASSES[entry.apiClass](client)[entry.method](options);

  const PAGE = { data: [], meta: { limit: 100, total: 0 } };

  test("path options fill the path and the rest go to the query", async () => {
    for (const entry of methods()) {
      const client = recordingClient(PAGE);
      const all = ngwafOptions(entry);
      const result = await call(client, entry, all);
      expect(result).toEqual(PAGE);
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
});
