# Fastly.KvStoreItemApi

```javascript
const apiInstance = new Fastly.KvStoreItemApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**kvStoreDeleteItem**](KvStoreItemApi.md#kvStoreDeleteItem) | **DELETE** /resources/stores/kv/{store_id}/keys/{key} | Delete an item.
[**kvStoreGetItem**](KvStoreItemApi.md#kvStoreGetItem) | **GET** /resources/stores/kv/{store_id}/keys/{key} | Get an item.
[**kvStoreListItemKeys**](KvStoreItemApi.md#kvStoreListItemKeys) | **GET** /resources/stores/kv/{store_id}/keys | List item keys.
[**kvStoreUpsertItem**](KvStoreItemApi.md#kvStoreUpsertItem) | **PUT** /resources/stores/kv/{store_id}/keys/{key} | Insert or update an item.


## `kvStoreDeleteItem`

```javascript
kvStoreDeleteItem({ store_id, key, [if_generation_match, ][force] })
```

Delete an item.

### Example

```javascript
const options = {
  store_id: "store_id_example", // required
  key: "key_example", // required
  if_generation_match: 56,
  force: false,
};

apiInstance.kvStoreDeleteItem(options)
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
**key** | **String** |  |
**if_generation_match** | **Number** |  | [optional]
**force** | **Boolean** |  | [optional] [defaults to false]

### Return type

null (empty response body)


## `kvStoreGetItem`

```javascript
kvStoreGetItem({ store_id, key })
```

Get an item, including its value, metadata (if any), and generation marker.

### Example

```javascript
const options = {
  store_id: "store_id_example", // required
  key: "key_example", // required
};

apiInstance.kvStoreGetItem(options)
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
**key** | **String** |  |

### Return type

**Blob**


## `kvStoreListItemKeys`

```javascript
kvStoreListItemKeys({ store_id, [cursor, ][limit, ][prefix, ][consistency] })
```

Lists the matching item keys (or all item keys, if no prefix is supplied).

### Example

```javascript
const options = {
  store_id: "store_id_example", // required
  cursor: "cursor_example",
  limit: 100,
  prefix: "prefix_example",
  consistency: "strong",
};

apiInstance.kvStoreListItemKeys(options)
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
**cursor** | **String** |  | [optional]
**limit** | **Number** |  | [optional] [defaults to 100]
**prefix** | **String** |  | [optional]
**consistency** | **String** |  | [optional] [one of: "strong", "eventual"]

### Return type

[**InlineResponse20011**](InlineResponse20011.md)


## `kvStoreUpsertItem`

```javascript
kvStoreUpsertItem({ store_id, key, [if_generation_match, ][time_to_live_sec, ][metadata, ][add, ][append, ][prepend, ][background_fetch, ][body] })
```

Inserts or updates an item's value and metadata.

### Example

```javascript
const options = {
  store_id: "store_id_example", // required
  key: "key_example", // required
  if_generation_match: 56,
  time_to_live_sec: 56,
  metadata: "metadata_example",
  add: false,
  append: false,
  prepend: false,
  background_fetch: false,
  body: null,
};

apiInstance.kvStoreUpsertItem(options)
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
**key** | **String** |  |
**if_generation_match** | **Number** |  | [optional]
**time_to_live_sec** | **Number** |  | [optional]
**metadata** | **String** |  | [optional]
**add** | **Boolean** |  | [optional] [defaults to false]
**append** | **Boolean** |  | [optional] [defaults to false]
**prepend** | **Boolean** |  | [optional] [defaults to false]
**background_fetch** | **Boolean** |  | [optional] [defaults to false]
**body** | **Blob** |  | [optional]

### Return type

null (empty response body)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
