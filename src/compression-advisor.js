// A synthetic API: one call runs a whole compression analysis over several other APIs, and returns only aggregated findings so request paths and client data stay out of the result.

import { describeOperations, param, readOptions } from "./api-adapter.js";

const GIGABYTE = 1e9;
const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const LOG_RETENTION_DAYS = 7;
const HOURLY_RETENTION_DAYS = 375;
const MAX_SERVICES = 10;
const SERVICE_CONCURRENCY = 4;
// Only used when the sandbox gives no execution deadline.
const ANALYSIS_BUDGET_MS = 20_000;
// Leaves the snippet enough time to return the result.
const RESULT_RESERVE_MS = 5_000;
const RANKING_LIMIT = 100;
const MAX_VARIANT_QUERIES = 8;
const MAX_LISTED_TYPES = 10;
const SIZE_SERIES = "avg[response_bytes_body]";
const UNSPECIFIED = "<unspecified>";

// Fastly reports about 70% savings for gzip on text, and Brotli output is 15 to 25% smaller than gzip's.
const REDUCTION_RATIOS = { gzip: 0.7, brotli: 0.75 };

// What Brotli still saves on bytes that gzip already compresses.
const GZIP_TO_BROTLI_RATIO =
  1 - (1 - REDUCTION_RATIOS.brotli) / (1 - REDUCTION_RATIOS.gzip);

// Text formats that compress well, with their usual extensions, so URL rankings and extension rules can be tied back to a type.
const COMPRESSIBLE_TYPES = {
  "text/html": ["html", "htm"],
  "text/css": ["css"],
  "text/plain": ["txt"],
  "text/csv": ["csv"],
  "text/xml": ["xml"],
  "text/javascript": ["js", "mjs"],
  "text/markdown": ["md"],
  "text/vtt": ["vtt"],
  "text/calendar": ["ics"],
  "application/javascript": ["js", "mjs"],
  "application/x-javascript": ["js"],
  "application/ecmascript": ["js"],
  "application/json": ["json"],
  "application/ld+json": ["jsonld"],
  "application/manifest+json": ["webmanifest"],
  "application/geo+json": ["geojson"],
  "application/xml": ["xml"],
  "application/xhtml+xml": ["xhtml"],
  "application/rss+xml": ["rss"],
  "application/atom+xml": ["atom"],
  "application/vnd.apple.mpegurl": ["m3u8"],
  "application/x-mpegurl": ["m3u8"],
  "application/dash+xml": ["mpd"],
  "application/wasm": ["wasm"],
  "application/vnd.ms-fontobject": ["eot"],
  "application/x-font-opentype": ["otf"],
  "application/x-font-truetype": ["ttf"],
  "application/x-font-ttf": ["ttf"],
  "font/eot": ["eot"],
  "font/opentype": ["otf"],
  "font/otf": ["otf"],
  "font/ttf": ["ttf"],
  "image/svg+xml": ["svg"],
  "image/vnd.microsoft.icon": ["ico"],
  "image/x-icon": ["ico"],
  "image/bmp": ["bmp"],
};

// Formats that are already compressed, where gzip or Brotli saves next to nothing.
const COMPRESSED_TYPES = new Set([
  "application/gzip",
  "application/x-gzip",
  "application/zip",
  "application/x-bzip2",
  "application/x-xz",
  "application/zstd",
  "application/x-7z-compressed",
  "application/x-rar-compressed",
  "application/pdf",
  "application/font-woff",
  "application/font-woff2",
  "font/woff",
  "font/woff2",
]);

const COMPRESSED_PREFIXES = ["image/", "video/", "audio/"];

const TYPES_BY_EXTENSION = new Map();
for (const [type, extensions] of Object.entries(COMPRESSIBLE_TYPES)) {
  for (const extension of extensions) {
    TYPES_BY_EXTENSION.set(extension, [
      ...(TYPES_BY_EXTENSION.get(extension) ?? []),
      type,
    ]);
  }
}

const CUSTOM_COMPRESSION = /\bberesp\.(?:gzip|brotli)\b|\bx-compress-hint\b/i;
const FETCH_MACRO = /#FASTLY\s+fetch\b/i;
const FETCH_SUBROUTINE = /\bsub\s+vcl_fetch\b/;

/** What each `*_source` value means, returned with every analysis. */
export const SOURCES = {
  service_configuration: {
    kind: "exact",
    description:
      "The active version's gzip rules, custom VCL files and VCL snippets, read from the service configuration.",
  },
  brotli_product: {
    kind: "exact",
    description:
      "Whether the Brotli compression product is enabled on the service.",
  },
  historical_stats: {
    kind: "exact",
    description:
      "Historical stats in hourly buckets, which count every request. `delivered_body_bytes` is the body bytes sent to end users.",
  },
  sampled_log_explorer: {
    kind: "estimate",
    description:
      "Sampled Log Explorer data. A content type's share is its request share from Insights times its average body size from log aggregations. Content types and extensions are the ones seen in the sample.",
  },
  calculated_estimate: {
    kind: "estimate",
    description:
      "Calculated from the values next to it. At least one input is an estimate or an assumption.",
  },
  assumed_ratio: {
    kind: "assumption",
    description:
      "A typical reduction ratio for text, not a measurement of this service's content. Fastly reports about 70% for gzip, and the HTTP Archive Web Almanac reports Brotli output 15 to 25% smaller than gzip output.",
  },
};

const GLOBAL_CAVEATS = [
  "Log Explorer records do not show the Content-Encoding header. Fastly never compresses a response that the origin compressed, and such a response looks uncompressed here, so projected savings are upper limits.",
  "Gzip rules compress only 200 and 404 responses, and only for clients that send Accept-Encoding, while the shares count every response.",
  "The analysis only reads configuration and statistics. It changes nothing.",
];

const PARAMS = [
  param(
    "service_ids",
    "Array",
    true,
    `The IDs of the services to analyze, from 1 to ${MAX_SERVICES}.`,
  ),
  param(
    "from",
    "String",
    true,
    "The inclusive start of the window, in RFC 3339 format, such as `'2026-10-01T00:00:00Z'`. A date on its own means midnight UTC.",
  ),
  param(
    "to",
    "String",
    true,
    "The exclusive end of the window, in RFC 3339 format.",
  ),
  param(
    "minimum_candidate_bandwidth_gb",
    "Number",
    false,
    "List a service as a candidate only when its candidate traffic reaches this many gigabytes (10^9 bytes). A whole number; the default is 0.",
  ),
  param(
    "compression",
    "String",
    false,
    "The compression to project savings for: `gzip`, the default, or `brotli`.",
    Object.keys(REDUCTION_RATIOS),
  ),
];

const RFC3339 =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2}))?$/i;

function readTime(name, value) {
  const time = RFC3339.test(value) ? Date.parse(value) : Number.NaN;
  if (!Number.isFinite(time)) {
    throw new Error(
      `'${name}' must be an RFC 3339 date-time with a time zone, such as '2026-10-01T00:00:00Z'.`,
    );
  }
  return time;
}

function readServiceIds(ids) {
  if (ids.length === 0 || ids.length > MAX_SERVICES) {
    throw new Error(
      `'service_ids' must hold from 1 to ${MAX_SERVICES} service IDs, not ${ids.length}. Split a longer list over several calls.`,
    );
  }
  const seen = new Set();
  for (const id of ids) {
    if (typeof id !== "string" || !/^[A-Za-z0-9]+$/.test(id)) {
      throw new Error(
        `'service_ids' must hold alphanumeric service IDs. ${JSON.stringify(id)} is not one.`,
      );
    }
    if (seen.has(id)) throw new Error(`'service_ids' names ${id} twice.`);
    seen.add(id);
  }
  return ids;
}

function readAnalysisOptions(options) {
  const values = readOptions("analyze", options, PARAMS);
  const from = readTime("from", values.from);
  const to = readTime("to", values.to);
  if (from >= to) throw new Error("'from' must be earlier than 'to'.");
  const minimum = values.minimum_candidate_bandwidth_gb ?? 0;
  if (minimum < 0) {
    throw new Error("'minimum_candidate_bandwidth_gb' cannot be negative.");
  }
  return {
    serviceIds: readServiceIds(values.service_ids),
    from,
    to,
    minimumBytes: minimum * GIGABYTE,
    compression: values.compression || "gzip",
  };
}

function analysisWindows(from, to, now) {
  if (from < now - HOURLY_RETENTION_DAYS * DAY_MS) {
    throw new Error(
      `'from' must be within the last ${HOURLY_RETENTION_DAYS} days, which is how long Fastly keeps hourly stats.`,
    );
  }
  const end = Math.min(to, now);
  const historical = { from: ceilHour(from), to: floorHour(end) };
  if (historical.to <= historical.from) {
    throw new Error(
      "The window must hold at least one whole hour that has already passed.",
    );
  }
  const logsFrom = Math.max(from, now - LOG_RETENTION_DAYS * DAY_MS);
  const logs =
    end > logsFrom
      ? { from: logsFrom, to: end, coverage: (end - logsFrom) / (end - from) }
      : undefined;
  return { historical, logs };
}

const iso = (time) => new Date(time).toISOString();
const ceilHour = (time) => Math.ceil(time / HOUR_MS) * HOUR_MS;
const floorHour = (time) => Math.floor(time / HOUR_MS) * HOUR_MS;
const round = (value) => Number(value.toFixed(6));
const fraction = (value) => round(Math.min(1, value));
const isoRange = ({ from, to }) => ({ from: iso(from), to: iso(to) });
const sum = (values) => values.reduce((total, value) => total + value, 0);
const shareOf = (entries) => sum(entries.map(({ share }) => share));

const splitList = (value) =>
  typeof value === "string" ? value.split(/\s+/).filter(Boolean) : [];

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

const mediaTypeOf = (raw) =>
  String(raw ?? "")
    .split(";")[0]
    .trim();

// Insights groups content types the same way.
const normalizeContentType = (raw) =>
  mediaTypeOf(raw).toLowerCase() || UNSPECIFIED;

const isKnownType = (type) => Object.hasOwn(COMPRESSIBLE_TYPES, type);

/** `compressible`, `compressed`, or `unknown` for binary types such as `application/octet-stream`. */
export function classifyContentType(type) {
  if (isKnownType(type)) return "compressible";
  // Compressing an event stream delays events until a block fills up.
  if (type.startsWith("text/") && type !== "text/event-stream") {
    return "compressible";
  }
  if (/\+(?:json|xml)$/.test(type)) return "compressible";
  if (COMPRESSED_TYPES.has(type)) return "compressed";
  if (COMPRESSED_PREFIXES.some((prefix) => type.startsWith(prefix))) {
    return "compressed";
  }
  return "unknown";
}

// Content types come from origin headers, so only known ones are named.
function labelOf(type) {
  if (isKnownType(type)) return type;
  if (type.startsWith("text/")) return "other text/* types";
  return type.endsWith("+json") ? "other +json types" : "other +xml types";
}

// Insights writes URLs as `GET /path`.
const urlOf = (value) => String(value ?? "").replace(/^[A-Z]+ /, "");

// Only known extensions come out, so nothing a client typed ends up in the result.
function urlExtension(url) {
  const path = url.split(/[?#]/)[0];
  const segment = path.slice(path.lastIndexOf("/") + 1);
  const dot = segment.lastIndexOf(".");
  if (dot <= 0) return undefined;
  const extension = segment.slice(dot + 1).toLowerCase();
  return TYPES_BY_EXTENSION.has(extension) ? extension : undefined;
}

/** Rebuilds the test Fastly generates from a gzip rule: case-sensitive, on the content type without its parameters or on the URL extension, with `/.../` entries read as regular expressions. */
function gzipRule(gzip) {
  const contentTypes = splitList(gzip.content_types);
  const extensions = splitList(gzip.extensions);
  const rule = {
    name: gzip.name,
    extensions: new Set(extensions),
    cacheCondition: gzip.cache_condition || undefined,
    contentType: undefined,
    url: undefined,
    // Fastly fills in its default lists when a rule is saved, so an empty list is something we can't interpret.
    unreadable: contentTypes.length === 0 || extensions.length === 0,
  };
  const pattern = (entry) =>
    entry.length > 2 && entry.startsWith("/") && entry.endsWith("/")
      ? entry.slice(1, -1)
      : escapeRegExp(entry);
  try {
    if (contentTypes.length) {
      rule.contentType = new RegExp(
        `^(?:${contentTypes.map(pattern).join("|")})\\s*(?:$|;)`,
      );
    }
  } catch {
    // Fastly uses PCRE, and a few PCRE patterns don't work in JavaScript.
    rule.unreadable = true;
  }
  if (extensions.length) {
    rule.url = new RegExp(
      `\\.(?:${extensions.map(escapeRegExp).join("|")})(?:$|\\?)`,
    );
  }
  return rule;
}

// Custom VCL can turn compression on or off behind the gzip rules' back.
function scanCustomVcl(version) {
  const vcls = version.vcls ?? [];
  const custom = [];
  const dynamic = [];
  for (const vcl of vcls) {
    if (CUSTOM_COMPRESSION.test(vcl.content ?? "")) {
      custom.push(`vcl:${vcl.name}`);
    }
  }
  for (const snippet of version.snippets ?? []) {
    if (CUSTOM_COMPRESSION.test(snippet.content ?? "")) {
      custom.push(`snippet:${snippet.name}`);
    }
    // A dynamic snippet can change without a new version, so the version may not show what actually runs.
    if (String(snippet.dynamic) === "1") dynamic.push(snippet.name);
  }
  // Fastly adds its own vcl_fetch, macro included, when custom VCL has none, so only a custom vcl_fetch without the macro skips the gzip rules.
  const has = (pattern) => vcls.some((vcl) => pattern.test(vcl.content ?? ""));
  const bypassed = has(FETCH_SUBROUTINE) && !has(FETCH_MACRO);
  return { custom, dynamic, bypassed };
}

async function settle(tasks) {
  const names = Object.keys(tasks);
  const results = await Promise.allSettled(
    names.map(async (name) => tasks[name]()),
  );
  return Object.fromEntries(names.map((name, i) => [name, results[i]]));
}

// The totals are reported as exact, so an answer that isn't clearly complete fails the service rather than counting as zero.
function historicalTotal(response, field) {
  if (response?.status !== "success" || !Array.isArray(response.data)) {
    const reason = response?.msg ? `: ${response.msg}` : "";
    throw new Error(
      `Historical stats for ${field} answered with status ${JSON.stringify(response?.status)}${reason}.`,
    );
  }
  if (response.data.some((row) => !Number.isFinite(row?.[field]))) {
    throw new Error(`Historical stats left ${field} out of some hours.`);
  }
  return sum(response.data.map((row) => row[field]));
}

const averageOf = (row) => row?.values?.[0]?.[SIZE_SERIES];

/** Splits the service's body bytes by content type: each type's request share from Insights, times its average size from log aggregations, over the overall average. */
async function contentTypeShares(ctx, serviceId, sampled, needsWeight) {
  const { insights, sizes, overall } = sampled;
  const average = averageOf(overall.data?.[0]);
  const requestShares = new Map();
  for (const row of insights.data ?? []) {
    const rate = row?.values?.[0]?.rate;
    if (!Number.isFinite(rate)) continue;
    const type = normalizeContentType(row.dimensions?.content_type);
    requestShares.set(type, (requestShares.get(type) ?? 0) + rate);
  }
  if (!Number.isFinite(average) || average <= 0 || requestShares.size === 0) {
    return undefined;
  }
  const variants = new Map();
  for (const row of sizes.data ?? []) {
    const raw = row?.dimensions?.response_content_type ?? "";
    const size = averageOf(row);
    if (!Number.isFinite(size)) continue;
    const type = normalizeContentType(raw);
    variants.set(type, [...(variants.get(type) ?? []), { raw, size }]);
  }
  const spellings = new Map(
    [...variants].map(([type, found]) => [
      type,
      [...new Set(found.map(({ raw }) => mediaTypeOf(raw)))],
    ]),
  );
  // Spellings such as with and without a charset each have their own average, and only a filtered query weighs them properly.
  const weighable = [...requestShares.keys()]
    .filter(
      (type) =>
        (variants.get(type)?.length ?? 0) > 1 &&
        needsWeight(type, spellings.get(type)),
    )
    .sort((a, b) => requestShares.get(b) - requestShares.get(a));
  const queried = weighable.slice(0, MAX_VARIANT_QUERIES);
  const answers = await Promise.allSettled(
    queried.map(async (type) => {
      const answer = await ctx.aggregations(serviceId, {
        filter: { response_content_type: variants.get(type).map((v) => v.raw) },
      });
      return averageOf(answer?.data?.[0]);
    }),
  );
  ctx.rethrowExpired(answers);
  const weighted = new Map();
  queried.forEach((type, i) => {
    const { value } = answers[i];
    if (Number.isFinite(value)) weighted.set(type, value);
  });
  const shares = new Map();
  for (const [type, rate] of requestShares) {
    const found = variants.get(type);
    if (found === undefined) continue;
    const size =
      weighted.get(type) ?? sum(found.map((v) => v.size)) / found.length;
    shares.set(type, Math.min(1, (rate * size) / average));
  }
  return {
    shares,
    spellings,
    approximated: weighable.some((type) => !weighted.has(type)),
    truncated:
      (insights.data?.length ?? 0) >= RANKING_LIMIT ||
      (sizes.data?.length ?? 0) >= RANKING_LIMIT,
  };
}

// Traffic reached only by a conditional or bypassed rule is uncertain, not covered.
function extensionShares(ranking, matches, definite) {
  let ranked = 0;
  let covered = 0;
  let uncertain = 0;
  const uncovered = new Map();
  const reaches = (matcher, url, extension) =>
    matcher.url(url) || TYPES_BY_EXTENSION.get(extension).some(matcher.type);
  for (const row of ranking?.data ?? []) {
    const share = row?.values?.[0]?.bandwidth_percentage;
    if (!Number.isFinite(share)) continue;
    ranked += share;
    const url = urlOf(row.dimensions?.url);
    const extension = urlExtension(url);
    if (extension === undefined) continue;
    if (reaches(definite, url, extension)) {
      covered += share;
    } else if (reaches(matches, url, extension)) {
      uncertain += share;
    } else {
      uncovered.set(extension, (uncovered.get(extension) ?? 0) + share);
    }
  }
  if (ranked === 0) return undefined;
  return {
    missing: [...uncovered.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([extension]) => extension),
    uncertain: uncertain > 0,
    ranking: {
      ranked_share: fraction(ranked),
      covered_compressible_share: fraction(covered),
      uncertain_compressible_share: fraction(uncertain),
      uncovered_compressible_share: fraction(sum([...uncovered.values()])),
      source: "sampled_log_explorer",
    },
  };
}

function recommendationFor({
  isCompute,
  bypassed,
  unconditional,
  missingTypes,
  missingExtensions,
  conditionalRules,
  unreadableRules,
  hidden,
  brotli,
}) {
  const actions = [];
  if (isCompute) {
    actions.push({
      action: "set_x_compress_hint",
      content_types: missingTypes,
    });
  } else {
    if (bypassed) actions.push({ action: "restore_fastly_fetch_macro" });
    if (missingTypes.length || missingExtensions.length) {
      actions.push({
        // A type added to a conditional rule would stay conditional, so only unconditional rules get updated.
        action: unconditional.length
          ? "update_gzip_config"
          : "create_gzip_config",
        ...(unconditional.length === 1 && { gzip_rule: unconditional[0].name }),
        content_types: missingTypes,
        ...(missingExtensions.length && { extensions: missingExtensions }),
      });
    }
    if (unreadableRules.length) {
      actions.push({
        action: "review_gzip_rules",
        gzip_rules: unreadableRules,
      });
    }
    if (conditionalRules.length) {
      actions.push({
        action: "review_gzip_cache_condition",
        gzip_rules: conditionalRules,
      });
    }
    if (brotli === "disabled")
      actions.push({ action: "enable_brotli_product" });
    if (brotli === "unknown") actions.push({ action: "verify_brotli_product" });
  }
  if (hidden) actions.push({ action: "review_unlisted_content_types" });
  const [first, ...rest] = actions;
  return rest.length ? { ...first, additional_actions: rest } : first;
}

async function analyzeService(ctx, serviceId) {
  const { call, compression, windows } = ctx;
  const { logs, historical } = windows;
  // Without the product, Log Explorer answers some reads with a 500, so we don't send them at all.
  const sampling = logs
    ? ctx.logExplorerStatus(serviceId)
    : Promise.resolve("outside_retention");
  const logRead = (read) => async () => {
    const status = await sampling;
    return status === "enabled" || status === "unknown" ? read() : undefined;
  };
  const historicalField = async (field) =>
    historicalTotal(
      await call("HistoricalApi", "getHistStatsServiceField", {
        service_id: serviceId,
        field,
        from: iso(historical.from),
        to: iso(historical.to),
        by: "hour",
      }),
      field,
    );
  const insights = (visualization) =>
    call("InsightsApi", "getLogInsights", {
      visualization,
      service_id: serviceId,
      start: iso(logs.from),
      end: iso(logs.to),
      limit: RANKING_LIMIT,
    });
  // Everything is read at once. Which body field has data depends on the service type, so both are read.
  const settled = await settle({
    detail: () =>
      call("ServiceApi", "getServiceDetail", { service_id: serviceId }),
    bandwidth: () => historicalField("bandwidth"),
    edge_resp_body_bytes: () => historicalField("edge_resp_body_bytes"),
    compute_resp_body_bytes: () => historicalField("compute_resp_body_bytes"),
    ...(compression === "brotli" && {
      brotli: () => ctx.brotliStatus(serviceId),
    }),
    insights: logRead(() => insights("top-content-type-by-requests")),
    ranking: logRead(() => insights("top-url-by-bandwidth")),
    sizes: logRead(() =>
      ctx.aggregations(serviceId, {
        dimensions: "response_content_type",
        limit: RANKING_LIMIT,
      }),
    ),
    overall: logRead(() => ctx.aggregations(serviceId, {})),
  });
  ctx.rethrowExpired(Object.values(settled));
  if (settled.detail.status === "rejected") {
    return ctx.failed(
      serviceId,
      "service_configuration",
      settled.detail.reason,
    );
  }
  const detail = settled.detail.value;
  const version = detail?.active_version;
  const service = { id: serviceId, name: detail?.name, type: detail?.type };
  if (!version?.number) return { service, reason: "no_active_version" };
  service.active_version = version.number;
  service.source = "service_configuration";
  const isCompute = detail.type === "wasm";
  const bodyField = isCompute
    ? "compute_resp_body_bytes"
    : "edge_resp_body_bytes";

  const errors = [];
  const read = (name, source) => {
    const result = settled[name];
    if (result === undefined) return undefined;
    if (result.status === "fulfilled") return result.value;
    errors.push(ctx.failure(source, result.reason));
    return undefined;
  };
  const totalBandwidth = read("bandwidth", "historical_stats");
  const deliveredBody = read(bodyField, "historical_stats");
  const sampled = {
    insights: read("insights", "sampled_log_explorer"),
    sizes: read("sizes", "sampled_log_explorer"),
    overall: read("overall", "sampled_log_explorer"),
  };
  const ranking = isCompute
    ? undefined
    : read("ranking", "sampled_log_explorer");
  if (totalBandwidth === undefined || deliveredBody === undefined) {
    return { service, reason: "failed", errors };
  }

  const rules = isCompute ? [] : (version.gzips ?? []).map(gzipRule);
  const { custom, dynamic, bypassed } = isCompute
    ? { custom: [], dynamic: [], bypassed: false }
    : scanCustomVcl(version);
  let status = "not_configured";
  if (isCompute) status = "not_applicable";
  else if (rules.length) status = bypassed ? "bypassed" : "covered";
  const configuration = { status, status_source: "service_configuration" };
  if (!isCompute) configuration.gzip_rules = rules.map((rule) => rule.name);
  if (custom.length) configuration.custom_compression = custom;
  if (dynamic.length) configuration.dynamic_snippets = dynamic;
  const brotli = isCompute ? undefined : settled.brotli?.value;
  if (brotli !== undefined) {
    configuration.brotli_product = brotli;
    configuration.brotli_product_source = "brotli_product";
  }

  const traffic = {
    total_bandwidth_bytes: totalBandwidth,
    total_bandwidth_source: "historical_stats",
    delivered_body_bytes: deliveredBody,
    delivered_body_source: "historical_stats",
  };

  const logStatus = await sampling;
  if (logStatus === "disabled" || logStatus === "outside_retention") {
    const reason =
      logStatus === "disabled"
        ? "log_explorer_not_enabled"
        : "window_outside_log_retention";
    return { service, reason, configuration, traffic };
  }
  // An empty sample isn't a failure, even when the reads that depend on it fail.
  if (sampled.insights !== undefined && !sampled.insights?.data?.length) {
    return { service, reason: "no_sampled_traffic", configuration, traffic };
  }

  const matcherFor = (list) => ({
    type: (value) => list.some((rule) => rule.contentType?.test(value)),
    url: (url) => list.some((rule) => rule.url?.test(url)),
  });
  const unconditional = rules.filter((rule) => !rule.cacheCondition);
  const matches = matcherFor(rules);
  const surely = matcherFor(unconditional);
  const definite = matcherFor(bypassed ? [] : unconditional);
  const unreadable = rules.filter((rule) => rule.unreadable);
  // Fastly matches content types case-sensitively, so a type only counts as covered when a rule without a cache condition matches every spelling the origin sends.
  const coverageOf = (spellings) => {
    if (bypassed) return "none";
    if (spellings.every(surely.type)) return "full";
    if (spellings.every(matches.type)) return "conditional";
    if (unreadable.length) return "unknown";
    return spellings.some(matches.type) ? "some_spellings" : "none";
  };
  const countsGzipped = brotli !== undefined && brotli !== "enabled";
  const split =
    sampled.insights && sampled.sizes && sampled.overall
      ? await contentTypeShares(
          ctx,
          serviceId,
          sampled,
          (type, spellings) =>
            classifyContentType(type) === "compressible" &&
            (countsGzipped || coverageOf(spellings) !== "full"),
        )
      : undefined;
  if (split === undefined) {
    return {
      service,
      reason: errors.length ? "failed" : "no_sampled_traffic",
      configuration,
      traffic,
      ...(errors.length && { errors }),
    };
  }

  const ratio = REDUCTION_RATIOS[compression];
  let compressibleShare = 0;
  let savingsShare = 0;
  const candidates = [];
  for (const [type, share] of split.shares) {
    if (classifyContentType(type) !== "compressible") continue;
    compressibleShare += share;
    const spellings = split.spellings.get(type);
    let coverage = coverageOf(spellings);
    let saving = ratio;
    if (coverage === "full") {
      if (!countsGzipped) continue;
      coverage = "gzip_only";
      saving = GZIP_TO_BROTLI_RATIO;
    }
    // The rules need these spellings in exactly this form.
    const missing = spellings.filter((form) => !matches.type(form));
    candidates.push({ type, share, coverage, missing });
    savingsShare += share * saving;
  }
  candidates.sort((a, b) => b.share - a.share);
  const candidateShare = shareOf(candidates);
  const knownForms = (entries) => [
    ...new Set(
      entries
        .flatMap(({ missing }) => missing)
        .filter((form) => isKnownType(form.toLowerCase())),
    ),
  ];
  const missingTypes = knownForms(
    candidates.filter(({ coverage }) =>
      ["none", "some_spellings"].includes(coverage),
    ),
  );
  const hiddenShare = shareOf(
    candidates.filter(({ type }) => !isKnownType(type)),
  );
  if (
    configuration.status === "covered" &&
    candidates.some(({ coverage }) => coverage !== "gzip_only")
  ) {
    configuration.status = "partially_covered";
  }
  const extensions =
    isCompute || unreadable.length
      ? undefined
      : extensionShares(ranking, matches, definite);
  if (!isCompute) {
    configuration.missing_content_types = missingTypes;
    configuration.missing_content_types_source = "sampled_log_explorer";
  }
  if (extensions) {
    configuration.missing_extensions = extensions.missing;
    configuration.missing_extensions_source = "sampled_log_explorer";
  }

  const listed = new Map();
  for (const { type, share, coverage } of candidates) {
    const label = labelOf(type);
    const entry = listed.get(label);
    if (entry === undefined) {
      listed.set(label, {
        content_type: label,
        share,
        ...(label === type && { rule_coverage: coverage }),
      });
    } else {
      entry.share += share;
    }
  }
  const savings = Math.round(deliveredBody * savingsShare);
  Object.assign(traffic, {
    compressible_share: fraction(compressibleShare),
    compressible_share_source: "sampled_log_explorer",
    candidate_share: fraction(candidateShare),
    candidate_share_source: "sampled_log_explorer",
    candidate_bandwidth_bytes: Math.round(deliveredBody * candidateShare),
    candidate_bandwidth_source: "calculated_estimate",
    candidate_content_types: [...listed.values()]
      .sort((a, b) => b.share - a.share)
      .slice(0, MAX_LISTED_TYPES)
      .map((entry) => ({ ...entry, share: round(entry.share) })),
    candidate_content_types_source: "sampled_log_explorer",
  });
  if (extensions) traffic.url_ranking = extensions.ranking;

  const caveats = ["Content-type shares come from sampled Log Explorer data."];
  let low = false;
  // Anything that makes the estimate shakier also lowers the confidence, unless it only adds context.
  const caution = (text, lowers = true) => {
    caveats.push(text);
    if (lowers) low = true;
  };
  if (split.approximated) {
    caution(
      "Some content types came in several spellings, and their average size is a plain mean of the spellings rather than a weighted one.",
    );
  }
  if (split.truncated) {
    caution(
      `The sample holds more than ${RANKING_LIMIT} content types, and the rarest ones are left out.`,
      false,
    );
  }
  if (isCompute) {
    caution(
      "This is a Compute service. Gzip rules do not apply to it, and its code can set x-compress-hint in a way this analysis cannot see.",
    );
    caution(
      "Compute compresses at level 1, so real savings are lower than the assumed ratio gives.",
    );
  }
  if (bypassed) {
    caution(
      "Custom VCL defines vcl_fetch without the #FASTLY fetch macro, so no gzip rule runs until the macro is added.",
      false,
    );
  }
  if (custom.length) {
    caution(
      `Custom VCL sets compression in ${custom.join(", ")}. It may compress some of these content types already.`,
    );
  }
  if (dynamic.length) {
    caution(
      `Dynamic snippets (${dynamic.join(", ")}) can change outside versions, so this analysis cannot check whether they compress.`,
    );
  }
  if (unreadable.length) {
    caution(
      `The gzip rules ${unreadable.map((rule) => rule.name).join(", ")} have an empty list or a pattern this analysis cannot read. The types they may cover are counted in full, as an upper limit.`,
    );
  }
  const reachedByExtension = missingTypes.filter((type) =>
    COMPRESSIBLE_TYPES[type.toLowerCase()]?.some((extension) =>
      rules.some((rule) => rule.extensions.has(extension)),
    ),
  );
  if (reachedByExtension.length && !bypassed) {
    const reached = shareOf(
      candidates.filter(({ missing }) =>
        missing.some((form) => reachedByExtension.includes(form)),
      ),
    );
    caution(
      `An extension rule compresses ${reachedByExtension.join(", ")} when the URL ends with a matching extension, so part of that traffic may be compressed already.`,
      reached * 2 >= candidateShare,
    );
  }
  const escaped = candidates.filter(
    ({ coverage }) => coverage === "some_spellings",
  );
  if (escaped.length) {
    const named = knownForms(escaped);
    caution(
      `Fastly matches content types case-sensitively, and the rules miss ${named.length ? named.map((form) => `'${form}'`).join(", ") : "some spellings the origin sends"}. Those types are counted in full, as an upper limit.`,
    );
  }
  const conditionalTypes = candidates.some(
    ({ coverage }) => coverage === "conditional",
  );
  const conditionalRules =
    conditionalTypes || (!bypassed && extensions?.uncertain)
      ? rules.filter((rule) => rule.cacheCondition).map((rule) => rule.name)
      : [];
  if (conditionalRules.length) {
    caution(
      `The gzip rules ${conditionalRules.join(", ")} apply only when their cache condition matches, so what only they cover is counted as uncovered or uncertain.`,
      conditionalTypes,
    );
  }
  if (hiddenShare > 0) {
    caution(
      `Content types outside this server's known list carry a share of ${round(hiddenShare)} of the body bytes. Their names come from origin headers, so they are left out; look them up in Log Explorer.`,
      false,
    );
  }
  if ((version.backends ?? []).some((backend) => backend?.shield)) {
    caution(
      "The service uses shielding, and the sampled shares also count requests between shield and edge POPs.",
      false,
    );
  }
  if (logs.coverage < 0.99) {
    caution(
      `Log Explorer keeps ${LOG_RETENTION_DAYS} days of records, so the shares describe only the last ${Math.round(logs.coverage * 100)}% of the window.`,
      logs.coverage < 0.5,
    );
  }
  if (brotli === "unknown") {
    caution(
      "The Brotli product status could not be read, so gzip-covered types are counted at the extra saving of Brotli, as an upper limit.",
    );
  }
  for (const error of errors) {
    caution(`A ${error.source} read failed: ${error.error}`);
  }
  const confidence = low ? "low" : "medium";

  if (compressibleShare === 0 || candidateShare === 0) {
    return {
      service,
      reason: compressibleShare === 0 ? "no_compressible_traffic" : "covered",
      configuration,
      traffic,
      confidence,
      caveats,
    };
  }
  return {
    service,
    configuration,
    traffic,
    projection: {
      assumed_reduction_ratio: ratio,
      assumed_reduction_ratio_source: "assumed_ratio",
      ...(candidates.some(({ coverage }) => coverage === "gzip_only") && {
        assumed_gzip_to_brotli_ratio: round(GZIP_TO_BROTLI_RATIO),
        assumed_gzip_to_brotli_ratio_source: "assumed_ratio",
      }),
      projected_savings_bytes: savings,
      projected_savings_source: "calculated_estimate",
      projected_savings_share_of_service:
        totalBandwidth > 0 ? round(savings / totalBandwidth) : 0,
      projected_savings_share_of_service_source: "calculated_estimate",
    },
    confidence,
    caveats,
    recommendation: recommendationFor({
      isCompute,
      bypassed,
      unconditional,
      missingTypes,
      missingExtensions: extensions?.missing ?? [],
      conditionalRules,
      unreadableRules: unreadable.map((rule) => rule.name),
      hidden: hiddenShare > 0,
      brotli,
    }),
  };
}

// One account-wide read answers for every service, and a failed read leaves the status unknown instead of failing the service.
function productStatus(ctx, apiClass, method) {
  let enabled;
  return async (serviceId) => {
    enabled ??= Promise.resolve()
      .then(() => ctx.call(apiClass, method))
      .then((answer) => new Set(answer?.services ?? []));
    try {
      return (await enabled).has(serviceId) ? "enabled" : "disabled";
    } catch (err) {
      if (err === ctx.expired) throw err;
      return "unknown";
    }
  };
}

async function eachLimited(items, limit, task) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      await task(items[index], index);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
}

export class CompressionAdvisorApi {
  #deps;

  /** The sandbox provides the gated API calls, the clock, the timers and the execution deadline. */
  constructor({
    call,
    now = Date.now,
    setTimer = setTimeout,
    clearTimer = clearTimeout,
    deadline,
  }) {
    this.#deps = { call, now, setTimer, clearTimer, deadline };
  }

  async analyze(options) {
    const { call, now, setTimer, clearTimer, deadline } = this.#deps;
    const { serviceIds, from, to, minimumBytes, compression } =
      readAnalysisOptions(options);
    const started = now();
    const windows = analysisWindows(from, to, started);
    const budgetEnd = Number.isFinite(deadline)
      ? deadline - RESULT_RESERVE_MS
      : started + ANALYSIS_BUDGET_MS;

    let timedOut = false;
    const active = () => !timedOut && now() < budgetEnd;
    // The sandbox turns every failed call into an Error with the status and token hint a snippet would see.
    const failure = (source, err) => ({
      ...(source !== undefined && { source }),
      error: err?.message || String(err),
      ...(Number.isInteger(err?.status) && { status: err.status }),
      ...(err?.hint && { hint: err.hint }),
    });
    const ctx = {
      compression,
      windows,
      expired: new Error("The time budget ran out."),
      rethrowExpired: (results) => {
        if (results.some(({ reason }) => reason === ctx.expired)) {
          throw ctx.expired;
        }
      },
      // Every request goes through this check, so none starts once time is up.
      call: (apiClass, method, request) => {
        if (!active()) throw ctx.expired;
        return call(apiClass, method, request);
      },
      aggregations: (serviceId, extra) =>
        ctx.call("ObservabilityAggregationsForLogsApi", "logAggregationsGet", {
          service_id: serviceId,
          start: iso(windows.logs.from),
          end: iso(windows.logs.to),
          series: SIZE_SERIES,
          ...extra,
        }),
      failure,
      failed: (serviceId, source, err) => ({
        service: { id: serviceId },
        reason: "failed",
        errors: [failure(source, err)],
      }),
    };
    ctx.brotliStatus = productStatus(
      ctx,
      "ProductBrotliCompressionApi",
      "getServicesProductBrotliCompression",
    );
    ctx.logExplorerStatus = productStatus(
      ctx,
      "ProductLogExplorerInsightsApi",
      "getServicesProductLogExplorerInsights",
    );

    const unfinished = (serviceId) => ({
      service: { id: serviceId },
      reason: "time_budget",
    });
    const results = new Array(serviceIds.length);
    let timer;
    const expired = new Promise((resolve) => {
      timer = setTimer(
        () => {
          timedOut = true;
          resolve();
        },
        Math.max(0, budgetEnd - started),
      );
    });
    const work = eachLimited(
      serviceIds,
      SERVICE_CONCURRENCY,
      async (serviceId, index) => {
        if (!active()) return;
        // One broken service must not cost the others their findings.
        results[index] = await analyzeService(ctx, serviceId).catch((err) =>
          err === ctx.expired
            ? unfinished(serviceId)
            : ctx.failed(serviceId, undefined, err),
        );
      },
    );
    // A service still running when time runs out is reported as unfinished. Its requests in flight end with the execution, since the SDK can't cancel them.
    try {
      await Promise.race([work, expired]);
    } finally {
      clearTimer(timer);
    }

    const candidates = [];
    const others = [];
    serviceIds.forEach((serviceId, index) => {
      const result = results[index] ?? unfinished(serviceId);
      if (result.reason !== undefined) {
        others.push(result);
      } else if (result.traffic.candidate_bandwidth_bytes < minimumBytes) {
        const { service, configuration, traffic, projection, confidence } =
          result;
        others.push({
          service,
          reason: "below_minimum",
          configuration,
          traffic,
          projection,
          confidence,
        });
      } else {
        candidates.push(result);
      }
    });
    candidates.sort(
      (a, b) =>
        b.projection.projected_savings_bytes -
        a.projection.projected_savings_bytes,
    );

    return {
      window: isoRange({ from, to }),
      analyzed_windows: {
        historical_stats: isoRange(windows.historical),
        ...(windows.logs && {
          sampled_log_explorer: isoRange(windows.logs),
        }),
      },
      compression,
      minimum_candidate_bandwidth_bytes: minimumBytes,
      candidates: candidates.map((candidate, index) => ({
        priority: index + 1,
        ...candidate,
      })),
      ...(others.length && { other_services: others }),
      complete: others.every((other) => other.reason !== "time_budget"),
      caveats: GLOBAL_CAVEATS,
      sources: SOURCES,
    };
  }
}

export const COMPRESSION_ADVISOR_API_CLASSES = { CompressionAdvisorApi };

const DESCRIPTION = [
  "Rank services by the bytes they could save with more compression, in one call that returns compact findings rather than log records.",
  "It reads each service's active version, gzip rules, custom VCL and snippets, the exact byte counts in historical stats, and the sampled Log Explorer content-type and URL bandwidth rankings.",
  "Use it instead of calling those methods one by one and aggregating their answers in the snippet.",
  "Pass `service_ids` as an array, as in `{ service_ids: ['SERVICE_ID'], from: '2026-10-01T00:00:00Z', to: '2026-10-08T00:00:00Z' }`.",
  `It takes up to ${MAX_SERVICES} services and stops ${RESULT_RESERVE_MS / 1000} seconds before the execution ends, so split a longer list over several executions.`,
  "Every value has a `*_source` field next to it, and `sources` says which sources are exact, estimated or assumed.",
  "Byte totals from `historical_stats` are exact. Shares from `sampled_log_explorer` are estimates, and so are the candidate bytes and the savings calculated from them.",
  `The reduction ratio is an assumption: ${REDUCTION_RATIOS.gzip} for gzip and ${REDUCTION_RATIOS.brotli} for Brotli.`,
  "`projected_savings_share_of_service` and every `*_share` are fractions from 0 to 1, not percentages.",
  "`candidates` lists the services whose candidate traffic reaches `minimum_candidate_bandwidth_gb`, ranked by projected savings, with `priority` 1 first.",
  "`other_services` gives the reason for every other service: `covered`, `below_minimum`, `no_compressible_traffic`, `no_sampled_traffic`, `log_explorer_not_enabled`, `window_outside_log_retention`, `no_active_version`, `failed` or `time_budget`.",
  "`complete` is false when the time budget left services unfinished.",
  "A missing gzip rule does not prove that responses go out uncompressed: custom VCL can set `beresp.gzip` or `x-compress-hint`, and the origin can compress responses itself.",
  "So each finding has a `confidence` and `caveats`. Confidence is `medium` at best, because the shares are sampled and the ratio is assumed.",
  "It drops to `low` whenever something outside the gzip rules may compress these types, a rule's coverage is uncertain, or the data behind the estimate is partial, and the caveats say which.",
  "The gzip rules are evaluated the way Fastly generates them: a content type matches case-sensitively and ignores parameters such as `charset`, an entry written as `/.../` is a regular expression, and an extension matches the end of the URL.",
  "That evaluation matches the VCL Fastly generated for a live gzip rule. Only `/.../` entries come from Fastly's documentation alone and are unverified.",
  "Custom VCL that defines `vcl_fetch` without the `#FASTLY fetch` macro never runs the gzip rules, which shows as the status `bypassed`.",
  `Log Explorer keeps ${LOG_RETENTION_DAYS} days of records, and the service needs the Log Explorer & Insights product.`,
  "With `compression: 'brotli'`, gzip-covered types also count when the Brotli product is not known to be enabled, at the extra saving of Brotli over gzip.",
  "`url_ranking` splits the compressible URL traffic into covered, uncertain when only a conditional or bypassed rule reaches it, and uncovered.",
  "Each entry of `candidate_content_types` has a `rule_coverage`: `none`, `some_spellings` when the rules miss a spelling such as `Text/HTML`, `conditional` when only a rule with a cache condition matches, `unknown` when a rule has an empty list or an unreadable pattern, or `gzip_only` when gzip covers it but Brotli does not.",
  "Types outside this server's list of known text formats are grouped, as in `other text/* types`, since their names come from origin headers.",
  "The `recommendation` names an `action`: `create_gzip_config` or `update_gzip_config` with the content types to add to a rule without a cache condition, `restore_fastly_fetch_macro`, `review_gzip_rules`, `review_gzip_cache_condition`, `enable_brotli_product`, `verify_brotli_product`, `set_x_compress_hint` or `review_unlisted_content_types`.",
  "Further steps are in `additional_actions`. A recommendation changes nothing by itself.",
  "Apply a gzip change on a cloned version with `gzipApi.updateGzipConfig` or `gzipApi.createGzipConfig`, and check it before activating.",
  "Compression turns off Streaming Miss and does not work with Segmented Caching, so check large downloads first.",
  "Content types come from the configuration and from origin headers, and only known file extensions are reported, so no request path or client detail reaches the result.",
];

export function compressionAdvisorMethods() {
  return describeOperations([
    {
      apiClass: "CompressionAdvisorApi",
      method: "analyze",
      synthetic: true,
      params: PARAMS,
      description: DESCRIPTION,
    },
  ]);
}
