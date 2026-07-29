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
