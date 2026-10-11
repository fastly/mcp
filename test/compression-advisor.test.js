import { describe, expect, test } from "bun:test";
import { setTimeout as sleep } from "node:timers/promises";
import {
  CompressionAdvisorApi,
  classifyContentType,
  SOURCES,
} from "../src/compression-advisor.js";

const NOW = Date.parse("2026-10-11T12:00:00Z");
const DAY = 86_400_000;
const RANGE = {
  from: new Date(NOW - 7 * DAY).toISOString(),
  to: new Date(NOW).toISOString(),
};
const SIZE = "avg[response_bytes_body]";

/** A VCL service with HTML and JSON, both compressible, and PNG, which is not. */
function service(overrides = {}) {
  const { version, ...rest } = overrides;
  return {
    id: "svc1",
    name: "storefront",
    type: "vcl",
    version: {
      number: 42,
      gzips: [],
      vcls: [],
      snippets: [],
      backends: [],
      ...version,
    },
    stats: {
      bandwidth: 1_000e9,
      edge_resp_body_bytes: 900e9,
      compute_resp_body_bytes: 800e9,
    },
    rates: [
      ["text/html", 0.25],
      ["application/json", 0.25],
      ["image/png", 0.5],
    ],
    sizes: [
      ["text/html; charset=utf-8", 4000],
      ["application/json", 8000],
      ["image/png", 20000],
    ],
    overall: 13000,
    urls: [
      ["GET /index.html", 0.1],
      ["GET /api/items.json", 0.2],
      ["GET /logo.png", 0.7],
    ],
    ...rest,
  };
}

// HTML in two spellings, so its average size needs a weighted query.
const TWO_HTML_SPELLINGS = {
  sizes: [
    ["text/html", 1000],
    ["text/html; charset=utf-8", 9000],
    ["application/json", 8000],
    ["image/png", 20000],
  ],
  weighted: { "text/html|text/html; charset=utf-8": 2000 },
};

const ALL_GZIPPED = {
  version: {
    gzips: [
      {
        name: "all",
        content_types: "text/html application/json",
        extensions: "css",
      },
    ],
  },
};

// The sandbox hands synthetic APIs failures shaped like this.
const httpError = (status, reason, extra) =>
  Object.assign(new Error(`HTTP ${status} ${reason}`), { status, ...extra });

/** Fake APIs that answer from the service fixtures and record every call. */
function world(services, { logExplorer, brotli = [], fail = {} } = {}) {
  const calls = [];
  const byId = new Map(services.map((s) => [s.id, s]));
  const answer = (name, options, reply) => {
    calls.push([name, options]);
    const failing = fail[name];
    if (failing !== undefined) {
      const reason = failing(options);
      if (reason instanceof Promise) return reason.then(reply);
      if (reason) return Promise.reject(reason);
    }
    return Promise.resolve().then(reply);
  };
  const apis = {
    ServiceApi: {
      getServiceDetail: (o) =>
        answer("getServiceDetail", o, () => {
          const s = byId.get(o.service_id);
          return { name: s.name, type: s.type, active_version: s.version };
        }),
    },
    HistoricalApi: {
      getHistStatsServiceField: (o) =>
        answer("getHistStatsServiceField", o, () => {
          const s = byId.get(o.service_id);
          if (s.historical?.[o.field]) return s.historical[o.field];
          const total = s.stats[o.field];
          return {
            status: "success",
            data: [
              { [o.field]: total / 2, start_time: 1 },
              { [o.field]: total / 2, start_time: 2 },
            ],
          };
        }),
    },
    InsightsApi: {
      getLogInsights: (o) =>
        answer(`getLogInsights:${o.visualization}`, o, () => {
          const s = byId.get(o.service_id);
          if (o.visualization === "top-content-type-by-requests") {
            return {
              data: s.rates.map(([content_type, rate]) => ({
                dimensions: { content_type },
                values: [{ rate }],
              })),
            };
          }
          return {
            data: s.urls.map(([url, bandwidth_percentage]) => ({
              dimensions: { url },
              values: [{ average_bandwidth_bytes: 1, bandwidth_percentage }],
            })),
          };
        }),
    },
    ObservabilityAggregationsForLogsApi: {
      logAggregationsGet: (o) =>
        answer("logAggregationsGet", o, () => {
          const s = byId.get(o.service_id);
          if (o.dimensions) {
            return {
              data: s.sizes.map(([response_content_type, size]) => ({
                dimensions: { response_content_type },
                values: [{ [SIZE]: size }],
              })),
            };
          }
          const size = o.filter
            ? s.weighted[o.filter.response_content_type.join("|")]
            : s.overall;
          return { data: [{ values: [{ [SIZE]: size }] }] };
        }),
    },
    ProductLogExplorerInsightsApi: {
      getServicesProductLogExplorerInsights: () =>
        answer("logExplorerProduct", undefined, () => ({
          services: logExplorer ?? services.map((s) => s.id),
        })),
    },
    ProductBrotliCompressionApi: {
      getServicesProductBrotliCompression: () =>
        answer("brotliProduct", undefined, () => ({ services: brotli })),
    },
  };
  return {
    call: (apiClass, method, options) => apis[apiClass][method](options),
    calls,
    names: () => calls.map(([name]) => name),
  };
}

function advisor(w, deps = {}) {
  return new CompressionAdvisorApi({
    call: w.call,
    now: () => NOW,
    ...deps,
  });
}

async function analyze(services, options = {}, worldOptions = {}) {
  const w = world(services, worldOptions);
  const result = await advisor(w).analyze({
    service_ids: services.map((s) => s.id),
    ...RANGE,
    ...options,
  });
  return { result, w };
}

const sourcesIn = (value, found = []) => {
  if (Array.isArray(value)) {
    for (const item of value) sourcesIn(item, found);
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (key === "sources" || key === "errors") continue;
      if (key === "source" || key.endsWith("_source")) found.push(item);
      else sourcesIn(item, found);
    }
  }
  return found;
};

describe("compressionAdvisorApi.analyze options", () => {
  test("bad options are refused before any request", async () => {
    const w = world([service()]);
    const cases = [
      [undefined, "Missing the required parameter 'service_ids'."],
      ["svc1", "analyze takes a single options object."],
      [
        { ...RANGE, service_ids: ["svc1"], limit: 1 },
        "analyze does not accept 'limit'. Its options are service_ids, from, to, minimum_candidate_bandwidth_gb, compression.",
      ],
      [{ ...RANGE, service_ids: "svc1" }, "'service_ids' must be an array."],
      [
        { ...RANGE, service_ids: [] },
        "'service_ids' must hold from 1 to 10 service IDs, not 0.",
      ],
      [
        {
          ...RANGE,
          service_ids: Array.from({ length: 11 }, (_, i) => `s${i}`),
        },
        "'service_ids' must hold from 1 to 10 service IDs, not 11.",
      ],
      [
        { ...RANGE, service_ids: [".."] },
        `'service_ids' must hold alphanumeric service IDs. ".." is not one.`,
      ],
      [
        { ...RANGE, service_ids: [7] },
        "'service_ids' must hold alphanumeric service IDs. 7 is not one.",
      ],
      [
        { ...RANGE, service_ids: ["svc1", "svc1"] },
        "'service_ids' names svc1 twice.",
      ],
      [
        { service_ids: ["svc1"], to: RANGE.to },
        "Missing the required parameter 'from'.",
      ],
      [
        { ...RANGE, service_ids: ["svc1"], from: "2026-10-04T12:00:00" },
        "'from' must be an RFC 3339 date-time with a time zone",
      ],
      [
        { ...RANGE, service_ids: ["svc1"], from: "yesterday" },
        "'from' must be an RFC 3339 date-time with a time zone",
      ],
      [
        { ...RANGE, service_ids: ["svc1"], from: RANGE.to },
        "'from' must be earlier than 'to'.",
      ],
      [
        { ...RANGE, service_ids: ["svc1"], minimum_candidate_bandwidth_gb: -1 },
        "'minimum_candidate_bandwidth_gb' cannot be negative.",
      ],
      [
        {
          ...RANGE,
          service_ids: ["svc1"],
          minimum_candidate_bandwidth_gb: 0.5,
        },
        "'minimum_candidate_bandwidth_gb' must be an integer.",
      ],
      [
        { ...RANGE, service_ids: ["svc1"], compression: "zstd" },
        "'compression' must be one of gzip, brotli.",
      ],
      [
        {
          service_ids: ["svc1"],
          from: new Date(NOW - 400 * DAY).toISOString(),
          to: RANGE.to,
        },
        "'from' must be within the last 375 days",
      ],
      [
        {
          service_ids: ["svc1"],
          from: "2026-10-11T11:10:00Z",
          to: "2026-10-11T11:50:00Z",
        },
        "The window must hold at least one whole hour that has already passed.",
      ],
    ];
    for (const [options, message] of cases) {
      await expect(advisor(w).analyze(options)).rejects.toThrow(message);
    }
    expect(w.calls).toEqual([]);
  });

  test("a date on its own means midnight UTC", async () => {
    const result = await advisor(world([service()])).analyze({
      service_ids: ["svc1"],
      from: "2026-10-05",
      to: "2026-10-11",
    });
    expect(result.window).toEqual({
      from: "2026-10-05T00:00:00.000Z",
      to: "2026-10-11T00:00:00.000Z",
    });
  });
});

describe("compressionAdvisorApi.analyze findings", () => {
  test("a service without gzip rules becomes a candidate with exact totals and estimated shares", async () => {
    const { result, w } = await analyze([service()], {
      minimum_candidate_bandwidth_gb: 10,
    });
    const share = 1000 / 13000 + 2000 / 13000;
    const candidateBytes = Math.round(900e9 * share);
    const savings = Math.round(
      900e9 * (0.7 * (1000 / 13000) + 0.7 * (2000 / 13000)),
    );
    expect(result.window).toEqual({
      from: "2026-10-04T12:00:00.000Z",
      to: "2026-10-11T12:00:00.000Z",
    });
    expect(result.minimum_candidate_bandwidth_bytes).toBe(10e9);
    expect(result.complete).toBe(true);
    expect(result.other_services).toBeUndefined();
    expect(result.candidates).toHaveLength(1);
    const [candidate] = result.candidates;
    expect(candidate).toEqual({
      priority: 1,
      service: {
        id: "svc1",
        name: "storefront",
        type: "vcl",
        active_version: 42,
        source: "service_configuration",
      },
      configuration: {
        status: "not_configured",
        status_source: "service_configuration",
        gzip_rules: [],
        missing_content_types: ["application/json", "text/html"],
        missing_content_types_source: "sampled_log_explorer",
        missing_extensions: ["json", "html"],
        missing_extensions_source: "sampled_log_explorer",
      },
      traffic: {
        total_bandwidth_bytes: 1_000e9,
        total_bandwidth_source: "historical_stats",
        delivered_body_bytes: 900e9,
        delivered_body_source: "historical_stats",
        compressible_share: Number(share.toFixed(6)),
        compressible_share_source: "sampled_log_explorer",
        candidate_share: Number(share.toFixed(6)),
        candidate_share_source: "sampled_log_explorer",
        candidate_bandwidth_bytes: candidateBytes,
        candidate_bandwidth_source: "calculated_estimate",
        candidate_content_types: [
          {
            content_type: "application/json",
            share: Number((2000 / 13000).toFixed(6)),
            rule_coverage: "none",
          },
          {
            content_type: "text/html",
            share: Number((1000 / 13000).toFixed(6)),
            rule_coverage: "none",
          },
        ],
        candidate_content_types_source: "sampled_log_explorer",
        url_ranking: {
          ranked_share: 1,
          covered_compressible_share: 0,
          uncertain_compressible_share: 0,
          uncovered_compressible_share: 0.3,
          source: "sampled_log_explorer",
        },
      },
      projection: {
        assumed_reduction_ratio: 0.7,
        assumed_reduction_ratio_source: "assumed_ratio",
        projected_savings_bytes: savings,
        projected_savings_source: "calculated_estimate",
        projected_savings_share_of_service: Number(
          (savings / 1_000e9).toFixed(6),
        ),
        projected_savings_share_of_service_source: "calculated_estimate",
      },
      confidence: "medium",
      caveats: ["Content-type shares come from sampled Log Explorer data."],
      recommendation: {
        action: "create_gzip_config",
        content_types: ["application/json", "text/html"],
        extensions: ["json", "html"],
      },
    });
    // A seven-day window on whole hours is read as is.
    expect(result.analyzed_windows).toEqual({
      historical_stats: result.window,
      sampled_log_explorer: result.window,
    });
    expect(w.calls).toContainEqual([
      "getHistStatsServiceField",
      {
        service_id: "svc1",
        field: "bandwidth",
        from: "2026-10-04T12:00:00.000Z",
        to: "2026-10-11T12:00:00.000Z",
        by: "hour",
      },
    ]);
  });

  test("every value names a source, and the sources say which ones are exact", async () => {
    const { result } = await analyze([service()]);
    const found = sourcesIn(result);
    expect(found.length).toBeGreaterThan(10);
    for (const source of found) expect(Object.keys(SOURCES)).toContain(source);
    expect(SOURCES.historical_stats.kind).toBe("exact");
    expect(SOURCES.service_configuration.kind).toBe("exact");
    expect(SOURCES.sampled_log_explorer.kind).toBe("estimate");
    expect(SOURCES.calculated_estimate.kind).toBe("estimate");
    expect(SOURCES.assumed_ratio.kind).toBe("assumption");
    expect(result.sources).toEqual(SOURCES);
    expect(result.caveats.join(" ")).toContain("upper limits");
  });

  test("returns no log record, request path or client detail", async () => {
    const leaky = service({
      urls: [
        ["GET /users/alice/secret-token.json?key=hunter2", 0.4],
        ["POST /checkout/card-4111.txt", 0.1],
        ["GET /weird.p4ssw0rd", 0.5],
      ],
    });
    const { result, w } = await analyze([leaky]);
    const text = JSON.stringify(result);
    for (const leak of [
      "/users",
      "alice",
      "secret",
      "hunter2",
      "checkout",
      "4111",
      "p4ssw0rd",
    ]) {
      expect(text).not.toContain(leak);
    }
    expect(result.candidates[0].configuration.missing_extensions).toEqual([
      "json",
      "txt",
    ]);
    expect(w.names()).not.toContain("getLogRecords");
  });

  test("rules are read the way Fastly generates them", async () => {
    const covered = service({
      version: {
        gzips: [
          {
            name: "compress-text",
            content_types: "/text/[^/]+/ image/svg+xml",
            extensions: "css js",
          },
        ],
      },
      sizes: [
        ["text/html; charset=utf-8", 4000],
        ["Text/HTML; Charset=UTF-8", 4000],
        ["application/json", 8000],
        ["image/png", 20000],
      ],
      weighted: { "text/html; charset=utf-8|Text/HTML; Charset=UTF-8": 4000 },
    });
    const { result } = await analyze([covered]);
    const [candidate] = result.candidates;
    expect(candidate.configuration.status).toBe("partially_covered");
    expect(candidate.configuration.gzip_rules).toEqual(["compress-text"]);
    // The rule needs `Text/HTML` spelled that way, since Fastly matches case-sensitively.
    expect(candidate.configuration.missing_content_types).toEqual([
      "application/json",
      "Text/HTML",
    ]);
    expect(
      candidate.traffic.candidate_content_types.map((t) => [
        t.content_type,
        t.rule_coverage,
      ]),
    ).toEqual([
      ["application/json", "none"],
      ["text/html", "some_spellings"],
    ]);
    // The HTML URL counts as covered through its content type, and JSON is the only gap.
    expect(candidate.traffic.url_ranking).toEqual({
      ranked_share: 1,
      covered_compressible_share: 0.1,
      uncertain_compressible_share: 0,
      uncovered_compressible_share: 0.2,
      source: "sampled_log_explorer",
    });
    expect(candidate.recommendation).toEqual({
      action: "update_gzip_config",
      gzip_rule: "compress-text",
      content_types: ["application/json", "Text/HTML"],
      extensions: ["json"],
    });
    expect(candidate.caveats).toContain(
      "Fastly matches content types case-sensitively, and the rules miss 'Text/HTML'. Those types are counted in full, as an upper limit.",
    );
    expect(candidate.confidence).toBe("low");
  });

  test("a type sent only in a spelling the rule misses is not covered", async () => {
    const shouting = service({
      version: {
        gzips: [
          { name: "html", content_types: "text/html", extensions: "css" },
        ],
      },
      rates: [["text/html", 1]],
      sizes: [["Text/HTML", 1000]],
      overall: 1000,
    });
    const { result } = await analyze([shouting]);
    const [candidate] = result.candidates;
    expect(candidate.traffic.candidate_share).toBe(1);
    expect(candidate.traffic.candidate_content_types).toEqual([
      { content_type: "text/html", share: 1, rule_coverage: "none" },
    ]);
    expect(candidate.recommendation.content_types).toEqual(["Text/HTML"]);
  });

  test("a rule with a cache condition leaves its types uncertain rather than covered", async () => {
    const conditional = service({
      version: {
        gzips: [
          {
            name: "html-when-cached",
            content_types: "text/html application/json",
            extensions: "css",
            cache_condition: "is-cacheable",
          },
        ],
      },
    });
    const { result } = await analyze([conditional]);
    const [candidate] = result.candidates;
    expect(candidate.configuration.status).toBe("partially_covered");
    expect(candidate.configuration.missing_content_types).toEqual([]);
    expect(
      candidate.traffic.candidate_content_types.map((t) => t.rule_coverage),
    ).toEqual(["conditional", "conditional"]);
    expect(candidate.confidence).toBe("low");
    expect(candidate.caveats).toContain(
      "The gzip rules html-when-cached apply only when their cache condition matches, so what only they cover is counted as uncovered or uncertain.",
    );
    expect(candidate.recommendation).toEqual({
      action: "review_gzip_cache_condition",
      gzip_rules: ["html-when-cached"],
    });
  });

  test("content types outside the known list are grouped and never named", async () => {
    const odd = service({
      rates: [
        ["text/customer-alice-12345", 0.5],
        ["application/vnd.bob-67890+json", 0.25],
        ["image/png", 0.25],
      ],
      sizes: [
        ["text/customer-alice-12345", 1000],
        ["application/vnd.bob-67890+json", 1000],
        ["image/png", 2000],
      ],
      overall: 1250,
    });
    const { result } = await analyze([odd]);
    const text = JSON.stringify(result);
    for (const leak of ["alice", "12345", "bob", "67890"]) {
      expect(text).not.toContain(leak);
    }
    const [candidate] = result.candidates;
    expect(candidate.traffic.candidate_content_types).toEqual([
      { content_type: "other text/* types", share: 0.4 },
      { content_type: "other +json types", share: 0.2 },
    ]);
    expect(candidate.configuration.missing_content_types).toEqual([]);
    expect(candidate.recommendation).toEqual({
      action: "create_gzip_config",
      content_types: [],
      extensions: ["json", "html"],
      additional_actions: [{ action: "review_unlisted_content_types" }],
    });
    expect(candidate.caveats).toContain(
      "Content types outside this server's known list carry a share of 0.6 of the body bytes. Their names come from origin headers, so they are left out; look them up in Log Explorer.",
    );
  });

  test("a conditional extension rule is uncertain coverage, and missing types go to a new unconditional rule", async () => {
    const conditional = service({
      version: {
        gzips: [
          {
            name: "json-when-cached",
            content_types: "text/html",
            extensions: "json",
            cache_condition: "is-cacheable",
          },
        ],
      },
    });
    const { result } = await analyze([conditional]);
    const [candidate] = result.candidates;
    expect(candidate.traffic.url_ranking).toEqual({
      ranked_share: 1,
      covered_compressible_share: 0,
      uncertain_compressible_share: 0.3,
      uncovered_compressible_share: 0,
      source: "sampled_log_explorer",
    });
    expect(candidate.recommendation).toEqual({
      action: "create_gzip_config",
      content_types: ["application/json"],
      additional_actions: [
        {
          action: "review_gzip_cache_condition",
          gzip_rules: ["json-when-cached"],
        },
      ],
    });
  });

  test("a service whose rules cover every compressible type is reported as covered", async () => {
    const covered = service({
      version: {
        gzips: [
          {
            name: "all",
            content_types: "text/html application/json",
            extensions: "html json",
          },
        ],
      },
    });
    const { result } = await analyze([covered]);
    expect(result.candidates).toEqual([]);
    expect(result.other_services).toEqual([
      expect.objectContaining({
        service: expect.objectContaining({ id: "svc1" }),
        reason: "covered",
        configuration: expect.objectContaining({ status: "covered" }),
        confidence: "medium",
        caveats: ["Content-type shares come from sampled Log Explorer data."],
      }),
    ]);
  });

  test("an extension rule that may reach a missing type lowers the confidence", async () => {
    const byExtension = service({
      version: {
        gzips: [
          { name: "ext", content_types: "text/html", extensions: "json" },
        ],
      },
    });
    const { result } = await analyze([byExtension]);
    const [candidate] = result.candidates;
    expect(candidate.confidence).toBe("low");
    expect(candidate.caveats).toContain(
      "An extension rule compresses application/json when the URL ends with a matching extension, so part of that traffic may be compressed already.",
    );
  });

  test("custom VCL, dynamic snippets and unreadable rules make the finding uncertain", async () => {
    const cases = [
      [
        {
          vcls: [
            {
              name: "main",
              main: true,
              content:
                "sub vcl_fetch {\n#FASTLY fetch\n set beresp.gzip = true;\n}",
            },
          ],
        },
        "Custom VCL sets compression in vcl:main.",
        { custom_compression: ["vcl:main"] },
      ],
      [
        {
          snippets: [
            {
              name: "hint",
              type: "deliver",
              dynamic: "0",
              content: 'set resp.http.X-Compress-Hint = "on";',
            },
          ],
        },
        "Custom VCL sets compression in snippet:hint.",
        { custom_compression: ["snippet:hint"] },
      ],
      [
        { snippets: [{ name: "live", type: "fetch", dynamic: "1" }] },
        "Dynamic snippets (live) can change outside versions",
        { dynamic_snippets: ["live"] },
      ],
      [
        {
          gzips: [{ name: "odd", content_types: "/(?i)text/", extensions: "" }],
        },
        "The gzip rules odd have an empty list or a pattern this analysis cannot read.",
        { gzip_rules: ["odd"] },
      ],
    ];
    for (const [version, caveat, fields] of cases) {
      const { result } = await analyze([service({ version })]);
      const [candidate] = result.candidates;
      expect(candidate.confidence).toBe("low");
      expect(candidate.caveats.join(" ")).toContain(caveat);
      expect(candidate.configuration).toEqual(expect.objectContaining(fields));
    }
  });

  test("a rule read back without its lists has unknown coverage and gets reviewed, not extended", async () => {
    const { result } = await analyze([
      service({ version: { gzips: [{ name: "default" }] } }),
    ]);
    const [candidate] = result.candidates;
    expect(candidate.configuration.missing_content_types).toEqual([]);
    expect(candidate.configuration.missing_extensions).toBeUndefined();
    expect(candidate.traffic.url_ranking).toBeUndefined();
    expect(
      candidate.traffic.candidate_content_types.map((t) => t.rule_coverage),
    ).toEqual(["unknown", "unknown"]);
    expect(candidate.confidence).toBe("low");
    expect(candidate.recommendation).toEqual({
      action: "review_gzip_rules",
      gzip_rules: ["default"],
    });
  });

  test("custom VCL that defines vcl_fetch without the macro bypasses the rules", async () => {
    const rules = [
      { name: "html", content_types: "text/html", extensions: "css" },
    ];
    const bypassed = service({
      version: {
        gzips: rules,
        vcls: [
          {
            name: "main",
            main: true,
            content: "sub vcl_fetch {\n return(deliver);\n}",
          },
        ],
      },
    });
    const { result } = await analyze([bypassed]);
    const [candidate] = result.candidates;
    expect(candidate.configuration.status).toBe("bypassed");
    expect(candidate.traffic.url_ranking.covered_compressible_share).toBe(0);
    expect(candidate.configuration.missing_content_types).toEqual([
      "application/json",
    ]);
    // HTML counts too, since the rule that covers it never runs.
    expect(
      candidate.traffic.candidate_content_types.map((t) => t.content_type),
    ).toEqual(["application/json", "text/html"]);
    expect(candidate.recommendation).toEqual({
      action: "restore_fastly_fetch_macro",
      additional_actions: [
        {
          action: "update_gzip_config",
          gzip_rule: "html",
          content_types: ["application/json"],
          extensions: ["json"],
        },
      ],
    });

    // Fastly writes its own vcl_fetch, macro included, when custom VCL has none.
    const { result: kept } = await analyze([
      service({
        version: {
          gzips: rules,
          vcls: [
            {
              name: "main",
              main: true,
              content: "sub vcl_recv {\n#FASTLY recv\n}",
            },
          ],
        },
      }),
    ]);
    expect(kept.candidates[0].configuration.status).toBe("partially_covered");
  });

  test("a Compute service is analyzed from its own byte counts, without gzip rules", async () => {
    const compute = service({ type: "wasm", version: { gzips: undefined } });
    const { result } = await analyze([compute]);
    const [candidate] = result.candidates;
    expect(candidate.configuration).toEqual({
      status: "not_applicable",
      status_source: "service_configuration",
    });
    expect(candidate.traffic.delivered_body_bytes).toBe(800e9);
    expect(candidate.confidence).toBe("low");
    expect(candidate.recommendation).toEqual({
      action: "set_x_compress_hint",
      content_types: ["application/json", "text/html"],
    });
  });

  test("brotli counts gzip-covered types at the extra saving over gzip while the product is off", async () => {
    const gzipped = service({
      version: {
        gzips: [
          { name: "html", content_types: "text/html", extensions: "html" },
        ],
      },
    });
    const { result } = await analyze([gzipped], { compression: "brotli" });
    const [candidate] = result.candidates;
    const extra = 1 - (1 - 0.75) / (1 - 0.7);
    expect(candidate.configuration.brotli_product).toBe("disabled");
    expect(candidate.configuration.brotli_product_source).toBe(
      "brotli_product",
    );
    expect(candidate.traffic.candidate_content_types).toEqual([
      {
        content_type: "application/json",
        share: Number((2000 / 13000).toFixed(6)),
        rule_coverage: "none",
      },
      {
        content_type: "text/html",
        share: Number((1000 / 13000).toFixed(6)),
        rule_coverage: "gzip_only",
      },
    ]);
    expect(candidate.projection).toEqual(
      expect.objectContaining({
        assumed_reduction_ratio: 0.75,
        assumed_gzip_to_brotli_ratio: Number(extra.toFixed(6)),
        assumed_gzip_to_brotli_ratio_source: "assumed_ratio",
        projected_savings_bytes: Math.round(
          900e9 * ((1000 / 13000) * extra + (2000 / 13000) * 0.75),
        ),
      }),
    );
    expect(candidate.recommendation).toEqual({
      action: "update_gzip_config",
      gzip_rule: "html",
      content_types: ["application/json"],
      extensions: ["json"],
      additional_actions: [{ action: "enable_brotli_product" }],
    });

    const { result: enabled } = await analyze(
      [service(ALL_GZIPPED)],
      { compression: "brotli" },
      { brotli: ["svc1"] },
    );
    expect(enabled.other_services[0]).toEqual(
      expect.objectContaining({
        reason: "covered",
        configuration: expect.objectContaining({ brotli_product: "enabled" }),
      }),
    );
  });

  test("an unknown Brotli status never ends in a covered verdict", async () => {
    const { result } = await analyze(
      [service(ALL_GZIPPED)],
      { compression: "brotli" },
      { fail: { brotliProduct: () => ({ status: 503 }) } },
    );
    const [candidate] = result.candidates;
    expect(candidate.configuration.brotli_product).toBe("unknown");
    expect(
      candidate.traffic.candidate_content_types.map((t) => t.rule_coverage),
    ).toEqual(["gzip_only", "gzip_only"]);
    expect(candidate.confidence).toBe("low");
    expect(candidate.caveats).toContain(
      "The Brotli product status could not be read, so gzip-covered types are counted at the extra saving of Brotli, as an upper limit.",
    );
    expect(candidate.recommendation).toEqual({
      action: "verify_brotli_product",
    });
  });

  test("candidates are ranked by projected savings, and small ones fall below the minimum", async () => {
    const big = service({
      id: "big",
      stats: { bandwidth: 2_000e9, edge_resp_body_bytes: 1_800e9 },
    });
    const small = service({
      id: "small",
      stats: { bandwidth: 20e9, edge_resp_body_bytes: 18e9 },
    });
    const middle = service({ id: "middle" });
    const { result } = await analyze([small, big, middle], {
      minimum_candidate_bandwidth_gb: 10,
    });
    expect(result.candidates.map((c) => [c.priority, c.service.id])).toEqual([
      [1, "big"],
      [2, "middle"],
    ]);
    expect(result.other_services).toEqual([
      expect.objectContaining({
        service: expect.objectContaining({ id: "small" }),
        reason: "below_minimum",
        confidence: "medium",
        projection: expect.objectContaining({
          projected_savings_bytes: expect.any(Number),
        }),
      }),
    ]);
  });

  test("spellings of one type are weighted with a filtered aggregation", async () => {
    const spelled = service({ ...TWO_HTML_SPELLINGS, overall: 13250 });
    const { result, w } = await analyze([spelled]);
    expect(
      w.calls
        .filter(([name, o]) => name === "logAggregationsGet" && o.filter)
        .map(([, o]) => o.filter),
    ).toEqual([
      { response_content_type: ["text/html", "text/html; charset=utf-8"] },
    ]);
    const html = result.candidates[0].traffic.candidate_content_types.find(
      (t) => t.content_type === "text/html",
    );
    expect(html.share).toBe(Number(((0.25 * 2000) / 13250).toFixed(6)));
    expect(result.candidates[0].confidence).toBe("medium");

    // Without the weighted average, the plain mean stands in and says so.
    const { result: fallback } = await analyze(
      [spelled],
      {},
      {
        fail: { logAggregationsGet: (o) => o.filter && { status: 500 } },
      },
    );
    const [candidate] = fallback.candidates;
    expect(
      candidate.traffic.candidate_content_types.find(
        (t) => t.content_type === "text/html",
      ).share,
    ).toBe(Number(((0.25 * 5000) / 13250).toFixed(6)));
    expect(candidate.confidence).toBe("low");
    expect(candidate.caveats.join(" ")).toContain(
      "plain mean of the spellings",
    );
  });
});

describe("compressionAdvisorApi.analyze partial data", () => {
  test("one failing service does not stop the others", async () => {
    const { result } = await analyze(
      [service({ id: "denied" }), service({ id: "fine" })],
      {},
      {
        fail: {
          getServiceDetail: (o) =>
            o.service_id === "denied" &&
            httpError(403, "Forbidden", { hint: "Check the token's scope." }),
        },
      },
    );
    expect(result.candidates.map((c) => c.service.id)).toEqual(["fine"]);
    expect(result.other_services).toEqual([
      {
        service: { id: "denied" },
        reason: "failed",
        errors: [
          {
            source: "service_configuration",
            error: "HTTP 403 Forbidden",
            status: 403,
            hint: "Check the token's scope.",
          },
        ],
      },
    ]);
  });

  test("missing or incomplete exact totals fail the service rather than counting as zero", async () => {
    const { result } = await analyze(
      [service()],
      {},
      {
        fail: {
          getHistStatsServiceField: (o) =>
            o.field === "bandwidth" && new Error("stats are down"),
        },
      },
    );
    expect(result.other_services).toEqual([
      expect.objectContaining({
        reason: "failed",
        errors: [{ source: "historical_stats", error: "stats are down" }],
      }),
    ]);
    for (const [answer, error] of [
      [
        { status: "error", msg: "bad window", data: [] },
        'Historical stats for bandwidth answered with status "error": bad window.',
      ],
      [
        { status: "success" },
        'Historical stats for bandwidth answered with status "success".',
      ],
      [
        { status: "success", data: [{ start_time: 1 }] },
        "Historical stats left bandwidth out of some hours.",
      ],
    ]) {
      const { result: broken } = await analyze([
        service({ historical: { bandwidth: answer } }),
      ]);
      expect(broken.other_services).toEqual([
        expect.objectContaining({
          reason: "failed",
          errors: [{ source: "historical_stats", error }],
        }),
      ]);
    }
  });

  test("a service without Log Explorer is reported without sending log reads", async () => {
    const { result, w } = await analyze([service()], {}, { logExplorer: [] });
    expect(result.other_services).toEqual([
      expect.objectContaining({
        reason: "log_explorer_not_enabled",
        traffic: expect.objectContaining({ total_bandwidth_bytes: 1_000e9 }),
      }),
    ]);
    expect(
      w.names().filter((name) => /Insights|Aggregations/.test(name)),
    ).toEqual([]);
  });

  test("an empty sample is no traffic, even when the reads that need it fail", async () => {
    const { result } = await analyze(
      [service({ rates: [] })],
      {},
      {
        fail: { logAggregationsGet: () => ({ status: 500 }) },
      },
    );
    expect(result.other_services).toEqual([
      expect.objectContaining({ reason: "no_sampled_traffic" }),
    ]);
  });

  test("an unknown product status still reads the logs", async () => {
    const { result } = await analyze(
      [service()],
      {},
      {
        fail: { logExplorerProduct: () => ({ status: 403 }) },
      },
    );
    expect(result.candidates).toHaveLength(1);
  });

  test("a failed URL ranking keeps the finding but lowers the confidence", async () => {
    const { result } = await analyze(
      [service()],
      {},
      {
        fail: {
          "getLogInsights:top-url-by-bandwidth": () =>
            httpError(503, "Service Unavailable"),
        },
      },
    );
    const [candidate] = result.candidates;
    expect(candidate.confidence).toBe("low");
    expect(candidate.traffic.url_ranking).toBeUndefined();
    expect(candidate.caveats).toContain(
      "A sampled_log_explorer read failed: HTTP 503 Service Unavailable",
    );
  });

  test("a window mostly older than the log retention lowers the confidence", async () => {
    const { result } = await analyze([service()], {
      from: new Date(NOW - 30 * DAY).toISOString(),
    });
    const [candidate] = result.candidates;
    expect(result.analyzed_windows.sampled_log_explorer.from).toBe(
      new Date(NOW - 7 * DAY).toISOString(),
    );
    expect(candidate.confidence).toBe("low");
    expect(candidate.caveats).toContain(
      "Log Explorer keeps 7 days of records, so the shares describe only the last 23% of the window.",
    );
  });

  test("a window older than the log retention reads no logs", async () => {
    const { result, w } = await analyze([service()], {
      from: new Date(NOW - 30 * DAY).toISOString(),
      to: new Date(NOW - 20 * DAY).toISOString(),
    });
    expect(result.analyzed_windows.sampled_log_explorer).toBeUndefined();
    expect(result.other_services).toEqual([
      expect.objectContaining({ reason: "window_outside_log_retention" }),
    ]);
    expect(
      w.names().filter((name) => /Insights|Aggregations|Product/.test(name)),
    ).toEqual([]);
  });

  test("a service without an active version is reported as such", async () => {
    const { result } = await analyze([
      service({ version: { number: undefined } }),
    ]);
    expect(result.other_services).toEqual([
      {
        service: { id: "svc1", name: "storefront", type: "vcl" },
        reason: "no_active_version",
      },
    ]);
  });
});

describe("compressionAdvisorApi.analyze time budget", () => {
  test("a service still running at the deadline is reported as unfinished and sends nothing more", async () => {
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    // A weighted-size query would come after the reads.
    const late = service({ id: "late", ...TWO_HTML_SPELLINGS });
    const w = world([service({ id: "fast" }), late], {
      fail: { getServiceDetail: (o) => o.service_id === "late" && gate },
    });
    let fire;
    const cleared = [];
    const pending = advisor(w, {
      setTimer: (callback, ms) => {
        fire = callback;
        expect(ms).toBe(20_000);
        return "timer";
      },
      clearTimer: (id) => cleared.push(id),
    }).analyze({ service_ids: ["fast", "late"], ...RANGE });
    await sleep(10);
    fire();
    const result = await pending;
    expect(result.complete).toBe(false);
    expect(result.candidates.map((c) => c.service.id)).toEqual(["fast"]);
    expect(result.other_services).toEqual([
      { service: { id: "late" }, reason: "time_budget" },
    ]);
    expect(cleared).toEqual(["timer"]);
    release();
    await sleep(10);
    expect(
      w.calls.some(([name, o]) => name === "logAggregationsGet" && o.filter),
    ).toBe(false);
  });

  test("no request starts once the budget has run out, even between two checks", async () => {
    const w = world([service()]);
    // The worker still sees time left, and the first request doesn't.
    let readings = 0;
    const result = await advisor(w, {
      now: () => (++readings <= 2 ? NOW : NOW + 25_000),
    }).analyze({ service_ids: ["svc1"], ...RANGE });
    expect(result.other_services).toEqual([
      { service: { id: "svc1" }, reason: "time_budget" },
    ]);
    expect(w.calls).toEqual([]);
  });

  test("an execution deadline too close starts nothing", async () => {
    const w = world([service()]);
    const timers = [];
    const result = await advisor(w, {
      deadline: NOW + 4000,
      setTimer: (callback, ms) => {
        timers.push(ms);
        callback();
        return 1;
      },
      clearTimer: () => {},
    }).analyze({ service_ids: ["svc1"], ...RANGE });
    expect(timers).toEqual([0]);
    expect(result.complete).toBe(false);
    expect(w.calls).toEqual([]);
  });
});

describe("content types", () => {
  test("are classified by how well they compress", () => {
    for (const type of [
      "text/html",
      "text/csv",
      "application/json",
      "application/problem+json",
      "application/rss+xml",
      "image/svg+xml",
      "font/ttf",
      "application/wasm",
    ]) {
      expect(classifyContentType(type)).toBe("compressible");
    }
    for (const type of [
      "image/png",
      "image/webp",
      "video/mp4",
      "audio/mpeg",
      "application/zip",
      "font/woff2",
      "application/pdf",
    ]) {
      expect(classifyContentType(type)).toBe("compressed");
    }
    for (const type of [
      "application/octet-stream",
      "<unspecified>",
      "text/event-stream",
    ]) {
      expect(classifyContentType(type)).toBe("unknown");
    }
  });
});
