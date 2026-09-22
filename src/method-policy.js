/**
 * Operations a remote server refuses, with the reason shown to the model.
 *
 * One table drives both discovery and execution, so the two cannot disagree.
 * It is written by hand rather than derived from parameter types, because
 * the generated docs spell the type of `putPackage`'s `_package` in a way
 * the indexer does not even see as a parameter.
 */
const REMOTE_UNAVAILABLE = {
  PackageApi: {
    putPackage:
      "Uploading a Compute package needs a file, and a remote server has no access to files on your machine. Deploy packages with the Fastly CLI instead.",
  },
};

const HTTP_INFO_SUFFIX = "WithHttpInfo";

/** Why the operation is unavailable remotely, or undefined when it is fine. */
export function remoteDenial(apiClass, method) {
  const operations = REMOTE_UNAVAILABLE[apiClass];
  if (!operations || typeof method !== "string") return undefined;
  const base = method.endsWith(HTTP_INFO_SUFFIX)
    ? method.slice(0, -HTTP_INFO_SUFFIX.length)
    : method;
  return Object.hasOwn(operations, base) ? operations[base] : undefined;
}

export function remoteUnavailableOperations() {
  return Object.entries(REMOTE_UNAVAILABLE).flatMap(([apiClass, operations]) =>
    Object.entries(operations).map(([method, reason]) => ({
      apiClass,
      method,
      reason,
    })),
  );
}

/** The index a remote server exposes, without the operations it refuses. */
export function projectRemoteIndex(index) {
  return index.filter(
    (entry) => remoteDenial(entry.apiClass, entry.method) === undefined,
  );
}

/**
 * Names the SDK class really defines as operations.
 * Only own prototype methods count, so `constructor`, anything inherited
 * from Object.prototype and instance fields stay out of reach of sandboxed
 * code.
 */
export function operationsOf(ApiClass) {
  const names = new Set();
  for (const name of Object.getOwnPropertyNames(ApiClass.prototype)) {
    if (name === "constructor") continue;
    const { value } = Object.getOwnPropertyDescriptor(ApiClass.prototype, name);
    if (typeof value === "function") names.add(name);
  }
  return names;
}
