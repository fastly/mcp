# Fastly.ConfigStoreApi

```javascript
const apiInstance = new Fastly.ConfigStoreApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createConfigStore**](ConfigStoreApi.md#createConfigStore) | **POST** /resources/stores/config | Create a config store
[**deleteConfigStore**](ConfigStoreApi.md#deleteConfigStore) | **DELETE** /resources/stores/config/{config_store_id} | Delete a config store
[**getConfigStore**](ConfigStoreApi.md#getConfigStore) | **GET** /resources/stores/config/{config_store_id} | Describe a config store
[**getConfigStoreInfo**](ConfigStoreApi.md#getConfigStoreInfo) | **GET** /resources/stores/config/{config_store_id}/info | Get config store metadata
[**listConfigStoreServices**](ConfigStoreApi.md#listConfigStoreServices) | **GET** /resources/stores/config/{config_store_id}/services | List linked services
[**listConfigStores**](ConfigStoreApi.md#listConfigStores) | **GET** /resources/stores/config | List config stores
[**updateConfigStore**](ConfigStoreApi.md#updateConfigStore) | **PUT** /resources/stores/config/{config_store_id} | Update a config store


## `createConfigStore`

```javascript
createConfigStore({ , [name] })
```

Create a config store.

### Example

```javascript
const options = {
  name: "name_example",
};

apiInstance.createConfigStore(options)
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
**name** | **String** | The name of the config store. | [optional]

### Return type

[**ConfigStoreResponse**](ConfigStoreResponse.md)


## `deleteConfigStore`

```javascript
deleteConfigStore({ config_store_id })
```

Delete a config store.

### Example

```javascript
const options = {
  config_store_id: "config_store_id_example", // required
};

apiInstance.deleteConfigStore(options)
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
**config_store_id** | **String** | An alphanumeric string identifying the config store. |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `getConfigStore`

```javascript
getConfigStore({ config_store_id })
```

Describe a config store by its identifier.

### Example

```javascript
const options = {
  config_store_id: "config_store_id_example", // required
};

apiInstance.getConfigStore(options)
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
**config_store_id** | **String** | An alphanumeric string identifying the config store. |

### Return type

[**ConfigStoreResponse**](ConfigStoreResponse.md)


## `getConfigStoreInfo`

```javascript
getConfigStoreInfo({ config_store_id })
```

Retrieve metadata for a single config store.

### Example

```javascript
const options = {
  config_store_id: "config_store_id_example", // required
};

apiInstance.getConfigStoreInfo(options)
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
**config_store_id** | **String** | An alphanumeric string identifying the config store. |

### Return type

[**ConfigStoreInfoResponse**](ConfigStoreInfoResponse.md)


## `listConfigStoreServices`

```javascript
listConfigStoreServices({ config_store_id })
```

List services linked to a config store

### Example

```javascript
const options = {
  config_store_id: "config_store_id_example", // required
};

apiInstance.listConfigStoreServices(options)
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
**config_store_id** | **String** | An alphanumeric string identifying the config store. |

### Return type

**Object**


## `listConfigStores`

```javascript
listConfigStores({ , [name] })
```

List config stores.

### Example

```javascript
const options = {
  name: "name_example",
};

apiInstance.listConfigStores(options)
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
**name** | **String** | Returns a one-element array containing the details for the named config store. | [optional]

### Return type

[**[ConfigStoreResponse]**](ConfigStoreResponse.md)


## `updateConfigStore`

```javascript
updateConfigStore({ config_store_id, [name] })
```

Update a config store.

### Example

```javascript
const options = {
  config_store_id: "config_store_id_example", // required
  name: "name_example",
};

apiInstance.updateConfigStore(options)
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
**config_store_id** | **String** | An alphanumeric string identifying the config store. |
**name** | **String** | The name of the config store. | [optional]

### Return type

[**ConfigStoreResponse**](ConfigStoreResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
