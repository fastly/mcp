const MAX_RESULTS = 10;

const SUGGESTED_CATEGORIES = [
  "service",
  "domain",
  "backend",
  "purge",
  "tls",
  "logging",
  "dictionary",
  "acl",
  "vcl",
  "cache",
  "stats",
  "historical",
  "billing",
  "usage",
  "waf",
  "pool",
  "healthcheck",
  "snippet",
  "condition",
  "header",
  "request_settings",
  "response_object",
];

function tokenize(query) {
  const expanded = query.replace(/([a-z])([A-Z])/g, "$1 $2");

  return expanded
    .toLowerCase()
    .split(/[\s_\-./]+/)
    .filter((t) => t.length >= 2);
}

function scoreToken(method, token) {
  let score = 0;

  const methodLower = method.method.toLowerCase();
  const classLower = method.apiClass.toLowerCase();
  const pathLower = method.httpPath.toLowerCase();
  const descLower = method.description.toLowerCase();
  const returnLower = method.returnType.toLowerCase();

  if (methodLower === token) {
    score += 100;
  } else if (methodLower.includes(token)) {
    score += 50;
  }

  if (classLower.includes(token)) {
    score += 30;
  }

  if (pathLower.includes(token)) {
    score += 20;
  }

  if (descLower.includes(token)) {
    score += 10;
  }

  if (returnLower.includes(token)) {
    score += 5;
  }

  for (const p of method.params) {
    if (p.name.toLowerCase().includes(token)) {
      score += 5;
      break;
    }
  }

  return score;
}

function scoreMethod(method, tokens) {
  if (tokens.length === 0) return 0;

  let total = 0;
  let tokensMatched = 0;

  for (const token of tokens) {
    const s = scoreToken(method, token);
    if (s > 0) tokensMatched++;
    total += s;
  }

  // All-match bonus: multi-term queries rank higher when every token hits
  if (tokens.length > 1 && tokensMatched === tokens.length) {
    total += 25 * tokens.length;
  }

  return total;
}

const SUMMARY_MAX_CHARS = 160;

function summarize(description) {
  if (typeof description !== "string" || !description) return "";
  const collapsed = description.replace(/\s+/g, " ").trim();
  if (!collapsed) return "";

  const sentenceEnd = collapsed.search(/[.!?](\s|$)/);
  if (sentenceEnd !== -1 && sentenceEnd + 1 <= SUMMARY_MAX_CHARS) {
    return collapsed.slice(0, sentenceEnd + 1);
  }

  if (collapsed.length <= SUMMARY_MAX_CHARS) return collapsed;
  return `${collapsed.slice(0, SUMMARY_MAX_CHARS - 1).trimEnd()}…`;
}

function extractPathParams(httpPath) {
  if (typeof httpPath !== "string") return [];
  const out = [];
  const re = /\{([^}]+)\}/g;
  let m = re.exec(httpPath);
  while (m !== null) {
    out.push(m[1]);
    m = re.exec(httpPath);
  }
  return out;
}

// Generic English phrases that hint at the scope of an endpoint. Each entry
// maps a phrase to a short tag. The list is intentionally not endpoint- or
// resource-specific — adding a new Fastly API does not require touching it.
// Earlier entries win when multiple phrases match.
const SCOPE_CUES = [
  { phrase: "aggregated across all", tag: "aggregated" },
  { phrase: "information aggregated across", tag: "aggregated" },
  { phrase: "for each of your fastly services", tag: "all-services" },
  { phrase: "for each of your services", tag: "all-services" },
  { phrase: "groups the results by service", tag: "all-services" },
  { phrase: "for a single service", tag: "single-service" },
  { phrase: "for a given service", tag: "single-service" },
  { phrase: "stats from a service", tag: "single-service" },
  { phrase: "from a service for", tag: "single-service" },
];

const SCOPE_EVIDENCE_PADDING = 20;

function detectScope(description) {
  if (typeof description !== "string" || !description) return undefined;
  const lower = description.toLowerCase();
  for (const cue of SCOPE_CUES) {
    const idx = lower.indexOf(cue.phrase);
    if (idx === -1) continue;
    const start = Math.max(0, idx - SCOPE_EVIDENCE_PADDING);
    const end = Math.min(
      description.length,
      idx + cue.phrase.length + SCOPE_EVIDENCE_PADDING,
    );
    const snippet = description.slice(start, end).replace(/\s+/g, " ").trim();
    return { tag: cue.tag, evidence: snippet };
  }
  return undefined;
}

function projectMatch(method) {
  const params = Array.isArray(method.params) ? method.params : [];
  const requiredParams = params
    .filter((p) => p && p.required === true)
    .map((p) => p.name);
  const pathParams = extractPathParams(method.httpPath);
  const hasServiceIdParam = params.some((p) => p && p.name === "service_id");

  const projected = {
    apiClass: method.apiClass,
    method: method.method,
    httpMethod: method.httpMethod,
    httpPath: method.httpPath,
    summary: summarize(method.description),
    requiredParams,
    pathParams,
    hasServiceIdParam,
  };

  const scope = detectScope(method.description);
  if (scope) projected.scope = scope;

  return projected;
}

export function search(index, query) {
  if (typeof query !== "string" || !query.trim()) {
    return { ok: false, error: "query must be a non-empty string" };
  }

  const trimmed = query.trim();
  const tokens = tokenize(trimmed);

  const fullLower = trimmed.toLowerCase();
  if (!tokens.includes(fullLower)) {
    tokens.push(fullLower);
  }

  const scored = [];
  for (const method of index) {
    const score = scoreMethod(method, tokens);
    if (score > 0) {
      scored.push({ method, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  const total = scored.length;
  const matches = scored
    .slice(0, MAX_RESULTS)
    .map((s) => projectMatch(s.method));

  let hint;
  if (total === 0) {
    hint = `No matches for '${trimmed}'.`;
  } else if (total <= MAX_RESULTS) {
    hint = `Found ${total} match${total === 1 ? "" : "es"} for '${trimmed}'.`;
  } else {
    hint = `Showing ${MAX_RESULTS} of ${total} matches for '${trimmed}'. Refine your query for fewer results.`;
  }

  const result = { ok: true, matches, total, hint };

  if (total <= 2) {
    result.suggestions = SUGGESTED_CATEGORIES;
    if (total === 0) {
      hint +=
        " Try one of the suggested categories, or use a method name, API class, or HTTP path fragment.";
      result.hint = hint;
    }
  }

  return result;
}
