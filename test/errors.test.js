import { describe, expect, test } from "bun:test";
import { describeThrown } from "../src/errors.js";
import { GITHUB_PAT } from "./helpers.js";

// The exact shape the Fastly client rejects with on a 401: a bare object, no
// `message`, an empty `body` because the response was text/plain, and the real
// payload hiding in `response.text`.
function fastlyRejection({ status = 401, reason = "Unauthorized", text } = {}) {
  const response = { status, text, body: {}, type: "text/plain" };
  const error = new Error(reason);
  error.status = status;
  error.response = response;
  return { status, statusText: undefined, body: {}, response, error };
}

describe("describeThrown", () => {
  test("Fastly 401 becomes a readable message with status and body", () => {
    const out = describeThrown(
      fastlyRejection({
        text: '{"msg":"Provided credentials are missing or invalid"}',
      }),
    );

    expect(out.error).toBe("HTTP 401 Unauthorized");
    expect(out.error).not.toContain("[object Object]");
    expect(out.status).toBe(401);
    expect(out.body).toBe(
      '{"msg":"Provided credentials are missing or invalid"}',
    );
  });

  test("an empty response body is dropped instead of reported as {}", () => {
    const out = describeThrown(fastlyRejection({ text: "" }));
    expect(out.error).toBe("HTTP 401 Unauthorized");
    expect(out.body).toBeUndefined();
  });

  test("a payload that really is {} is reported as sent", () => {
    const out = describeThrown(fastlyRejection({ text: "{}" }));
    expect(out.body).toBe("{}");
  });

  test("a JSON error body is preferred over the raw response text", () => {
    const rejection = fastlyRejection({
      status: 404,
      reason: "Not Found",
      text: "ignored",
    });
    rejection.body = { msg: "Service not found" };

    const out = describeThrown(rejection);
    expect(out.error).toBe("HTTP 404 Not Found");
    expect(out.status).toBe(404);
    expect(out.body).toBe('{"msg":"Service not found"}');
  });

  test("statusText is used when the client provides one", () => {
    const out = describeThrown({
      status: 429,
      statusText: "Too Many Requests",
    });
    expect(out.error).toBe("HTTP 429 Too Many Requests");
    expect(out.statusText).toBe("Too Many Requests");
  });

  test("status without any reason phrase still reads as HTTP <status>", () => {
    expect(describeThrown({ status: 503 }).error).toBe("HTTP 503");
  });

  test("plain Errors keep their message", () => {
    expect(describeThrown(new Error("boom"))).toEqual({ error: "boom" });
  });

  test("an Error cause is appended to the message", () => {
    const err = new TypeError("fetch failed", {
      cause: new Error("connect ECONNREFUSED 127.0.0.1:1"),
    });
    expect(describeThrown(err).error).toBe(
      "fetch failed: connect ECONNREFUSED 127.0.0.1:1",
    );
  });

  test("a repeated cause is not appended twice", () => {
    const err = new Error("connect ECONNREFUSED 127.0.0.1:1", {
      cause: new Error("connect ECONNREFUSED 127.0.0.1:1"),
    });
    expect(describeThrown(err).error).toBe("connect ECONNREFUSED 127.0.0.1:1");
  });

  test("hints ride along when present", () => {
    const err = new Error("HTTP 401 Unauthorized");
    err.hint = "check the token";
    expect(describeThrown(err).hint).toBe("check the token");
  });

  test("oversized bodies are truncated", () => {
    const out = describeThrown({ status: 500, body: "x".repeat(5000) });
    expect(out.body.length).toBe(2001);
    expect(out.body.endsWith("…")).toBe(true);
  });

  // The body is cut in the sandbox, before any shield runs, and an API failure gets described twice on its way out.
  test("a body cut never goes through a secret, however many times it is cut", () => {
    const token = GITHUB_PAT;
    const across = describeThrown({
      status: 500,
      body: `${" ".repeat(1970)}${token} tail`,
    });
    expect(across.body).toBe(`${" ".repeat(1970)}…`);
    expect(describeThrown({ status: 500, body: across.body }).body).toBe(
      across.body,
    );

    // Kept whole when it ends right at the cut, and kept again when the result is cut a second time.
    const ending = describeThrown({
      status: 500,
      body: `${" ".repeat(1960)}${token} tail`,
    });
    expect(ending.body).toBe(`${" ".repeat(1960)}${token}…`);
    expect(describeThrown({ status: 500, body: ending.body }).body).toBe(
      ending.body,
    );
  });

  test("thrown non-objects are described, never stringified to [object Object]", () => {
    expect(describeThrown(null)).toEqual({ error: "null was thrown" });
    expect(describeThrown(undefined)).toEqual({
      error: "undefined was thrown",
    });
    expect(describeThrown("plain string")).toEqual({ error: "plain string" });
    expect(describeThrown(42)).toEqual({ error: "42" });
  });

  test("an opaque object is dumped rather than collapsed", () => {
    expect(describeThrown({ code: "E_WEIRD" }).error).toBe(
      '{"code":"E_WEIRD"}',
    );
    expect(describeThrown({}).error).toBe(
      "Unknown error (empty object thrown)",
    );
  });

  test("values JSON cannot handle are still described", () => {
    const circular = {};
    circular.self = circular;
    expect(describeThrown(circular).error).toBe('{"self":"[circular]"}');
    expect(describeThrown({ size: 10n }).error).toBe('{"size":"10n"}');
  });

  test("a class instance without a message names its class", () => {
    class WeirdFailure {}
    expect(describeThrown(new WeirdFailure()).error).toBe(
      "WeirdFailure (no message)",
    );
  });

  test("throwing metadata getters do not hide a usable message", () => {
    const failure = { message: "useful failure" };
    Object.defineProperty(failure, "status", {
      get() {
        throw new Error("getter trap");
      },
    });
    expect(describeThrown(failure)).toEqual({ error: "useful failure" });
  });

  test("a proxy that refuses every property read is still described", () => {
    const failure = new Proxy(
      {},
      {
        get() {
          throw new Error("getter trap");
        },
      },
    );
    expect(() => describeThrown(failure)).not.toThrow();
    expect(describeThrown(failure).error).toBe(
      "Unknown error (empty object thrown)",
    );
  });
});
