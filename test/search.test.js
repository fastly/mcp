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
});
