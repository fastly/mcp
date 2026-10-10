import { describe, expect, test } from "bun:test";
import { operationTable } from "../src/api-adapter.js";
import {
  LOG_EXPLORER_API_CLASSES,
  logExplorerMethods,
} from "../src/log-explorer.js";
import { enrichMethod } from "../src/method-entry.js";
import {
  describeAdapterContract,
  recordingClient,
} from "./adapter-contract.js";

// Written out by hand, so a typo in the operation table can't pass its own test. Each entry is the path, the required options, then the type of each optional one.
const OPERATIONS = [
  [
    "LogExplorerApi.getLogRecords",
    "/observability/log-explorer",
    ["service_id", "start", "end"],
    { limit: "Number", next_cursor: "String", filter: "Object" },
  ],
  [
    "InsightsApi.getLogInsights",
    "/observability/log-insights",
    ["visualization", "service_id", "start", "end"],
    {
      pops: "String",
      domain: "String",
      domain_exact_match: "Boolean",
      limit: "Number",
    },
  ],
  [
    "ObservabilityAggregationsForLogsApi.logAggregationsGet",
    "/observability/aggregations",
    ["service_id", "start", "end", "series"],
    {
      dimensions: "String",
      sort: "String",
      limit: "Number",
      filter: "Object",
    },
  ],
];

const RANGE = { service_id: "svc1", start: "2026-10-09", end: "2026-10-10" };

const REQUIRED = {
  getLogRecords: RANGE,
  getLogInsights: { visualization: "top-url-by-requests", ...RANGE },
  logAggregationsGet: { ...RANGE, series: "avg[response_time]" },
};

const OPTIONAL = {
  getLogRecords: {
    limit: 25,
    next_cursor: "cursor1",
    filter: { response_status: 404 },
  },
  getLogInsights: {
    pops: "PAR,SOF",
    domain: "example.com",
    domain_exact_match: false,
    limit: 25,
  },
  logAggregationsGet: {
    dimensions: "fastly_pop",
    sort: "-avg[response_time]",
    limit: 25,
    filter: { response_status: 404 },
  },
};

const QUERIES = {
  getLogRecords: {
    ...RANGE,
    limit: 25,
    next_cursor: "cursor1",
    "filter[response_status]": 404,
  },
  getLogInsights: {
    ...RANGE,
    visualization: "top-url-by-requests",
    pops: "PAR,SOF",
    domain: "example.com",
    domain_exact_match: false,
    limit: 25,
  },
  logAggregationsGet: {
    ...RANGE,
    source: "logs",
    series: ["avg[response_time]"],
    dimensions: "fastly_pop",
    sort: "-avg[response_time]",
    limit: 25,
    "filter[response_status]": 404,
  },
};

const VISUALIZATIONS = [
  "top-url-by-requests",
  "top-url-by-bandwidth",
  "top-url-by-duration",
  "top-url-by-misses",
  "top-url-by-cache-hit-ratio",
  "bottom-url-by-cache-hit-ratio",
  "top-4xx-urls",
  "top-5xx-urls",
  "top-503-responses",
  "response-status-codes",
  "country-statistics",
  "top-browser-by-requests",
  "top-device-by-requests",
  "top-os-by-requests",
  "top-content-type-by-requests",
];

describeAdapterContract({
  name: "Log Explorer",
  methods: logExplorerMethods,
  classes: LOG_EXPLORER_API_CLASSES,
  operations: OPERATIONS,
  firstParam: "service_id",
  sampleOptions: (entry) => REQUIRED[entry.method],
});

const methods = () => logExplorerMethods().map(enrichMethod);

const call = (client, entry, options) =>
  new LOG_EXPLORER_API_CLASSES[entry.apiClass](client)[entry.method](options);

/** The query object one call handed the client. */
async function queryOf(entry, options) {
  const client = recordingClient();
  await call(client, entry, options);
  return client.calls[0][4];
}

const byMethod = (name) => methods().find((entry) => entry.method === name);

describe("every Log Explorer adapter", () => {
  test("builds the query each endpoint expects and hands the body back", async () => {
    for (const entry of methods()) {
      const client = recordingClient();
      const result = await call(client, entry, {
        ...REQUIRED[entry.method],
        ...OPTIONAL[entry.method],
      });
      expect(result).toEqual({ data: [], meta: {} });
      const [args] = client.calls;
      expect(args).toEqual([
        entry.httpPath,
        "GET",
        {},
        {},
        QUERIES[entry.method],
        {},
        {},
        null,
        ["token"],
        [],
        ["application/json"],
        Object,
        "https://api.fastly.com",
      ]);
    }
  });

  test("optional options that are left out, null or undefined are not sent", async () => {
    for (const entry of methods()) {
      const optional = entry.params.filter((p) => !p.required);
      for (const unset of [null, undefined]) {
        const query = await queryOf(entry, {
          ...REQUIRED[entry.method],
          ...Object.fromEntries(optional.map((p) => [p.name, unset])),
        });
        for (const param of optional) {
          expect(Object.hasOwn(query, param.name)).toBe(false);
        }
      }
    }
  });
});

describe("filter translation", () => {
  const records = byMethod("getLogRecords");
  const filtered = (filter) =>
    queryOf(records, { ...REQUIRED.getLogRecords, filter });

  test("a scalar becomes an equality test and a list becomes 'in'", async () => {
    expect(
      await filtered({
        response_status: 404,
        request_path: "/login",
        is_cache_hit: true,
      }),
    ).toEqual({
      ...REQUIRED.getLogRecords,
      "filter[response_status]": 404,
      "filter[request_path]": "/login",
      "filter[is_cache_hit]": true,
    });
    expect(await filtered({ response_status: [404, 500] })).toEqual({
      ...REQUIRED.getLogRecords,
      "filter[response_status][in]": "404,500",
    });
  });

  test("a named operator becomes the second bracket", async () => {
    expect(
      await filtered({
        response_time: { gte: 0.5, lt: 2 },
        request_path: { "ends-with": ".css" },
        request_method: { in: ["GET", "HEAD"] },
      }),
    ).toEqual({
      ...REQUIRED.getLogRecords,
      "filter[response_time][gte]": 0.5,
      "filter[response_time][lt]": 2,
      "filter[request_path][ends-with]": ".css",
      "filter[request_method][in]": "GET,HEAD",
    });
  });

  // Many log fields are empty strings, so an empty filter value is a real test.
  test("an empty string is kept", async () => {
    expect(await filtered({ client_browser_name: "" })).toEqual({
      ...REQUIRED.getLogRecords,
      "filter[client_browser_name]": "",
    });
  });

  // Leaving it out is fine. An empty one is how a dropped property arrives, since arguments reach the adapter as JSON.
  test("no filter is fine, an empty one is refused", async () => {
    expect(await filtered(undefined)).toEqual(REQUIRED.getLogRecords);
    const message =
      "'filter' names no field. Leave the option out rather than passing an empty filter.";
    await expect(filtered({})).rejects.toThrow(message);
    await expect(
      filtered(JSON.parse(JSON.stringify({ response_status: undefined }))),
    ).rejects.toThrow(message);
  });

  // A value the client would drop on the way out leaves the filter unapplied.
  test("a filter that would not reach the wire is refused", async () => {
    for (const [filter, message] of [
      [{ response_status: null }, "'filter.response_status' has no value."],
      [
        { response_status: undefined },
        "'filter.response_status' has no value.",
      ],
      [
        { response_status: { gte: null } },
        "'filter.response_status.gte' has no value.",
      ],
      [
        { response_status: { gte: undefined } },
        "'filter.response_status.gte' has no value.",
      ],
      [{ response_status: [] }, "'filter.response_status' is an empty list."],
      [
        { response_status: { in: [] } },
        "'filter.response_status.in' is an empty list.",
      ],
    ]) {
      await expect(filtered(filter)).rejects.toThrow(message);
    }
  });

  // Two different filters must never build the same query parameter.
  test("a field name that is not a plain name is refused", async () => {
    for (const field of [
      "filter[response_status]",
      "response_status][eq",
      "response status",
      "",
    ]) {
      await expect(filtered({ [field]: 404 })).rejects.toThrow(
        `'filter' takes log record field names. '${field}' is not one.`,
      );
    }
  });

  test("a value that cannot be spelled as a parameter is refused", async () => {
    await expect(
      filtered({ response_time: { gte: { x: 1 } } }),
    ).rejects.toThrow(
      "'filter.response_time.gte' must be a single value, not an object.",
    );
    await expect(
      filtered({ response_status: { in: [404, { x: 1 }] } }),
    ).rejects.toThrow(
      "'filter.response_status.in' must be a single value, not an object.",
    );
    await expect(filtered({ response_status: [404, null] })).rejects.toThrow(
      "'filter.response_status' has no value.",
    );
  });

  // The API reads a comma as the end of a list entry, and nothing escapes it.
  test("a comma inside a list value is refused, written either way", async () => {
    const message =
      "cannot hold '/a,b', because the API reads the comma as the end of a list entry";
    await expect(filtered({ request_path: ["/a,b", "/c"] })).rejects.toThrow(
      `'filter.request_path' ${message}.`,
    );
    await expect(
      filtered({ request_path: { in: ["/c", "/a,b"] } }),
    ).rejects.toThrow(`'filter.request_path.in' ${message}.`);
    // A single value is free to hold one, since nothing splits it.
    expect(await filtered({ request_path: "/a,b" })).toEqual({
      ...REQUIRED.getLogRecords,
      "filter[request_path]": "/a,b",
    });
    expect(await filtered({ request_path: { contains: "a,b" } })).toEqual({
      ...REQUIRED.getLogRecords,
      "filter[request_path][contains]": "a,b",
    });
  });

  // Any other operator would quietly compare against the joined string.
  test("a list is refused for every operator but 'in'", async () => {
    for (const operator of ["eq", "contains", "ends-with", "gte"]) {
      await expect(
        filtered({ request_path: { [operator]: ["/a", "/b"] } }),
      ).rejects.toThrow(
        `'filter.request_path.${operator}' takes one value, since only 'in' reads a list.`,
      );
    }
  });

  test("an unknown or missing operator is refused with the list", async () => {
    const help =
      "The operators are eq, in, contains, ends-with, gt, gte, lt, lte.";
    await expect(filtered({ response_status: { ne: 404 } })).rejects.toThrow(
      `'filter.response_status' uses the unknown operator 'ne'. ${help}`,
    );
    await expect(
      filtered({ request_path: { "starts-with": "/a" } }),
    ).rejects.toThrow(
      `'filter.request_path' uses the unknown operator 'starts-with'. ${help}`,
    );
    await expect(filtered({ response_status: {} })).rejects.toThrow(
      `'filter.response_status' names no operator. ${help}`,
    );
  });

  test("the aggregations endpoint takes the same filters", async () => {
    expect(
      await queryOf(byMethod("logAggregationsGet"), {
        ...REQUIRED.logAggregationsGet,
        filter: { response_time: { gte: 0.5 } },
      }),
    ).toMatchObject({ "filter[response_time][gte]": 0.5 });
  });
});

describe("log aggregations", () => {
  const entry = byMethod("logAggregationsGet");
  const aggregated = (options) =>
    queryOf(entry, { ...REQUIRED.logAggregationsGet, ...options });

  test("the one legal source is sent and is not an option", async () => {
    expect((await aggregated({})).source).toBe("logs");
    expect(entry.params.map((p) => p.name)).not.toContain("source");
  });

  // The API answers a comma-separated series with one metric named after the whole string, so the list has to become a repeated parameter.
  test("several metrics become a repeated parameter", async () => {
    expect((await aggregated({})).series).toEqual(["avg[response_time]"]);
    expect(
      (await aggregated({ series: "avg[response_time],p95[response_time]" }))
        .series,
    ).toEqual(["avg[response_time]", "p95[response_time]"]);
    expect(
      (
        await aggregated({
          series: " avg[response_time] , max[response_time] ",
        })
      ).series,
    ).toEqual(["avg[response_time]", "max[response_time]"]);
  });

  test("a series list with no metric in it is refused", async () => {
    for (const series of [",", " , "]) {
      await expect(aggregated({ series })).rejects.toThrow(
        "'series' needs at least one metric, such as 'avg[response_time]'.",
      );
    }
  });

  // The API keeps only the first value of either, so they stay single strings.
  test("dimensions and sort are passed through unchanged", async () => {
    const query = await aggregated({
      dimensions: "fastly_pop,request_method",
      sort: "-p95[response_time],avg[response_time]",
    });
    expect(query.dimensions).toBe("fastly_pop,request_method");
    expect(query.sort).toBe("-p95[response_time],avg[response_time]");
  });
});

describe("insights visualizations", () => {
  const entry = byMethod("getLogInsights");

  test("every working visualization is accepted", async () => {
    for (const visualization of VISUALIZATIONS) {
      const query = await queryOf(entry, {
        ...REQUIRED.getLogInsights,
        visualization,
      });
      expect(query.visualization).toBe(visualization);
    }
    expect(entry.params[0].description).toContain(VISUALIZATIONS.join(", "));
  });

  // The API answers an unknown name with a 500, which reads like an outage.
  test("an unknown visualization is refused before any request", async () => {
    const client = recordingClient();
    const expected = `'visualization' must be one of ${VISUALIZATIONS.join(", ")}.`;
    for (const visualization of [
      "top-url-by-duration-sum",
      "top-asn-by-requests",
      "TOP-URL-BY-REQUESTS",
    ]) {
      await expect(
        call(client, entry, { ...REQUIRED.getLogInsights, visualization }),
      ).rejects.toThrow(expected);
    }
    expect(client.calls).toEqual([]);
  });
});

describe("the operation table", () => {
  const operation = (apiClass, method) => ({
    apiClass,
    method,
    httpPath: "/x",
    params: [],
    description: ["X."],
  });

  // A repeat would overwrite the first entry, and its class would then send requests to the other one's endpoint.
  test("refuses one method name declared by two classes", () => {
    expect(() =>
      operationTable([
        operation("OneApi", "getX"),
        operation("TwoApi", "getX"),
      ]),
    ).toThrow(
      "getX is declared by both OneApi and TwoApi, and one table cannot hold both. Rename one of them.",
    );
    expect(
      Object.keys(
        operationTable([
          operation("OneApi", "getX"),
          operation("TwoApi", "getY"),
        ]),
      ),
    ).toEqual(["getX", "getY"]);
  });
});
