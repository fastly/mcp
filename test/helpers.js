import { createServer } from "node:http";

// Ephemeral loopback HTTP server for tests. The returned url has no
// trailing slash; close() resolves once the socket is gone.
export async function startLocalServer(handler) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

// Frames belonging to the sandbox plumbing or to the runtime, none of which
// should ever reach the model.
export const SANDBOX_INTERNAL_MARKERS = [
  "sandbox.js",
  "sandbox-facade",
  "evalmachine",
  "node:internal",
  "node:vm",
  "native:",
  "(unknown)",
  "bunx-",
];

export function expectNoInternals(expect, stack) {
  for (const marker of SANDBOX_INTERNAL_MARKERS) {
    expect(stack ?? "").not.toContain(marker);
  }
}
