// Runs the real sandbox against a local stand-in for the Fastly API.
//
// The SDK hard-codes https://api.fastly.com and remote executions pin that
// origin, so the URLs stay as they are and only the connection is pointed at
// the mock.
// That way the mock sees the exact path and Fastly-Key the child sent.
import http from "node:http";
import https from "node:https";

const target = new URL(process.env.FASTLY_MCP_TEST_API);

https.request = (options, callback) =>
  http.request(
    {
      method: options.method,
      path: options.path,
      headers: { ...options.headers, "x-original-host": options.host },
      host: target.hostname,
      port: target.port,
    },
    callback,
  );

await import("../../src/sandbox.js");
