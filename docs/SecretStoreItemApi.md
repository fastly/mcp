# Fastly.SecretStoreItemApi

```javascript
const apiInstance = new Fastly.SecretStoreItemApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createSecret**](SecretStoreItemApi.md#createSecret) | **POST** /resources/stores/secret/{store_id}/secrets | Create a new secret in a store.
[**deleteSecret**](SecretStoreItemApi.md#deleteSecret) | **DELETE** /resources/stores/secret/{store_id}/secrets/{secret_name} | Delete a secret from a store.
[**getSecret**](SecretStoreItemApi.md#getSecret) | **GET** /resources/stores/secret/{store_id}/secrets/{secret_name} | Get secret metadata.
[**getSecrets**](SecretStoreItemApi.md#getSecrets) | **GET** /resources/stores/secret/{store_id}/secrets | List secrets within a store.
[**mustRecreateSecret**](SecretStoreItemApi.md#mustRecreateSecret) | **PATCH** /resources/stores/secret/{store_id}/secrets | Recreate a secret in a store.
[**recreateSecret**](SecretStoreItemApi.md#recreateSecret) | **PUT** /resources/stores/secret/{store_id}/secrets | Create or recreate a secret in a store.


## `createSecret`

```javascript
createSecret({ store_id, [secret] })
```

Create a new secret in a store. Returns an error if a secret already exists with the same name. See `PUT` and `PATCH` methods for ways to recreate an existing secret.  The `secret` field must be Base64-encoded because a secret can contain binary data. In the example below, the unencoded secret is \"Hello, world!\" 

### Example

```javascript
const options = {
  store_id: "store_id_example", // required
  secret: new Fastly.Secret(),
};

apiInstance.createSecret(options)
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
**store_id** | **String** |  |
**secret** | [**Secret**](Secret.md) |  | [optional]

### Return type

[**SecretResponse**](SecretResponse.md)


## `deleteSecret`

```javascript
deleteSecret({ store_id, secret_name })
```

Delete a secret from a store by name.

### Example

```javascript
const options = {
  store_id: "store_id_example", // required
  secret_name: "secret_name_example", // required
};

apiInstance.deleteSecret(options)
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
**store_id** | **String** |  |
**secret_name** | **String** |  |

### Return type

null (empty response body)


## `getSecret`

```javascript
getSecret({ store_id, secret_name })
```

Get metadata about a secret by name.

### Example

```javascript
const options = {
  store_id: "store_id_example", // required
  secret_name: "secret_name_example", // required
};

apiInstance.getSecret(options)
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
**store_id** | **String** |  |
**secret_name** | **String** |  |

### Return type

[**SecretResponse**](SecretResponse.md)


## `getSecrets`

```javascript
getSecrets({ store_id, [cursor, ][limit] })
```

List all secrets within a store.

### Example

```javascript
const options = {
  store_id: "store_id_example", // required
  cursor: "cursor_example",
  limit: "'100'",
};

apiInstance.getSecrets(options)
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
**store_id** | **String** |  |
**cursor** | **String** | Cursor value from the `next_cursor` field of a previous response, used to retrieve the next page. To request the first page, this should be empty. | [optional]
**limit** | **String** | Number of results per page. The maximum is 200. | [optional] [defaults to '100']

### Return type

[**InlineResponse20013**](InlineResponse20013.md)


## `mustRecreateSecret`

```javascript
mustRecreateSecret({ store_id, [secret] })
```

Recreate a secret based on the secret's name. Returns an error if there is no existing secret with the same name.  The `secret` field must be Base64-encoded because a secret can contain binary data. In the example below, the unencoded secret is \"Hello, world!\" 

### Example

```javascript
const options = {
  store_id: "store_id_example", // required
  secret: new Fastly.Secret(),
};

apiInstance.mustRecreateSecret(options)
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
**store_id** | **String** |  |
**secret** | [**Secret**](Secret.md) |  | [optional]

### Return type

[**SecretResponse**](SecretResponse.md)


## `recreateSecret`

```javascript
recreateSecret({ store_id, [secret] })
```

Create or recreate a secret based on the secret's name. The response object's `recreated` field will be true if the secret was recreated.  The `secret` field must be Base64-encoded because a secret can contain binary data. In the example below, the unencoded secret is \"Hello, world!\" 

### Example

```javascript
const options = {
  store_id: "store_id_example", // required
  secret: new Fastly.Secret(),
};

apiInstance.recreateSecret(options)
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
**store_id** | **String** |  |
**secret** | [**Secret**](Secret.md) |  | [optional]

### Return type

[**SecretResponse**](SecretResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
