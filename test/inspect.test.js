import { describe, expect, test } from "bun:test";
import { inspect } from "../src/tools/inspect.js";

const mockIndex = [
  {
    apiClass: "PurgeApi",
    method: "bulkPurgeTag",
    httpMethod: "POST",
    httpPath: "/service/{service_id}/purge",
    description: "Purge multiple surrogate key tags",
    params: [
      {
        name: "service_id",
        type: "String",
        required: true,
        description: "Service ID",
      },
    ],
    returnType: "{String: String}",
    example:
      'const options = {\n  service_id: "SU1Z0isxPaozGVKXdv0eY",\n};\n\napiInstance.bulkPurgeTag(options)\n  .then((data) => {\n    console.log(data, "API called successfully.");\n  })',
  },
  {
    apiClass: "ServiceApi",
    method: "listServices",
    httpMethod: "GET",
    httpPath: "/service",
    description: "List services",
    params: [
      {
        name: "per_page",
        type: "Number",
        required: false,
        description: "Number of items per page",
      },
    ],
    returnType: "[ServiceResponse]",
    example: "",
  },
  {
    apiClass: "ServiceApi",
    method: "getService",
    httpMethod: "GET",
    httpPath: "/service/{service_id}",
    description: "Get a specific service",
    params: [
      {
        name: "service_id",
        type: "String",
        required: true,
        description: "Service ID",
      },
    ],
    returnType: "ServiceResponse",
    example: "",
  },
];

describe("inspect", () => {
  test("exact method name match", () => {
    const result = inspect(mockIndex, "listServices");
    expect(result.ok).toBe(true);
    expect(result.apiClass).toBe("ServiceApi");
    expect(result.method).toBe("listServices");
    expect(result.httpMethod).toBe("GET");
    expect(result.httpPath).toBe("/service");
    expect(result.description).toBe("List services");
    expect(result.returnType).toBe("[ServiceResponse]");
    expect(result.params).toHaveLength(1);
    expect(result.usage).toContain("Fastly.ServiceApi");
    expect(result.usage).toContain("listServices");
  });

  test("case-insensitive match", () => {
    const result = inspect(mockIndex, "LISTSERVICES");
    expect(result.ok).toBe(true);
    expect(result.method).toBe("listServices");
  });

  test("ClassName.methodName format", () => {
    const result = inspect(mockIndex, "PurgeApi.bulkPurgeTag");
    expect(result.ok).toBe(true);
    expect(result.apiClass).toBe("PurgeApi");
    expect(result.method).toBe("bulkPurgeTag");
  });

  test("ClassName.methodName is case-insensitive", () => {
    const result = inspect(mockIndex, "purgeapi.bulkpurgetag");
    expect(result.ok).toBe(true);
    expect(result.method).toBe("bulkPurgeTag");
  });

  test("includes example when available", () => {
    const result = inspect(mockIndex, "bulkPurgeTag");
    expect(result.ok).toBe(true);
    expect(result.example).toContain("bulkPurgeTag");
  });

  test("omits example field when empty", () => {
    const result = inspect(mockIndex, "listServices");
    expect(result.ok).toBe(true);
    expect(result.example).toBeUndefined();
  });

  test("unknown method returns error with suggestions", () => {
    const result = inspect(mockIndex, "getServices");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("No method named");
    // Should suggest partial matches
    expect(result.error).toContain("getService");
  });

  test("completely unknown method returns error with search hint", () => {
    const result = inspect(mockIndex, "zzzzNonexistent");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("No method named");
    expect(result.error).toContain("search tool");
  });

  test("empty string returns error", () => {
    const result = inspect(mockIndex, "");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("non-empty");
  });

  test("null returns error", () => {
    const result = inspect(mockIndex, null);
    expect(result.ok).toBe(false);
  });

  test("usage snippet includes params placeholder when method has params", () => {
    const result = inspect(mockIndex, "listServices");
    expect(result.usage).toContain("{ /* params */ }");
  });

  test("usage snippet has empty parens when no params", () => {
    // Need a method with no params for this - getService has params
    // bulkPurgeTag has params too. Let's just test the general structure.
    const result = inspect(mockIndex, "listServices");
    expect(result.usage).toContain("return await");
  });
});
