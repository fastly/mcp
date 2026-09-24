import { safeSerialize } from "./serializer.js";
import { truncateOutsideSecrets } from "./truncate.js";

const MAX_BODY = 2000;

function firstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value) return value;
  }
  return undefined;
}

function firstNumber(...values) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}

function truncate(text) {
  if (!/\S/.test(text)) return undefined;
  return truncateOutsideSecrets(text, MAX_BODY, "…");
}

function dump(value) {
  return JSON.stringify(safeSerialize(value)) ?? "";
}

/** `value[key]`, or undefined when a getter or a proxy trap throws. */
export function read(value, key) {
  if (value === null || value === undefined) return undefined;
  try {
    return value[key];
  } catch {
    return undefined;
  }
}

// Raw payloads are reported as they arrived, even a literal "{}".
function rawBody(value) {
  if (typeof value !== "string") return undefined;
  return truncate(value);
}

// Parsed payloads go through a filter instead: superagent leaves `body` as an
// empty object when it could not parse the response, and reporting that as the
// body is what made a perfectly descriptive 401 look empty.
function parsedBody(value) {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return truncate(value);
  const text = dump(value);
  if (text === "{}" || text === "[]" || text === "null") return undefined;
  return truncate(text);
}

// The Fastly client rejects with a bare object rather than an Error:
// `{ status, statusText, body, response, error }`, where `body` is `{}` unless the
// response was JSON and `response.text` holds what the API actually said.
function pickBody(err) {
  const response = read(err, "response");
  return (
    parsedBody(read(err, "body")) ??
    rawBody(read(response, "text")) ??
    parsedBody(read(response, "body"))
  );
}

function describeOpaque(err) {
  const text = dump(err);
  if (!text || text === "{}") return "Unknown error (empty object thrown)";
  return truncate(text) ?? "Unknown error (empty object thrown)";
}

/**
 * Turn anything that was thrown into a flat, JSON-safe description.
 *
 * Returns `{ error }` plus `status`, `statusText`, `body` and `hint` when the
 * thrown value carries them.
 */
export function describeThrown(err) {
  if (err === null) return { error: "null was thrown" };
  if (err === undefined) return { error: "undefined was thrown" };
  if (typeof err === "string") return { error: err };
  if (typeof err !== "object" && typeof err !== "function") {
    return { error: String(err) };
  }

  const out = {};
  const response = read(err, "response");
  const status = firstNumber(
    read(err, "status"),
    read(err, "statusCode"),
    read(response, "status"),
  );
  const statusText = firstString(
    read(err, "statusText"),
    read(response, "statusText"),
  );
  // Superagent sets the callback error's message to the reason phrase, which is
  // the only place a Fastly failure spells out "Unauthorized" or "Not Found".
  const reason = statusText ?? firstString(read(read(err, "error"), "message"));
  const message = firstString(read(err, "message"));
  const constructorName = firstString(read(read(err, "constructor"), "name"));

  if (message) {
    out.error = message;
  } else if (status !== undefined) {
    out.error = reason ? `HTTP ${status} ${reason}` : `HTTP ${status}`;
  } else if (reason) {
    out.error = reason;
  } else if (constructorName && constructorName !== "Object") {
    out.error = `${constructorName} (no message)`;
  } else {
    out.error = describeOpaque(err);
  }

  const cause = firstString(read(read(err, "cause"), "message"));
  if (cause && !out.error.includes(cause)) out.error = `${out.error}: ${cause}`;

  if (status !== undefined) out.status = status;
  if (statusText) out.statusText = statusText;
  const body = pickBody(err);
  if (body !== undefined) out.body = body;
  const hint = firstString(read(err, "hint"));
  if (hint) out.hint = hint;

  return out;
}
