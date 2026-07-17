# Fastly.DmRoutingConfigsApi

```javascript
const apiInstance = new Fastly.DmRoutingConfigsApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**activateDmRoutingConfigDraft**](DmRoutingConfigsApi.md#activateDmRoutingConfigDraft) | **POST** /domain-management/v1/routing-configs/{config_id}/activate | Activate the draft
[**createDmRoutingConfig**](DmRoutingConfigsApi.md#createDmRoutingConfig) | **POST** /domain-management/v1/routing-configs | Create a routing config
[**createDmRoutingConfigPath**](DmRoutingConfigsApi.md#createDmRoutingConfigPath) | **POST** /domain-management/v1/routing-configs/{config_id}/paths | Create a path
[**createDmRoutingConfigRule**](DmRoutingConfigsApi.md#createDmRoutingConfigRule) | **POST** /domain-management/v1/routing-configs/{config_id}/paths/{path_id}/rules | Create a rule
[**deactivateDmRoutingConfig**](DmRoutingConfigsApi.md#deactivateDmRoutingConfig) | **POST** /domain-management/v1/routing-configs/{config_id}/deactivate | Deactivate a routing config
[**deleteDmRoutingConfig**](DmRoutingConfigsApi.md#deleteDmRoutingConfig) | **DELETE** /domain-management/v1/routing-configs/{config_id} | Delete a routing config
[**deleteDmRoutingConfigInactiveVersions**](DmRoutingConfigsApi.md#deleteDmRoutingConfigInactiveVersions) | **DELETE** /domain-management/v1/routing-configs/{config_id}/versions/inactive | Delete inactive versions
[**deleteDmRoutingConfigPath**](DmRoutingConfigsApi.md#deleteDmRoutingConfigPath) | **DELETE** /domain-management/v1/routing-configs/{config_id}/paths/{path_id} | Delete a path
[**deleteDmRoutingConfigRule**](DmRoutingConfigsApi.md#deleteDmRoutingConfigRule) | **DELETE** /domain-management/v1/routing-configs/{config_id}/paths/{path_id}/rules/{rule_id} | Delete a rule
[**discardDmRoutingConfigDraft**](DmRoutingConfigsApi.md#discardDmRoutingConfigDraft) | **DELETE** /domain-management/v1/routing-configs/{config_id}/draft | Discard the draft
[**getDmRoutingConfig**](DmRoutingConfigsApi.md#getDmRoutingConfig) | **GET** /domain-management/v1/routing-configs/{config_id} | Get a routing config
[**getDmRoutingConfigDraftDiff**](DmRoutingConfigsApi.md#getDmRoutingConfigDraftDiff) | **GET** /domain-management/v1/routing-configs/{config_id}/draft/diff | Get the draft diff
[**getDmRoutingConfigPath**](DmRoutingConfigsApi.md#getDmRoutingConfigPath) | **GET** /domain-management/v1/routing-configs/{config_id}/paths/{path_id} | Get a path
[**getDmRoutingConfigRule**](DmRoutingConfigsApi.md#getDmRoutingConfigRule) | **GET** /domain-management/v1/routing-configs/{config_id}/paths/{path_id}/rules/{rule_id} | Get a rule
[**listDmRoutingConfigPaths**](DmRoutingConfigsApi.md#listDmRoutingConfigPaths) | **GET** /domain-management/v1/routing-configs/{config_id}/paths | List paths
[**listDmRoutingConfigRules**](DmRoutingConfigsApi.md#listDmRoutingConfigRules) | **GET** /domain-management/v1/routing-configs/{config_id}/paths/{path_id}/rules | List rules
[**listDmRoutingConfigVersions**](DmRoutingConfigsApi.md#listDmRoutingConfigVersions) | **GET** /domain-management/v1/routing-configs/{config_id}/versions | List versions
[**listDmRoutingConfigs**](DmRoutingConfigsApi.md#listDmRoutingConfigs) | **GET** /domain-management/v1/routing-configs | List routing configs
[**reactivateDmRoutingConfigVersion**](DmRoutingConfigsApi.md#reactivateDmRoutingConfigVersion) | **POST** /domain-management/v1/routing-configs/{config_id}/versions/{version_id}/activate | Reactivate a version
[**updateDmRoutingConfigDraft**](DmRoutingConfigsApi.md#updateDmRoutingConfigDraft) | **PATCH** /domain-management/v1/routing-configs/{config_id}/draft | Update the draft
[**updateDmRoutingConfigPath**](DmRoutingConfigsApi.md#updateDmRoutingConfigPath) | **PATCH** /domain-management/v1/routing-configs/{config_id}/paths/{path_id} | Update a path
[**updateDmRoutingConfigRule**](DmRoutingConfigsApi.md#updateDmRoutingConfigRule) | **PATCH** /domain-management/v1/routing-configs/{config_id}/paths/{path_id}/rules/{rule_id} | Update a rule


## `activateDmRoutingConfigDraft`

```javascript
activateDmRoutingConfigDraft({ config_id })
```

Activate the current draft version. The previously active version, if any, becomes inactive but is retained in version history.

### Example

```javascript
const options = {
  config_id: "config_id_example", // required
};

apiInstance.activateDmRoutingConfigDraft(options)
  .then((data) => {
    console.log(data, "API called successfully.");
  })
  .catch((error) => {
    console.error(error);
  });
```

### Options

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**config_id** | **String** |  |

### Return type

[**RoutingConfigVersionResponse**](RoutingConfigVersionResponse.md)


## `createDmRoutingConfig`

```javascript
createDmRoutingConfig({ , [routing_config] })
```

Create a new routing config. An optional `initial_version` may be provided to seed the config with paths and rules in a single request, and may also be activated immediately.

### Example

```javascript
const options = {
  routing_config: new Fastly.RoutingConfig(),
};

apiInstance.createDmRoutingConfig(options)
  .then((data) => {
    console.log(data, "API called successfully.");
  })
  .catch((error) => {
    console.error(error);
  });
```

### Options

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**routing_config** | [**RoutingConfig**](RoutingConfig.md) |  | [optional]

### Return type

[**RoutingConfigResponse**](RoutingConfigResponse.md)


## `createDmRoutingConfigPath`

```javascript
createDmRoutingConfigPath({ config_id, [path_create] })
```

Add a new path to the config's draft version. If no draft exists, one is created automatically by cloning the active version.

### Example

```javascript
const options = {
  config_id: "config_id_example", // required
  path_create: new Fastly.PathCreate(),
};

apiInstance.createDmRoutingConfigPath(options)
  .then((data) => {
    console.log(data, "API called successfully.");
  })
  .catch((error) => {
    console.error(error);
  });
```

### Options

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**config_id** | **String** |  |
**path_create** | [**PathCreate**](PathCreate.md) |  | [optional]

### Return type

[**PathResponse**](PathResponse.md)


## `createDmRoutingConfigRule`

```javascript
createDmRoutingConfigRule({ config_id, path_id, [rule_create] })
```

Add a new rule to a path on the config's draft version. If no draft exists, one is created automatically by cloning the active version. A rule with an empty `conditions` array is a default (catch-all) rule and there can be at most one default rule per path.

### Example

```javascript
const options = {
  config_id: "config_id_example", // required
  path_id: "path_id_example", // required
  rule_create: new Fastly.RuleCreate(),
};

apiInstance.createDmRoutingConfigRule(options)
  .then((data) => {
    console.log(data, "API called successfully.");
  })
  .catch((error) => {
    console.error(error);
  });
```

### Options

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**config_id** | **String** |  |
**path_id** | **String** |  |
**rule_create** | [**RuleCreate**](RuleCreate.md) |  | [optional]

### Return type

[**RuleResponse**](RuleResponse.md)


## `deactivateDmRoutingConfig`

```javascript
deactivateDmRoutingConfig({ config_id })
```

Clear the active version designation. This is a bookkeeping operation only — it does not stop edge traffic. Minerva continues serving the last-activated version until the domain association is removed in Spotless. Only removing the routing config from the domain (via Spotless) triggers Neptune to drop the reference, which causes Minerva to stop fetching and eventually clean up the cached config. Idempotent: returns 200 even if already deactivated.

### Example

```javascript
const options = {
  config_id: "config_id_example", // required
};

apiInstance.deactivateDmRoutingConfig(options)
  .then((data) => {
    console.log(data, "API called successfully.");
  })
  .catch((error) => {
    console.error(error);
  });
```

### Options

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**config_id** | **String** |  |

### Return type

[**RoutingConfigResponse**](RoutingConfigResponse.md)


## `deleteDmRoutingConfig`

```javascript
deleteDmRoutingConfig({ config_id, [force] })
```

Delete a routing config. By default, configs that have an active version cannot be deleted. Pass `force=true` to bypass the active-version check — this is destructive and will immediately stop traffic routing for any paths the config serves. The `force` parameter does **not** bypass the domain-association check; if domains are still associated, deletion is rejected with 409 regardless of `force`.

### Example

```javascript
const options = {
  config_id: "config_id_example", // required
  force: false,
};

apiInstance.deleteDmRoutingConfig(options)
  .then(() => {
    console.log('API called successfully.');
  })
  .catch((error) => {
    console.error(error);
  });
```

### Options

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**config_id** | **String** |  |
**force** | **Boolean** | When `true`, allows deleting a routing config that has an active version. This is destructive — traffic routing for any paths served by the config will stop immediately. | [optional] [defaults to false]

### Return type

null (empty response body)


## `deleteDmRoutingConfigInactiveVersions`

```javascript
deleteDmRoutingConfigInactiveVersions({ config_id })
```

Delete all inactive versions for a routing config. The currently active version, if any, is retained.

### Example

```javascript
const options = {
  config_id: "config_id_example", // required
};

apiInstance.deleteDmRoutingConfigInactiveVersions(options)
  .then(() => {
    console.log('API called successfully.');
  })
  .catch((error) => {
    console.error(error);
  });
```

### Options

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**config_id** | **String** |  |

### Return type

null (empty response body)


## `deleteDmRoutingConfigPath`

```javascript
deleteDmRoutingConfigPath({ config_id, path_id })
```

Delete a path from the config's draft version. If no draft exists, one is created automatically by cloning the active version.

### Example

```javascript
const options = {
  config_id: "config_id_example", // required
  path_id: "path_id_example", // required
};

apiInstance.deleteDmRoutingConfigPath(options)
  .then(() => {
    console.log('API called successfully.');
  })
  .catch((error) => {
    console.error(error);
  });
```

### Options

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**config_id** | **String** |  |
**path_id** | **String** |  |

### Return type

null (empty response body)


## `deleteDmRoutingConfigRule`

```javascript
deleteDmRoutingConfigRule({ config_id, path_id, rule_id })
```

Delete a rule from the config's draft version. If no draft exists, one is created automatically by cloning the active version.

### Example

```javascript
const options = {
  config_id: "config_id_example", // required
  path_id: "path_id_example", // required
  rule_id: "rule_id_example", // required
};

apiInstance.deleteDmRoutingConfigRule(options)
  .then(() => {
    console.log('API called successfully.');
  })
  .catch((error) => {
    console.error(error);
  });
```

### Options

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**config_id** | **String** |  |
**path_id** | **String** |  |
**rule_id** | **String** |  |

### Return type

null (empty response body)


## `discardDmRoutingConfigDraft`

```javascript
discardDmRoutingConfigDraft({ config_id })
```

Delete the current draft version, reverting any unactivated changes.

### Example

```javascript
const options = {
  config_id: "config_id_example", // required
};

apiInstance.discardDmRoutingConfigDraft(options)
  .then(() => {
    console.log('API called successfully.');
  })
  .catch((error) => {
    console.error(error);
  });
```

### Options

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**config_id** | **String** |  |

### Return type

null (empty response body)


## `getDmRoutingConfig`

```javascript
getDmRoutingConfig({ config_id })
```

Retrieve a single routing config by its identifier.

### Example

```javascript
const options = {
  config_id: "config_id_example", // required
};

apiInstance.getDmRoutingConfig(options)
  .then((data) => {
    console.log(data, "API called successfully.");
  })
  .catch((error) => {
    console.error(error);
  });
```

### Options

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**config_id** | **String** |  |

### Return type

[**RoutingConfigResponse**](RoutingConfigResponse.md)


## `getDmRoutingConfigDraftDiff`

```javascript
getDmRoutingConfigDraftDiff({ config_id })
```

Compare the current draft version against the active version and return the paths and rules that have been added, modified, or deleted.

### Example

```javascript
const options = {
  config_id: "config_id_example", // required
};

apiInstance.getDmRoutingConfigDraftDiff(options)
  .then((data) => {
    console.log(data, "API called successfully.");
  })
  .catch((error) => {
    console.error(error);
  });
```

### Options

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**config_id** | **String** |  |

### Return type

[**DraftDiff**](DraftDiff.md)


## `getDmRoutingConfigPath`

```javascript
getDmRoutingConfigPath({ config_id, path_id })
```

Retrieve a single path by its stable identifier.

### Example

```javascript
const options = {
  config_id: "config_id_example", // required
  path_id: "path_id_example", // required
};

apiInstance.getDmRoutingConfigPath(options)
  .then((data) => {
    console.log(data, "API called successfully.");
  })
  .catch((error) => {
    console.error(error);
  });
```

### Options

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**config_id** | **String** |  |
**path_id** | **String** |  |

### Return type

[**PathResponse**](PathResponse.md)


## `getDmRoutingConfigRule`

```javascript
getDmRoutingConfigRule({ config_id, path_id, rule_id })
```

Retrieve a single rule by its stable identifier.

### Example

```javascript
const options = {
  config_id: "config_id_example", // required
  path_id: "path_id_example", // required
  rule_id: "rule_id_example", // required
};

apiInstance.getDmRoutingConfigRule(options)
  .then((data) => {
    console.log(data, "API called successfully.");
  })
  .catch((error) => {
    console.error(error);
  });
```

### Options

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**config_id** | **String** |  |
**path_id** | **String** |  |
**rule_id** | **String** |  |

### Return type

[**RuleResponse**](RuleResponse.md)


## `listDmRoutingConfigPaths`

```javascript
listDmRoutingConfigPaths({ config_id, [path, ][match, ][sort, ][cursor, ][limit] })
```

List paths for the config. Returns paths from the active version if one exists, otherwise from the draft.

### Example

```javascript
const options = {
  config_id: "config_id_example", // required
  path: "path_example",
  match: "exact",
  sort: "created_at",
  cursor: "cursor_example",
  limit: 20,
};

apiInstance.listDmRoutingConfigPaths(options)
  .then((data) => {
    console.log(data, "API called successfully.");
  })
  .catch((error) => {
    console.error(error);
  });
```

### Options

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**config_id** | **String** |  |
**path** | **String** | Filter results by path pattern. The match strategy is controlled by the `match` parameter. | [optional]
**match** | **String** | How to match the value of the `path` filter against existing path patterns. Has no effect unless `path` is also provided. | [optional] [one of: "exact", "starts_with", "ends_with", "contains"]
**sort** | **String** | The order in which to list the results. | [optional] [one of: "created_at", "-created_at", "id", "-id", "path", "-path"]
**cursor** | **String** | Cursor value from the `next_cursor` field of a previous response, used to retrieve the next page. To request the first page, this should be empty. | [optional]
**limit** | **Number** | Limit how many results are returned. | [optional] [defaults to 20]

### Return type

[**PathsResponse**](PathsResponse.md)


## `listDmRoutingConfigRules`

```javascript
listDmRoutingConfigRules({ config_id, path_id, [sort, ][cursor, ][limit] })
```

List all rules for a path in evaluation order.

### Example

```javascript
const options = {
  config_id: "config_id_example", // required
  path_id: "path_id_example", // required
  sort: "created_at",
  cursor: "cursor_example",
  limit: 20,
};

apiInstance.listDmRoutingConfigRules(options)
  .then((data) => {
    console.log(data, "API called successfully.");
  })
  .catch((error) => {
    console.error(error);
  });
```

### Options

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**config_id** | **String** |  |
**path_id** | **String** |  |
**sort** | **String** | The order in which to list the results. | [optional] [one of: "created_at", "-created_at", "position", "-position"]
**cursor** | **String** | Cursor value from the `next_cursor` field of a previous response, used to retrieve the next page. To request the first page, this should be empty. | [optional]
**limit** | **Number** | Limit how many results are returned. | [optional] [defaults to 20]

### Return type

[**RulesResponse**](RulesResponse.md)


## `listDmRoutingConfigVersions`

```javascript
listDmRoutingConfigVersions({ config_id, [sort, ][cursor, ][limit] })
```

List all versions for a routing config.

### Example

```javascript
const options = {
  config_id: "config_id_example", // required
  sort: "activated_at",
  cursor: "cursor_example",
  limit: 20,
};

apiInstance.listDmRoutingConfigVersions(options)
  .then((data) => {
    console.log(data, "API called successfully.");
  })
  .catch((error) => {
    console.error(error);
  });
```

### Options

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**config_id** | **String** |  |
**sort** | **String** | The order in which to list the results. | [optional] [one of: "activated_at", "-activated_at", "created_at", "-created_at"]
**cursor** | **String** | Cursor value from the `next_cursor` field of a previous response, used to retrieve the next page. To request the first page, this should be empty. | [optional]
**limit** | **Number** | Limit how many results are returned. | [optional] [defaults to 20]

### Return type

[**VersionsResponse**](VersionsResponse.md)


## `listDmRoutingConfigs`

```javascript
listDmRoutingConfigs({ , [state, ][sort, ][cursor, ][limit] })
```

List all routing configs for the authenticated customer.

### Example

```javascript
const options = {
  state: "draft-only",
  sort: "created_at",
  cursor: "cursor_example",
  limit: 20,
};

apiInstance.listDmRoutingConfigs(options)
  .then((data) => {
    console.log(data, "API called successfully.");
  })
  .catch((error) => {
    console.error(error);
  });
```

### Options

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**state** | [**[String]**](String.md) | Filter configs by lifecycle state. Accepts a comma-separated list of state values (e.g. `?state&#x3D;active,active-with-draft`). Returns only configs whose current state matches one of the provided values. Returns 400 if any value is not a recognised state. | [optional] [one of: "draft-only", "active", "active-with-draft"]
**sort** | **String** | The order in which to list the results. | [optional] [one of: "created_at", "-created_at", "id", "-id", "name", "-name"]
**cursor** | **String** | Cursor value from the `next_cursor` field of a previous response, used to retrieve the next page. To request the first page, this should be empty. | [optional]
**limit** | **Number** | Limit how many results are returned. | [optional] [defaults to 20]

### Return type

[**RoutingConfigsResponse**](RoutingConfigsResponse.md)


## `reactivateDmRoutingConfigVersion`

```javascript
reactivateDmRoutingConfigVersion({ config_id, version_id })
```

Reactivate a previously-active version. The currently active version, if any, becomes inactive but is retained in version history.

### Example

```javascript
const options = {
  config_id: "config_id_example", // required
  version_id: "version_id_example", // required
};

apiInstance.reactivateDmRoutingConfigVersion(options)
  .then((data) => {
    console.log(data, "API called successfully.");
  })
  .catch((error) => {
    console.error(error);
  });
```

### Options

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**config_id** | **String** |  |
**version_id** | **String** |  |

### Return type

[**RoutingConfigVersionResponse**](RoutingConfigVersionResponse.md)


## `updateDmRoutingConfigDraft`

```javascript
updateDmRoutingConfigDraft({ config_id, [draft_update] })
```

Update metadata on the draft version, such as its comment. If no draft exists, one is created automatically by cloning the active version.

### Example

```javascript
const options = {
  config_id: "config_id_example", // required
  draft_update: new Fastly.DraftUpdate(),
};

apiInstance.updateDmRoutingConfigDraft(options)
  .then((data) => {
    console.log(data, "API called successfully.");
  })
  .catch((error) => {
    console.error(error);
  });
```

### Options

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**config_id** | **String** |  |
**draft_update** | [**DraftUpdate**](DraftUpdate.md) |  | [optional]

### Return type

[**RoutingConfigVersionResponse**](RoutingConfigVersionResponse.md)


## `updateDmRoutingConfigPath`

```javascript
updateDmRoutingConfigPath({ config_id, path_id, [path_update] })
```

Update a path on the config's draft version. If no draft exists, one is created automatically by cloning the active version.

### Example

```javascript
const options = {
  config_id: "config_id_example", // required
  path_id: "path_id_example", // required
  path_update: new Fastly.PathUpdate(),
};

apiInstance.updateDmRoutingConfigPath(options)
  .then((data) => {
    console.log(data, "API called successfully.");
  })
  .catch((error) => {
    console.error(error);
  });
```

### Options

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**config_id** | **String** |  |
**path_id** | **String** |  |
**path_update** | [**PathUpdate**](PathUpdate.md) |  | [optional]

### Return type

[**PathResponse**](PathResponse.md)


## `updateDmRoutingConfigRule`

```javascript
updateDmRoutingConfigRule({ config_id, path_id, rule_id, [rule_update] })
```

Update a rule on the config's draft version. If no draft exists, one is created automatically by cloning the active version.

### Example

```javascript
const options = {
  config_id: "config_id_example", // required
  path_id: "path_id_example", // required
  rule_id: "rule_id_example", // required
  rule_update: new Fastly.RuleUpdate(),
};

apiInstance.updateDmRoutingConfigRule(options)
  .then((data) => {
    console.log(data, "API called successfully.");
  })
  .catch((error) => {
    console.error(error);
  });
```

### Options

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**config_id** | **String** |  |
**path_id** | **String** |  |
**rule_id** | **String** |  |
**rule_update** | [**RuleUpdate**](RuleUpdate.md) |  | [optional]

### Return type

[**RuleResponse**](RuleResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
