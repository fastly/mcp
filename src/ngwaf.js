import {
  bytes,
  describeOperations,
  OwnedApi,
  operationTable,
  param,
} from "./api-adapter.js";
import { API_RESPONSE_BYTES, INLINE_RESULT_BYTES } from "./limits.js";

export class NgwafRulesApi extends OwnedApi {
  listAccountRules(options) {
    return this.send(OPERATIONS.listAccountRules, options);
  }

  listWorkspaceRules(options) {
    return this.send(OPERATIONS.listWorkspaceRules, options);
  }
}

export class NgwafWorkspacesApi extends OwnedApi {
  getWorkspace(options) {
    return this.send(OPERATIONS.getWorkspace, options);
  }

  getTopAttacks(options) {
    return this.send(OPERATIONS.getTopAttacks, options);
  }
}

export class NgwafEventsApi extends OwnedApi {
  listEvents(options) {
    return this.send(OPERATIONS.listEvents, options);
  }

  getEvent(options) {
    return this.send(OPERATIONS.getEvent, options);
  }
}

export class NgwafRequestsApi extends OwnedApi {
  searchWorkspaceRequests(options) {
    return this.send(OPERATIONS.searchWorkspaceRequests, options);
  }

  getRequest(options) {
    return this.send(OPERATIONS.getRequest, options);
  }
}

export class NgwafTimeseriesApi extends OwnedApi {
  getWorkspaceTimeseries(options) {
    return this.send(OPERATIONS.getWorkspaceTimeseries, options);
  }
}

export class NgwafSignalsApi extends OwnedApi {
  listAccountSignals(options) {
    return this.send(OPERATIONS.listAccountSignals, options);
  }

  listWorkspaceSignals(options) {
    return this.send(OPERATIONS.listWorkspaceSignals, options);
  }
}

export class NgwafListsApi extends OwnedApi {
  listAccountLists(options) {
    return this.send(OPERATIONS.listAccountLists, options);
  }

  listWorkspaceLists(options) {
    return this.send(OPERATIONS.listWorkspaceLists, options);
  }
}

export const NGWAF_API_CLASSES = {
  NgwafRulesApi,
  NgwafWorkspacesApi,
  NgwafSignalsApi,
  NgwafListsApi,
  NgwafEventsApi,
  NgwafRequestsApi,
  NgwafTimeseriesApi,
};

const PAGING = [
  "Each call returns one page with the rules in `data` and pagination metadata in `meta`.",
  "`meta.limit` gives the page size and `meta.total` gives the collection's rule count.",
  "Pages are numbered from 1, and omitting `page` returns page 1.",
  "`page: 0` is refused with a 400.",
  "Request `page: 1`, `page: 2` and so on, adding every rule `id` to a Set.",
  "The collection is complete only when that Set's size equals `meta.total`.",
  "When counting IDs, a rule seen twice counts once.",
  "Stop and report the list as incomplete if a page is empty before that count is reached.",
  "Also stop if `meta.total` changes between pages or a page adds no new ID.",
  "Pass `enabled: true` to ask for enabled rules only.",
  "Pass `types` as one string, which is sent unchanged.",
  "A comma-separated string such as `'request,signal'` asks for several types.",
  "Conditions name lists and custom signals by `reference_id`, such as `site.blocklist`, and these methods do not resolve them.",
  "Look them up with `ngwafListsApi` and `ngwafSignalsApi`, matching on `reference_id`, never on `id`.",
];

const WORKSPACE_LOOKUP =
  "Get a service's workspace ID from `configuration.workspace_id` in the result of " +
  "`productNgwafApi.getProductNgwafConfiguration({ service_id })`.";

const WORKSPACE_ID = param(
  "workspace_id",
  "String",
  true,
  "The ID of the workspace.",
);

const FROM = param(
  "from",
  "String",
  true,
  "The start of the date-time range, the older of the two dates, in RFC 3339 format.",
);

const TO = param(
  "to",
  "String",
  false,
  "The end of the date-time range, the newer of the two dates, in RFC 3339 format.",
);

const LIMIT = param(
  "limit",
  "Number",
  false,
  "Limit how many results are returned. The default is 100.",
);

const PAGE = param(
  "page",
  "Number",
  false,
  "Page number of the collection to request.",
);

const RULE_FILTERS = [
  param(
    "action",
    "String",
    false,
    "Return only the rules with the given action.",
  ),
  param(
    "enabled",
    "Boolean",
    false,
    "Return either all enabled rules or all disabled rules.",
  ),
  LIMIT,
  PAGE,
  param(
    "types",
    "String",
    false,
    "Return rules with any of the given rule types. " +
      "The string is sent unchanged, and arrays are refused.",
  ),
];

const SIGNAL_LIMIT = param(
  "limit",
  "Number",
  false,
  "Limit how many signals are returned, up to 1,000. The default is 100, and a scope holds up to 200.",
);

const TIMES =
  "Times are RFC 3339 strings, such as `new Date(Date.now() - 24 * 3600e3).toISOString()` for a day ago.";

const RECORD_PAGES = [
  "Each call returns one page, with the records in `data` and their count in `meta.total`.",
  "Fix both ends of the time range before paging, since a range that ends now keeps growing and changes `meta.total`.",
  "Page in a loop from `page: 1`, since `page: 0` returns page 1 again, and add every record `id` to a Set.",
  "The listing is complete only when that Set's size equals `meta.total`, which counts only the records that match the filters.",
  "Report it as incomplete on an empty page, a page that adds no new ID, or a change in `meta.total`.",
  `Return a summary rather than raw records, since the result shown to the model is limited to ${bytes(INLINE_RESULT_BYTES)} bytes.`,
  "Count values that clients choose, such as paths and user agents, in a `Map`, since a plain object silently drops a key like `__proto__`.",
  "A page took one to three seconds in testing and an execution stops after 30 seconds, so check `Date.now()` between pages and stop after about 20 seconds.",
  "When stopping early, return what you have, say that it is incomplete, and give the page to continue from.",
];

const STORED = [
  "Only some requests are stored: all requests with an attack or CVE signal, a sample of those with anomaly, bot or custom signals, and requests without signals only when a rule with request logging matched them.",
  "Requests whose only signals are informational, API, account takeover or threshold signals are counted in time series but never stored.",
  "So an empty search does not mean nothing happened; get counts from `ngwafTimeseriesApi.getWorkspaceTimeseries` or `ngwafReportsApi.getAttacksReport`.",
  "Stored requests are kept for 30 days at most.",
];

const CUSTOM_TAGS =
  "Custom tags look like a signal's `reference_id`, but no live check has confirmed yet that they match, so say so when a custom tag finds no signal.";

const SIGNAL_TAGS = [
  "Signals are named by tag: system signals use names such as `SQLI`, `XSS` or `HTTP404`, and custom ones `site.<name>` or `corp.<name>`.",
  "Look up a custom tag by `reference_id` in `ngwafSignalsApi.listWorkspaceSignals` and `listAccountSignals`, never by `id`.",
  CUSTOM_TAGS,
];

const DETECTORS =
  "A signal's `detector` is either a built-in detector such as `TraversalRule`, or the ID of a rule to find by `id` in `ngwafRulesApi.listWorkspaceRules` or `listAccountRules`.";

const ERRORS =
  "A refused call throws an error whose `status` is the HTTP status and whose `body` is the API's JSON reason, as in `JSON.parse(e.body).detail`.";

const PRIVACY = [
  "Records hold client IPs and full request and response headers, which can include cookies and authorization headers.",
  "Return only the fields the question needs, and never the raw `request_headers` or `response_headers`.",
];

const COMPLETE_LIST =
  "The list is complete only when `data.length` equals `meta.total`; otherwise report it as incomplete.";

const SIGNAL_NAMES = [
  "Rules name a custom signal by its `reference_id`, such as `corp.bad-bot` or `site.bad-bot`, and tags in events and requests have the same form.",
  "Match on `reference_id`, never on `id`, which for a workspace signal is an unrelated string.",
  CUSTOM_TAGS,
  "Built-in signals such as `SQLI` or `XSS` never appear here.",
  "There is no `page` option, so pass `limit: 200` to get every signal a scope can hold in one call.",
  COMPLETE_LIST,
];

const LIST_NAMES = [
  "Each list carries its `type` and all its `entries`, such as IPs, countries or strings.",
  "Rule conditions name a list by its `reference_id`, as in `{ operator: 'in_list', value: 'site.blocklist' }`, never by its `id`.",
  "A scope holds at most 25 lists, and the API has no paging options for them.",
  COMPLETE_LIST,
];

const OPERATIONS = operationTable([
  {
    apiClass: "NgwafRulesApi",
    method: "listAccountRules",
    httpPath: "/ngwaf/v1/rules",
    params: RULE_FILTERS,
    description: [
      "List one page of account-level NGWAF rules, which can apply to several workspaces.",
      ...PAGING,
      "How `enabled`, `types` and `action` affect this list's `meta.total` is unverified.",
      "Page without those filters to establish completeness, then apply them locally.",
      "Until verified, never report a filtered account listing as complete.",
      "Keep account rules whose `scope.applies_to` contains `'*'` or the target workspace ID.",
      "Count distinct IDs on the account collection first, then keep the rules that apply.",
      "The API's `scope` query filter is unverified, and this method does not send it.",
      "Do not assume the workspace list includes account rules.",
      "Deduplicate by rule ID when combining both lists.",
      WORKSPACE_LOOKUP,
    ],
  },
  {
    apiClass: "NgwafRulesApi",
    method: "listWorkspaceRules",
    httpPath: "/ngwaf/v1/workspaces/{workspace_id}/rules",
    params: [WORKSPACE_ID, ...RULE_FILTERS],
    description: [
      "List one page of the NGWAF rules defined in one workspace.",
      ...PAGING,
      "Here `meta.total` counts only rules matching `enabled`, `types` and `action`.",
      "With these filters, a filtered listing is complete when its distinct IDs reach that total.",
      "Account rules can also apply; list them with `ngwafRulesApi.listAccountRules()`.",
      WORKSPACE_LOOKUP,
    ],
  },
  {
    apiClass: "NgwafWorkspacesApi",
    method: "getWorkspace",
    httpPath: "/ngwaf/v1/workspaces/{workspace_id}",
    params: [WORKSPACE_ID],
    description: [
      "Get an NGWAF workspace's settings, including protection `mode` and attack thresholds.",
      "Attack thresholds are in `attack_signal_thresholds`.",
      WORKSPACE_LOOKUP,
      "The configuration's `traffic_ramp` gives the share of traffic inspected, not protection mode.",
      "Whether a rule blocks requests depends on the workspace mode and the rule's actions.",
      "When describing rules, report enablement and blocking separately.",
      "Report attack thresholds as workspace settings, not as rules.",
    ],
  },
  {
    apiClass: "NgwafWorkspacesApi",
    method: "getTopAttacks",
    httpPath: "/ngwaf/v1/workspaces/{workspace_id}/top-attacks",
    params: [
      WORKSPACE_ID,
      param(
        "field",
        "String",
        true,
        "What to rank: `server_name_and_path`, `path`, `remote_ip` or `remote_country_code`.",
      ),
      FROM,
      TO,
      LIMIT,
    ],
    description: [
      "Get a workspace's most attacked URLs or paths, or its top attacking IPs or countries, over up to seven days.",
      "The API reference also lists `user_agent` for `field`, but the API refuses it.",
      "`to` defaults to now, so pass it too when `from` is seven days back, or the few seconds until the request arrives make the range too long.",
      "Older weeks work, such as a `from` 37 days back with a `to` 30 days back.",
      TIMES,
      "Each entry in `data` has a `value`, a `display_name` and a `count`, sorted by request count.",
      "For attack counts across all workspaces, start with `ngwafReportsApi.getAttacksReport`, whose `top_attack_signals` use display names such as `Traversal` rather than tags.",
      ERRORS,
      WORKSPACE_LOOKUP,
    ],
  },
  {
    apiClass: "NgwafSignalsApi",
    method: "listAccountSignals",
    httpPath: "/ngwaf/v1/signals",
    params: [SIGNAL_LIMIT],
    description: [
      "List the account's custom NGWAF signals, whose names start with `corp.`.",
      ...SIGNAL_NAMES,
      "An account signal applies to the workspaces in its `scope.applies_to`, where `'*'` means all of them.",
    ],
  },
  {
    apiClass: "NgwafSignalsApi",
    method: "listWorkspaceSignals",
    httpPath: "/ngwaf/v1/workspaces/{workspace_id}/signals",
    params: [WORKSPACE_ID, SIGNAL_LIMIT],
    description: [
      "List one workspace's custom NGWAF signals, whose names start with `site.`.",
      ...SIGNAL_NAMES,
      "Account signals can also apply; list them with `ngwafSignalsApi.listAccountSignals({ limit: 200 })`.",
      WORKSPACE_LOOKUP,
    ],
  },
  {
    apiClass: "NgwafListsApi",
    method: "listAccountLists",
    httpPath: "/ngwaf/v1/lists",
    params: [],
    description: [
      "List the account's NGWAF lists with their entries, whose names start with `corp.`.",
      ...LIST_NAMES,
    ],
  },
  {
    apiClass: "NgwafListsApi",
    method: "listWorkspaceLists",
    httpPath: "/ngwaf/v1/workspaces/{workspace_id}/lists",
    params: [WORKSPACE_ID],
    description: [
      "List one workspace's NGWAF lists with their entries, whose names start with `site.`.",
      ...LIST_NAMES,
      "Rules can also use account lists; list them with `ngwafListsApi.listAccountLists()`.",
      WORKSPACE_LOOKUP,
    ],
  },
  {
    apiClass: "NgwafEventsApi",
    method: "listEvents",
    httpPath: "/ngwaf/v1/workspaces/{workspace_id}/events",
    params: [
      WORKSPACE_ID,
      FROM,
      TO,
      param("ip", "String", false, "Return only events for this IP."),
      param("signal", "String", false, "Return only events with this signal."),
      param(
        "status",
        "String",
        false,
        "Return only `active` or only `expired` events.",
      ),
      LIMIT,
      PAGE,
    ],
    description: [
      "List one page of NGWAF events, the actions the WAF took against an IP because of threshold-based blocking, templated rules or site alerts.",
      "This is not the account's activity log, which is `eventsApi.listEvents`.",
      TIMES,
      "Filter with `ip`, `signal`, or `status`, which takes `active` or `expired`; any other `status` returns nothing rather than an error.",
      "`signal` matches a tag exactly, so `TRAVERSAL` finds events and `traversal` does not.",
      "Each event has its `action`, the IP in `source`, `reasons` with a `count` per signal in `signal_id`, `request_count`, `window`, `expires_at`, `is_expired` and a `sample_request`.",
      "Whether `signal` also takes custom tags such as `site.<name>` is unverified.",
      ...RECORD_PAGES,
      ...SIGNAL_TAGS,
      ...PRIVACY,
      WORKSPACE_LOOKUP,
    ],
  },
  {
    apiClass: "NgwafEventsApi",
    method: "getEvent",
    httpPath: "/ngwaf/v1/workspaces/{workspace_id}/events/{event_id}",
    params: [
      WORKSPACE_ID,
      param("event_id", "String", true, "The ID of the event."),
    ],
    description: [
      "Get one NGWAF event by ID, with its reasons, request counts and a sample request.",
      "This is not the account's activity log, which is `eventsApi.getEvent`.",
      "Event IDs come from `ngwafEventsApi.listEvents`.",
      "It has the listed fields plus `blocked_request_count` and `flagged_request_count`.",
      ...SIGNAL_TAGS,
      ...PRIVACY,
    ],
  },
  {
    apiClass: "NgwafRequestsApi",
    method: "searchWorkspaceRequests",
    httpPath: "/ngwaf/v1/workspaces/{workspace_id}/requests",
    params: [
      WORKSPACE_ID,
      param(
        "q",
        "String",
        false,
        "Search query in the request search syntax, with the time range as `from:` and `until:`.",
      ),
      LIMIT,
      PAGE,
    ],
    description: [
      "Search the requests an NGWAF workspace stored, such as attacks and blocked requests, one page per call.",
      "`q` uses the request search syntax, such as `'from:-1h ip:192.0.2.1 path:/login'`, `'from:-7d tag:SQLI'`, `'from:-1d tag:BLOCKED'` or `'from:-1d ruleid:<rule id>'`.",
      "Other keys include `httpcode`, `method`, `country`, `useragent`, `server`, `payload` and `sort:time-asc`, and `-key:value` negates.",
      "Put the time range in `q` as `from:` and `until:`, with values such as `-1h`, `-7d`, Unix timestamps or `YYYYMMDD`.",
      "Always include `from:`: a query without it covered only the last six hours in testing.",
      "When paging, use Unix timestamps computed once from `Math.floor(Date.now() / 1000)`, as in `from:1790000000 until:1790604800`.",
      "One query covers at most seven days, and a longer range is refused with a 400, so split longer periods into seven-day windows.",
      "The older Signal Sciences API capped a search at 10,000 requests; whether this one does is unverified, so treat a `meta.total` of exactly 10,000 as possibly capped and narrow the window.",
      ...STORED,
      ...RECORD_PAGES,
      `\`limit\` goes up to 1,000, but 1,000 requests with their headers passed the ${bytes(API_RESPONSE_BYTES)}-byte response limit in testing while 500 came to 2.6 MB, so pages of 250 are a safe choice.`,
      "At that size, a week of 2,734 requests took 11 pages and 17 seconds, so one execution reads roughly 3,000 requests.",
      "Each request has `timestamp`, `remote_ip`, `country`, `method`, `server_name`, `path`, `user_agent`, `response_code` and `signals`, where each signal has its tag in `id`, a `location`, the matched `value` and a `detector`.",
      DETECTORS,
      ...SIGNAL_TAGS,
      ERRORS,
      ...PRIVACY,
      WORKSPACE_LOOKUP,
    ],
  },
  {
    apiClass: "NgwafRequestsApi",
    method: "getRequest",
    httpPath: "/ngwaf/v1/workspaces/{workspace_id}/requests/{request_id}",
    params: [
      WORKSPACE_ID,
      param("request_id", "String", true, "The ID of the request."),
    ],
    description: [
      "Get one stored NGWAF request by ID, with its signals, headers and response details.",
      "Request IDs come from `ngwafRequestsApi.searchWorkspaceRequests` or an event's `sample_request`, and search results already carry the same fields.",
      "Each entry in `signals` has its tag in `id`, a `location`, the matched `value` and a `detector`.",
      DETECTORS,
      ...SIGNAL_TAGS,
      "A matched rule only blocks when the workspace `mode` from `ngwafWorkspacesApi.getWorkspace` allows it.",
      "To check whether a changed request would be blocked, replay it with `ngwafSimulateApi.ngwafSimulateWafRequest`.",
      "Attack signals alone need not block: a request with `SQLI` and `TRAVERSAL` signals simulated as 200 in a workspace in block mode, since such requests are blocked once their IP is flagged.",
      ...PRIVACY,
    ],
  },
  {
    apiClass: "NgwafTimeseriesApi",
    method: "getWorkspaceTimeseries",
    httpPath: "/ngwaf/v1/workspaces/{workspace_id}/timeseries",
    params: [
      WORKSPACE_ID,
      param(
        "start",
        "String",
        true,
        "The start of the date-time range, in RFC 3339 format.",
      ),
      param(
        "metrics",
        "String",
        true,
        "Comma-separated metrics, such as `'requests_total,requests_attack'`.",
      ),
      param(
        "end",
        "String",
        false,
        "The end of the date-time range, in RFC 3339 format.",
      ),
      param(
        "granularity",
        "Number",
        false,
        "Bucket size in seconds, such as 3600 or 86400.",
      ),
    ],
    description: [
      "Get NGWAF metric counts over time for one workspace, such as attacks, blocked requests or a signal.",
      "This is not `observabilityTimeseriesApi.timeseriesGet`, which returns general observability data.",
      "This method takes `start` and `end`, where events and top attacks take `from` and `to`.",
      TIMES,
      "`metrics` is one comma-separated string, such as `'requests_total,requests_attack,requests_total_blocked'`, and also takes signal names such as `SQLI`, `XSS` or `HTTP404`.",
      "Each point in `data` has a `timestamp` and a count under each metric's name.",
      "Without `granularity`, buckets were one hour for up to seven days and two hours for 30 days in testing.",
      "`granularity: 3600` and `86400` were honored, with daily buckets starting at midnight UTC, but 60 gave 10-minute buckets, so read the step from the timestamps.",
      "The bucket still in progress is left out.",
      "An unknown metric name is not refused and comes back as zeros, so check the names against the list above.",
      "Time series also count requests that are never stored, so they can show attacks a request search cannot find.",
      WORKSPACE_LOOKUP,
    ],
  },
]);

export function ngwafMethods() {
  return describeOperations(OPERATIONS);
}
