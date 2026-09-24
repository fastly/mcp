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
    expect(result.example).toContain("serviceApi");
    expect(result.example).toContain("listServices");
    expect(result.example).not.toContain("new Fastly");
    expect(result.usage).toBeUndefined();
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

  test("the example is the same call search suggests, with the required parameters", () => {
    const result = inspect(mockIndex, "bulkPurgeTag");
    expect(result.ok).toBe(true);
    expect(result.example).toBe(
      "return await purgeApi.bulkPurgeTag({ service_id: '...' });",
    );
  });

  test("the example leaves optional parameters out", () => {
    const result = inspect(mockIndex, "listServices");
    expect(result.example).toBe("return await serviceApi.listServices();");
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

  test("example has empty parens when no params", () => {
    const result = inspect(
      [
        {
          apiClass: "StatusApi",
          method: "ping",
          httpMethod: "GET",
          httpPath: "/status",
          description: "Check API status",
          params: [],
          returnType: "String",
        },
      ],
      "ping",
    );
    expect(result.example).toBe("return await statusApi.ping();");
  });

  test("inspect surfaces constraints when present", () => {
    const idx = [
      {
        apiClass: "StatsApi",
        method: "getServiceStats",
        httpMethod: "GET",
        httpPath: "/service/{service_id}/stats/summary",
        description:
          "Get the stats from a service for a block of time. Use either a timestamp range (using start_time and end_time) or a specified month/year combo (using month and year).",
        params: [
          {
            name: "service_id",
            type: "String",
            required: true,
            description: "",
          },
          {
            name: "start_time",
            type: "Number",
            required: false,
            description: "",
          },
          {
            name: "end_time",
            type: "Number",
            required: false,
            description: "",
          },
          { name: "month", type: "String", required: false, description: "" },
          { name: "year", type: "String", required: false, description: "" },
        ],
        returnType: "Stats",
        constraints: [
          {
            kind: "oneOf",
            groups: [
              ["start_time", "end_time"],
              ["month", "year"],
            ],
            sourceText:
              "Use either a timestamp range (using start_time and end_time) or a specified month/year combo (using month and year).",
          },
        ],
      },
    ];
    const result = inspect(idx, "getServiceStats");
    expect(result.ok).toBe(true);
    expect(result.constraints).toBeDefined();
    expect(result.constraints[0].kind).toBe("oneOf");
    expect(result.constraints[0].groups).toEqual([
      ["start_time", "end_time"],
      ["month", "year"],
    ]);
    expect(result.constraints[0].sourceText).toContain(
      "start_time and end_time",
    );
  });

  test("inspect omits constraints when empty or absent", () => {
    const idxEmpty = [
      {
        apiClass: "FooApi",
        method: "foo",
        httpMethod: "GET",
        httpPath: "/foo",
        description: "Plain endpoint.",
        params: [],
        returnType: "void",
        constraints: [],
      },
    ];
    expect(inspect(idxEmpty, "foo").constraints).toBeUndefined();

    const idxAbsent = [
      {
        apiClass: "FooApi",
        method: "foo",
        httpMethod: "GET",
        httpPath: "/foo",
        description: "Plain endpoint.",
        params: [],
        returnType: "void",
      },
    ];
    expect(inspect(idxAbsent, "foo").constraints).toBeUndefined();
  });

  test("inspect retains the heavy fields that search drops", () => {
    // Search projects to a slim record; inspect is the canonical source
    // for full description, full params (with types + per-param descriptions),
    // and returnType.
    const result = inspect(mockIndex, "bulkPurgeTag");
    expect(result.ok).toBe(true);
    expect(result.description).toBe("Purge multiple surrogate key tags");
    expect(result.returnType).toBe("{String: String}");
    expect(Array.isArray(result.params)).toBe(true);
    expect(result.params[0]).toEqual({
      name: "service_id",
      type: "String",
      required: true,
      description: "Service ID",
    });
  });
});
