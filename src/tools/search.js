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

export function search(index, query) {
  if (typeof query !== "string" || !query.trim()) {
    return { ok: false, error: "query must be a non-empty string" };
  }

  const trimmed = query.trim();
  const tokens = tokenize(trimmed);

  // Also try the full query as a single token for exact/substring matching
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
  const matches = scored.slice(0, MAX_RESULTS).map((s) => s.method);

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
