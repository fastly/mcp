// Adapters for the three Log Explorer & Insights read endpoints, none of which works through the SDK.
//
// Records and aggregations cannot be filtered, and aggregations cannot ask for more than one metric. The record model also keeps only 28 of the 65 fields a record carries.
//
// Insights sends its request correctly but loses part of the answer: its model reads `status-code` where the API sends `status_code`, so `response-status-codes` arrives with no dimension at all.
//
// So these adapters send the requests themselves and hand the JSON back untouched.

import {
  bytes,
  describeOperations,
  FILTER_OPERATORS,
  filterQuery,
  OwnedApi,
  operationTable,
  param,
} from "./api-adapter.js";
import { INLINE_RESULT_BYTES } from "./limits.js";

// The API wants one `series` parameter per metric. Hand it a comma-separated list and it answers with a single metric named after the whole string, so splitting here is what makes several metrics work.
function seriesList(series) {
  const metrics = series
    .split(",")
    .map((metric) => metric.trim())
    .filter((metric) => metric !== "");
  if (metrics.length === 0) {
    throw new Error(
      "'series' needs at least one metric, such as 'avg[response_time]'.",
    );
  }
  return metrics;
}

// An unknown visualization comes back a 500, which reads like an outage, so the param checks the name before we send it.
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

export class LogExplorerApi extends OwnedApi {
  getLogRecords(options) {
    return this.send(OPERATIONS.getLogRecords, options);
  }
}

export class InsightsApi extends OwnedApi {
  getLogInsights(options) {
    return this.send(OPERATIONS.getLogInsights, options);
  }
}

export class ObservabilityAggregationsForLogsApi extends OwnedApi {
  logAggregationsGet(options) {
    return this.send(OPERATIONS.logAggregationsGet, options);
  }
}

export const LOG_EXPLORER_API_CLASSES = {
  LogExplorerApi,
  InsightsApi,
  ObservabilityAggregationsForLogsApi,
};

/**
 * SDK classes these adapters deliberately stand in for.
 *
 * Every class here shadows one, so the list is derived. An endpoint the SDK does not ship belongs in its own module, like the NGWAF adapters, and putting one here fails at startup rather than claiming to replace something that isn't there.
 */
export const REPLACED_SDK_CLASSES = Object.keys(LOG_EXPLORER_API_CLASSES);

const SERVICE_ID = param(
  "service_id",
  "String",
  true,
  "Alphanumeric string identifying the service.",
);

const START = param(
  "start",
  "String",
  true,
  "The inclusive start of the time range, in RFC 3339 format. A date on its own, such as `'2026-10-09'`, also works.",
);

const END = param(
  "end",
  "String",
  true,
  "The exclusive end of the time range, in RFC 3339 format.",
);

const LIMIT = param(
  "limit",
  "Number",
  false,
  "How many rows to return, from 1 to 100. The default is 10.",
);

const FILTER = param(
  "filter",
  "Object",
  false,
  "Field tests, as `{ response_status: 404 }` for equality, " +
    "`{ response_time: { gte: 0.5 } }` for another operator, " +
    "or `{ response_status: [404, 500] }` for a list.",
);

const PRODUCT = [
  "The service needs the Log Explorer & Insights product enabled.",
  "Check one service with `productLogExplorerInsightsApi.getProductLogExplorerInsights({ service_id })`, or list them all with `getServicesProductLogExplorerInsights()`.",
  "Records are kept for seven days: a window ending seven days back still returned rows in testing, and one ending eight days back returned none.",
  "A service without the product, or a window older than that, answers 200 with `data: null` rather than an error.",
];

const SAMPLED = [
  "Fastly samples these records at a rate that follows the service's requests per second, so shares and rates are estimates rather than totals.",
  "For exact request counts, use `historicalApi.getHistStats` or `realtimeApi.getStatsLast120Seconds`, which count every request.",
  "`observabilityTimeseriesApi.timeseriesGet` reads this same sampled data, and its `filter` cannot be sent through the SDK either.",
];

const TIMES =
  "Times are RFC 3339 strings, such as `new Date(Date.now() - 3600e3).toISOString()` for an hour ago.";

const FILTER_FIELDS = [
  "A filter names a field of the log record, and the fields combine with AND.",
  "The useful ones are `request_host` (also spelled `domain`), `request_path`, `request_method`, `response_status`, `response_time`, `fastly_pop`, `client_country_code`, `client_browser_name`, `client_device_type`, `client_os_name`, `is_cache_hit`, `is_edge`, `is_shield`, `bot_name` and `bot_category`.",
  "The published reference names `fastly_is_cache_hit`, `fastly_is_edge` and `fastly_is_shield`, which the API refuses; use the `is_` names above.",
  `Operators: \`eq\` is the default, and the others are ${FILTER_OPERATORS.filter((op) => op !== "eq").join(", ")}.`,
  "There is no negation and no `starts-with`.",
  "`customer_id`, `service_id`, `timestamp` and `request_protocol` cannot be filtered on.",
  "A rejected field or operator comes back as a 400 that names it.",
  "An empty `filter` is refused, since a property holding `undefined` arrives here as one and would answer an unfiltered page; when building a filter in a loop, leave the option out while it holds nothing.",
  "The applied tests are echoed in the response, so check them when a result looks too wide.",
];

const ERRORS =
  "A refused call throws an error whose `status` is the HTTP status and whose `body` is the API's JSON reason, as in `JSON.parse(e.body).errors[0].reason`.";

const PRIVACY =
  "Records carry client IP prefixes, request paths and user agents, so return only the fields the question needs.";

const OPERATIONS = operationTable([
  {
    apiClass: "LogExplorerApi",
    method: "getLogRecords",
    httpPath: "/observability/log-explorer",
    params: [
      SERVICE_ID,
      START,
      END,
      LIMIT,
      param(
        "next_cursor",
        "String",
        false,
        "The cursor of the next page, taken from `meta.filters.next_cursor`.",
      ),
      FILTER,
    ],
    query: ({ filter, ...rest }) => ({ ...rest, ...filterQuery(filter) }),
    description: [
      "Search a service's sampled request logs, one page of whole records per call.",
      "This is not a logging endpoint for a service's own log streaming, which is the `logging*Api` classes.",
      TIMES,
      ...PRODUCT,
      ...SAMPLED,
      "Records come back newest first in `data`, and the query is echoed in `meta.filters`.",
      "Page with `next_cursor` from `meta.filters.next_cursor`, passing it back unchanged.",
      "That field is absent once the window holds nothing more, which is the only way to know the page was the last one.",
      "An invalid cursor is refused with a 400, and a cursor belongs to the window it came from.",
      ...FILTER_FIELDS,
      "Each record has about 65 fields, covering the client, the POP, the request, the origin, the response, cache state and bot detection.",
      `A page of 100 records came to 153 KB in testing, which is over the ${bytes(INLINE_RESULT_BYTES)} bytes a result may show the model, so summarize in the snippet rather than returning raw records.`,
      "Count values that clients choose, such as paths and user agents, in a `Map`, since a plain object silently drops a key like `__proto__`.",
      "To summarize the same records instead of reading them one by one, use `observabilityAggregationsForLogsApi.logAggregationsGet`.",
      ERRORS,
      PRIVACY,
    ],
  },
  {
    apiClass: "InsightsApi",
    method: "getLogInsights",
    httpPath: "/observability/log-insights",
    params: [
      param(
        "visualization",
        "String",
        true,
        `Which ranking to return, one of ${VISUALIZATIONS.join(", ")}.`,
        VISUALIZATIONS,
      ),
      SERVICE_ID,
      START,
      END,
      param(
        "pops",
        "String",
        false,
        "Comma-separated POP codes, such as `'PAR,SOF'`, to count only those POPs.",
      ),
      param("domain", "String", false, "Count only requests to this domain."),
      param(
        "domain_exact_match",
        "Boolean",
        false,
        "Whether `domain` must match exactly. The default is true; false matches any domain ending in that value.",
      ),
      LIMIT,
    ],
    description: [
      "Get one ready-made ranking over a service's sampled request logs, such as its busiest URLs or its slowest ones.",
      "These are the charts of the Insights page, each one already aggregated, so this answers a 'top N' question in one call.",
      TIMES,
      ...PRODUCT,
      ...SAMPLED,
      "Each row of `data` has its `dimensions`, sometimes `dimension_attributes`, and sometimes a `values` list.",
      "The dimension key follows the visualization: `url`, `country`, `status_code`, `browser`, `content_type`, `device` or `os`.",
      "The SDK also documents a `response` key, which no visualization produced in testing; it is probably the reason phrase of `top-503-responses`, on a service that has 503s.",
      "`top-4xx-urls` and `top-5xx-urls` have no `values` at all, only a `rate` in `dimension_attributes`.",
      "`country-statistics` and `response-status-codes` ignore `limit`: the first returned every country seen, 211 of them in testing, and the second one row per status code.",
      `A full \`country-statistics\` answer came to 116 KB in testing, over the ${bytes(INLINE_RESULT_BYTES)} bytes a result may show, so pick the rows the question needs.`,
      "The SDK's documentation names a `top-url-by-duration-sum` visualization, which always answers 500; the working name is `top-url-by-duration`.",
      "`response-status-codes` is the one ranking the SDK's own class cannot return, because its response model looks for `status-code` where the API sends `status_code`.",
      "An unknown visualization is refused here rather than sent, because the API answers one with a 500 that reads like an outage.",
      "An unknown POP code gives zero rows rather than an error, so check the codes against `popApi.listPops`.",
      "For a ranking this list does not cover, aggregate the records yourself with `observabilityAggregationsForLogsApi.logAggregationsGet`.",
      ERRORS,
      PRIVACY,
    ],
  },
  {
    apiClass: "ObservabilityAggregationsForLogsApi",
    method: "logAggregationsGet",
    httpPath: "/observability/aggregations",
    params: [
      SERVICE_ID,
      START,
      END,
      param(
        "series",
        "String",
        true,
        "Comma-separated metrics, each one `<operator>[<field>]`, such as `'avg[response_time],max[response_time]'`.",
      ),
      param(
        "dimensions",
        "String",
        false,
        "Comma-separated fields to group by, such as `'fastly_pop,request_method'`. Without this, the whole window is one row.",
      ),
      param(
        "sort",
        "String",
        false,
        "Comma-separated metrics to sort by, written exactly as in `series`, each one optionally prefixed with `-` for descending.",
      ),
      LIMIT,
      FILTER,
    ],
    fixedQuery: { source: "logs" },
    query: ({ series, filter, ...rest }) => ({
      ...rest,
      series: seriesList(series),
      ...filterQuery(filter),
    }),
    description: [
      "Aggregate a service's sampled request logs into your own grouped metrics, such as the p95 response time per POP.",
      "Use this when `insightsApi.getLogInsights` has no ready-made ranking for the question.",
      "`observabilityTimeseriesApi.timeseriesGet` reads the same records with the same metrics, but buckets them by time instead of grouping them by field.",
      "It is still an SDK method, so its `filter` cannot be sent and its `granularity` takes `minute`, `hour` or `day` rather than a number.",
      TIMES,
      ...PRODUCT,
      ...SAMPLED,
      "The API's `source` parameter has one legal value and this method sends it, so it is not an option here.",
      "A metric is `<operator>[<field>]`, where the operators are `avg`, `min`, `max`, `p95` and `p99`.",
      "There is no `count` and no `sum`, so this cannot answer 'how many requests'; count them with `historicalApi.getHistStats` instead.",
      "Ask for several metrics as one comma-separated string; this method splits them, because the API needs the parameter repeated and answers a comma-separated one with a single metric named after the whole string.",
      "Each row of `data` has its `dimensions` and a `values` list holding one object keyed by the metric strings.",
      "Group by `fastly_pop`, `request_host`, `request_path`, `request_method`, `response_content_type`, `response_reason`, `response_state`, `response_x_cache`, `response_completed`, `client_country_code`, `client_region`, `client_as_number`, `client_as_name`, `client_ip_prefix`, `client_browser_name`, `client_browser_version`, `client_device_type` or `client_os_name`.",
      "Those are the fields that worked in testing, and the field's type does not say which ones do: `client_as_number` groups while `response_status` does not.",
      "Every other field answered 500 or 503, which is a server-side fault rather than a bad request, so stay with the list above.",
      "`dimensions` and `sort` are each one comma-separated string, since the API keeps only the first value when either parameter is repeated.",
      "Sorting names the metric as written in `series`, as in `sort: '-p95[response_time]'`, and an unknown name is a 400.",
      ...FILTER_FIELDS,
      "`meta` carries the echoed query directly here, where `logExplorerApi.getLogRecords` nests it under `meta.filters`.",
      ERRORS,
    ],
  },
]);

export function logExplorerMethods() {
  return describeOperations(OPERATIONS);
}
