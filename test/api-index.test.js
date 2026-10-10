import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Fastly from "fastly";
import { buildApiIndex, ownedMethods } from "../src/api-index.js";
import { buildIndex } from "../src/indexer.js";
import { REPLACED_SDK_CLASSES } from "../src/log-explorer.js";
import { inspect } from "../src/tools/inspect.js";
import { search } from "../src/tools/search.js";
import { tempDir } from "./helpers.js";

const FAKE_DOC = `# Fastly.NgwafRulesApi

## Methods

Method | HTTP request | Description
------ | ------------ | -----------
[**createRule**](NgwafRulesApi.md#createRule) | **POST** /ngwaf/v1/rules | Create a rule


## \`createRule\`

\`\`\`javascript
createRule()
\`\`\`

Create a rule.

### Example

\`\`\`javascript
apiInstance.createRule();
\`\`\`

### Return type

**Object**
`;

let index;
let docsDir;

beforeAll(async () => {
  index = await buildApiIndex();
  docsDir = tempDir("api-index");
  writeFileSync(join(docsDir, "NgwafRulesApi.md"), FAKE_DOC);
});

afterAll(() => {
  rmSync(docsDir, { recursive: true, force: true });
});

const owned = (apiClass, method) => ({
  apiClass,
  method,
  httpMethod: "GET",
  httpPath: "/x",
  description: "X.",
  params: [],
  constraints: [],
  returnType: "Object",
});

describe("the public index", () => {
  test("adds the owned adapters to the generated operations", async () => {
    const generated = await buildIndex();
    const standsIn = generated.filter((e) =>
      REPLACED_SDK_CLASSES.includes(e.apiClass),
    );
    expect(standsIn.length).toBeGreaterThan(0);
    expect(index.length).toBe(
      generated.length - standsIn.length + ownedMethods().length,
    );
  });

  // The adapter and the generated operation share a name, so the index has to offer one of the two, not both.
  test("a replaced class comes from the adapters only", async () => {
    const generated = await buildIndex();
    for (const apiClass of REPLACED_SDK_CLASSES) {
      const fromDocs = generated.filter((e) => e.apiClass === apiClass);
      const published = index.filter((e) => e.apiClass === apiClass);
      expect(fromDocs.length).toBeGreaterThan(0);
      expect(published.map((e) => e.method).sort()).toEqual(
        fromDocs.map((e) => e.method).sort(),
      );
      // The generated docs leave these blank.
      for (const entry of published) {
        for (const param of entry.params) {
          expect(param.description).not.toBe("");
        }
      }
    }
  });

  test("a replacement the generated docs no longer define is refused", async () => {
    await expect(
      buildApiIndex({ owned: [], replaced: ["GoneApi"] }),
    ).rejects.toThrow(
      "GoneApi stands in for an SDK class the generated docs no longer define.",
    );
  });

  test("the generated docs name exactly the pinned SDK's API classes", async () => {
    const generated = new Set((await buildIndex()).map((e) => e.apiClass));
    const exported = Object.keys(Fastly).filter(
      (name) => /Api$/.test(name) && typeof Fastly[name] === "function",
    );
    expect([...generated].sort()).toEqual(exported.sort());
  });

  // Discovery must not pay the SDK's import cost in the server process.
  test("building the index never loads the SDK into the server", () => {
    const probe = `
      import { createRequire } from "node:module";
      const require = createRequire(import.meta.url);
      await import("./src/main.js");
      await (await import("./src/api-index.js")).buildApiIndex();
      const loaded = () => Object.keys(require.cache).filter((k) => k.includes("/node_modules/fastly/")).length;
      const before = loaded();
      await import("fastly");
      console.log(JSON.stringify([before, loaded() > 0]));
    `;
    const out = spawnSync("node", ["--input-type=module", "-e", probe], {
      cwd: join(import.meta.dir, ".."),
      encoding: "utf8",
    });
    expect(JSON.parse(out.stdout)).toEqual([0, true]);
  });

  test("an owned class the generated docs also define is refused, whatever its methods", async () => {
    await expect(buildApiIndex({ docsDir, replaced: [] })).rejects.toThrow(
      "NgwafRulesApi is both in the generated SDK docs and implemented by this server",
    );
  });

  test("an owned method defined twice is refused", async () => {
    await expect(
      buildApiIndex({
        docsDir,
        replaced: [],
        owned: [owned("OtherApi", "getX"), owned("OtherApi", "getX")],
      }),
    ).rejects.toThrow("OtherApi.getX is defined twice.");
    const fine = await buildApiIndex({
      docsDir,
      replaced: [],
      owned: [owned("OtherApi", "getX"), owned("OtherApi", "getY")],
    });
    expect(fine.map((e) => `${e.apiClass}.${e.method}`)).toEqual([
      "NgwafRulesApi.createRule",
      "OtherApi.getX",
      "OtherApi.getY",
    ]);
  });
});

describe("NGWAF discovery", () => {
  test("search finds every adapter method with ready-to-run usage", () => {
    const rules = search(index, "ngwaf rules");
    const byMethod = Object.fromEntries(
      rules.matches.map((match) => [match.method, match]),
    );
    expect(byMethod.listAccountRules).toMatchObject({
      apiClass: "NgwafRulesApi",
      httpMethod: "GET",
      httpPath: "/ngwaf/v1/rules",
      requiredParams: [],
      pathParams: [],
      usage: "return await ngwafRulesApi.listAccountRules();",
    });
    expect(byMethod.listWorkspaceRules).toMatchObject({
      httpPath: "/ngwaf/v1/workspaces/{workspace_id}/rules",
      requiredParams: ["workspace_id"],
      pathParams: ["workspace_id"],
      usage:
        "return await ngwafRulesApi.listWorkspaceRules({ workspace_id: '...' });",
    });
    expect(byMethod.listAccountRules.summary).toBe(
      "List one page of account-level NGWAF rules, which can apply to several workspaces.",
    );

    const workspace = search(index, "ngwaf workspace");
    expect(workspace.matches).toContainEqual(
      expect.objectContaining({
        method: "getWorkspace",
        usage:
          "return await ngwafWorkspacesApi.getWorkspace({ workspace_id: '...' });",
      }),
    );
  });

  test("inspect carries the paging, filter and scope guidance, with a required-only example", () => {
    for (const method of ["listAccountRules", "listWorkspaceRules"]) {
      const doc = inspect(index, `NgwafRulesApi.${method}`);
      expect(doc.ok).toBe(true);
      expect(doc.returnType).toBe("Object");
      expect(doc.description).toContain("one page");
      expect(doc.description).toContain("`meta.total`");
      expect(doc.description).toContain("Pages are numbered from 1");
      expect(doc.description).toContain("`page: 0` is refused");
      expect(doc.description).toContain("a rule seen twice counts once");
      expect(doc.description).toContain("report the list as incomplete");
      expect(doc.description).toContain("`enabled: true`");
      expect(doc.description).toContain("sent unchanged");
      expect(doc.description).toContain("getProductNgwafConfiguration");
      const optionalParams = doc.params.filter((p) => !p.required);
      expect(optionalParams.map((p) => p.name)).toEqual([
        "action",
        "enabled",
        "limit",
        "page",
        "types",
      ]);
      expect(doc.constraints).toBeUndefined();
    }
    const account = inspect(index, "listAccountRules");
    expect(account.description).toContain(
      "never report a filtered account listing as complete",
    );
    expect(inspect(index, "listWorkspaceRules").description).toContain(
      "a filtered listing is complete when its distinct IDs reach that total",
    );
    expect(account.description).toContain("`scope.applies_to`");
    expect(account.description).toContain("`'*'`");
    expect(account.description).toContain("does not send it");
    expect(account.example).toBe(
      "return await ngwafRulesApi.listAccountRules();",
    );
    expect(inspect(index, "listWorkspaceRules").example).toBe(
      "return await ngwafRulesApi.listWorkspaceRules({ workspace_id: '...' });",
    );

    const workspace = inspect(index, "ngwafworkspacesapi.GETWORKSPACE");
    expect(workspace.returnType).toBe("Object");
    expect(workspace.constraints).toBeUndefined();
    expect(workspace.params.map((p) => p.name)).toEqual(["workspace_id"]);
    expect(workspace.description).toContain("protection `mode`");
    expect(workspace.description).toContain("`traffic_ramp`");
    expect(workspace.description).toContain(
      "report enablement and blocking separately",
    );
    expect(workspace.example).toBe(
      "return await ngwafWorkspacesApi.getWorkspace({ workspace_id: '...' });",
    );
  });

  test("search puts the NGWAF methods ahead of look-alikes", () => {
    for (const [query, first] of [
      [
        "ngwaf signals",
        [
          "NgwafSignalsApi.listAccountSignals",
          "NgwafSignalsApi.listWorkspaceSignals",
        ],
      ],
      [
        "ngwaf lists",
        ["NgwafListsApi.listAccountLists", "NgwafListsApi.listWorkspaceLists"],
      ],
      [
        "waf attacks",
        [
          "NgwafWorkspacesApi.getTopAttacks",
          "NgwafReportsApi.getAttacksReport",
        ],
      ],
      ["top attacks", ["NgwafWorkspacesApi.getTopAttacks"]],
      ["blocked requests", ["NgwafRequestsApi.searchWorkspaceRequests"]],
      ["ngwaf events", ["NgwafEventsApi.listEvents"]],
      ["simulate request", ["NgwafSimulateApi.ngwafSimulateWafRequest"]],
      ["waf timeseries", ["NgwafTimeseriesApi.getWorkspaceTimeseries"]],
    ]) {
      const ranked = search(index, query).matches.map(
        (m) => `${m.apiClass}.${m.method}`,
      );
      expect(ranked.slice(0, first.length)).toEqual(first);
    }
  });

  test("every summary is a whole first sentence", () => {
    for (const { apiClass, method, description } of ownedMethods()) {
      const { matches } = search(index, `${apiClass}.${method}`);
      const match = matches.find(
        (entry) => entry.apiClass === apiClass && entry.method === method,
      );
      expect(match).toBeDefined();
      expect(description.startsWith(match.summary)).toBe(true);
      expect(match.summary.endsWith(".")).toBe(true);
    }
  });

  test("every method a description mentions exists", () => {
    const known = new Set(index.map((e) => `${e.shortcut}.${e.method}`));
    const mentioned = ownedMethods().flatMap(({ description }) =>
      [...description.matchAll(/`(\w+Api)\.(\w+)/g)].map(
        ([, api, m]) => `${api}.${m}`,
      ),
    );
    expect(mentioned.length).toBeGreaterThan(10);
    expect(mentioned.filter((name) => !known.has(name))).toEqual([]);
  });

  test("descriptions carry the guidance snippets need", () => {
    const signals = [
      "never on `id`",
      "`limit: 200`",
      "`data.length` equals `meta.total`",
      "no live check has confirmed yet",
    ];
    const lists = [
      "operator: 'in_list'",
      "never by its `id`",
      "`data.length` equals `meta.total`",
    ];
    for (const [name, phrases] of [
      [
        "NgwafRulesApi.listWorkspaceRules",
        ["matching on `reference_id`, never on `id`"],
      ],
      ["NgwafSignalsApi.listAccountSignals", signals],
      ["NgwafSignalsApi.listWorkspaceSignals", signals],
      ["NgwafListsApi.listAccountLists", lists],
      ["NgwafListsApi.listWorkspaceLists", lists],
      [
        "NgwafEventsApi.listEvents",
        [
          "`eventsApi.listEvents`",
          "`page: 0` returns page 1 again",
          "no live check has confirmed yet",
        ],
      ],
      [
        "NgwafEventsApi.getEvent",
        ["`eventsApi.getEvent`", "no live check has confirmed yet"],
      ],
      [
        "NgwafRequestsApi.searchWorkspaceRequests",
        [
          "`from:` and `until:`",
          "at most seven days",
          "refused with a 400",
          "does not mean nothing happened",
          "is unverified",
          "`page: 0` returns page 1 again",
          "counts only the records that match",
          "about 20 seconds",
          "in a `Map`",
          "`JSON.parse(e.body).detail`",
          "never the raw `request_headers`",
          "no live check has confirmed yet",
        ],
      ],
      [
        "NgwafRequestsApi.getRequest",
        [
          "`ngwafSimulateApi.ngwafSimulateWafRequest`",
          "no live check has confirmed yet",
        ],
      ],
      [
        "NgwafTimeseriesApi.getWorkspaceTimeseries",
        [
          "`observabilityTimeseriesApi.timeseriesGet`",
          "read the step from the timestamps",
        ],
      ],
    ]) {
      const { description } = inspect(index, name);
      for (const phrase of phrases) expect(description).toContain(phrase);
    }
    // Search shows only this sentence, and events come from more than thresholds.
    expect(search(index, "ngwaf events").matches[0].summary).toBe(
      "List one page of NGWAF events, the actions the WAF took against an IP because of threshold-based blocking, templated rules or site alerts.",
    );
    expect(inspect(index, "getWorkspaceTimeseries").example).toBe(
      "return await ngwafTimeseriesApi.getWorkspaceTimeseries({ workspace_id: '...', start: '...', metrics: '...' });",
    );
  });
});

describe("Log Explorer discovery", () => {
  test("search finds each adapter method with ready-to-run usage", () => {
    for (const [query, expected] of [
      [
        "log records",
        {
          apiClass: "LogExplorerApi",
          method: "getLogRecords",
          httpMethod: "GET",
          httpPath: "/observability/log-explorer",
          requiredParams: ["service_id", "start", "end"],
          pathParams: [],
          hasServiceIdParam: true,
          usage:
            "return await logExplorerApi.getLogRecords({ service_id: '...', start: '...', end: '...' });",
        },
      ],
      [
        "log insights",
        {
          apiClass: "InsightsApi",
          method: "getLogInsights",
          httpPath: "/observability/log-insights",
          requiredParams: ["visualization", "service_id", "start", "end"],
          usage:
            "return await insightsApi.getLogInsights({ visualization: '...', service_id: '...', start: '...', end: '...' });",
        },
      ],
      [
        "log aggregations",
        {
          apiClass: "ObservabilityAggregationsForLogsApi",
          method: "logAggregationsGet",
          httpPath: "/observability/aggregations",
          requiredParams: ["service_id", "start", "end", "series"],
          usage:
            "return await observabilityAggregationsForLogsApi.logAggregationsGet({ service_id: '...', start: '...', end: '...', series: '...' });",
        },
      ],
    ]) {
      expect(search(index, query).matches).toContainEqual(
        expect.objectContaining(expected),
      );
    }
  });

  test("inspect carries the guidance a snippet needs", () => {
    const shared = [
      "Log Explorer & Insights product enabled",
      "kept for seven days",
      "samples these records",
    ];
    for (const [name, phrases] of [
      [
        "LogExplorerApi.getLogRecords",
        [
          ...shared,
          "newest first",
          "`meta.filters.next_cursor`",
          "absent once the window holds nothing more",
          "use the `is_` names above",
          "about 65 fields",
          "in a `Map`",
          "`JSON.parse(e.body).errors[0].reason`",
        ],
      ],
      [
        "InsightsApi.getLogInsights",
        [
          ...shared,
          "top-url-by-duration-sum",
          "always answers 500",
          "ignore `limit`",
          "`top-4xx-urls` and `top-5xx-urls` have no `values`",
        ],
      ],
      [
        "ObservabilityAggregationsForLogsApi.logAggregationsGet",
        [
          ...shared,
          "`avg`, `min`, `max`, `p95` and `p99`",
          "no `count` and no `sum`",
          "this method splits them",
          "keeps only the first value",
          "the field's type does not say which ones do",
        ],
      ],
    ]) {
      const doc = inspect(index, name);
      expect(doc.ok).toBe(true);
      expect(doc.returnType).toBe("Object");
      for (const phrase of phrases) expect(doc.description).toContain(phrase);
      const limit = doc.params.find((p) => p.name === "limit");
      expect(limit.description).toContain("from 1 to 100");
    }
  });

  // The adapters keep the SDK's class names, so check that the product class they leave alone is untouched.
  test("the enablement class still comes from the generated docs", () => {
    const doc = inspect(
      index,
      "ProductLogExplorerInsightsApi.getProductLogExplorerInsights",
    );
    expect(doc.ok).toBe(true);
    expect(doc.description).toBe(
      "Get the enablement status of the Log Explorer & Insights product on a service.",
    );
  });
});
