import { buildIndex } from "./indexer.js";
import {
  REPLACED_SDK_CLASSES as LOG_EXPLORER_REPLACEMENTS,
  logExplorerMethods,
} from "./log-explorer.js";
import { enrichMethod } from "./method-entry.js";
import { ngwafMethods } from "./ngwaf.js";
import {
  observabilityTimeseriesMethods,
  REPLACED_SDK_CLASSES as TIMESERIES_REPLACEMENTS,
} from "./observability-timeseries.js";

export const REPLACED_SDK_CLASSES = [
  ...LOG_EXPLORER_REPLACEMENTS,
  ...TIMESERIES_REPLACEMENTS,
];

export function ownedMethods() {
  return [
    ...ngwafMethods(),
    ...logExplorerMethods(),
    ...observabilityTimeseriesMethods(),
  ];
}

/**
 * Combines generated SDK documentation with this server's own methods.
 *
 * An owned class may stand in for an SDK class whose generated operations cannot be used, and those then drop out so the index offers one way to call the endpoint. Any other overlap fails here at startup rather than later on every execution, both when the SDK grows a class we implement and when it loses one we replace.
 */
export async function buildApiIndex({
  docsDir,
  owned = ownedMethods(),
  replaced = REPLACED_SDK_CLASSES,
} = {}) {
  const generated = await buildIndex(docsDir);
  const generatedClasses = new Set(generated.map((entry) => entry.apiClass));
  const standsIn = new Set(replaced);
  for (const apiClass of standsIn) {
    if (!generatedClasses.has(apiClass)) {
      throw new Error(
        `${apiClass} stands in for an SDK class the generated docs no longer define. Drop the replacement and keep the adapter, or drop both.`,
      );
    }
  }
  const seen = new Set();
  for (const entry of owned) {
    if (generatedClasses.has(entry.apiClass) && !standsIn.has(entry.apiClass)) {
      throw new Error(
        `${entry.apiClass} is both in the generated SDK docs and implemented by this server. Drop the owned adapter, declare it as a replacement, or pin an SDK without the class.`,
      );
    }
    const name = `${entry.apiClass}.${entry.method}`;
    if (seen.has(name)) throw new Error(`${name} is defined twice.`);
    seen.add(name);
  }
  return [
    ...generated.filter((entry) => !standsIn.has(entry.apiClass)),
    ...owned.map(enrichMethod),
  ];
}
