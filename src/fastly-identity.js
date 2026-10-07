// Fastly-Key checks and identity lookups, shared by the Node remote server and the Fastly Compute build, so it only uses web APIs.

import { readBounded } from "./streams.js";

const TOKEN_SELF_URL = "https://api.fastly.com/tokens/self";
const CURRENT_CUSTOMER_URL = "https://api.fastly.com/current_customer";
const MAX_UPSTREAM_BODY_BYTES = 64 * 1024;
const MAX_KEY_LENGTH = 4096;
const MAX_RETRY_AFTER_SECONDS = 300;
const IDENTIFIER = /^[A-Za-z0-9_-]{1,128}$/;
const VISIBLE_ASCII = /^[\x21-\x7e]+$/;
// A byte order mark stays in, so it fails to parse like any other stray character.
const decoder = new TextDecoder("utf-8", { ignoreBOM: true });

/** How long each validator waits for one upstream request, body included. */
export const VALIDATION_TIMEOUT_MS = 5000;
/** How long a successful validation may be reused, never past the token's expiry. */
export const VALIDATION_CACHE_TTL_MS = 60_000;
/** Domain separation for the keyed hash that names a cached validation. */
export const VALIDATION_CACHE_LABEL = "@fastly/mcp/validation-cache/v1";
/** The most upstream requests `lookUpIdentity` makes. */
export const LOOKUP_REQUESTS = 2;

/** Whether `value` looks like a Fastly token ID or customer ID. */
export const isIdentifier = (value) =>
  typeof value === "string" && IDENTIFIER.test(value);

export const KEY_HINT =
  "Update the Fastly-Key header in your MCP client configuration with a valid Fastly API token.";

/**
 * A request that cannot be admitted.
 * `status` is the HTTP status to answer with, and `category` a fixed label that is safe to log.
 * The message never quotes the credential or Fastly.
 */
export class RemoteAuthError extends Error {
  constructor(status, category, message, { retryAfter } = {}) {
    super(message);
    this.status = status;
    this.category = category;
    this.retryAfter = retryAfter;
  }
}

/** Returns the only Fastly-Key the request sent, given every value of that header, and throws a RemoteAuthError otherwise. */
export function checkFastlyKey(values) {
  if (values.length > 1) {
    throw new RemoteAuthError(
      400,
      "key_duplicated",
      "Send exactly one Fastly-Key header.",
    );
  }
  if (values.length === 0 || values[0] === "") {
    throw new RemoteAuthError(
      401,
      "key_missing",
      `A Fastly-Key header is required. ${KEY_HINT}`,
    );
  }
  const [key] = values;
  if (key.length > MAX_KEY_LENGTH) {
    throw new RemoteAuthError(
      400,
      "key_too_long",
      "The Fastly-Key header is too long.",
    );
  }
  if (key.includes(",") || !VISIBLE_ASCII.test(key)) {
    throw new RemoteAuthError(
      400,
      "key_malformed",
      "The Fastly-Key header must hold a single token, without spaces, commas or control characters.",
    );
  }
  return key;
}

function retryAfterOf(response) {
  const seconds = Number(response.headers.get("retry-after"));
  if (!Number.isInteger(seconds) || seconds < 1) return undefined;
  return Math.min(seconds, MAX_RETRY_AFTER_SECONDS);
}

async function readBoundedJson(response) {
  const bytes = await readBounded(response.body, MAX_UPSTREAM_BODY_BYTES);
  if (!bytes) throw new Error("upstream body too large");
  return JSON.parse(decoder.decode(bytes));
}

function unavailable() {
  return new RemoteAuthError(
    503,
    "validation_unavailable",
    "The Fastly API could not be reached to validate the Fastly-Key header. Try again shortly.",
  );
}

async function fetchJson(fetchImpl, url, token) {
  let response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      headers: { "Fastly-Key": token, Accept: "application/json" },
      redirect: "manual",
    });
  } catch {
    throw unavailable();
  }
  if (response.status === 200) {
    try {
      return { status: 200, body: await readBoundedJson(response) };
    } catch {
      throw unavailable();
    }
  }
  await response.body?.cancel?.().catch(() => {});
  if (response.status === 429) {
    throw new RemoteAuthError(
      429,
      "validation_rate_limited",
      "Fastly is rate limiting token validation. Try again later.",
      { retryAfter: retryAfterOf(response) ?? 60 },
    );
  }
  if (response.status === 401 || response.status === 403) {
    return { status: response.status };
  }
  throw unavailable();
}

function expirationOf(value) {
  if (value === null || value === undefined) return Number.POSITIVE_INFINITY;
  const parsed = typeof value === "string" ? Date.parse(value) : Number.NaN;
  if (Number.isNaN(parsed)) throw unavailable();
  return parsed;
}

function expiredKey() {
  return new RemoteAuthError(
    401,
    "key_expired",
    `The Fastly API token has expired. ${KEY_HINT}`,
  );
}

/**
 * Asks Fastly who `token` belongs to, as `{ tokenId, customerId, expiresAt }`.
 * Any deadline on the upstream requests goes in `fetchImpl`.
 * Nothing a caller sends can change their URLs.
 */
export async function lookUpIdentity(fetchImpl, token, wallClock) {
  const self = await fetchJson(fetchImpl, TOKEN_SELF_URL, token);
  if (self.status !== 200) {
    throw new RemoteAuthError(
      401,
      "key_rejected",
      `Fastly rejected the API token. ${KEY_HINT}`,
    );
  }
  const { id, customer_id: customerId, expires_at: expiry } = self.body ?? {};
  if (!isIdentifier(id)) throw unavailable();
  const expiresAt = expirationOf(expiry);
  if (expiresAt <= wallClock()) {
    throw expiredKey();
  }

  const identity = { tokenId: id, customerId: null, expiresAt };
  if (isIdentifier(customerId)) {
    identity.customerId = customerId;
    return identity;
  }
  // Some token types cannot read their account.
  // They stay valid for discovery, and execution is refused later for lack of a customer to charge.
  const customer = await fetchJson(fetchImpl, CURRENT_CUSTOMER_URL, token);
  if (expiresAt <= wallClock()) throw expiredKey();
  const fallbackId = customer.body?.id;
  if (isIdentifier(fallbackId)) {
    identity.customerId = fallbackId;
  } else if (customer.status === 200) {
    throw unavailable();
  }
  return identity;
}
