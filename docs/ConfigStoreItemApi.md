# Fastly.ConfigStoreItemApi

```javascript
const apiInstance = new Fastly.ConfigStoreItemApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**bulkUpdateConfigStoreItem**](ConfigStoreItemApi.md#bulkUpdateConfigStoreItem) | **PATCH** /resources/stores/config/{config_store_id}/items | Update multiple entries in a config store
[**createConfigStoreItem**](ConfigStoreItemApi.md#createConfigStoreItem) | **POST** /resources/stores/config/{config_store_id}/item | Create an entry in a config store
[**deleteConfigStoreItem**](ConfigStoreItemApi.md#deleteConfigStoreItem) | **DELETE** /resources/stores/config/{config_store_id}/item/{config_store_item_key} | Delete an item from a config store
[**getConfigStoreItem**](ConfigStoreItemApi.md#getConfigStoreItem) | **GET** /resources/stores/config/{config_store_id}/item/{config_store_item_key} | Get an item from a config store
[**listConfigStoreItems**](ConfigStoreItemApi.md#listConfigStoreItems) | **GET** /resources/stores/config/{config_store_id}/items | List items in a config store
[**updateConfigStoreItem**](ConfigStoreItemApi.md#updateConfigStoreItem) | **PATCH** /resources/stores/config/{config_store_id}/item/{config_store_item_key} | Update an entry in a config store
[**upsertConfigStoreItem**](ConfigStoreItemApi.md#upsertConfigStoreItem) | **PUT** /resources/stores/config/{config_store_id}/item/{config_store_item_key} | Insert or update an entry in a config store


## `bulkUpdateConfigStoreItem`

```javascript
bulkUpdateConfigStoreItem({ config_store_id, [bulk_update_config_store_list_request] })
```

Add multiple key-value pairs to an individual config store, specified by ID.

### Example

```javascript
const options = {
  config_store_id: "config_store_id_example", // required
  bulk_update_config_store_list_request: {"items":[{"op":"create","item_key":"test-key","item_value":"new-value"},{"op":"update","item_key":"test-key-2","item_value":"new-value-2"},{"op":"upsert","item_key":"test-key-3","item_value":"new-value-3"},{"op":"delete","item_key":"test-key-4"}]},
};

apiInstance.bulkUpdateConfigStoreItem(options)
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
**bulk_update_config_store_list_request** | [**BulkUpdateConfigStoreListRequest**](BulkUpdateConfigStoreListRequest.md) |  | [optional]

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `createConfigStoreItem`

```javascript
createConfigStoreItem({ config_store_id, [item_key, ][item_value] })
```

Add a single key-value pair to an individual config store, specified by ID.

### Example

```javascript
const options = {
  config_store_id: "config_store_id_example", // required
  item_key: "item_key_example",
  item_value: "item_value_example",
};

apiInstance.createConfigStoreItem(options)
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
**item_key** | **String** | Item key, maximum 256 characters. | [optional]
**item_value** | **String** | Item value, maximum 8000 characters. | [optional]

### Return type

[**ConfigStoreItemResponse**](ConfigStoreItemResponse.md)


## `deleteConfigStoreItem`

```javascript
deleteConfigStoreItem({ config_store_id, config_store_item_key })
```

Delete an entry in a config store given a config store ID, and item key.

### Example

```javascript
const options = {
  config_store_id: "config_store_id_example", // required
  config_store_item_key: "config_store_item_key_example", // required
};

apiInstance.deleteConfigStoreItem(options)
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
**config_store_item_key** | **String** | Item key, maximum 256 characters. |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `getConfigStoreItem`

```javascript
getConfigStoreItem({ config_store_id, config_store_item_key })
```

Retrieve a config store entry given a config store ID and item key.

### Example

```javascript
const options = {
  config_store_id: "config_store_id_example", // required
  config_store_item_key: "config_store_item_key_example", // required
};

apiInstance.getConfigStoreItem(options)
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
**config_store_item_key** | **String** | Item key, maximum 256 characters. |

### Return type

[**ConfigStoreItemResponse**](ConfigStoreItemResponse.md)


## `listConfigStoreItems`

```javascript
listConfigStoreItems({ config_store_id })
```

List the key-value pairs associated with a given config store ID.

### Example

```javascript
const options = {
  config_store_id: "config_store_id_example", // required
};

apiInstance.listConfigStoreItems(options)
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

[**[ConfigStoreItemResponse]**](ConfigStoreItemResponse.md)


## `updateConfigStoreItem`

```javascript
updateConfigStoreItem({ config_store_id, config_store_item_key, [item_key, ][item_value] })
```

Update an entry in a config store given a config store ID, item key, and item value.

### Example

```javascript
const options = {
  config_store_id: "config_store_id_example", // required
  config_store_item_key: "config_store_item_key_example", // required
  item_key: "item_key_example",
  item_value: "item_value_example",
};

apiInstance.updateConfigStoreItem(options)
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
**config_store_item_key** | **String** | Item key, maximum 256 characters. |
**item_key** | **String** | Item key, maximum 256 characters. | [optional]
**item_value** | **String** | Item value, maximum 8000 characters. | [optional]

### Return type

[**ConfigStoreItemResponse**](ConfigStoreItemResponse.md)


## `upsertConfigStoreItem`

```javascript
upsertConfigStoreItem({ config_store_id, config_store_item_key, [item_key, ][item_value] })
```

Insert or update an entry in a config store given a config store ID, item key, and item value.

### Example

```javascript
const options = {
  config_store_id: "config_store_id_example", // required
  config_store_item_key: "config_store_item_key_example", // required
  item_key: "item_key_example",
  item_value: "item_value_example",
};

apiInstance.upsertConfigStoreItem(options)
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
**config_store_item_key** | **String** | Item key, maximum 256 characters. |
**item_key** | **String** | Item key, maximum 256 characters. | [optional]
**item_value** | **String** | Item value, maximum 8000 characters. | [optional]

### Return type

[**ConfigStoreItemResponse**](ConfigStoreItemResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
