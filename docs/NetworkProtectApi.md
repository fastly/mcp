# Fastly.NetworkProtectApi

```javascript
const apiInstance = new Fastly.NetworkProtectApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createNetworkProtectEndpoint**](NetworkProtectApi.md#createNetworkProtectEndpoint) | **POST** /network-protect/v1/endpoints | Create a Network Protect endpoint
[**createNetworkProtectNetwork**](NetworkProtectApi.md#createNetworkProtectNetwork) | **POST** /network-protect/v1/networks | Create a Network Protect network
[**createNetworkProtectPrefixList**](NetworkProtectApi.md#createNetworkProtectPrefixList) | **POST** /network-protect/v1/prefix-lists | Create a Network Protect prefix list
[**createNetworkProtectRuleSet**](NetworkProtectApi.md#createNetworkProtectRuleSet) | **POST** /network-protect/v1/rule-sets | Create a Network Protect rule set
[**deleteNetworkProtectEndpoint**](NetworkProtectApi.md#deleteNetworkProtectEndpoint) | **DELETE** /network-protect/v1/endpoints/{endpoint_id} | Delete a Network Protect endpoint
[**deleteNetworkProtectNetwork**](NetworkProtectApi.md#deleteNetworkProtectNetwork) | **DELETE** /network-protect/v1/networks/{network_id} | Delete a Network Protect network
[**deleteNetworkProtectPrefixList**](NetworkProtectApi.md#deleteNetworkProtectPrefixList) | **DELETE** /network-protect/v1/prefix-lists/{prefix_list_id} | Delete a Network Protect prefix list
[**deleteNetworkProtectRuleSet**](NetworkProtectApi.md#deleteNetworkProtectRuleSet) | **DELETE** /network-protect/v1/rule-sets/{rule_set_id} | Delete a Network Protect rule set
[**getNetworkProtectEndpoint**](NetworkProtectApi.md#getNetworkProtectEndpoint) | **GET** /network-protect/v1/endpoints/{endpoint_id} | Get a Network Protect endpoint
[**getNetworkProtectNetwork**](NetworkProtectApi.md#getNetworkProtectNetwork) | **GET** /network-protect/v1/networks/{network_id} | Get a Network Protect network
[**getNetworkProtectPrefixList**](NetworkProtectApi.md#getNetworkProtectPrefixList) | **GET** /network-protect/v1/prefix-lists/{prefix_list_id} | Get a Network Protect prefix list
[**getNetworkProtectRuleSet**](NetworkProtectApi.md#getNetworkProtectRuleSet) | **GET** /network-protect/v1/rule-sets/{rule_set_id} | Get a Network Protect rule set
[**listNetworkProtectEndpoints**](NetworkProtectApi.md#listNetworkProtectEndpoints) | **GET** /network-protect/v1/endpoints | List Network Protect endpoints
[**listNetworkProtectNetworks**](NetworkProtectApi.md#listNetworkProtectNetworks) | **GET** /network-protect/v1/networks | List Network Protect networks
[**listNetworkProtectPrefixLists**](NetworkProtectApi.md#listNetworkProtectPrefixLists) | **GET** /network-protect/v1/prefix-lists | List Network Protect prefix lists
[**listNetworkProtectRuleSets**](NetworkProtectApi.md#listNetworkProtectRuleSets) | **GET** /network-protect/v1/rule-sets | List Network Protect rule sets
[**updateNetworkProtectEndpoint**](NetworkProtectApi.md#updateNetworkProtectEndpoint) | **PATCH** /network-protect/v1/endpoints/{endpoint_id} | Update a Network Protect endpoint
[**updateNetworkProtectNetwork**](NetworkProtectApi.md#updateNetworkProtectNetwork) | **PATCH** /network-protect/v1/networks/{network_id} | Update a Network Protect network
[**updateNetworkProtectPrefixList**](NetworkProtectApi.md#updateNetworkProtectPrefixList) | **PATCH** /network-protect/v1/prefix-lists/{prefix_list_id} | Update a Network Protect prefix list
[**updateNetworkProtectRuleSet**](NetworkProtectApi.md#updateNetworkProtectRuleSet) | **PATCH** /network-protect/v1/rule-sets/{rule_set_id} | Update a Network Protect rule set


## `createNetworkProtectEndpoint`

```javascript
createNetworkProtectEndpoint({ network_protect_endpoint_create })
```

Creates a GRE delivery destination. A new endpoint is not attached to a network until it is added to an endpoint policy.

### Example

```javascript
const options = {
  network_protect_endpoint_create: new Fastly.NetworkProtectEndpointCreate(), // required
};

apiInstance.createNetworkProtectEndpoint(options)
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
**network_protect_endpoint_create** | [**NetworkProtectEndpointCreate**](NetworkProtectEndpointCreate.md) |  |

### Return type

[**NetworkProtectEndpointResponse**](NetworkProtectEndpointResponse.md)


## `createNetworkProtectNetwork`

```javascript
createNetworkProtectNetwork({ network_protect_network_create })
```

Registers customer-owned IP space for protection. The network starts with advertisement disabled and Fastly does not announce its prefix. Turn advertisement on after LOA and ROA authorization are ready. The create request cannot include advertise; sending it returns a `400 Bad Request` error.

### Example

```javascript
const options = {
  network_protect_network_create: new Fastly.NetworkProtectNetworkCreate(), // required
};

apiInstance.createNetworkProtectNetwork(options)
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
**network_protect_network_create** | [**NetworkProtectNetworkCreate**](NetworkProtectNetworkCreate.md) |  |

### Return type

[**NetworkProtectNetworkResponse**](NetworkProtectNetworkResponse.md)


## `createNetworkProtectPrefixList`

```javascript
createNetworkProtectPrefixList({ network_protect_prefix_list_create })
```

Creates a typed list of addresses that rules can reference. The family is required and cannot be changed. The addresses list may remain empty.

### Example

```javascript
const options = {
  network_protect_prefix_list_create: new Fastly.NetworkProtectPrefixListCreate(), // required
};

apiInstance.createNetworkProtectPrefixList(options)
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
**network_protect_prefix_list_create** | [**NetworkProtectPrefixListCreate**](NetworkProtectPrefixListCreate.md) |  |

### Return type

[**NetworkProtectPrefixListResponse**](NetworkProtectPrefixListResponse.md)


## `createNetworkProtectRuleSet`

```javascript
createNetworkProtectRuleSet({ network_protect_rule_set_create })
```

Creates an ordered rule set and stores its filtering intent. A rule set has at most 64 rules and uses the default action when no rule matches. Custom attachment and detachment are restricted in this release.

### Example

```javascript
const options = {
  network_protect_rule_set_create: new Fastly.NetworkProtectRuleSetCreate(), // required
};

apiInstance.createNetworkProtectRuleSet(options)
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
**network_protect_rule_set_create** | [**NetworkProtectRuleSetCreate**](NetworkProtectRuleSetCreate.md) |  |

### Return type

[**NetworkProtectRuleSetResponse**](NetworkProtectRuleSetResponse.md)


## `deleteNetworkProtectEndpoint`

```javascript
deleteNetworkProtectEndpoint({ endpoint_id })
```

Deletes an endpoint. The endpoint must first be removed from every network policy; active references return a `409 Conflict` error.

### Example

```javascript
const options = {
  endpoint_id: DBOEWyMXebAir5qwjWEwK1, // required
};

apiInstance.deleteNetworkProtectEndpoint(options)
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
**endpoint_id** | **String** | Unique identifier of the Network Protect endpoint. |

### Return type

null (empty response body)


## `deleteNetworkProtectNetwork`

```javascript
deleteNetworkProtectNetwork({ network_id })
```

Deletes a network and stops its advertisement and filtering. Endpoints and rule sets used by the network are not deleted.

### Example

```javascript
const options = {
  network_id: an7NWnhOjjOkwSNvrwphTd, // required
};

apiInstance.deleteNetworkProtectNetwork(options)
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
**network_id** | **String** | Unique identifier of the Network Protect network. |

### Return type

null (empty response body)


## `deleteNetworkProtectPrefixList`

```javascript
deleteNetworkProtectPrefixList({ prefix_list_id })
```

Deletes a prefix list. Active rule references must be removed first; referenced lists return a `409 Conflict` error. Unknown and foreign IDs are indistinguishable and return a `404 Not Found` error.

### Example

```javascript
const options = {
  prefix_list_id: QoavyX1BHOMGQm2zmVyEbS, // required
};

apiInstance.deleteNetworkProtectPrefixList(options)
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
**prefix_list_id** | **String** | Unique identifier of the Network Protect prefix list. |

### Return type

null (empty response body)


## `deleteNetworkProtectRuleSet`

```javascript
deleteNetworkProtectRuleSet({ rule_set_id })
```

Deletes a rule set. Attached rule sets cannot be deleted and return a `409 Conflict` error until their references are removed.

### Example

```javascript
const options = {
  rule_set_id: Z4xQoBznwNb5GJfdJbp58Y, // required
};

apiInstance.deleteNetworkProtectRuleSet(options)
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
**rule_set_id** | **String** | Unique identifier of the Network Protect rule set. |

### Return type

null (empty response body)


## `getNetworkProtectEndpoint`

```javascript
getNetworkProtectEndpoint({ endpoint_id })
```

Retrieves a single endpoint by its identifier.

### Example

```javascript
const options = {
  endpoint_id: DBOEWyMXebAir5qwjWEwK1, // required
};

apiInstance.getNetworkProtectEndpoint(options)
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
**endpoint_id** | **String** | Unique identifier of the Network Protect endpoint. |

### Return type

[**NetworkProtectEndpointResponse**](NetworkProtectEndpointResponse.md)


## `getNetworkProtectNetwork`

```javascript
getNetworkProtectNetwork({ network_id })
```

Retrieves a single network by its identifier.

### Example

```javascript
const options = {
  network_id: an7NWnhOjjOkwSNvrwphTd, // required
};

apiInstance.getNetworkProtectNetwork(options)
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
**network_id** | **String** | Unique identifier of the Network Protect network. |

### Return type

[**NetworkProtectNetworkResponse**](NetworkProtectNetworkResponse.md)


## `getNetworkProtectPrefixList`

```javascript
getNetworkProtectPrefixList({ prefix_list_id })
```

Retrieves a single prefix list by its identifier. Unknown and foreign IDs are indistinguishable and return a `404 Not Found` error.

### Example

```javascript
const options = {
  prefix_list_id: QoavyX1BHOMGQm2zmVyEbS, // required
};

apiInstance.getNetworkProtectPrefixList(options)
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
**prefix_list_id** | **String** | Unique identifier of the Network Protect prefix list. |

### Return type

[**NetworkProtectPrefixListResponse**](NetworkProtectPrefixListResponse.md)


## `getNetworkProtectRuleSet`

```javascript
getNetworkProtectRuleSet({ rule_set_id })
```

Retrieves a single rule set with rules in evaluation order.

### Example

```javascript
const options = {
  rule_set_id: Z4xQoBznwNb5GJfdJbp58Y, // required
};

apiInstance.getNetworkProtectRuleSet(options)
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
**rule_set_id** | **String** | Unique identifier of the Network Protect rule set. |

### Return type

[**NetworkProtectRuleSetResponse**](NetworkProtectRuleSetResponse.md)


## `listNetworkProtectEndpoints`

```javascript
listNetworkProtectEndpoints({ , [limit, ][cursor] })
```

Lists the customer's GRE delivery endpoints in ascending ID order. The response is cursor-paginated and includes the effective page limit.

### Example

```javascript
const options = {
  limit: 100,
  cursor: network-cursor-next,
};

apiInstance.listNetworkProtectEndpoints(options)
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
**limit** | **Number** | Maximum resources to return. Defaults to 100. Positive values above 1000 are accepted and clamped to 1000; the effective value is reported in meta.limit. Zero, negative, and non-integer values return a `400 Bad Request` error. | [optional] [defaults to 100]
**cursor** | **String** | Continuation value from a previous response&#39;s meta.next_cursor. Omit this parameter to request the first page. | [optional]

### Return type

[**NetworkProtectEndpointsResponse**](NetworkProtectEndpointsResponse.md)


## `listNetworkProtectNetworks`

```javascript
listNetworkProtectNetworks({ , [limit, ][cursor] })
```

Lists the customer's networks in ascending ID order. The response is cursor-paginated and includes the effective page limit.

### Example

```javascript
const options = {
  limit: 100,
  cursor: network-cursor-next,
};

apiInstance.listNetworkProtectNetworks(options)
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
**limit** | **Number** | Maximum resources to return. Defaults to 100. Positive values above 1000 are accepted and clamped to 1000; the effective value is reported in meta.limit. Zero, negative, and non-integer values return a `400 Bad Request` error. | [optional] [defaults to 100]
**cursor** | **String** | Continuation value from a previous response&#39;s meta.next_cursor. Omit this parameter to request the first page. | [optional]

### Return type

[**NetworkProtectNetworksResponse**](NetworkProtectNetworksResponse.md)


## `listNetworkProtectPrefixLists`

```javascript
listNetworkProtectPrefixLists({ , [limit, ][cursor] })
```

Lists prefix lists in ascending ID order. Positive limits above 1000 are accepted and clamped to 1000. Invalid limits return a `400 Bad Request` error.

### Example

```javascript
const options = {
  limit: 100,
  cursor: network-cursor-next,
};

apiInstance.listNetworkProtectPrefixLists(options)
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
**limit** | **Number** | Maximum resources to return. Defaults to 100. Positive values above 1000 are accepted and clamped to 1000; the effective value is reported in meta.limit. Zero, negative, and non-integer values return a `400 Bad Request` error. | [optional] [defaults to 100]
**cursor** | **String** | Continuation value from a previous response&#39;s meta.next_cursor. Omit this parameter to request the first page. | [optional]

### Return type

[**NetworkProtectPrefixListsResponse**](NetworkProtectPrefixListsResponse.md)


## `listNetworkProtectRuleSets`

```javascript
listNetworkProtectRuleSets({ , [limit, ][cursor] })
```

Lists rule sets in ascending ID order. Positive limits above 1000 are accepted and clamped to 1000; invalid limits return a `400 Bad Request` error.

### Example

```javascript
const options = {
  limit: 100,
  cursor: network-cursor-next,
};

apiInstance.listNetworkProtectRuleSets(options)
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
**limit** | **Number** | Maximum resources to return. Defaults to 100. Positive values above 1000 are accepted and clamped to 1000; the effective value is reported in meta.limit. Zero, negative, and non-integer values return a `400 Bad Request` error. | [optional] [defaults to 100]
**cursor** | **String** | Continuation value from a previous response&#39;s meta.next_cursor. Omit this parameter to request the first page. | [optional]

### Return type

[**NetworkProtectRuleSetsResponse**](NetworkProtectRuleSetsResponse.md)


## `updateNetworkProtectEndpoint`

```javascript
updateNetworkProtectEndpoint({ endpoint_id, network_protect_endpoint_update })
```

Updates an endpoint. Omitted fields remain unchanged. The IP address cannot be changed; create a new endpoint if the destination changes.

### Example

```javascript
const options = {
  endpoint_id: DBOEWyMXebAir5qwjWEwK1, // required
  network_protect_endpoint_update: new Fastly.NetworkProtectEndpointUpdate(), // required
};

apiInstance.updateNetworkProtectEndpoint(options)
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
**endpoint_id** | **String** | Unique identifier of the Network Protect endpoint. |
**network_protect_endpoint_update** | [**NetworkProtectEndpointUpdate**](NetworkProtectEndpointUpdate.md) |  |

### Return type

[**NetworkProtectEndpointResponse**](NetworkProtectEndpointResponse.md)


## `updateNetworkProtectNetwork`

```javascript
updateNetworkProtectNetwork({ network_id, network_protect_network_update })
```

Updates a network. Omitted fields remain unchanged. The prefix cannot be changed. Sending `endpoint_policies` replaces the complete policy list; an empty array removes every policy. Advertisement is desired state. Enabling it requires an approved LOA, a valid ROA, and a ready default-region delivery policy. A readiness failure returns a `409 Conflict` error.

### Example

```javascript
const options = {
  network_id: an7NWnhOjjOkwSNvrwphTd, // required
  network_protect_network_update: new Fastly.NetworkProtectNetworkUpdate(), // required
};

apiInstance.updateNetworkProtectNetwork(options)
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
**network_id** | **String** | Unique identifier of the Network Protect network. |
**network_protect_network_update** | [**NetworkProtectNetworkUpdate**](NetworkProtectNetworkUpdate.md) |  |

### Return type

[**NetworkProtectNetworkResponse**](NetworkProtectNetworkResponse.md)


## `updateNetworkProtectPrefixList`

```javascript
updateNetworkProtectPrefixList({ prefix_list_id, network_protect_prefix_list_update })
```

Updates a prefix list. The family cannot be changed. Sending addresses replaces the complete list; an empty array clears it when no active source-list restriction applies. Addresses are canonicalized, deduplicated, and sorted by the backend.

### Example

```javascript
const options = {
  prefix_list_id: QoavyX1BHOMGQm2zmVyEbS, // required
  network_protect_prefix_list_update: new Fastly.NetworkProtectPrefixListUpdate(), // required
};

apiInstance.updateNetworkProtectPrefixList(options)
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
**prefix_list_id** | **String** | Unique identifier of the Network Protect prefix list. |
**network_protect_prefix_list_update** | [**NetworkProtectPrefixListUpdate**](NetworkProtectPrefixListUpdate.md) |  |

### Return type

[**NetworkProtectPrefixListResponse**](NetworkProtectPrefixListResponse.md)


## `updateNetworkProtectRuleSet`

```javascript
updateNetworkProtectRuleSet({ rule_set_id, network_protect_rule_set_update })
```

Updates a rule set. Omitted fields remain unchanged. Sending rules replaces the complete ordered list; an empty array removes every rule. Custom attachment and detachment remain restricted in this release.

### Example

```javascript
const options = {
  rule_set_id: Z4xQoBznwNb5GJfdJbp58Y, // required
  network_protect_rule_set_update: new Fastly.NetworkProtectRuleSetUpdate(), // required
};

apiInstance.updateNetworkProtectRuleSet(options)
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
**rule_set_id** | **String** | Unique identifier of the Network Protect rule set. |
**network_protect_rule_set_update** | [**NetworkProtectRuleSetUpdate**](NetworkProtectRuleSetUpdate.md) |  |

### Return type

[**NetworkProtectRuleSetResponse**](NetworkProtectRuleSetResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
