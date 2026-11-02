# Fastly.AiRuntimeControlProviderConnectionsApi

```javascript
const apiInstance = new Fastly.AiRuntimeControlProviderConnectionsApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**arcCreateProviderConnection**](AiRuntimeControlProviderConnectionsApi.md#arcCreateProviderConnection) | **POST** /ai-runtime-control/v1/provider-connections | Create a provider connection
[**arcDeleteProviderConnection**](AiRuntimeControlProviderConnectionsApi.md#arcDeleteProviderConnection) | **DELETE** /ai-runtime-control/v1/provider-connections/{id} | Delete a provider connection
[**arcGetProviderConnection**](AiRuntimeControlProviderConnectionsApi.md#arcGetProviderConnection) | **GET** /ai-runtime-control/v1/provider-connections/{id} | Get a provider connection
[**arcListProviderConnections**](AiRuntimeControlProviderConnectionsApi.md#arcListProviderConnections) | **GET** /ai-runtime-control/v1/provider-connections | List provider connections
[**arcUpdateProviderConnection**](AiRuntimeControlProviderConnectionsApi.md#arcUpdateProviderConnection) | **PATCH** /ai-runtime-control/v1/provider-connections/{id} | Update a provider connection


## `arcCreateProviderConnection`

```javascript
arcCreateProviderConnection({ arc_provider_connection_request })
```

Create a provider connection. Set `auth_type` to `api-key` (the default) to connect with a provider's own API key, or to `aws-iam` to connect to Amazon Bedrock using an AWS IAM role.  Accounts are limited to 25 provider connections. Creating a 26th connection returns a 409 response.

### Example

```javascript
const options = {
  arc_provider_connection_request: new Fastly.ArcProviderConnectionRequest(), // required
};

apiInstance.arcCreateProviderConnection(options)
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
**arc_provider_connection_request** | [**ArcProviderConnectionRequest**](ArcProviderConnectionRequest.md) |  |

### Return type

[**ArcProviderConnectionResponse**](ArcProviderConnectionResponse.md)


## `arcDeleteProviderConnection`

```javascript
arcDeleteProviderConnection({ id })
```

Delete a provider connection. Returns a 409 response if the connection is still referenced by a virtual key's failover policy.

### Example

```javascript
const options = {
  id: pTfnUUBcU1yv8SoRJn5PZ2, // required
};

apiInstance.arcDeleteProviderConnection(options)
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
**id** | **String** | The ID of the provider connection. |

### Return type

null (empty response body)


## `arcGetProviderConnection`

```javascript
arcGetProviderConnection({ id })
```

Retrieve a single provider connection.

### Example

```javascript
const options = {
  id: pTfnUUBcU1yv8SoRJn5PZ2, // required
};

apiInstance.arcGetProviderConnection(options)
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
**id** | **String** | The ID of the provider connection. |

### Return type

[**ArcGetProviderConnectionResponse**](ArcGetProviderConnectionResponse.md)


## `arcListProviderConnections`

```javascript
arcListProviderConnections({ , [include_deleted, ][sort] })
```

List the provider connections belonging to your account.

### Example

```javascript
const options = {
  include_deleted: false,
  sort: "created_at",
};

apiInstance.arcListProviderConnections(options)
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
**include_deleted** | **Boolean** | Include deleted provider connections in the results. Deleted connections have a `deleted_at` value. | [optional] [defaults to false]
**sort** | **String** | Sort field. Prefix with `-` for descending order (e.g., `sort&#x3D;-name`).  | [optional] [one of: "created_at", "-created_at", "updated_at", "-updated_at", "name", "-name"]

### Return type

[**ArcProviderConnectionsResponse**](ArcProviderConnectionsResponse.md)


## `arcUpdateProviderConnection`

```javascript
arcUpdateProviderConnection({ id, arc_update_provider_connection_request })
```

Update the attributes of a provider connection. Only the fields you include are changed. Which fields you can set depends on the connection's existing `auth_type`: `base_url` and `api_key` apply only to `api-key` connections, and `customer_role_arn` and `region` apply only to `aws-iam` connections. `auth_type` itself cannot be changed.

### Example

```javascript
const options = {
  id: pTfnUUBcU1yv8SoRJn5PZ2, // required
  arc_update_provider_connection_request: new Fastly.ArcUpdateProviderConnectionRequest(), // required
};

apiInstance.arcUpdateProviderConnection(options)
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
**id** | **String** | The ID of the provider connection. |
**arc_update_provider_connection_request** | [**ArcUpdateProviderConnectionRequest**](ArcUpdateProviderConnectionRequest.md) |  |

### Return type

[**ArcProviderConnectionResponse**](ArcProviderConnectionResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
