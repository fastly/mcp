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

function requireId(name, id) {
  if (id === undefined || id === "") {
    throw new Error(`Missing the required parameter '${name}'.`);
  }
  // Dots survive path encoding and can change which endpoint receives the request.
  if (id === "." || id === "..") {
    throw new Error(`'${name}' must be an ID, not '${id}'.`);
  }
  return id;
}

async function get(apiClient, path, pathParams, queryParams) {
  const response = await apiClient.callApi(
    path,
    "GET",
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

export class NgwafRulesApi {
  #apiClient;

  constructor(apiClient) {
    this.#apiClient = apiClient;
  }

  async listAccountRules(options) {
    const filters = readOptions("listAccountRules", options, LIST_PARAMS);
    return get(this.#apiClient, "/ngwaf/v1/rules", {}, filters);
  }

  async listWorkspaceRules(options) {
    const { workspace_id, ...filters } = readOptions(
      "listWorkspaceRules",
      options,
      [WORKSPACE_ID, ...LIST_PARAMS],
    );
    return get(
      this.#apiClient,
      "/ngwaf/v1/workspaces/{workspace_id}/rules",
      { workspace_id: requireId("workspace_id", workspace_id) },
      filters,
    );
  }
}

export class NgwafWorkspacesApi {
  #apiClient;

  constructor(apiClient) {
    this.#apiClient = apiClient;
  }

  async getWorkspace(options) {
    const { workspace_id } = readOptions("getWorkspace", options, [
      WORKSPACE_ID,
    ]);
    return get(
      this.#apiClient,
      "/ngwaf/v1/workspaces/{workspace_id}",
      { workspace_id: requireId("workspace_id", workspace_id) },
      {},
    );
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

/**
 * Returns fresh metadata, so enriching one index changes neither another index nor the parameters the adapters validate against.
 */
export function ngwafMethods() {
  const entry = (apiClass, method, httpPath, sentences, params) => ({
    apiClass,
    method,
    httpMethod: "GET",
    httpPath,
    description: sentences.join(" "),
    params: params.map((param) => ({ ...param })),
    constraints: [],
    returnType: "Object",
  });
  return [
    entry(
      "NgwafRulesApi",
      "listAccountRules",
      "/ngwaf/v1/rules",
      [
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
      LIST_PARAMS,
    ),
    entry(
      "NgwafRulesApi",
      "listWorkspaceRules",
      "/ngwaf/v1/workspaces/{workspace_id}/rules",
      [
        "List one page of the NGWAF rules defined in one workspace.",
        ...PAGING,
        "Here `meta.total` counts only rules matching `enabled`, `types` and `action`.",
        "With these filters, a filtered listing is complete when its distinct IDs reach that total.",
        "Account rules can also apply; list them with `ngwafRulesApi.listAccountRules()`.",
        WORKSPACE_LOOKUP,
      ],
      [WORKSPACE_ID, ...LIST_PARAMS],
    ),
    entry(
      "NgwafWorkspacesApi",
      "getWorkspace",
      "/ngwaf/v1/workspaces/{workspace_id}",
      [
        "Get an NGWAF workspace's settings, including protection `mode` and attack thresholds.",
        "Attack thresholds are in `attack_signal_thresholds`.",
        WORKSPACE_LOOKUP,
        "The configuration's `traffic_ramp` gives the share of traffic inspected, not protection mode.",
        "Whether a rule blocks requests depends on the workspace mode and the rule's actions.",
        "When describing rules, report enablement and blocking separately.",
        "Report attack thresholds as workspace settings, not as rules.",
      ],
      [WORKSPACE_ID],
    ),
  ];
}
