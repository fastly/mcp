// Discovery runs on Fastly Compute too, so this module stays free of filesystem imports.

function extractPathParams(httpPath) {
  if (typeof httpPath !== "string") return [];
  const out = [];
  const re = /\{([^}]+)\}/g;
  let m = re.exec(httpPath);
  while (m !== null) {
    out.push(m[1]);
    m = re.exec(httpPath);
  }
  return out;
}

/** The camelCase global for an API class, such as `serviceApi`. */
export const shortcutName = (apiClass) =>
  apiClass.charAt(0).toLowerCase() + apiClass.slice(1);

export function enrichMethod(method) {
  if (!Array.isArray(method.params)) method.params = [];
  if (method.methodLower !== undefined) return method;
  const apiClass = method.apiClass;
  method.shortcut = shortcutName(apiClass);
  method.methodLower = method.method.toLowerCase();
  method.classLower = apiClass.toLowerCase();
  method.pathLower = (method.httpPath ?? "").toLowerCase();
  method.descLower = (method.description ?? "").toLowerCase();
  method.returnLower = (method.returnType ?? "").toLowerCase();
  method.paramsLower = method.params.map((p) => p.name.toLowerCase());
  method.requiredParams = method.params
    .filter((p) => p.required === true)
    .map((p) => p.name);
  method.pathParams = extractPathParams(method.httpPath);
  return method;
}

/** A call to an enriched method with placeholders for its required parameters. */
export function buildUsage(method) {
  const args =
    method.requiredParams.length > 0
      ? `{ ${method.requiredParams.map((p) => `${p}: '...'`).join(", ")} }`
      : "";
  return `return await ${method.shortcut}.${method.method}(${args});`;
}
