import { describe, expect, test } from "bun:test";
import {
  ForwardedChainError,
  normalizeIp,
  parseTrustedProxies,
  rateLimitKey,
  resolveClientAddress,
} from "../src/client-address.js";

function request(remoteAddress, ...forwardedLines) {
  const rawHeaders = ["Host", "mcp.example.test"];
  for (const line of forwardedLines) rawHeaders.push("X-Forwarded-For", line);
  return { socket: { remoteAddress }, rawHeaders };
}

const PROXIES = parseTrustedProxies(["10.0.0.0/8", "2001:db8:ffff::/48"]);

function clientOf(remoteAddress, ...forwardedLines) {
  return resolveClientAddress(
    request(remoteAddress, ...forwardedLines),
    PROXIES,
  ).address;
}

describe("normalizeIp", () => {
  test("IPv4 literals are kept as they are", () => {
    expect(normalizeIp("192.0.2.7")).toEqual({
      address: "192.0.2.7",
      family: "ipv4",
    });
  });

  test("IPv6 literals are canonicalized to their RFC 5952 form", () => {
    const expected = { address: "2001:db8::1", family: "ipv6" };
    expect(normalizeIp("2001:db8::1")).toEqual(expected);
    expect(normalizeIp("2001:0DB8:0000:0000:0000:0000:0000:0001")).toEqual(
      expected,
    );
    expect(normalizeIp("2001:db8:0:0:0:0:0:1")).toEqual(expected);
    expect(normalizeIp("0:0:0:0:0:0:0:1")).toEqual({
      address: "::1",
      family: "ipv6",
    });
  });

  test("IPv4-mapped IPv6 equals the IPv4 address", () => {
    const expected = { address: "10.0.0.1", family: "ipv4" };
    expect(normalizeIp("::ffff:10.0.0.1")).toEqual(expected);
    expect(normalizeIp("::FFFF:10.0.0.1")).toEqual(expected);
    expect(normalizeIp("::ffff:a00:1")).toEqual(expected);
    expect(normalizeIp("0:0:0:0:0:ffff:0a00:0001")).toEqual(expected);
    expect(normalizeIp("::ffff:255.254.253.252")).toEqual({
      address: "255.254.253.252",
      family: "ipv4",
    });
  });

  test("zone ids are rejected", () => {
    expect(normalizeIp("fe80::1%eth0")).toBeNull();
    expect(normalizeIp("fe80::1%25eth0")).toBeNull();
    expect(normalizeIp("10.0.0.1%1")).toBeNull();
  });

  test("garbage is rejected", () => {
    const garbage = [
      "",
      " ",
      "unknown",
      "example.test",
      "10.0.0",
      "10.0.0.256",
      "10.0.0.1:443",
      " 10.0.0.1",
      "10.0.0.1/8",
      "[2001:db8::1]",
      "[2001:db8::1]:443",
      "2001:db8::1::2",
      "2001:db8::g",
      "1:2:3:4:5:6:7:8:9",
      "_hidden",
      "10.0.0.1\n",
      undefined,
      null,
      42,
      {},
      ["10.0.0.1"],
    ];
    for (const value of garbage) expect(normalizeIp(value)).toBeNull();
  });
});

describe("rateLimitKey", () => {
  test("an IPv4 source is limited on its full address", () => {
    expect(rateLimitKey(normalizeIp("192.0.2.7"))).toBe("192.0.2.7");
    expect(rateLimitKey(normalizeIp("::ffff:192.0.2.7"))).toBe("192.0.2.7");
  });

  test("an IPv6 source is limited on its /64", () => {
    expect(rateLimitKey(normalizeIp("2001:db8:1:2:3:4:5:6"))).toBe(
      "2001:db8:1:2::/64",
    );
    expect(rateLimitKey(normalizeIp("2001:db8:1:2::1"))).toBe(
      "2001:db8:1:2::/64",
    );
    expect(rateLimitKey(normalizeIp("2001:db8::1"))).toBe("2001:db8:0:0::/64");
    expect(rateLimitKey(normalizeIp("::1"))).toBe("0:0:0:0::/64");
    expect(rateLimitKey(normalizeIp("::"))).toBe("0:0:0:0::/64");
    expect(rateLimitKey(normalizeIp("2001:db8:1::"))).toBe("2001:db8:1:0::/64");
  });

  test("every address of a /64 shares one key, neighbors do not", () => {
    const key = (text) => rateLimitKey(normalizeIp(text));
    const inside = [
      "2001:db8:aa:bb::",
      "2001:db8:aa:bb::1",
      "2001:db8:aa:bb:ffff:ffff:ffff:ffff",
      "2001:db8:aa:bb:0:1::",
      "2001:0db8:00aa:00bb:0000:0000:0000:0009",
    ];
    for (const text of inside) expect(key(text)).toBe(key(inside[0]));
    expect(key("2001:db8:aa:bc::1")).not.toBe(key(inside[0]));
    expect(key("2001:db8:aa::1")).not.toBe(key(inside[0]));
  });
});

describe("parseTrustedProxies", () => {
  test("no entries trusts nobody", () => {
    const list = parseTrustedProxies();
    expect(list.check("127.0.0.1", "ipv4")).toBe(false);
    expect(list.check("::1", "ipv6")).toBe(false);
  });

  test("CIDR ranges match their members only", () => {
    const list = parseTrustedProxies(["10.0.0.0/8", "2001:db8:ffff::/48"]);
    expect(list.check("10.255.0.9", "ipv4")).toBe(true);
    expect(list.check("11.0.0.1", "ipv4")).toBe(false);
    expect(list.check("2001:db8:ffff:1::5", "ipv6")).toBe(true);
    expect(list.check("2001:db8:fffe::5", "ipv6")).toBe(false);
  });

  test("a bare IP is accepted as a single host", () => {
    const list = parseTrustedProxies(["192.0.2.10", "2001:db8::10"]);
    expect(list.check("192.0.2.10", "ipv4")).toBe(true);
    expect(list.check("192.0.2.11", "ipv4")).toBe(false);
    expect(list.check("2001:db8::10", "ipv6")).toBe(true);
    expect(list.check("2001:db8::11", "ipv6")).toBe(false);
  });

  test("full-length and zero prefixes, and surrounding spaces, are accepted", () => {
    const list = parseTrustedProxies([" 192.0.2.10/32 ", "2001:db8::10/128"]);
    expect(list.check("192.0.2.10", "ipv4")).toBe(true);
    expect(list.check("2001:db8::10", "ipv6")).toBe(true);
    expect(
      parseTrustedProxies(["0.0.0.0/0"]).check("203.0.113.1", "ipv4"),
    ).toBe(true);
    expect(parseTrustedProxies(["::/0"]).check("2001:db8::1", "ipv6")).toBe(
      true,
    );
  });

  test("an invalid entry anywhere in the list is refused, and named", () => {
    const invalid = [
      "junk",
      "",
      "10.0.0.0/33",
      "2001:db8::/129",
      "10.0.0.0/999",
      "10.0.0.0/1000",
      "10.0.0.0/",
      "10.0.0.0/-1",
      "10.0.0.0/8.5",
      "10.0.0.0/abc",
      "10.0.0.0/8/9",
      "10.0.0.0/ 8",
      "10.0.0/8",
      "10.0.0.0/64",
      "fe80::1%eth0/64",
      "proxy.example.test/24",
    ];
    for (const entry of invalid) {
      const parse = () => parseTrustedProxies(["10.0.0.0/8", entry]);
      expect(parse).toThrow(/Invalid --http-trusted-proxy value .*CIDR/);
      expect(parse).toThrow(`"${entry}"`);
    }
  });
});

describe("resolveClientAddress", () => {
  test("an untrusted peer is the client, and its forwarding header is not even parsed", () => {
    const hops = Array.from({ length: 100 }, () => "10.0.0.1").join(", ");
    for (const header of [
      "10.0.0.1",
      "198.51.100.1, 10.0.0.1",
      "not an address",
      hops,
      "1".repeat(5000),
    ]) {
      expect(clientOf("203.0.113.9", header)).toBe("203.0.113.9");
    }
  });

  test("a trusted peer without the header is the client", () => {
    expect(clientOf("10.0.0.1")).toBe("10.0.0.1");
    expect(
      resolveClientAddress({ socket: { remoteAddress: "10.0.0.1" } }, PROXIES),
    ).toEqual({ address: "10.0.0.1", family: "ipv4" });
  });

  test("a trusted peer vouches for the address it appended", () => {
    expect(clientOf("10.0.0.1", "198.51.100.1")).toBe("198.51.100.1");
    expect(
      resolveClientAddress(request("10.0.0.1", "2001:DB8:0:0::5"), PROXIES),
    ).toEqual({ address: "2001:db8::5", family: "ipv6" });
  });

  test("the walk goes right to left and nothing left of the first untrusted hop counts", () => {
    const chains = [
      "198.51.100.1, 10.0.0.3, 10.0.0.2",
      "192.0.2.66, 198.51.100.1, 10.0.0.3, 10.0.0.2",
      "10.0.0.99, 198.51.100.1, 10.0.0.2",
      "127.0.0.1, 198.51.100.1",
      "garbage, 198.51.100.1, 10.0.0.2",
      "<script>, , 198.51.100.1",
    ];
    for (const chain of chains) {
      expect(clientOf("10.0.0.1", chain)).toBe("198.51.100.1");
    }
  });

  test("mixed IPv4, IPv6 and mapped proxies are all recognized", () => {
    expect(
      clientOf(
        "::ffff:10.0.0.1",
        "203.0.113.5, 2001:db8:ffff::2, ::ffff:10.0.0.2",
      ),
    ).toBe("203.0.113.5");
    expect(clientOf("2001:db8:ffff::1", "::ffff:203.0.113.5, 10.0.0.2")).toBe(
      "203.0.113.5",
    );
  });

  test("a zone id on the peer socket address is dropped", () => {
    const linkLocal = parseTrustedProxies(["fe80::/10"]);
    const client = resolveClientAddress(
      request("fe80::1%en0", "198.51.100.1"),
      linkLocal,
    );
    expect(client.address).toBe("198.51.100.1");
  });

  test("an all-trusted chain yields its leftmost entry", () => {
    expect(clientOf("10.0.0.1", "10.0.0.4, 10.0.0.3, 10.0.0.2")).toBe(
      "10.0.0.4",
    );
  });

  test("several header lines are joined in the order they were sent", () => {
    expect(clientOf("10.0.0.1", "198.51.100.1", "203.0.113.5")).toBe(
      "203.0.113.5",
    );
    expect(clientOf("10.0.0.1", "203.0.113.5, 198.51.100.1", "10.0.0.2")).toBe(
      "198.51.100.1",
    );
  });

  test("the header name is matched without regard to case", () => {
    const req = {
      socket: { remoteAddress: "10.0.0.1" },
      rawHeaders: [
        "x-forwarded-for",
        "198.51.100.1",
        "X-FORWARDED-FOR",
        "10.0.0.2",
      ],
    };
    expect(resolveClientAddress(req, PROXIES).address).toBe("198.51.100.1");
  });

  test("a malformed entry reached during the walk is refused", () => {
    const malformed = [
      "garbage",
      "198.51.100.1, garbage, 10.0.0.2",
      "198.51.100.1, , 10.0.0.2",
      "198.51.100.1,",
      "198.51.100.1:443",
      "[2001:db8::1]",
      "fe80::1%eth0",
      "unknown, 10.0.0.2",
    ];
    for (const header of malformed) {
      expect(() => clientOf("10.0.0.1", header)).toThrow(ForwardedChainError);
    }
  });

  test("a chain longer than 32 hops is refused, across header lines too", () => {
    const hops = (count) =>
      Array.from({ length: count }, (_, i) => `10.0.1.${i}`).join(",");
    const lines = Array.from({ length: 33 }, () => "10.0.0.2");
    expect(clientOf("10.0.0.1", hops(32))).toBe("10.0.1.0");
    expect(() => clientOf("10.0.0.1", hops(33))).toThrow(ForwardedChainError);
    expect(() => clientOf("10.0.0.1", hops(33))).toThrow(/too many hops/);
    expect(() => clientOf("10.0.0.1", ...lines)).toThrow(/too many hops/);
  });

  test("a header longer than 1024 bytes is refused", () => {
    const padded = (length) => {
      const tail = ", 10.0.0.2";
      const head = "198.51.100.1";
      return head + " ".repeat(length - head.length - tail.length) + tail;
    };
    expect(padded(1024)).toHaveLength(1024);
    expect(clientOf("10.0.0.1", padded(1024))).toBe("198.51.100.1");
    expect(() => clientOf("10.0.0.1", padded(1025))).toThrow(
      ForwardedChainError,
    );
    expect(() => clientOf("10.0.0.1", padded(1025))).toThrow(/too long/);
  });

  test("a missing or unusable peer address is refused", () => {
    for (const remoteAddress of [undefined, null, "", "unix-socket"]) {
      expect(() =>
        resolveClientAddress(request(remoteAddress), PROXIES),
      ).toThrow(ForwardedChainError);
    }
    expect(() => resolveClientAddress({ rawHeaders: [] }, PROXIES)).toThrow(
      ForwardedChainError,
    );
  });
});
