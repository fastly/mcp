import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildIndex } from "../src/indexer.js";

const DOCS_DIR = join(import.meta.dir, "../docs");

describe("buildIndex – parse correctness", () => {
  let index;

  // Build once, share across tests in this describe block.
  test("builds index from real docs without throwing", async () => {
    index = await buildIndex(DOCS_DIR);
    expect(index).toBeDefined();
    expect(Array.isArray(index)).toBe(true);
  });

  test("PurgeApi has exactly 4 methods", () => {
    const purgeMethods = index.filter((m) => m.apiClass === "PurgeApi");
    expect(purgeMethods.map((m) => m.method).sort()).toEqual([
      "bulkPurgeTag",
      "purgeAll",
      "purgeSingleUrl",
      "purgeTag",
    ]);
    expect(purgeMethods).toHaveLength(4);
  });

  test("AclApi has exactly 5 methods", () => {
    const aclMethods = index.filter((m) => m.apiClass === "AclApi");
    expect(aclMethods).toHaveLength(5);
  });

  test("bulkPurgeTag has correct httpMethod and httpPath", () => {
    const bulkPurge = index.find(
      (m) => m.apiClass === "PurgeApi" && m.method === "bulkPurgeTag",
    );
    expect(bulkPurge).toBeDefined();
    expect(bulkPurge.httpMethod).toBe("POST");
    expect(bulkPurge.httpPath).toBe("/service/{service_id}/purge");
  });

  test("bulkPurgeTag has service_id (required) and fastly_soft_purge (optional) params", () => {
    const bulkPurge = index.find(
      (m) => m.apiClass === "PurgeApi" && m.method === "bulkPurgeTag",
    );
    const serviceId = bulkPurge.params.find((p) => p.name === "service_id");
    expect(serviceId).toBeDefined();
    expect(serviceId.required).toBe(true);

    const softPurge = bulkPurge.params.find(
      (p) => p.name === "fastly_soft_purge",
    );
    expect(softPurge).toBeDefined();
    expect(softPurge.required).toBe(false);
  });

  test("every method has a non-empty returnType", () => {
    for (const method of index) {
      expect(method.returnType).toBeTruthy();
      expect(method.returnType.length).toBeGreaterThan(0);
    }
  });
});

describe("buildIndex – golden test", () => {
  test("exactly 133 API classes are parsed", async () => {
    const index = await buildIndex(DOCS_DIR);
    const classes = new Set(index.map((m) => m.apiClass));
    expect(classes.size).toBe(133);
  });
});

describe("buildIndex – total method count", () => {
  test("total method count is at least 500", async () => {
    const index = await buildIndex(DOCS_DIR);
    expect(index.length).toBeGreaterThanOrEqual(500);
  });
});

describe("buildIndex – required startup checks", () => {
  test("throws on empty docs directory", async () => {
    let tmpDir;
    try {
      tmpDir = await mkdtemp(join(tmpdir(), "indexer-empty-"));
      await expect(buildIndex(tmpDir)).rejects.toThrow(
        "No *Api.md files found",
      );
    } finally {
      if (tmpDir) await rm(tmpDir, { recursive: true });
    }
  });

  test("succeeds with a temp dir containing a single valid Api.md file", async () => {
    let tmpDir;
    try {
      tmpDir = await mkdtemp(join(tmpdir(), "indexer-single-"));

      const validDoc = `# Fastly.FakeApi

\`\`\`javascript
const apiInstance = new Fastly.FakeApi();
\`\`\`
## Methods

Method | HTTP request | Description
------ | ------------ | -----------
[**doThing**](FakeApi.md#doThing) | **GET** /fake/{id} | Do a thing


## \`doThing\`

\`\`\`javascript
doThing({ id })
\`\`\`

Does a thing.

### Example

\`\`\`javascript
const options = { id: "abc" };
apiInstance.doThing(options);
\`\`\`

### Options

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**id** | **String** | The identifier. |

### Return type

**String**
`;

      await writeFile(join(tmpDir, "FakeApi.md"), validDoc);
      const index = await buildIndex(tmpDir);
      expect(index).toHaveLength(1);
      expect(index[0].apiClass).toBe("FakeApi");
      expect(index[0].method).toBe("doThing");
      expect(index[0].httpMethod).toBe("GET");
      expect(index[0].httpPath).toBe("/fake/{id}");
    } finally {
      if (tmpDir) await rm(tmpDir, { recursive: true });
    }
  });
});

describe("buildIndex – validation", () => {
  test("every parsed method has non-empty httpMethod and httpPath", async () => {
    const index = await buildIndex(DOCS_DIR);
    for (const method of index) {
      expect(method.httpMethod).toBeTruthy();
      expect(typeof method.httpMethod).toBe("string");
      expect(method.httpMethod.length).toBeGreaterThan(0);

      expect(method.httpPath).toBeTruthy();
      expect(typeof method.httpPath).toBe("string");
      expect(method.httpPath.length).toBeGreaterThan(0);
    }
  });
});
