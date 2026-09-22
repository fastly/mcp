import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import Fastly from "fastly";
import { buildIndex } from "../src/indexer.js";
import {
  operationsOf,
  projectRemoteIndex,
  remoteDenial,
  remoteUnavailableOperations,
} from "../src/method-policy.js";
import { execute } from "../src/tools/execute.js";
import { inspect } from "../src/tools/inspect.js";
import { search } from "../src/tools/search.js";

const SDK_API_DIR = join(
  dirname(createRequire(import.meta.url).resolve("fastly")),
  "api",
);

describe("remote operation policy", () => {
  test("every SDK operation that uploads a file is on the denied list", () => {
    // When an SDK upgrade adds another upload operation, this fails until
    // someone decides what remote mode should do with it.
    const uploads = [];
    for (const file of readdirSync(SDK_API_DIR)) {
      const source = readFileSync(join(SDK_API_DIR, file), "utf8");
      const methods = source.split(/\n {4}key: "/).slice(1);
      for (const method of methods) {
        const name = method.slice(0, method.indexOf('"'));
        if (!name.endsWith("WithHttpInfo")) continue;
        if (/multipart\/form-data|\bFile\b/.test(method)) {
          uploads.push({
            apiClass: file.replace(/\.js$/, ""),
            method: name.replace(/WithHttpInfo$/, ""),
          });
        }
      }
    }
    expect(uploads).toEqual([{ apiClass: "PackageApi", method: "putPackage" }]);
    expect(
      remoteUnavailableOperations().map(({ apiClass, method }) => ({
        apiClass,
        method,
      })),
    ).toEqual(uploads);
    for (const { reason } of remoteUnavailableOperations()) {
      expect(reason).toContain("file");
    }
  });

  test("both spellings of a denied operation are denied, neighbors are not", () => {
    expect(remoteDenial("PackageApi", "putPackage")).toContain("file");
    expect(remoteDenial("PackageApi", "putPackageWithHttpInfo")).toContain(
      "file",
    );
    expect(remoteDenial("PackageApi", "getPackage")).toBeUndefined();
    expect(remoteDenial("ServiceApi", "putPackage")).toBeUndefined();
    expect(remoteDenial("PackageApi", "constructor")).toBeUndefined();
    expect(remoteDenial("PackageApi", Symbol("x"))).toBeUndefined();
  });

  test("the remote index hides denied operations and nothing else", async () => {
    const index = await buildIndex();
    const remote = projectRemoteIndex(index);
    const local = index.filter((entry) => entry.apiClass === "PackageApi");
    expect(local.map((entry) => entry.method).sort()).toEqual([
      "getPackage",
      "putPackage",
    ]);
    expect(index.length - remote.length).toBe(1);
    expect(search(remote, "putPackage").matches).not.toContainEqual(
      expect.objectContaining({ method: "putPackage" }),
    );
    expect(inspect(remote, "putPackage", { remote: true }).error).toContain(
      "unavailable on this remote server",
    );
    expect(
      inspect(remote, "packageapi.PUTPACKAGE", { remote: true }).error,
    ).toContain("unavailable on this remote server");
    expect(inspect(remote, "getPackage", { remote: true }).ok).toBe(true);
    expect(inspect(index, "putPackage").ok).toBe(true);
  });

  test("operation names are the SDK class's own methods only", () => {
    const operations = operationsOf(Fastly.ServiceApi);
    expect(operations.has("listServices")).toBe(true);
    expect(operations.has("listServicesWithHttpInfo")).toBe(true);
    for (const inherited of [
      "constructor",
      "toString",
      "hasOwnProperty",
      "valueOf",
      "__defineGetter__",
      "__proto__",
      "apiClient",
    ]) {
      expect(operations.has(inherited)).toBe(false);
    }
  });
});

describe("operation allowlist in local executions", () => {
  test("inherited and non-operation callables are rejected before the SDK runs", async () => {
    for (const name of [
      "constructor",
      "toString",
      "hasOwnProperty",
      "__defineGetter__",
      "__lookupGetter__",
      "valueOf",
    ]) {
      const result = await execute(
        `try { return await serviceApi[${JSON.stringify(name)}]("x"); } catch (e) { return "refused: " + e.message; }`,
      );
      const value = result.result ?? result.error;
      expect(String(value)).toMatch(
        /Unknown Fastly API method|undefined|not a function/,
      );
      expect(String(value)).not.toContain("[object");
    }
  }, 60000);

  test("local executions keep fetch and may name putPackage", async () => {
    const result = await execute(
      "return [typeof fetch, typeof packageApi.putPackage];",
    );
    expect(result.result).toEqual(["function", "function"]);
  }, 30000);
});
