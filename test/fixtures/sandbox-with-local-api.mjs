// Entry point that runs the real sandbox against a local stand-in for
// api.fastly.com, so the Fastly error path can be tested without network access
// or a live token.
//
// `ApiClient.instance.basePath` is not enough: every generated method carries its
// own hard-coded `https://api.fastly.com` and passes it down as an override, so
// the redirect has to happen where the URL is assembled.
import Fastly from "fastly";

const target = process.env.FASTLY_MCP_TEST_BASE_PATH;
const buildUrl = Fastly.ApiClient.prototype.buildUrl;

Fastly.ApiClient.prototype.buildUrl = function (...args) {
  return buildUrl
    .apply(this, args)
    .replace(/^https:\/\/(api|rt)\.fastly\.com/, target);
};

await import("../../src/sandbox.js");
