// Discovery imports this module in the server process, so keep the SDK import in the sandbox.

const BASE_PATH = "https://api.fastly.com";

function isType(value, type) {
  if (type === "Number") return Number.isInteger(value);
  return typeof value === type.toLowerCase();
}

// Refuse unsupported filters so callers cannot mistake them for applied filters.
function readOptions(method, options, params) {
  if (options === undefined) return {};
  if (
    typeof options !== "object" ||
    options === null ||
    Array.isArray(options)
  ) {
    throw new TypeError(`${method} takes a single options object.`);
  }
  const values = {};
  for (const [name, value] of Object.entries(options)) {
    const param = params.find((p) => p.name === name);
    if (param === undefined) {
      throw new TypeError(
        `${method} does not accept '${name}'. Its options are ${params.map((p) => p.name).join(", ")}.`,
      );
    }
    if (value === undefined || value === null) continue;
    if (!isType(value, param.type)) {
      const expected =
        param.type === "Number"
          ? "an integer"
          : `a ${param.type.toLowerCase()}`;
      throw new TypeError(`'${name}' must be ${expected}.`);
    }
    values[name] = value;
  }
  return values;
}

function requireValue(name, value) {
  if (value === undefined || value === "") {
    throw new Error(`Missing the required parameter '${name}'.`);
  }
  return value;
}

function requireId(name, id) {
  requireValue(name, id);
  // Dots survive path encoding and can change which endpoint receives the request.
  if (id === "." || id === "..") {
    throw new Error(`'${name}' must be an ID, not '${id}'.`);
  }
  return id;
}

async function request(apiClient, operation, options) {
  const { method, httpMethod, httpPath, params } = operation;
  const values = readOptions(method, options, params);
  const pathParams = {};
  const queryParams = { ...values };
  for (const { name, required } of params) {
    if (httpPath.includes(`{${name}}`)) {
      pathParams[name] = requireId(name, values[name]);
      delete queryParams[name];
    } else if (required) {
      requireValue(name, values[name]);
    }
  }
  const response = await apiClient.callApi(
    httpPath,
    httpMethod,
    pathParams,
    {},
    queryParams,
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

// Methods on this base class are not the subclasses' own, so the sandbox never exposes them.
class NgwafApi {
  #apiClient;

  constructor(apiClient) {
    this.#apiClient = apiClient;
  }

  send(operation, options) {
    return request(this.#apiClient, operation, options);
  }
}

export class NgwafRulesApi extends NgwafApi {
  listAccountRules(options) {
    return this.send(OPERATIONS.listAccountRules, options);
  }

  listWorkspaceRules(options) {
    return this.send(OPERATIONS.listWorkspaceRules, options);
  }
}

export class NgwafWorkspacesApi extends NgwafApi {
  getWorkspace(options) {
    return this.send(OPERATIONS.getWorkspace, options);
  }
}

export const NGWAF_API_CLASSES = { NgwafRulesApi, NgwafWorkspacesApi };

const PAGING = [
  "Each call returns one page with the rules in `data` and pagination metadata in `meta`.",
  "`meta.limit` gives the page size and `meta.total` gives the collection's rule count.",
  "Pages are numbered from 1, and omitting `page` returns page 1.",
  "`page: 0` is refused with a 400.",
  "Request `page: 1`, `page: 2` and so on, adding every rule `id` to a Set.",
  "The collection is complete only when that Set's size equals `meta.total`.",
  "When counting IDs, a rule seen twice counts once.",
  "Stop and report the list as incomplete if a page is empty before that count is reached.",
  "Also stop if `meta.total` changes between pages or a page adds no new ID.",
  "Pass `enabled: true` to ask for enabled rules only.",
  "Pass `types` as one string, which is sent unchanged.",
  "A comma-separated string such as `'request,signal'` asks for several types.",
  "Conditions can name lists and custom signals by ID, and these methods do not resolve them.",
];

const WORKSPACE_LOOKUP =
  "Get a service's workspace ID from `configuration.workspace_id` in the result of " +
  "`productNgwafApi.getProductNgwafConfiguration({ service_id })`.";

const LIST_PARAMS = [
  {
    name: "action",
    type: "String",
    required: false,
    description: "Return only the rules with the given action.",
  },
  {
    name: "enabled",
    type: "Boolean",
    required: false,
    description: "Return either all enabled rules or all disabled rules.",
  },
  {
    name: "limit",
    type: "Number",
    required: false,
    description: "Limit how many results are returned.",
  },
  {
    name: "page",
    type: "Number",
    required: false,
    description: "Page number of the collection to request.",
  },
  {
    name: "types",
    type: "String",
    required: false,
    description:
      "Return rules with any of the given rule types. " +
      "The string is sent unchanged, and arrays are refused.",
  },
];

const WORKSPACE_ID = {
  name: "workspace_id",
  type: "String",
  required: true,
  description: "The ID of the workspace.",
};

// Keyed by method name, so method names must stay unique across classes.
const OPERATIONS = Object.fromEntries(
  [
    {
      apiClass: "NgwafRulesApi",
      method: "listAccountRules",
      httpPath: "/ngwaf/v1/rules",
      params: LIST_PARAMS,
      description: [
        "List one page of account-level NGWAF rules, which can apply to several workspaces.",
        ...PAGING,
        "How `enabled`, `types` and `action` affect this list's `meta.total` is unverified.",
        "Page without those filters to establish completeness, then apply them locally.",
        "Until verified, never report a filtered account listing as complete.",
        "Keep account rules whose `scope.applies_to` contains `'*'` or the target workspace ID.",
        "Count distinct IDs on the account collection first, then keep the rules that apply.",
        "The API's `scope` query filter is unverified, and this method does not send it.",
        "Do not assume the workspace list includes account rules.",
        "Deduplicate by rule ID when combining both lists.",
        WORKSPACE_LOOKUP,
      ],
    },
    {
      apiClass: "NgwafRulesApi",
      method: "listWorkspaceRules",
      httpPath: "/ngwaf/v1/workspaces/{workspace_id}/rules",
      params: [WORKSPACE_ID, ...LIST_PARAMS],
      description: [
        "List one page of the NGWAF rules defined in one workspace.",
        ...PAGING,
        "Here `meta.total` counts only rules matching `enabled`, `types` and `action`.",
        "With these filters, a filtered listing is complete when its distinct IDs reach that total.",
        "Account rules can also apply; list them with `ngwafRulesApi.listAccountRules()`.",
        WORKSPACE_LOOKUP,
      ],
    },
    {
      apiClass: "NgwafWorkspacesApi",
      method: "getWorkspace",
      httpPath: "/ngwaf/v1/workspaces/{workspace_id}",
      params: [WORKSPACE_ID],
      description: [
        "Get an NGWAF workspace's settings, including protection `mode` and attack thresholds.",
        "Attack thresholds are in `attack_signal_thresholds`.",
        WORKSPACE_LOOKUP,
        "The configuration's `traffic_ramp` gives the share of traffic inspected, not protection mode.",
        "Whether a rule blocks requests depends on the workspace mode and the rule's actions.",
        "When describing rules, report enablement and blocking separately.",
        "Report attack thresholds as workspace settings, not as rules.",
      ],
    },
  ].map((operation) => [operation.method, { httpMethod: "GET", ...operation }]),
);

/**
 * Returns fresh metadata, so enriching one index changes neither another index nor the parameters the adapters validate against.
 */
export function ngwafMethods() {
  return Object.values(OPERATIONS).map(
    ({ apiClass, method, httpMethod, httpPath, description, params }) => ({
      apiClass,
      method,
      httpMethod,
      httpPath,
      description: description.join(" "),
      params: params.map((param) => ({ ...param })),
      constraints: [],
      returnType: "Object",
    }),
  );
}
