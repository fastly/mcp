import { describe, expect, test } from "bun:test";
import {
  OBSERVABILITY_TIMESERIES_API_CLASSES,
  ObservabilityTimeseriesApi,
  observabilityTimeseriesMethods,
  REPLACED_SDK_CLASSES,
} from "../src/observability-timeseries.js";
import {
  describeAdapterContract,
  recordingClient,
} from "./adapter-contract.js";

const sustainability = {
  source: "sustainability",
  from: "2026-09-01T00:00:00Z",
  to: "2026-09-02T00:00:00Z",
  granularity: "day",
  series: "sum[bandwidth_gb]",
};
const logs = {
  ...sustainability,
  source: "logs",
  service_id: "service-id",
  granularity: "second",
  series: "avg[response_time]",
};

const call = (client, options) =>
  new ObservabilityTimeseriesApi(client).timeseriesGet(options);

describeAdapterContract({
  name: "Observability Timeseries",
  methods: observabilityTimeseriesMethods,
  classes: OBSERVABILITY_TIMESERIES_API_CLASSES,
  firstParam: "source",
  operations: [
    [
      "ObservabilityTimeseriesApi.timeseriesGet",
      "/observability/timeseries",
      ["source", "from", "to", "granularity", "series"],
      {
        service_id: "String",
        dimensions: "String",
        filter: "Object",
        limit: "Number",
        cursor: "String",
      },
    ],
  ],
  sampleOptions: () => ({ ...sustainability }),
});

describe("Observability Timeseries queries", () => {
  test("declares its SDK replacement", () => {
    expect(REPLACED_SDK_CLASSES).toEqual(["ObservabilityTimeseriesApi"]);
    expect(REPLACED_SDK_CLASSES).toEqual(
      Object.keys(OBSERVABILITY_TIMESERIES_API_CLASSES),
    );
  });

  test("logs uses repeated metrics and shared filters", async () => {
    const client = recordingClient();
    await call(client, {
      ...logs,
      series: " avg[response_time], , p99[response_time], ",
      dimensions: "fastly_pop",
      limit: 3,
      filter: { response_status: [200, 404], response_time: { gte: 0.5 } },
    });
    expect(client.calls).toEqual([
      [
        "/observability/timeseries",
        "GET",
        {},
        {},
        {
          ...logs,
          series: ["avg[response_time]", "p99[response_time]"],
          dimensions: "fastly_pop",
          limit: 3,
          "filter[response_status][in]": "200,404",
          "filter[response_time][gte]": 0.5,
        },
        {},
        {},
        null,
        ["token"],
        [],
        ["application/json"],
        Object,
        "https://api.fastly.com",
      ],
    ]);
  });

  test("sustainability normalizes CSV and passes pagination unchanged", async () => {
    const client = recordingClient();
    await call(client, {
      ...sustainability,
      series: " sum[bandwidth_gb],, sum[cputime_sec], ",
      dimensions: "country,product",
      limit: 1,
      cursor: "opaque+/=cursor",
      filter: { product: { in: ["cdn", "compute"] } },
    });
    expect(client.calls[0][4]).toEqual({
      ...sustainability,
      series: "sum[bandwidth_gb],sum[cputime_sec]",
      dimensions: "country,product",
      limit: 1,
      cursor: "opaque+/=cursor",
      "filter[product][in]": "cdn,compute",
    });
  });

  test("scalar equality works for both sources", async () => {
    for (const [options, filter, expected] of [
      [logs, { response_status: 404 }, { "filter[response_status]": 404 }],
      [sustainability, { product: "cdn" }, { "filter[product]": "cdn" }],
    ]) {
      const client = recordingClient();
      await call(client, { ...options, filter });
      expect(client.calls[0][4]).toMatchObject(expected);
      expect(client.calls[0][4]).not.toHaveProperty("filter");
    }
  });

  test("omits null and undefined optional values", async () => {
    for (const absent of [null, undefined]) {
      const client = recordingClient();
      await call(client, {
        ...sustainability,
        service_id: absent,
        dimensions: absent,
        filter: absent,
        limit: absent,
        cursor: absent,
      });
      expect(client.calls[0][4]).toEqual(sustainability);
      await call(client, { ...logs, cursor: absent });
      expect(client.calls[1][4]).toEqual({
        ...logs,
        series: [logs.series],
      });
    }
  });

  test("checks conditional service requiredness and source-only options", async () => {
    const client = recordingClient();
    for (const service_id of [undefined, null, ""]) {
      await expect(call(client, { ...logs, service_id })).rejects.toThrow(
        "Missing the required parameter 'service_id'",
      );
    }
    for (const service_id of ["service-id", ""]) {
      await expect(
        call(client, { ...sustainability, service_id }),
      ).rejects.toThrow("'service_id' is not supported for sustainability");
    }
    for (const cursor of ["cursor", ""]) {
      await expect(call(client, { ...logs, cursor })).rejects.toThrow(
        "'cursor' is only supported for sustainability",
      );
    }
    await expect(
      call(client, { ...sustainability, source: "unknown" }),
    ).rejects.toThrow("'source' must be one of logs, sustainability");
    expect(client.calls).toEqual([]);
  });

  test("accepts only each source's string granularities", async () => {
    for (const [options, allowed, denied] of [
      [logs, ["second", "minute", "hour", "day"], ["month", "week", "1"]],
      [sustainability, ["day", "month"], ["second", "minute", "hour"]],
    ]) {
      const client = recordingClient();
      for (const granularity of denied) {
        await expect(call(client, { ...options, granularity })).rejects.toThrow(
          "'granularity'",
        );
      }
      await expect(
        call(client, { ...options, granularity: 1 }),
      ).rejects.toThrow("'granularity' must be a string");
      expect(client.calls).toEqual([]);
      for (const granularity of allowed) {
        await call(client, { ...options, granularity });
        expect(client.calls.at(-1)[4].granularity).toBe(granularity);
      }
    }
  });

  test("rejects blank metric lists without imposing a metric allowlist", async () => {
    for (const options of [logs, sustainability]) {
      const client = recordingClient();
      for (const series of [" ", ",", " , , "]) {
        await expect(call(client, { ...options, series })).rejects.toThrow(
          "'series' needs at least one metric",
        );
      }
      expect(client.calls).toEqual([]);
      await call(client, { ...options, series: " future[metric] " });
      expect(client.calls[0][4].series).toEqual(
        options.source === "logs" ? ["future[metric]"] : "future[metric]",
      );
    }
  });

  test("rejects invalid filters before sending either source", async () => {
    for (const options of [logs, sustainability]) {
      const client = recordingClient();
      for (const filter of [
        {},
        { product: [] },
        { product: {} },
        { product: null },
        { product: undefined },
        { product: ["cdn,compute"] },
        { product: { in: ["cdn,compute"] } },
        { product: { in: [] } },
        { product: { in: [null] } },
        { product: { in: [{}] } },
        { product: { eq: ["cdn"] } },
        { product: { contains: ["cdn"] } },
        { product: { "ends-with": ["cdn"] } },
        { product: { not_in: ["cdn"] } },
        { "product][in": "cdn" },
      ]) {
        await expect(call(client, { ...options, filter })).rejects.toThrow(
          "filter",
        );
      }
      expect(client.calls).toEqual([]);
    }
  });

  test("preserves raw values, upstream grouping bugs, and cursor metadata", async () => {
    for (const [options, body] of [
      [
        logs,
        {
          data: [
            {
              dimensions: { fastly_pop: 0.5, time: "2026-10-09T00:00:00Z" },
              values: [{ "avg[response_time]": 0.5 }],
            },
          ],
          meta: { extra: true },
        },
      ],
      [
        sustainability,
        {
          data: [{ values: { "sum[bandwidth_gb]": 4 } }],
          meta: { next_cursor: "next", extra: true },
        },
      ],
      [logs, { data: null }],
    ]) {
      expect(await call(recordingClient(body), options)).toBe(body);
    }
  });

  test("forwards upstream errors unchanged", async () => {
    const error = Object.assign(new Error("upstream refused query"), {
      status: 400,
      body: '{"errors":[{"reason":"too many buckets"}]}',
    });
    const client = {
      callApi: () => Promise.reject(error),
    };
    for (const options of [logs, sustainability]) {
      await expect(call(client, options)).rejects.toBe(error);
    }
  });
});
