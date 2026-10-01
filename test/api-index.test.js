import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Fastly from "fastly";
import { buildApiIndex } from "../src/api-index.js";
import { buildIndex } from "../src/indexer.js";
import { ngwafMethods } from "../src/ngwaf.js";
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
  test("adds the NGWAF adapters to the generated operations", async () => {
    const generated = await buildIndex();
    expect(index.length).toBe(generated.length + ngwafMethods().length);
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
    await expect(buildApiIndex({ docsDir })).rejects.toThrow(
      "NgwafRulesApi is both in the generated SDK docs and implemented by this server",
    );
  });

  test("an owned method defined twice is refused", async () => {
    await expect(
      buildApiIndex({
        docsDir,
        owned: [owned("OtherApi", "getX"), owned("OtherApi", "getX")],
      }),
    ).rejects.toThrow("OtherApi.getX is defined twice.");
    const fine = await buildApiIndex({
      docsDir,
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

  test("signals and lists come first in search and explain `reference_id`", () => {
    for (const [query, apiClass, methods] of [
      [
        "ngwaf signals",
        "NgwafSignalsApi",
        ["listAccountSignals", "listWorkspaceSignals"],
      ],
      [
        "ngwaf lists",
        "NgwafListsApi",
        ["listAccountLists", "listWorkspaceLists"],
      ],
    ]) {
      const { matches } = search(index, query);
      expect(
        matches.slice(0, 2).map((m) => `${m.apiClass}.${m.method}`),
      ).toEqual(methods.map((method) => `${apiClass}.${method}`));
    }
    const accountLists = search(index, "ngwaf lists").matches[0];
    expect(accountLists.usage).toBe(
      "return await ngwafListsApi.listAccountLists();",
    );
    expect(accountLists.summary).toBe(
      "List the account's NGWAF lists with their entries, whose names start with `corp.`.",
    );

    for (const method of ["listAccountSignals", "listWorkspaceSignals"]) {
      const doc = inspect(index, `NgwafSignalsApi.${method}`);
      expect(doc.description).toContain("never against `id`");
      expect(doc.description).toContain("`limit: 200`");
      expect(doc.description).toContain("`data.length` equals `meta.total`");
      expect(doc.params.find((p) => p.name === "limit").required).toBe(false);
    }
    for (const method of ["listAccountLists", "listWorkspaceLists"]) {
      const doc = inspect(index, `NgwafListsApi.${method}`);
      expect(doc.description).toContain("operator: 'in_list'");
      expect(doc.description).toContain("never by its `id`");
    }
    expect(inspect(index, "listWorkspaceLists").example).toBe(
      "return await ngwafListsApi.listWorkspaceLists({ workspace_id: '...' });",
    );
    expect(inspect(index, "listWorkspaceRules").description).toContain(
      "matching on `reference_id`, never on `id`",
    );
  });

  test("analysis questions find the NGWAF methods before look-alikes", () => {
    const ranked = (query) =>
      search(index, query).matches.map((m) => `${m.apiClass}.${m.method}`);
    for (const [query, first, below] of [
      ["waf attacks", "NgwafWorkspacesApi.getTopAttacks"],
      ["top attacks", "NgwafWorkspacesApi.getTopAttacks"],
      ["blocked requests", "NgwafRequestsApi.searchWorkspaceRequests"],
      ["ngwaf events", "NgwafEventsApi.listEvents", "EventsApi.listEvents"],
      ["simulate request", "NgwafSimulateApi.ngwafSimulateWafRequest"],
      [
        "waf timeseries",
        "NgwafTimeseriesApi.getWorkspaceTimeseries",
        "ObservabilityTimeseriesApi.timeseriesGet",
      ],
    ]) {
      const results = ranked(query);
      expect(results[0]).toBe(first);
      if (below) expect(results.indexOf(below)).toBeGreaterThan(0);
    }
    expect(ranked("waf attacks")).toContain("NgwafReportsApi.getAttacksReport");
  });

  test("every summary is a whole first sentence", () => {
    for (const { apiClass, method, description } of ngwafMethods()) {
      const [match] = search(index, `${apiClass} ${method}`).matches;
      expect(`${match.apiClass}.${match.method}`).toBe(`${apiClass}.${method}`);
      expect(description.startsWith(match.summary)).toBe(true);
      expect(match.summary.endsWith(".")).toBe(true);
    }
  });

  test("analysis methods show required options in usage and explain their limits", () => {
    const usage = (name) => inspect(index, name).example;
    expect(usage("NgwafEventsApi.listEvents")).toBe(
      "return await ngwafEventsApi.listEvents({ workspace_id: '...', from: '...' });",
    );
    expect(usage("NgwafTimeseriesApi.getWorkspaceTimeseries")).toBe(
      "return await ngwafTimeseriesApi.getWorkspaceTimeseries({ workspace_id: '...', start: '...', metrics: '...' });",
    );
    expect(usage("NgwafWorkspacesApi.getTopAttacks")).toBe(
      "return await ngwafWorkspacesApi.getTopAttacks({ workspace_id: '...', field: '...', from: '...' });",
    );
    expect(usage("NgwafRequestsApi.getRequest")).toBe(
      "return await ngwafRequestsApi.getRequest({ workspace_id: '...', request_id: '...' });",
    );

    const doc = (name) => inspect(index, name).description;
    expect(doc("NgwafEventsApi.listEvents")).toContain(
      "`eventsApi.listEvents`",
    );
    // Events come from more than thresholds, and the summary is all that search shows.
    expect(
      search(index, "ngwaf events").matches.find(
        (m) => m.method === "listEvents",
      ).summary,
    ).toBe(
      "List one page of NGWAF events, the actions the WAF took against an IP because of threshold-based blocking, templated rules or site alerts.",
    );
    expect(doc("NgwafEventsApi.getEvent")).toContain("`eventsApi.getEvent`");
    expect(doc("NgwafTimeseriesApi.getWorkspaceTimeseries")).toContain(
      "`observabilityTimeseriesApi.timeseriesGet`",
    );
    const searchDoc = doc("NgwafRequestsApi.searchWorkspaceRequests");
    for (const phrase of [
      "`from:` and `until:`",
      "at most seven days",
      "does not mean nothing happened",
      "`ngwafReportsApi.getAttacksReport`",
      "is unverified",
      "never start from 0",
      "`meta.total` counts only the matches",
      "refused with a 400",
      "`JSON.parse(e.body).detail`",
      "about 20 seconds",
      "never the raw `request_headers`",
      "`reference_id`",
      "no live check has confirmed yet",
    ]) {
      expect(searchDoc).toContain(phrase);
    }
    for (const name of [
      "NgwafRequestsApi.getRequest",
      "NgwafEventsApi.listEvents",
      "NgwafEventsApi.getEvent",
      "NgwafSignalsApi.listAccountSignals",
      "NgwafSignalsApi.listWorkspaceSignals",
    ]) {
      expect(doc(name)).toContain("no live check has confirmed yet");
    }
    expect(doc("NgwafRequestsApi.getRequest")).toContain(
      "`ngwafSimulateApi.ngwafSimulateWafRequest`",
    );
    expect(doc("NgwafTimeseriesApi.getWorkspaceTimeseries")).toContain(
      "read the step from the timestamps",
    );
    expect(
      inspect(index, "NgwafEventsApi.listEvents").params.find(
        (p) => p.name === "status",
      ),
    ).toMatchObject({ type: "String", required: false });
  });
});
