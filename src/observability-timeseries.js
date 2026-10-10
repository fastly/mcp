import {
  describeOperations,
  filterQuery,
  OwnedApi,
  operationTable,
  param,
} from "./api-adapter.js";

const GRANULARITIES = {
  logs: ["second", "minute", "hour", "day"],
  sustainability: ["day", "month"],
};

function timeseriesQuery({ filter, series, ...rest }) {
  const { source, service_id, cursor, granularity } = rest;
  if (source === "logs") {
    if (service_id === undefined || service_id === "") {
      throw new Error("Missing the required parameter 'service_id' for logs.");
    }
    if (cursor !== undefined) {
      throw new Error("'cursor' is only supported for sustainability.");
    }
  } else if (service_id !== undefined) {
    throw new Error("'service_id' is not supported for sustainability.");
  }
  if (!GRANULARITIES[source].includes(granularity)) {
    throw new Error(
      `'granularity' for ${source} must be one of ${GRANULARITIES[source].join(", ")}.`,
    );
  }
  const metrics = series
    .split(",")
    .map((metric) => metric.trim())
    .filter((metric) => metric !== "");
  if (metrics.length === 0) {
    throw new Error("'series' needs at least one metric.");
  }
  return {
    ...rest,
    series: source === "logs" ? metrics : metrics.join(","),
    ...filterQuery(filter),
  };
}

export class ObservabilityTimeseriesApi extends OwnedApi {
  timeseriesGet(options) {
    return this.send(OPERATIONS.timeseriesGet, options);
  }
}

export const OBSERVABILITY_TIMESERIES_API_CLASSES = {
  ObservabilityTimeseriesApi,
};

export const REPLACED_SDK_CLASSES = Object.keys(
  OBSERVABILITY_TIMESERIES_API_CLASSES,
);

const OPERATIONS = operationTable([
  {
    apiClass: "ObservabilityTimeseriesApi",
    method: "timeseriesGet",
    httpPath: "/observability/timeseries",
    params: [
      param("source", "String", true, "Data source: logs or sustainability.", [
        "logs",
        "sustainability",
      ]),
      param(
        "from",
        "String",
        true,
        "Start of the time range, in RFC 3339 format.",
      ),
      param("to", "String", true, "End of the time range, in RFC 3339 format."),
      param(
        "granularity",
        "String",
        true,
        "Logs supports second, minute, hour, and day. Sustainability supports day and month.",
      ),
      param(
        "series",
        "String",
        true,
        "Comma-separated metrics. Logs sends repeated parameters; sustainability sends normalized CSV.",
      ),
      param(
        "service_id",
        "String",
        false,
        "Required for logs; rejected for sustainability.",
      ),
      param(
        "dimensions",
        "String",
        false,
        "Comma-separated grouping dimensions.",
      ),
      param(
        "filter",
        "Object",
        false,
        "Field tests: scalar equality, arrays for in, or operator objects such as { product: { in: ['delivery'] } }.",
      ),
      param("limit", "Number", false, "Integer result limit."),
      param(
        "cursor",
        "String",
        false,
        "Sustainability only: pass meta.next_cursor unchanged for the next page.",
      ),
    ],
    query: timeseriesQuery,
    description: [
      "Retrieve time series from sampled logs or sustainability data.",
      "Use `from` and `to` as RFC 3339 strings, with an inclusive start and exclusive end.",
      "Logs requires `service_id` and the Log Explorer & Insights product enabled for that service.",
      "These sampled requests cannot provide exact totals; use `historicalApi.getHistStats` for exact request counts.",
      "Logs supports `second`, `minute`, `hour`, and `day` buckets, not numeric durations.",
      "A one-minute window with second buckets worked; more than 300 second buckets failed upstream.",
      "Logs metrics `avg[response_time]` and `p99[response_time]` worked together as repeated series parameters.",
      "Pass them as `series: 'avg[response_time],p99[response_time]'`; the adapter repeats the parameter.",
      "Logs filtering by `response_status` was verified, as in `filter: { response_status: 200 }`.",
      "Logs returns `values` as an array of objects, preserved unchanged.",
      "An upstream bug returned numeric `fastly_pop` grouping dimensions equal to the average metric.",
      "Do not interpret those values as POP codes; this adapter cannot repair them.",
      "Sustainability rejects `service_id` and supports `day` and `month` buckets.",
      "Sustainability metrics `sum[bandwidth_gb]` and `sum[cputime_sec]` were verified.",
      "Log sampling and retention guidance does not apply to sustainability.",
      "Sustainability uses documented, live-verified comma-separated series encoding.",
      "Sustainability dimensions `country` and `product` were verified, including `limit: 1` pagination with `meta.next_cursor`.",
      "Pass that cursor unchanged with the same query to retrieve the next page.",
      "Stop when `meta.next_cursor` is absent or empty; the adapter returns one page per call.",
      "Sustainability product filters support scalar equality and `in` lists; `not_in` is refused.",
      "Use `filter: { product: 'delivery' }` or `filter: { product: ['delivery', 'compute'] }`.",
      "Other metric and filter combinations remain unverified.",
      "Arrays imply `in`; only `in` accepts arrays, and list entries cannot contain commas.",
      "Sustainability `values` objects and cursor metadata remain untouched, as do all other response fields.",
      "API errors propagate unchanged with their `status` and `body`.",
    ],
  },
]);

export function observabilityTimeseriesMethods() {
  return describeOperations(OPERATIONS);
}
