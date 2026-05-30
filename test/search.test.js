import { describe, expect, test } from "bun:test";
import { search } from "../src/tools/search.js";

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
        description: "...",
      },
    ],
    returnType: "{String: String}",
  },
  {
    apiClass: "PurgeApi",
    method: "purgeSingleUrl",
    httpMethod: "POST",
    httpPath: "/purge/{cached_url}",
    description: "Instant Purge an individual URL",
    params: [
      {
        name: "cached_url",
        type: "String",
        required: true,
        description: "...",
      },
    ],
    returnType: "PurgeResponse",
  },
  {
    apiClass: "TlsCertificatesApi",
    method: "createTlsCert",
    httpMethod: "POST",
    httpPath: "/tls/certificates",
    description: "Create a TLS certificate",
    params: [
      {
        name: "tls_certificate",
        type: "TlsCertificate",
        required: false,
        description: "...",
      },
    ],
    returnType: "Object",
  },
  {
    apiClass: "TlsCertificatesApi",
    method: "listTlsCerts",
    httpMethod: "GET",
    httpPath: "/tls/certificates",
    description: "List TLS certificates",
    params: [],
    returnType: "[TlsCertificateBulkData]",
  },
  {
    apiClass: "ServiceApi",
    method: "createService",
    httpMethod: "POST",
    httpPath: "/service",
    description: "Create a service",
    params: [
      { name: "name", type: "String", required: true, description: "..." },
    ],
    returnType: "ServiceResponse",
  },
  {
    apiClass: "HistoricalApi",
    method: "getUsageService",
    httpMethod: "GET",
    httpPath: "/stats/usage_by_service",
    description: "Returns usage data per service",
    params: [
      { name: "from", type: "String", required: true, description: "..." },
      { name: "to", type: "String", required: true, description: "..." },
    ],
    returnType: "InlineResponse200",
  },
];

describe("search", () => {
  test("query 'purge' returns PurgeApi methods", () => {
    const result = search(mockIndex, "purge");
    expect(result.ok).toBe(true);
    expect(result.matches.length).toBeGreaterThanOrEqual(2);
    const methods = result.matches.map((m) => m.method);
    expect(methods).toContain("bulkPurgeTag");
    expect(methods).toContain("purgeSingleUrl");
  });

  test("query 'tls certificate' returns TLS-related methods via tokenization", () => {
    const result = search(mockIndex, "tls certificate");
    expect(result.ok).toBe(true);
    expect(result.matches.length).toBeGreaterThanOrEqual(2);
    const classes = result.matches.map((m) => m.apiClass);
    expect(classes).toContain("TlsCertificatesApi");
  });

  test("multi-word query 'usage service' matches via tokenization", () => {
    const result = search(mockIndex, "usage service");
    expect(result.ok).toBe(true);
    expect(result.matches.length).toBeGreaterThanOrEqual(1);
    const methods = result.matches.map((m) => m.method);
    expect(methods).toContain("getUsageService");
  });

  test("camelCase query 'getUsageService' is tokenized", () => {
    const result = search(mockIndex, "getUsageService");
    expect(result.ok).toBe(true);
    expect(result.matches.length).toBeGreaterThanOrEqual(1);
    // Exact match on the method name should rank it first
    expect(result.matches[0].method).toBe("getUsageService");
  });

  test("returnType match works", () => {
    const result = search(mockIndex, "PurgeResponse");
    expect(result.ok).toBe(true);
    expect(result.matches.length).toBeGreaterThanOrEqual(1);
    expect(result.matches[0].method).toBe("purgeSingleUrl");
  });

  test("query with no matches returns ok with empty matches and suggestions", () => {
    const result = search(mockIndex, "zzzznonexistent");
    expect(result.ok).toBe(true);
    expect(result.matches).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.hint).toContain("zzzznonexistent");
    expect(result.suggestions).toBeDefined();
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  test("low match count includes suggestions", () => {
    // A query that matches only 1-2 items should include suggestions
    const result = search(mockIndex, "cached_url");
    expect(result.ok).toBe(true);
    expect(result.total).toBeLessThanOrEqual(2);
    expect(result.suggestions).toBeDefined();
  });

  test("high match count does NOT include suggestions", () => {
    // "service" should match several methods — no suggestions needed
    const bigIndex = Array.from({ length: 20 }, (_, i) => ({
      apiClass: "ServiceApi",
      method: `serviceMethod${i}`,
      httpMethod: "GET",
      httpPath: `/service/${i}`,
      description: `Service operation ${i}`,
      params: [],
      returnType: "void",
    }));
    const result = search(bigIndex, "service");
    expect(result.ok).toBe(true);
    expect(result.total).toBeGreaterThan(2);
    expect(result.suggestions).toBeUndefined();
  });

  test("empty string query returns error", () => {
    const result = search(mockIndex, "");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("query must be a non-empty string");
  });

  test("whitespace-only query returns error", () => {
    const result = search(mockIndex, "   ");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("query must be a non-empty string");
  });

  test("null query returns error", () => {
    const result = search(mockIndex, null);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("query must be a non-empty string");
  });

  test("undefined query returns error", () => {
    const result = search(mockIndex, undefined);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("query must be a non-empty string");
  });

  test("exact method name match ranks higher than description-only match", () => {
    const result = search(mockIndex, "bulkPurgeTag");
    expect(result.ok).toBe(true);
    expect(result.matches.length).toBeGreaterThanOrEqual(1);
    expect(result.matches[0].method).toBe("bulkPurgeTag");

    if (result.matches.length > 1) {
      const idx = result.matches.findIndex(
        (m) => m.method === "purgeSingleUrl",
      );
      if (idx !== -1) {
        expect(idx).toBeGreaterThan(0);
      }
    }
  });

  test("hint field contains the query text", () => {
    const result = search(mockIndex, "purge");
    expect(result.ok).toBe(true);
    expect(result.hint).toContain("purge");

    const noMatch = search(mockIndex, "nonexistent");
    expect(noMatch.ok).toBe(true);
    expect(noMatch.hint).toContain("nonexistent");
  });

  test("total field matches actual match count", () => {
    const result = search(mockIndex, "purge");
    expect(result.ok).toBe(true);
    expect(result.total).toBeGreaterThanOrEqual(result.matches.length);

    const noMatch = search(mockIndex, "zzzznothing");
    expect(noMatch.ok).toBe(true);
    expect(noMatch.total).toBe(0);
    expect(noMatch.matches.length).toBe(0);
  });

  test("multi-token all-match bonus ranks correctly", () => {
    // "create service" should rank createService higher than methods that
    // only match one of the two terms
    const result = search(mockIndex, "create service");
    expect(result.ok).toBe(true);
    expect(result.matches.length).toBeGreaterThanOrEqual(1);
    expect(result.matches[0].method).toBe("createService");
  });

  describe("compact projection", () => {
    test("matches expose only the projected fields", () => {
      const result = search(mockIndex, "bulkPurgeTag");
      expect(result.ok).toBe(true);
      const match = result.matches[0];

      expect(Object.keys(match).sort()).toEqual(
        [
          "apiClass",
          "hasServiceIdParam",
          "httpMethod",
          "httpPath",
          "method",
          "pathParams",
          "requiredParams",
          "summary",
          "usage",
        ].sort(),
      );
    });

    test("heavy fields are absent from search matches", () => {
      const result = search(mockIndex, "bulkPurgeTag");
      const match = result.matches[0];

      expect(match.description).toBeUndefined();
      expect(match.returnType).toBeUndefined();
      expect(match.params).toBeUndefined();
      expect(match.example).toBeUndefined();
    });

    test("requiredParams reflects parsed required metadata", () => {
      const result = search(mockIndex, "bulkPurgeTag");
      const match = result.matches[0];
      expect(match.requiredParams).toEqual(["service_id"]);

      const tlsResult = search(mockIndex, "createTlsCert");
      const tlsMatch = tlsResult.matches[0];
      expect(tlsMatch.requiredParams).toEqual([]);
    });

    test("pathParams comes from httpPath placeholders, not params metadata", () => {
      const bulk = search(mockIndex, "bulkPurgeTag").matches[0];
      expect(bulk.pathParams).toEqual(["service_id"]);

      const single = search(mockIndex, "purgeSingleUrl").matches[0];
      expect(single.pathParams).toEqual(["cached_url"]);

      const list = search(mockIndex, "listTlsCerts").matches[0];
      expect(list.pathParams).toEqual([]);
    });

    test("pathParams and requiredParams can diverge", () => {
      // createService takes a required `name` param but has no path placeholders
      const result = search(mockIndex, "createService");
      const match = result.matches[0];
      expect(match.requiredParams).toEqual(["name"]);
      expect(match.pathParams).toEqual([]);
    });

    test("hasServiceIdParam is true when service_id appears in params", () => {
      const bulk = search(mockIndex, "bulkPurgeTag").matches[0];
      expect(bulk.hasServiceIdParam).toBe(true);

      const list = search(mockIndex, "listTlsCerts").matches[0];
      expect(list.hasServiceIdParam).toBe(false);

      const usage = search(mockIndex, "getUsageService").matches[0];
      expect(usage.hasServiceIdParam).toBe(false);
    });

    test("summary trims and shortens the description", () => {
      const longDesc =
        "Fetches historical stats for each of your Fastly services and groups the results by service ID. Additional details follow this sentence and should not appear in the summary.";
      const longIndex = [
        {
          apiClass: "HistoricalApi",
          method: "getHistStats",
          httpMethod: "GET",
          httpPath: "/stats",
          description: longDesc,
          params: [],
          returnType: "void",
        },
      ];
      const result = search(longIndex, "getHistStats");
      const match = result.matches[0];

      expect(match.summary.length).toBeLessThanOrEqual(160);
      expect(match.summary).toContain("Fetches historical stats");
      expect(match.summary).not.toContain("Additional details");
    });

    test("summary handles empty or missing descriptions", () => {
      const emptyIndex = [
        {
          apiClass: "FooApi",
          method: "foo",
          httpMethod: "GET",
          httpPath: "/foo",
          description: "",
          params: [],
          returnType: "void",
        },
      ];
      const result = search(emptyIndex, "foo");
      expect(result.matches[0].summary).toBe("");
    });

    test("scope is detected from generic prose cues, not a method lookup", () => {
      const scopedIndex = [
        {
          apiClass: "HistoricalApi",
          method: "getHistStats",
          httpMethod: "GET",
          httpPath: "/stats",
          description:
            "Fetches historical stats for each of your Fastly services and groups the results by service ID.",
          params: [],
          returnType: "void",
        },
        {
          apiClass: "HistoricalApi",
          method: "getHistStatsAggregated",
          httpMethod: "GET",
          httpPath: "/stats/aggregate",
          description:
            "Fetches historical stats information aggregated across all of your Fastly services.",
          params: [],
          returnType: "void",
        },
        {
          apiClass: "HistoricalApi",
          method: "getHistStatsService",
          httpMethod: "GET",
          httpPath: "/stats/service/{service_id}",
          description: "Fetches historical stats for a given service.",
          params: [],
          returnType: "void",
        },
      ];

      const all = search(scopedIndex, "historical stats").matches;
      const byMethod = Object.fromEntries(all.map((m) => [m.method, m]));

      expect(byMethod.getHistStats.scope.tag).toBe("all-services");
      expect(byMethod.getHistStatsAggregated.scope.tag).toBe("aggregated");
      expect(byMethod.getHistStatsService.scope.tag).toBe("single-service");
    });

    test("scope evidence is the verbatim source snippet", () => {
      const idx = [
        {
          apiClass: "FooApi",
          method: "foo",
          httpMethod: "GET",
          httpPath: "/foo",
          description:
            "Fetches historical stats for each of your Fastly services and does more things afterward.",
          params: [],
          returnType: "void",
        },
      ];
      const match = search(idx, "foo").matches[0];
      expect(match.scope).toBeDefined();
      expect(match.scope.evidence).toContain(
        "for each of your Fastly services",
      );
    });

    test("scope is omitted when no cue matches", () => {
      const idx = [
        {
          apiClass: "TlsApi",
          method: "createCert",
          httpMethod: "POST",
          httpPath: "/tls/certs",
          description: "Create a TLS certificate.",
          params: [],
          returnType: "void",
        },
      ];
      const match = search(idx, "createCert").matches[0];
      expect(match.scope).toBeUndefined();
    });

    test("aggregated cue is preferred over all-services when both could match", () => {
      // "aggregated across all" appears before "for each of your services"
      // in the cue list, so the more specific "aggregated" tag wins.
      const idx = [
        {
          apiClass: "FooApi",
          method: "foo",
          httpMethod: "GET",
          httpPath: "/foo",
          description:
            "Returns usage information aggregated across all Fastly services. Also exposes data for each of your services.",
          params: [],
          returnType: "void",
        },
      ];
      const match = search(idx, "foo").matches[0];
      expect(match.scope.tag).toBe("aggregated");
    });

    test("payload size shrinks noticeably versus the raw record", () => {
      // Mirrors the shape of real Fastly docs: long prose descriptions,
      // multiple params each with their own description text, return type
      // references, and example code blocks.
      const heavyIndex = Array.from({ length: 10 }, (_, i) => ({
        apiClass: "ServiceApi",
        method: `serviceMethod${i}`,
        httpMethod: "GET",
        httpPath: `/service/{service_id}/method/${i}`,
        description:
          "Fetches a detailed view of this resource. Accepts an optional timestamp range using start_time and end_time, or a month/year combo. Results are grouped by PoP location and include cache hit ratios, request counts, bandwidth consumed, and a number of other metrics that callers typically need when building dashboards or reports.",
        params: [
          {
            name: "service_id",
            type: "String",
            required: true,
            description:
              "Alphanumeric string identifying the service. Must be a valid service ID that the caller has access to.",
          },
          {
            name: "start_time",
            type: "Number",
            required: false,
            description:
              "Epoch timestamp marking the start of the window. Limits the results returned to entries on or after this timestamp.",
          },
          {
            name: "end_time",
            type: "Number",
            required: false,
            description:
              "Epoch timestamp marking the end of the window. Limits the results returned to entries on or before this timestamp.",
          },
          {
            name: "region",
            type: "String",
            required: false,
            description:
              "Limit query to a specific geographic region. One of: usa, europe, asia, asia_india, asia_southkorea, africa_std, mexico, southamerica_std.",
          },
        ],
        returnType: "DetailedServiceMetricsResponse",
        example:
          "const options = {\n  service_id: 'SU1Z0isxPaozGVKXdv0eY',\n  start_time: 1608560817,\n  end_time: 1608647217,\n};\n\napi.serviceMethod" +
          i +
          "(options).then((data) => console.log(data));",
      }));

      const projected = search(heavyIndex, "service");
      const projectedBytes = JSON.stringify(projected.matches).length;
      const rawBytes = JSON.stringify(heavyIndex).length;

      expect(projectedBytes).toBeLessThan(rawBytes * 0.5);
    });
  });
});
