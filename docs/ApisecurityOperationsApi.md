# Fastly.ApisecurityOperationsApi

```javascript
const apiInstance = new Fastly.ApisecurityOperationsApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**apiSecurityBulkAddTagsToOperations**](ApisecurityOperationsApi.md#apiSecurityBulkAddTagsToOperations) | **POST** /api-security/v1/services/{service_id}/operations-bulk-tags | Bulk add tags to operations
[**apiSecurityBulkCreateOperations**](ApisecurityOperationsApi.md#apiSecurityBulkCreateOperations) | **POST** /api-security/v1/services/{service_id}/operations-bulk | Bulk create operations
[**apiSecurityBulkDeleteOperations**](ApisecurityOperationsApi.md#apiSecurityBulkDeleteOperations) | **DELETE** /api-security/v1/services/{service_id}/operations-bulk | Bulk delete operations
[**apiSecurityCreateOperation**](ApisecurityOperationsApi.md#apiSecurityCreateOperation) | **POST** /api-security/v1/services/{service_id}/operations | Create operation
[**apiSecurityCreateOperationTag**](ApisecurityOperationsApi.md#apiSecurityCreateOperationTag) | **POST** /api-security/v1/services/{service_id}/tags | Create operation tag
[**apiSecurityDeleteOperation**](ApisecurityOperationsApi.md#apiSecurityDeleteOperation) | **DELETE** /api-security/v1/services/{service_id}/operations/{operation_id} | Delete operation
[**apiSecurityDeleteOperationTag**](ApisecurityOperationsApi.md#apiSecurityDeleteOperationTag) | **DELETE** /api-security/v1/services/{service_id}/tags/{tag_id} | Delete operation tag
[**apiSecurityGetOperation**](ApisecurityOperationsApi.md#apiSecurityGetOperation) | **GET** /api-security/v1/services/{service_id}/operations/{operation_id} | Retrieve operation
[**apiSecurityGetOperationTag**](ApisecurityOperationsApi.md#apiSecurityGetOperationTag) | **GET** /api-security/v1/services/{service_id}/tags/{tag_id} | Retrieve operation tag
[**apiSecurityListDiscoveredOperations**](ApisecurityOperationsApi.md#apiSecurityListDiscoveredOperations) | **GET** /api-security/v1/services/{service_id}/discovered-operations | List discovered operations
[**apiSecurityListOperationTags**](ApisecurityOperationsApi.md#apiSecurityListOperationTags) | **GET** /api-security/v1/services/{service_id}/tags | List operation tags
[**apiSecurityListOperations**](ApisecurityOperationsApi.md#apiSecurityListOperations) | **GET** /api-security/v1/services/{service_id}/operations | List operations
[**apiSecurityUpdateOperation**](ApisecurityOperationsApi.md#apiSecurityUpdateOperation) | **PATCH** /api-security/v1/services/{service_id}/operations/{operation_id} | Update operation
[**apiSecurityUpdateOperationTag**](ApisecurityOperationsApi.md#apiSecurityUpdateOperationTag) | **PATCH** /api-security/v1/services/{service_id}/tags/{tag_id} | Update operation tag


## `apiSecurityBulkAddTagsToOperations`

```javascript
apiSecurityBulkAddTagsToOperations({ service_id, [operation_bulk_add_tags] })
```

Add tags to multiple operations in a single request.

### Example

```javascript
const options = {
  service_id: 3NeCFuZNP1v0iyJ2vmYQI6, // required
  operation_bulk_add_tags: new Fastly.OperationBulkAddTags(),
};

apiInstance.apiSecurityBulkAddTagsToOperations(options)
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
**service_id** | **String** | The unique identifier of the service. |
**operation_bulk_add_tags** | [**OperationBulkAddTags**](OperationBulkAddTags.md) |  | [optional]

### Return type

[**InlineResponse2071**](InlineResponse2071.md)


## `apiSecurityBulkCreateOperations`

```javascript
apiSecurityBulkCreateOperations({ service_id, [operation_bulk_create] })
```

Create multiple operations associated with a specific service in a single request.

### Example

```javascript
const options = {
  service_id: 3NeCFuZNP1v0iyJ2vmYQI6, // required
  operation_bulk_create: new Fastly.OperationBulkCreate(),
};

apiInstance.apiSecurityBulkCreateOperations(options)
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
**service_id** | **String** | The unique identifier of the service. |
**operation_bulk_create** | [**OperationBulkCreate**](OperationBulkCreate.md) |  | [optional]

### Return type

[**InlineResponse207**](InlineResponse207.md)


## `apiSecurityBulkDeleteOperations`

```javascript
apiSecurityBulkDeleteOperations({ service_id, [operation_bulk_delete] })
```

Delete multiple operations in a single request.

### Example

```javascript
const options = {
  service_id: 3NeCFuZNP1v0iyJ2vmYQI6, // required
  operation_bulk_delete: new Fastly.OperationBulkDelete(),
};

apiInstance.apiSecurityBulkDeleteOperations(options)
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
**service_id** | **String** | The unique identifier of the service. |
**operation_bulk_delete** | [**OperationBulkDelete**](OperationBulkDelete.md) |  | [optional]

### Return type

[**InlineResponse2071**](InlineResponse2071.md)


## `apiSecurityCreateOperation`

```javascript
apiSecurityCreateOperation({ service_id, [operation_create] })
```

Create a new operation associated with a specific service.

### Example

```javascript
const options = {
  service_id: 3NeCFuZNP1v0iyJ2vmYQI6, // required
  operation_create: new Fastly.OperationCreate(),
};

apiInstance.apiSecurityCreateOperation(options)
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
**service_id** | **String** | The unique identifier of the service. |
**operation_create** | [**OperationCreate**](OperationCreate.md) |  | [optional]

### Return type

[**OperationGet**](OperationGet.md)


## `apiSecurityCreateOperationTag`

```javascript
apiSecurityCreateOperationTag({ service_id, [tag_create] })
```

Create a new operation tag associated with a specific service.

### Example

```javascript
const options = {
  service_id: 3NeCFuZNP1v0iyJ2vmYQI6, // required
  tag_create: new Fastly.TagCreate(),
};

apiInstance.apiSecurityCreateOperationTag(options)
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
**service_id** | **String** | The unique identifier of the service. |
**tag_create** | [**TagCreate**](TagCreate.md) |  | [optional]

### Return type

[**TagGet**](TagGet.md)


## `apiSecurityDeleteOperation`

```javascript
apiSecurityDeleteOperation({ service_id, operation_id })
```

Delete an existing operation associated with a specific service.

### Example

```javascript
const options = {
  service_id: 3NeCFuZNP1v0iyJ2vmYQI6, // required
  operation_id: op_abc123def456, // required
};

apiInstance.apiSecurityDeleteOperation(options)
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
**service_id** | **String** | The unique identifier of the service. |
**operation_id** | **String** | The unique identifier of the operation. |

### Return type

null (empty response body)


## `apiSecurityDeleteOperationTag`

```javascript
apiSecurityDeleteOperationTag({ service_id, tag_id })
```

Delete an existing operation tag.

### Example

```javascript
const options = {
  service_id: 3NeCFuZNP1v0iyJ2vmYQI6, // required
  tag_id: tag_abc123def456, // required
};

apiInstance.apiSecurityDeleteOperationTag(options)
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
**service_id** | **String** | The unique identifier of the service. |
**tag_id** | **String** | The unique identifier of the operation tag. |

### Return type

null (empty response body)


## `apiSecurityGetOperation`

```javascript
apiSecurityGetOperation({ service_id, operation_id })
```

Get a specific operation associated with a service.

### Example

```javascript
const options = {
  service_id: 3NeCFuZNP1v0iyJ2vmYQI6, // required
  operation_id: op_abc123def456, // required
};

apiInstance.apiSecurityGetOperation(options)
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
**service_id** | **String** | The unique identifier of the service. |
**operation_id** | **String** | The unique identifier of the operation. |

### Return type

[**OperationGet**](OperationGet.md)


## `apiSecurityGetOperationTag`

```javascript
apiSecurityGetOperationTag({ service_id, tag_id })
```

Get a specific operation tag by its unique identifier.

### Example

```javascript
const options = {
  service_id: 3NeCFuZNP1v0iyJ2vmYQI6, // required
  tag_id: tag_abc123def456, // required
};

apiInstance.apiSecurityGetOperationTag(options)
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
**service_id** | **String** | The unique identifier of the service. |
**tag_id** | **String** | The unique identifier of the operation tag. |

### Return type

[**TagGet**](TagGet.md)


## `apiSecurityListDiscoveredOperations`

```javascript
apiSecurityListDiscoveredOperations({ service_id, [method, ][domain, ][path, ][limit, ][page] })
```

List all discovered operations associated with a specific service. Optionally filter operations by status.

### Example

```javascript
const options = {
  service_id: 3NeCFuZNP1v0iyJ2vmYQI6, // required
  method: "GET",
  domain: ["example.com","api.example.com"],
  path: /api/v1/users,
  limit: 100,
  page: 1,
};

apiInstance.apiSecurityListDiscoveredOperations(options)
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
**service_id** | **String** | The unique identifier of the service. |
**method** | [**[String]**](String.md) | Filter operations by HTTP method. | [optional] [one of: "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS", "CONNECT", "TRACE"]
**domain** | [**[String]**](String.md) | Filter operations by fully-qualified domain name (exact match). | [optional]
**path** | **String** | Filter operations by path (exact match). | [optional]
**limit** | **Number** | The maximum number of operations to return per page. | [optional] [defaults to 100]
**page** | **Number** | The page number to return. | [optional] [defaults to 0]

### Return type

[**InlineResponse2001**](InlineResponse2001.md)


## `apiSecurityListOperationTags`

```javascript
apiSecurityListOperationTags({ service_id, [limit, ][page] })
```

List all operation tags associated with a specific service.

### Example

```javascript
const options = {
  service_id: 3NeCFuZNP1v0iyJ2vmYQI6, // required
  limit: 100,
  page: 1,
};

apiInstance.apiSecurityListOperationTags(options)
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
**service_id** | **String** | The unique identifier of the service. |
**limit** | **Number** | The maximum number of operations to return per page. | [optional] [defaults to 100]
**page** | **Number** | The page number to return. | [optional] [defaults to 0]

### Return type

[**InlineResponse2003**](InlineResponse2003.md)


## `apiSecurityListOperations`

```javascript
apiSecurityListOperations({ service_id, [tag_id, ][status, ][method, ][domain, ][path, ][limit, ][page] })
```

List all operations associated with a specific service. Optionally filter operations by tag ID.

### Example

```javascript
const options = {
  service_id: 3NeCFuZNP1v0iyJ2vmYQI6, // required
  tag_id: tag_abc123def456,
  status: "SAVED",
  method: "GET",
  domain: ["example.com","api.example.com"],
  path: /api/v1/users,
  limit: 100,
  page: 1,
};

apiInstance.apiSecurityListOperations(options)
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
**service_id** | **String** | The unique identifier of the service. |
**tag_id** | **String** | Filter operations by operation tag ID. Only operations associated with this operation tag will be returned. | [optional]
**status** | **String** | Filter operations by status. Defaults to SAVED if omitted. | [optional] [one of: "SAVED", "IGNORED"]
**method** | [**[String]**](String.md) | Filter operations by HTTP method. | [optional] [one of: "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS", "CONNECT", "TRACE"]
**domain** | [**[String]**](String.md) | Filter operations by fully-qualified domain name (exact match). | [optional]
**path** | **String** | Filter operations by path (exact match). | [optional]
**limit** | **Number** | The maximum number of operations to return per page. | [optional] [defaults to 100]
**page** | **Number** | The page number to return. | [optional] [defaults to 0]

### Return type

[**InlineResponse2002**](InlineResponse2002.md)


## `apiSecurityUpdateOperation`

```javascript
apiSecurityUpdateOperation({ service_id, operation_id, [operation_update] })
```

Partially update an existing operation associated with a specific service.

### Example

```javascript
const options = {
  service_id: 3NeCFuZNP1v0iyJ2vmYQI6, // required
  operation_id: op_abc123def456, // required
  operation_update: new Fastly.OperationUpdate(),
};

apiInstance.apiSecurityUpdateOperation(options)
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
**service_id** | **String** | The unique identifier of the service. |
**operation_id** | **String** | The unique identifier of the operation. |
**operation_update** | [**OperationUpdate**](OperationUpdate.md) |  | [optional]

### Return type

[**OperationGet**](OperationGet.md)


## `apiSecurityUpdateOperationTag`

```javascript
apiSecurityUpdateOperationTag({ service_id, tag_id, [body] })
```

Partially update an existing operation tag.

### Example

```javascript
const options = {
  service_id: 3NeCFuZNP1v0iyJ2vmYQI6, // required
  tag_id: tag_abc123def456, // required
  body: new Fastly.TagBase(),
};

apiInstance.apiSecurityUpdateOperationTag(options)
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
**service_id** | **String** | The unique identifier of the service. |
**tag_id** | **String** | The unique identifier of the operation tag. |
**body** | **TagBase** |  | [optional]

### Return type

[**TagGet**](TagGet.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
