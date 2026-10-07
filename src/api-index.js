import { buildIndex } from "./indexer.js";
import { enrichMethod } from "./method-entry.js";
import { ngwafMethods } from "./ngwaf.js";

/**
 * Combines generated SDK documentation with this server's own methods.
 *
 * Reject class overlap so an SDK upgrade fails at startup instead of on every execution.
 */
export async function buildApiIndex({ docsDir, owned = ngwafMethods() } = {}) {
  const generated = await buildIndex(docsDir);
  const generatedClasses = new Set(generated.map((entry) => entry.apiClass));
  const seen = new Set();
  for (const entry of owned) {
    if (generatedClasses.has(entry.apiClass)) {
      throw new Error(
        `${entry.apiClass} is both in the generated SDK docs and implemented by this server. Drop the owned adapter or pin an SDK without the class.`,
      );
    }
    const name = `${entry.apiClass}.${entry.method}`;
    if (seen.has(name)) throw new Error(`${name} is defined twice.`);
    seen.add(name);
  }
  return [...generated, ...owned.map(enrichMethod)];
}
