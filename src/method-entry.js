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

/** The HTTP route, or a marker for a synthetic method, which has none. */
export function httpRoute(method) {
  if (method.synthetic) return { synthetic: true };
  return { httpMethod: method.httpMethod, httpPath: method.httpPath };
}

const isList = (type) => type === "Array" || /^\[.*\]$/.test(type);

// Search shows ten of these at once, so big bodies are cut down to `{}`.
// `inspect` still has the full shape.
const MAX_BODY_DEPTH = 4;
const MAX_BODY_LENGTH = 240;

// Same escaping as JSON, but with single quotes to match the `'...'` placeholders.
const literal = (value) => {
  if (typeof value !== "string") return JSON.stringify(value);
  const escaped = JSON.stringify(value)
    .slice(1, -1)
    .replaceAll('\\"', '"')
    .replaceAll("'", "\\'");
  return `'${escaped}'`;
};

const propertyKey = (name) =>
  /^[A-Za-z_$][\w$]*$/.test(name) ? name : literal(name);

function requiredObject(fields, depth) {
  const required = fields.filter((field) => field.required);
  if (required.length === 0) return "{}";
  return `{ ${required.map((field) => `${propertyKey(field.name)}: ${placeholder(field, depth)}`).join(", ")} }`;
}

// Bodies get an object with their required fields instead of a string.
// When only one value is allowed, we use it.
function placeholder(param, depth) {
  const fields = param.fields ?? param.oneOf?.[0].fields;
  let value = "'...'";
  if (param.allowedValues?.length === 1) {
    value = literal(param.allowedValues[0]);
  } else if (param.type.startsWith("{")) {
    return "{}";
  } else if (fields) {
    const body =
      depth < MAX_BODY_DEPTH ? requiredObject(fields, depth + 1) : "{}";
    value = body.length > MAX_BODY_LENGTH ? "{}" : body;
  }
  return isList(param.type) ? `[${value}]` : value;
}

/** A call to an enriched method with placeholders for its required parameters. */
export function buildUsage(method) {
  const args =
    method.requiredParams.length > 0 ? requiredObject(method.params, 0) : "";
  return `return await ${method.shortcut}.${method.method}(${args});`;
}
