import { BlockList, isIP } from "node:net";

const MAX_FORWARDED_BYTES = 1024;
const MAX_FORWARDED_HOPS = 32;
const MAPPED_IPV4 = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/;

export class ForwardedChainError extends Error {}

/**
 * Every value of one header, in order.
 * `req.headers` folds repeated fields into one comma-separated string, which
 * would hide a second credential or a spliced forwarding chain.
 */
export function rawHeaderValues(rawHeaders, name) {
  const values = [];
  for (let i = 0; i + 1 < rawHeaders.length; i += 2) {
    if (rawHeaders[i].toLowerCase() === name) values.push(rawHeaders[i + 1]);
  }
  return values;
}

/**
 * Canonical form of an IP literal, or null when the text is not one.
 * IPv4-mapped IPv6 collapses to plain IPv4, so `::ffff:10.0.0.1` and
 * `10.0.0.1` match the same CIDR entries.
 */
export function normalizeIp(text) {
  if (typeof text !== "string" || text.includes("%")) return null;
  const family = isIP(text);
  if (family === 4) return { address: text, family: "ipv4" };
  if (family !== 6) return null;
  // The URL parser serializes IPv6 hosts in their RFC 5952 form.
  const address = new URL(`http://[${text}]`).hostname.slice(1, -1);
  const mapped = MAPPED_IPV4.exec(address);
  if (!mapped) return { address, family: "ipv6" };
  const high = Number.parseInt(mapped[1], 16);
  const low = Number.parseInt(mapped[2], 16);
  return {
    address: `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`,
    family: "ipv4",
  };
}

/**
 * Key under which a source is rate limited.
 * An IPv6 customer usually owns a whole /64, so limiting full addresses would
 * hand them 2^64 separate budgets.
 */
export function rateLimitKey({ address, family }) {
  if (family === "ipv4") return address;
  const [head, tail] = address.split("::");
  const groups = head ? head.split(":") : [];
  if (tail !== undefined) {
    const rest = tail ? tail.split(":") : [];
    groups.push(...Array(8 - groups.length - rest.length).fill("0"), ...rest);
  }
  return `${groups.slice(0, 4).join(":")}::/64`;
}

export function parseTrustedProxies(entries = []) {
  const list = new BlockList();
  for (const entry of entries) {
    const [network, prefixText, ...extra] = String(entry).trim().split("/");
    const ip = normalizeIp(network);
    const width = ip?.family === "ipv4" ? 32 : 128;
    const prefix = prefixText === undefined ? width : Number(prefixText);
    if (
      !ip ||
      extra.length > 0 ||
      !/^\d{1,3}$/.test(prefixText ?? "0") ||
      prefix > width
    ) {
      throw new Error(
        `Invalid --http-trusted-proxy value "${entry}". Use an IP address or a CIDR range such as 10.0.0.0/8.`,
      );
    }
    list.addSubnet(ip.address, prefix, ip.family);
  }
  return list;
}

function forwardedEntries(rawHeaders) {
  const joined = rawHeaderValues(rawHeaders, "x-forwarded-for").join(",");
  if (joined.length > MAX_FORWARDED_BYTES) {
    throw new ForwardedChainError("X-Forwarded-For is too long");
  }
  const entries = joined ? joined.split(",").map((entry) => entry.trim()) : [];
  if (entries.length > MAX_FORWARDED_HOPS) {
    throw new ForwardedChainError("X-Forwarded-For has too many hops");
  }
  return entries;
}

/**
 * Source address of a request, as seen through the configured proxies.
 * The chain is read from the right because each proxy appends the peer it
 * saw; everything left of the first untrusted address is client-controlled.
 */
export function resolveClientAddress(req, trustedProxies) {
  const peer = normalizeIp(String(req.socket?.remoteAddress).split("%")[0]);
  if (!peer) throw new ForwardedChainError("Unknown peer address");
  if (!trustedProxies.check(peer.address, peer.family)) return peer;

  let client = peer;
  const entries = forwardedEntries(req.rawHeaders ?? []);
  for (let i = entries.length - 1; i >= 0; i--) {
    const hop = normalizeIp(entries[i]);
    if (!hop) throw new ForwardedChainError("Malformed X-Forwarded-For entry");
    client = hop;
    if (!trustedProxies.check(hop.address, hop.family)) break;
  }
  return client;
}
