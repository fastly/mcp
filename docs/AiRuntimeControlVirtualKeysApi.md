# Fastly.AiRuntimeControlVirtualKeysApi

```javascript
const apiInstance = new Fastly.AiRuntimeControlVirtualKeysApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**arcCreateVirtualKey**](AiRuntimeControlVirtualKeysApi.md#arcCreateVirtualKey) | **POST** /ai-runtime-control/v1/keys | Create a virtual key
[**arcDeleteVirtualKey**](AiRuntimeControlVirtualKeysApi.md#arcDeleteVirtualKey) | **DELETE** /ai-runtime-control/v1/keys/{key_id} | Delete a virtual key
[**arcGetVirtualKey**](AiRuntimeControlVirtualKeysApi.md#arcGetVirtualKey) | **GET** /ai-runtime-control/v1/keys/{key_id} | Get a virtual key
[**arcGetVirtualKeyFailover**](AiRuntimeControlVirtualKeysApi.md#arcGetVirtualKeyFailover) | **GET** /ai-runtime-control/v1/keys/{key_id}/failover | Get a virtual key&#39;s failover policy
[**arcListVirtualKeys**](AiRuntimeControlVirtualKeysApi.md#arcListVirtualKeys) | **GET** /ai-runtime-control/v1/keys | List virtual keys
[**arcRotateVirtualKey**](AiRuntimeControlVirtualKeysApi.md#arcRotateVirtualKey) | **POST** /ai-runtime-control/v1/keys/{key_id}/rotate | Rotate a virtual key
[**arcUpdateVirtualKey**](AiRuntimeControlVirtualKeysApi.md#arcUpdateVirtualKey) | **PATCH** /ai-runtime-control/v1/keys/{key_id} | Update a virtual key
[**arcUpdateVirtualKeyFailover**](AiRuntimeControlVirtualKeysApi.md#arcUpdateVirtualKeyFailover) | **PUT** /ai-runtime-control/v1/keys/{key_id}/failover | Update a virtual key&#39;s failover policy


## `arcCreateVirtualKey`

```javascript
arcCreateVirtualKey({ arc_virtual_key })
```

Create a new virtual key for authenticating requests through the AI Runtime Control gateway.

### Example

```javascript
const options = {
  arc_virtual_key: new Fastly.ArcVirtualKey(), // required
};

apiInstance.arcCreateVirtualKey(options)
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
**arc_virtual_key** | [**ArcVirtualKey**](ArcVirtualKey.md) |  |

### Return type

[**ArcCreateVirtualKeyResponse**](ArcCreateVirtualKeyResponse.md)


## `arcDeleteVirtualKey`

```javascript
arcDeleteVirtualKey({ key_id })
```

Delete a virtual key. This also deletes any security configuration associated with the key.

### Example

```javascript
const options = {
  key_id: 7fVVQb1nZaJgnzCn4B4v3B, // required
};

apiInstance.arcDeleteVirtualKey(options)
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
**key_id** | **String** | The ID of the virtual key. |

### Return type

null (empty response body)


## `arcGetVirtualKey`

```javascript
arcGetVirtualKey({ key_id })
```

Retrieve a single virtual key.

### Example

```javascript
const options = {
  key_id: 7fVVQb1nZaJgnzCn4B4v3B, // required
};

apiInstance.arcGetVirtualKey(options)
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
**key_id** | **String** | The ID of the virtual key. |

### Return type

[**ArcVirtualKeyResponse**](ArcVirtualKeyResponse.md)


## `arcGetVirtualKeyFailover`

```javascript
arcGetVirtualKeyFailover({ key_id })
```

Retrieve the failover policy for a virtual key. A failover policy lists alternate provider connections to retry a request against, and which error conditions trigger a retry.  Failover is a per-account feature. If it isn't enabled on your account, this endpoint returns a 404 response.

### Example

```javascript
const options = {
  key_id: 7fVVQb1nZaJgnzCn4B4v3B, // required
};

apiInstance.arcGetVirtualKeyFailover(options)
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
**key_id** | **String** | The ID of the virtual key. |

### Return type

[**ArcVirtualKeyFailoverResponse**](ArcVirtualKeyFailoverResponse.md)


## `arcListVirtualKeys`

```javascript
arcListVirtualKeys({ , [include_deleted, ][search, ][cursor, ][limit, ][sort] })
```

List the virtual keys belonging to your account.

### Example

```javascript
const options = {
  include_deleted: false,
  search: production,
  cursor: MTA6MA,
  limit: 10,
  sort: "created_at",
};

apiInstance.arcListVirtualKeys(options)
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
**include_deleted** | **Boolean** | Include deleted virtual keys in the results. | [optional] [defaults to false]
**search** | **String** | Filter results to virtual keys whose name contains this substring. | [optional]
**cursor** | **String** | Cursor for pagination. Use the `next_cursor` value from a previous response to request the next page of results, or the `prev_cursor` value to request the previous page.  | [optional]
**limit** | **Number** | Limit how many results are returned. | [optional] [defaults to 10]
**sort** | **String** | Sort field. Prefix with `-` for descending order (e.g., `sort&#x3D;-created_at`).  | [optional] [one of: "created_at", "-created_at", "updated_at", "-updated_at", "name", "-name", "expires_at", "-expires_at", "user_name", "-user_name", "last_used_at", "-last_used_at"]

### Return type

[**ArcVirtualKeysResponse**](ArcVirtualKeysResponse.md)


## `arcRotateVirtualKey`

```javascript
arcRotateVirtualKey({ key_id, [arc_rotate_virtual_key_request] })
```

Issue a new access token for a virtual key, invalidating the previous one.

### Example

```javascript
const options = {
  key_id: 7fVVQb1nZaJgnzCn4B4v3B, // required
  arc_rotate_virtual_key_request: new Fastly.ArcRotateVirtualKeyRequest(),
};

apiInstance.arcRotateVirtualKey(options)
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
**key_id** | **String** | The ID of the virtual key. |
**arc_rotate_virtual_key_request** | [**ArcRotateVirtualKeyRequest**](ArcRotateVirtualKeyRequest.md) |  | [optional]

### Return type

[**ArcRotateVirtualKeyResponse**](ArcRotateVirtualKeyResponse.md)


## `arcUpdateVirtualKey`

```javascript
arcUpdateVirtualKey({ key_id, arc_update_virtual_key_request })
```

Update the attributes of a virtual key. Only the fields you include are changed.

### Example

```javascript
const options = {
  key_id: 7fVVQb1nZaJgnzCn4B4v3B, // required
  arc_update_virtual_key_request: new Fastly.ArcUpdateVirtualKeyRequest(), // required
};

apiInstance.arcUpdateVirtualKey(options)
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
**key_id** | **String** | The ID of the virtual key. |
**arc_update_virtual_key_request** | [**ArcUpdateVirtualKeyRequest**](ArcUpdateVirtualKeyRequest.md) |  |

### Return type

[**ArcUpdateVirtualKeyResponse**](ArcUpdateVirtualKeyResponse.md)


## `arcUpdateVirtualKeyFailover`

```javascript
arcUpdateVirtualKeyFailover({ key_id, arc_virtual_key_failover_request })
```

Replace the failover policy for a virtual key.  Failover is a per-account feature. If it isn't enabled on your account, this endpoint returns a 404 response.

### Example

```javascript
const options = {
  key_id: 7fVVQb1nZaJgnzCn4B4v3B, // required
  arc_virtual_key_failover_request: new Fastly.ArcVirtualKeyFailoverRequest(), // required
};

apiInstance.arcUpdateVirtualKeyFailover(options)
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
**key_id** | **String** | The ID of the virtual key. |
**arc_virtual_key_failover_request** | [**ArcVirtualKeyFailoverRequest**](ArcVirtualKeyFailoverRequest.md) |  |

### Return type

[**ArcVirtualKeyFailoverResponse**](ArcVirtualKeyFailoverResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
