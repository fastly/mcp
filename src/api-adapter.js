// Shared plumbing for the API methods this server implements itself.
// The server process imports these for discovery, so the SDK import has to stay in the sandbox.

const BASE_PATH = "https://api.fastly.com";

export const param = (name, type, required, description, values) => ({
  name,
  type,
  required,
  description,
  ...(values === undefined ? {} : { values }),
});

export const bytes = (n) => n.toLocaleString("en-US");

const isPlainObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const TYPES = {
  String: { is: (value) => typeof value === "string", expected: "a string" },
  Number: { is: Number.isInteger, expected: "an integer" },
  Boolean: { is: (value) => typeof value === "boolean", expected: "a boolean" },
  Object: { is: isPlainObject, expected: "an object" },
};

// Refuse unknown options, so callers never mistake them for filters that were applied.
function readOptions(method, options, params) {
  if (options === undefined) return {};
  if (!isPlainObject(options)) {
    throw new TypeError(`${method} takes a single options object.`);
  }
  const values = {};
  for (const [name, value] of Object.entries(options)) {
    const spec = params.find((p) => p.name === name);
    if (spec === undefined) {
      const accepted = params.length
        ? `Its options are ${params.map((p) => p.name).join(", ")}.`
        : "It takes no options.";
      throw new TypeError(`${method} does not accept '${name}'. ${accepted}`);
    }
    if (value === undefined || value === null) continue;
    const type = TYPES[spec.type];
    if (type === undefined) {
      throw new Error(
        `${method} declares '${name}' as the unknown type '${spec.type}'.`,
      );
    }
    if (!type.is(value)) {
      throw new TypeError(`'${name}' must be ${type.expected}.`);
    }
    // An empty option means "not given" here, so requireValue reports it.
    if (
      spec.values !== undefined &&
      value !== "" &&
      !spec.values.includes(value)
    ) {
      throw new Error(`'${name}' must be one of ${spec.values.join(", ")}.`);
    }
    values[name] = value;
  }
  return values;
}

function requireValue(name, value) {
  if (value === undefined || value === "") {
    throw new Error(`Missing the required parameter '${name}'.`);
  }
}

function requireId(name, id) {
  requireValue(name, id);
  // Dots survive path encoding and can change which endpoint receives the request.
  if (id === "." || id === "..") {
    throw new Error(`'${name}' must be an ID, not '${id}'.`);
  }
  return id;
}

export const FILTER_OPERATORS = [
  "eq",
  "in",
  "contains",
  "ends-with",
  "gt",
  "gte",
  "lt",
  "lte",
];

const OPERATOR_HELP = `The operators are ${FILTER_OPERATORS.join(", ")}.`;

// A value we cannot put in a query parameter would leave the filter unapplied. An empty string is fine, since plenty of log fields are empty.
function requireScalar(where, value) {
  if (value === undefined || value === null) {
    throw new Error(`'filter.${where}' has no value.`);
  }
  if (typeof value === "object") {
    throw new Error(`'filter.${where}' must be a single value, not an object.`);
  }
  return value;
}

// A comma inside a value would read as the end of an entry, and nothing escapes it: a backslash and quotes get split through too. Better an error than a filter nobody asked for.
function joinList(where, values) {
  if (values.length === 0) {
    throw new Error(`'filter.${where}' is an empty list.`);
  }
  return values
    .map((value) => {
      const scalar = requireScalar(where, value);
      if (String(scalar).includes(",")) {
        throw new Error(
          `'filter.${where}' cannot hold '${scalar}', because the API reads the comma as the end of a list entry.`,
        );
      }
      return scalar;
    })
    .join(",");
}

// Only `in` reads a list. Give one to `contains` or `ends-with` and it matches the joined string instead, with no error to show for it.
function filterValue(where, value, operator) {
  if (!Array.isArray(value)) return requireScalar(where, value);
  if (operator !== "in") {
    throw new Error(
      `'filter.${where}' takes one value, since only 'in' reads a list.`,
    );
  }
  return joinList(where, value);
}

// Field names are plain words. Refusing anything else keeps two filters from building the same parameter.
function filterField(field) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(field)) {
    throw new Error(
      `'filter' takes log record field names. '${field}' is not one. Write 'filter: { response_status: 404 }' rather than the query parameter.`,
    );
  }
  return field;
}

/**
 * Spells a filter the way every Fastly observability endpoint wants it, as a parameter name rather than a value.
 *
 * `{ response_status: 404 }` becomes `filter[response_status]=404`, and `{ response_time: { gte: 0.5 } }` becomes `filter[response_time][gte]=0.5`.
 */
export function filterQuery(filter) {
  if (filter === undefined) return {};
  const fields = Object.entries(filter);
  // Arguments reach us as JSON, which drops an undefined property, so `{ response_status: undefined }` arrives empty. Accepting that would quietly answer an unfiltered page.
  if (fields.length === 0) {
    throw new Error(
      "'filter' names no field. Leave the option out rather than passing an empty filter.",
    );
  }
  const query = {};
  for (const [name, test] of fields) {
    const field = filterField(name);
    if (Array.isArray(test)) {
      query[`filter[${field}][in]`] = filterValue(field, test, "in");
      continue;
    }
    if (isPlainObject(test)) {
      const tests = Object.entries(test);
      if (tests.length === 0) {
        throw new Error(
          `'filter.${field}' names no operator. ${OPERATOR_HELP}`,
        );
      }
      for (const [operator, value] of tests) {
        if (!FILTER_OPERATORS.includes(operator)) {
          throw new Error(
            `'filter.${field}' uses the unknown operator '${operator}'. ${OPERATOR_HELP}`,
          );
        }
        query[`filter[${field}][${operator}]`] = filterValue(
          `${field}.${operator}`,
          value,
          operator,
        );
      }
      continue;
    }
    query[`filter[${field}]`] = filterValue(field, test, "eq");
  }
  return query;
}

async function request(apiClient, operation, options) {
  const { method, httpMethod, httpPath, params, fixedQuery, query } = operation;
  const values = readOptions(method, options, params);
  const pathParams = {};
  const rest = { ...values };
  for (const { name, required } of params) {
    if (httpPath.includes(`{${name}}`)) {
      pathParams[name] = requireId(name, values[name]);
      delete rest[name];
    } else if (required) {
      requireValue(name, values[name]);
    }
  }
  const response = await apiClient.callApi(
    httpPath,
    httpMethod,
    pathParams,
    {},
    { ...fixedQuery, ...query(rest) },
    {},
    {},
    null,
    ["token"],
    [],
    ["application/json"],
    Object,
    BASE_PATH,
  );
  return response.data;
}

// Snippets can only call a class's own methods, so nothing on this base class is reachable.
export class OwnedApi {
  #apiClient;

  constructor(apiClient) {
    this.#apiClient = apiClient;
  }

  send(operation, options) {
    return request(this.#apiClient, operation, options);
  }
}

/** Method names have to be unique across a table, or a repeat would send one class's requests to the other's endpoint. */
export function operationTable(operations) {
  const table = Object.create(null);
  for (const operation of operations) {
    const { method } = operation;
    if (method in table) {
      throw new Error(
        `${method} is declared by both ${table[method].apiClass} and ${operation.apiClass}, and one table cannot hold both. Rename one of them.`,
      );
    }
    table[method] = {
      httpMethod: "GET",
      query: (values) => values,
      ...operation,
    };
  }
  return table;
}

/** Projects an operation table onto the shape the indexer produces. The copies matter, since enriching the index must not reach back into what the adapters check against. */
export function describeOperations(operations) {
  return Object.values(operations).map(
    ({ apiClass, method, httpMethod, httpPath, description, params }) => ({
      apiClass,
      method,
      httpMethod,
      httpPath,
      description: description.join(" "),
      params: params.map(({ name, type, required, description }) => ({
        name,
        type,
        required,
        description,
      })),
      constraints: [],
      returnType: "Object",
    }),
  );
}
