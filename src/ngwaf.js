/**
 * Read-only NGWAF operations that the fastly SDK does not implement yet.
 *
 * The classes run in the sandbox child on the SDK's own ApiClient, so they share its authentication, request plugins and error format.
 * This module never imports the SDK, which keeps the SDK out of the server process when discovery reads the metadata.
 */

const BASE_PATH = "https://api.fastly.com";

const LIST_OPTIONS = {
  action: "String",
  enabled: "Boolean",
  limit: "Number",
  page: "Number",
  types: "String",
};

function isType(value, type) {
  if (type === "Number") return Number.isInteger(value);
  return typeof value === type.toLowerCase();
}

// Unknown options are refused so that a filter this method does not send, such as the account list's `scope`, never looks applied.
function readOptions(method, options, types) {
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
    const type = Object.hasOwn(types, name) ? types[name] : undefined;
    if (type === undefined) {
      throw new TypeError(
        `${method} does not accept '${name}'. Its options are ${Object.keys(types).join(", ")}.`,
      );
    }
    if (value === undefined || value === null) continue;
    if (!isType(value, type)) {
      const expected =
        type === "Number" ? "an integer" : `a ${type.toLowerCase()}`;
      throw new TypeError(`'${name}' must be ${expected}.`);
    }
    values[name] = value;
  }
  return values;
}

function requireId(values, name) {
  const id = values[name];
  if (id === undefined || id === "") {
    throw new Error(`Missing the required parameter '${name}'.`);
  }
  // Path encoding leaves dots alone, and a server that resolves dot segments would answer for another endpoint.
  if (id === "." || id === "..") {
    throw new Error(`'${name}' must be an ID, not '${id}'.`);
  }
  return id;
}

function query(values) {
  const params = {};
  for (const name of Object.keys(LIST_OPTIONS)) {
    if (values[name] !== undefined) params[name] = values[name];
  }
  return params;
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

function requireClient(apiClient) {
  if (typeof apiClient?.callApi !== "function") {
    throw new TypeError("An NGWAF API needs the SDK's ApiClient.");
  }
  return apiClient;
}

export class NgwafRulesApi {
  #apiClient;

  constructor(apiClient) {
    this.#apiClient = requireClient(apiClient);
  }

  async listAccountRules(options) {
    const values = readOptions("listAccountRules", options, LIST_OPTIONS);
    return get(this.#apiClient, "/ngwaf/v1/rules", {}, query(values));
  }

  async listWorkspaceRules(options) {
    const values = readOptions("listWorkspaceRules", options, {
      workspace_id: "String",
      ...LIST_OPTIONS,
    });
    const workspaceId = requireId(values, "workspace_id");
    return get(
      this.#apiClient,
      "/ngwaf/v1/workspaces/{workspace_id}/rules",
      { workspace_id: workspaceId },
      query(values),
    );
  }
}

export class NgwafWorkspacesApi {
  #apiClient;

  constructor(apiClient) {
    this.#apiClient = requireClient(apiClient);
  }

  async getWorkspace(options) {
    const values = readOptions("getWorkspace", options, {
      workspace_id: "String",
    });
    const workspaceId = requireId(values, "workspace_id");
    return get(
      this.#apiClient,
      "/ngwaf/v1/workspaces/{workspace_id}",
      { workspace_id: workspaceId },
      {},
    );
  }
}

/** The classes the sandbox registers next to the SDK's own. */
export const NGWAF_API_CLASSES = { NgwafRulesApi, NgwafWorkspacesApi };

const PAGING = [
  "Each call returns one page as the complete response envelope: `data` holds the rules, and `meta.limit` and `meta.total` describe the collection.",
  "A page is not the whole collection unless its distinct rule IDs already number `meta.total`.",
  "Pages are numbered from 1, a call without `page` returns page 1, and `page: 0` is refused with a 400.",
  "Request `page: 1`, `page: 2` and so on, adding every rule `id` to a Set.",
  "The collection is complete only when the size of that Set equals `meta.total`, and a rule seen twice counts once.",
  "Stop and report the list as incomplete if a page comes back empty before that, if `meta.total` changes between pages, or if a page adds no new ID.",
  "Pass `enabled: true` to ask for enabled rules only, and pass `types` as one string, which is sent unchanged; a comma-separated string such as `'request,signal'` asks for several types.",
  "Conditions can name lists and custom signals by ID, and these methods do not resolve them.",
];

const WORKSPACE_LOOKUP =
  "A service's workspace ID is `configuration.workspace_id` in the result of `productNgwafApi.getProductNgwafConfiguration({ service_id })`.";

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
      "Return rules with any of the given rule types. The string is sent unchanged, and arrays are refused.",
  },
];

const WORKSPACE_ID = {
  name: "workspace_id",
  type: "String",
  required: true,
  description: "The ID of the workspace.",
};

/**
 * Discovery metadata for the classes above, in the shape the docs parser produces.
 * Each call returns fresh objects, so enriching one index never changes another.
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
        "Whether this list's `meta.total` counts only the rules that match `enabled`, `types` or `action` is unverified.",
        "To establish completeness, page through it without those filters and apply them to the collected rules; never report a filtered account listing as complete.",
        "An account rule applies to a workspace when its `scope.applies_to` contains `'*'` or that workspace ID.",
        "Count distinct IDs on the account collection first, then keep the rules that apply.",
        "The API documents a `scope` query filter whose matching is unverified, and this method does not send it.",
        "Do not assume the workspace list already includes account rules; when both lists are combined, deduplicate by rule ID.",
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
        "On this list `meta.total` counts only the rules that match `enabled`, `types` and `action`, so a filtered listing is complete when its distinct IDs reach that total.",
        "Account rules can also apply to the workspace; list them with `ngwafRulesApi.listAccountRules()`.",
        WORKSPACE_LOOKUP,
      ],
      [WORKSPACE_ID, ...LIST_PARAMS],
    ),
    entry(
      "NgwafWorkspacesApi",
      "getWorkspace",
      "/ngwaf/v1/workspaces/{workspace_id}",
      [
        "Get the settings of an NGWAF workspace, including its protection `mode` and `attack_signal_thresholds`.",
        WORKSPACE_LOOKUP,
        "That configuration's `traffic_ramp` is the share of traffic inspected and does not establish the protection mode.",
        "Whether an enabled rule blocks requests depends on the workspace mode and on the rule's actions, so report enablement and blocking separately.",
        "Report attack thresholds as workspace settings, not as rules.",
      ],
      [WORKSPACE_ID],
    ),
  ];
}
