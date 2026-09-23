import { mkdtempSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PREVIEW_BYTES } from "../src/limits.js";

// A token in GitHub's format, for tests that check a secret never gets out in plaintext.
export const GITHUB_PAT = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij";

// Code returning a `length`-character string whose preview is cut right before the token's last character.
// It follows clipString: the preview budget, minus the truncation note and the string's two quotes.
export function tokenAtPreviewCut(token, length = 100_001) {
  const kept = PREVIEW_BYTES - ` [${length} chars, truncated]`.length - 2;
  return `return " ".repeat(${kept - token.length + 1}) + "${token}" + " ".repeat(${length - kept - 1});`;
}

// Ephemeral loopback HTTP server for tests. The returned url has no
// trailing slash; close() resolves once the socket is gone.
export function tempDir(prefix) {
  return mkdtempSync(join(tmpdir(), `fastly-mcp-${prefix}-`));
}

export async function startLocalServer(handler) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => {
      server.closeAllConnections();
      return new Promise((resolve) => server.close(resolve));
    },
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
