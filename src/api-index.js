import { buildIndex, enrichMethod } from "./indexer.js";
import { ngwafMethods } from "./ngwaf.js";

/**
 * The index discovery serves: operations parsed from the generated SDK docs, then the ones this project implements itself.
 *
 * An owned class must not share a name with a generated one, even with different methods.
 * Such an overlap means an SDK upgrade now ships the class, and failing here gives one clear startup error instead of a failure on every execution.
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
