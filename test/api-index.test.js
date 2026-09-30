import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Fastly from "fastly";
import { buildApiIndex } from "../src/api-index.js";
import { buildIndex } from "../src/indexer.js";
import { NGWAF_API_CLASSES, ngwafMethods } from "../src/ngwaf.js";
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
    for (const { apiClass, method } of ngwafMethods()) {
      const entry = index.find(
        (e) => e.apiClass === apiClass && e.method === method,
      );
      expect(entry.shortcut).toBe(
        apiClass.charAt(0).toLowerCase() + apiClass.slice(1),
      );
    }
  });

  test("the generated docs name exactly the pinned SDK's API classes", async () => {
    const generated = new Set((await buildIndex()).map((e) => e.apiClass));
    const exported = Object.keys(Fastly).filter(
      (name) => /Api$/.test(name) && typeof Fastly[name] === "function",
    );
    expect(generated.size).toBe(139);
    expect([...generated].sort()).toEqual(exported.sort());
    for (const name of Object.keys(NGWAF_API_CLASSES)) {
      expect(generated.has(name)).toBe(false);
      expect(Object.hasOwn(Fastly, name)).toBe(false);
    }
  });

  // Loading the SDK costs the server process about 130 ms and 51 MiB on Node, and only the sandbox child needs it.
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
    await expect(
      buildApiIndex({ docsDir, owned: [owned("NgwafRulesApi", "listOther")] }),
    ).rejects.toThrow("NgwafRulesApi is both");
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
      expect(doc.params.map((p) => p.name)).toEqual(
        expect.arrayContaining(["action", "enabled", "limit", "page", "types"]),
      );
      expect(doc.params.filter((p) => !p.required).length).toBe(5);
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
    expect(workspace.description).toContain("protection `mode`");
    expect(workspace.description).toContain("`traffic_ramp`");
    expect(workspace.description).toContain(
      "report enablement and blocking separately",
    );
    expect(workspace.example).toBe(
      "return await ngwafWorkspacesApi.getWorkspace({ workspace_id: '...' });",
    );
  });
});
