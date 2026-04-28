# Fastly.SecretStoreApi

```javascript
const apiInstance = new Fastly.SecretStoreApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**clientKey**](SecretStoreApi.md#clientKey) | **POST** /resources/stores/secret/client-key | Create new client key
[**createSecretStore**](SecretStoreApi.md#createSecretStore) | **POST** /resources/stores/secret | Create new secret store
[**deleteSecretStore**](SecretStoreApi.md#deleteSecretStore) | **DELETE** /resources/stores/secret/{store_id} | Delete secret store
[**getSecretStore**](SecretStoreApi.md#getSecretStore) | **GET** /resources/stores/secret/{store_id} | Get secret store by ID
[**getSecretStores**](SecretStoreApi.md#getSecretStores) | **GET** /resources/stores/secret | Get all secret stores
[**signingKey**](SecretStoreApi.md#signingKey) | **GET** /resources/stores/secret/signing-key | Get public key


## `clientKey`

```javascript
clientKey()
```

Create a new client key for encrypting secrets locally before uploading.

### Example

```javascript
apiInstance.clientKey()
  .then((data) => {
    console.log(data, "API called successfully.");
  })
  .catch((error) => {
    console.error(error);
  });
```

### Options

This endpoint does not need any parameters.

### Return type

[**ClientKey**](ClientKey.md)


## `createSecretStore`

```javascript
createSecretStore({ , [secret_store] })
```

Create a new secret store.

### Example

```javascript
const options = {
  secret_store: new Fastly.SecretStore(),
};

apiInstance.createSecretStore(options)
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
**secret_store** | [**SecretStore**](SecretStore.md) |  | [optional]

### Return type

[**SecretStoreResponse**](SecretStoreResponse.md)


## `deleteSecretStore`

```javascript
deleteSecretStore({ store_id })
```

Delete a secret store and all of its contents.

### Example

```javascript
const options = {
  store_id: "store_id_example", // required
};

apiInstance.deleteSecretStore(options)
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

### Return type

null (empty response body)


## `getSecretStore`

```javascript
getSecretStore({ store_id })
```

Get a secret store by ID.

### Example

```javascript
const options = {
  store_id: "store_id_example", // required
};

apiInstance.getSecretStore(options)
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

### Return type

[**SecretStoreResponse**](SecretStoreResponse.md)


## `getSecretStores`

```javascript
getSecretStores({ , [cursor, ][limit, ][name] })
```

Get all secret stores.

### Example

```javascript
const options = {
  cursor: "cursor_example",
  limit: "'100'",
  name: "name_example",
};

apiInstance.getSecretStores(options)
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
**cursor** | **String** | Cursor value from the `next_cursor` field of a previous response, used to retrieve the next page. To request the first page, this should be empty. | [optional]
**limit** | **String** | Number of results per page. The maximum is 200. | [optional] [defaults to '100']
**name** | **String** | Returns a one-element array containing the details for the named secret store. | [optional]

### Return type

[**InlineResponse20012**](InlineResponse20012.md)


## `signingKey`

```javascript
signingKey()
```

Get the public key used for signing client keys.

### Example

```javascript
apiInstance.signingKey()
  .then((data) => {
    console.log(data, "API called successfully.");
  })
  .catch((error) => {
    console.error(error);
  });
```

### Options

This endpoint does not need any parameters.

### Return type

[**SigningKey**](SigningKey.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
