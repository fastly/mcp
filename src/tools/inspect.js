import { enrichMethod } from "../indexer.js";
import { remoteUnavailableOperations } from "../method-policy.js";

// The remote index leaves these operations out, so without this the model
// would be told the method does not exist.
function remoteExplanation(queryLower) {
  const [first, second] = queryLower.split(".", 2);
  const denied = remoteUnavailableOperations().find((operation) => {
    const methodLower = operation.method.toLowerCase();
    if (second === undefined) return methodLower === first;
    return methodLower === second && operation.apiClass.toLowerCase() === first;
  });
  if (!denied) return undefined;
  return `${denied.apiClass}.${denied.method} is unavailable on this remote server. ${denied.reason}`;
}

export function inspect(index, method, { remote = false } = {}) {
  if (typeof method !== "string" || !method.trim()) {
    return { ok: false, error: "method must be a non-empty string" };
  }

  const query = method.trim();
  const queryLower = query.toLowerCase();

  if (remote) {
    const explanation = remoteExplanation(queryLower);
    if (explanation) return { ok: false, error: explanation };
  }

  for (const m of index) enrichMethod(m);

  let match = index.find((m) => m.methodLower === queryLower);

  if (!match && query.includes(".")) {
    const [cls, meth] = query.split(".", 2);
    const clsLower = cls.toLowerCase();
    const methLower = meth.toLowerCase();
    match = index.find(
      (m) => m.classLower === clsLower && m.methodLower === methLower,
    );
  }

  if (!match) {
    const partial = index
      .filter((m) => m.methodLower.includes(queryLower))
      .slice(0, 5)
      .map((m) => `${m.apiClass}.${m.method}`);

    return {
      ok: false,
      error: `No method named '${query}' found.${partial.length > 0 ? ` Did you mean: ${partial.join(", ")}?` : " Use the search tool to find available methods."}`,
    };
  }

  const doc = {
    ok: true,
    apiClass: match.apiClass,
    method: match.method,
    httpMethod: match.httpMethod,
    httpPath: match.httpPath,
    description: match.description,
    returnType: match.returnType,
    params: match.params,
  };

  if (Array.isArray(match.constraints) && match.constraints.length > 0) {
    doc.constraints = match.constraints;
  }

  if (match.example) {
    doc.example = match.example;
  }

  const args = match.params.length > 0 ? "{ /* params */ }" : "";
  doc.usage = `return await ${match.shortcut}.${match.method}(${args});`;

  return doc;
}
