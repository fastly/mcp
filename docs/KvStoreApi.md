# Fastly.KvStoreApi

```javascript
const apiInstance = new Fastly.KvStoreApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**kvStoreCreate**](KvStoreApi.md#kvStoreCreate) | **POST** /resources/stores/kv | Create a KV store.
[**kvStoreDelete**](KvStoreApi.md#kvStoreDelete) | **DELETE** /resources/stores/kv/{store_id} | Delete a KV store.
[**kvStoreGet**](KvStoreApi.md#kvStoreGet) | **GET** /resources/stores/kv/{store_id} | Describe a KV store.
[**kvStoreList**](KvStoreApi.md#kvStoreList) | **GET** /resources/stores/kv | List all KV stores.
[**kvStorePut**](KvStoreApi.md#kvStorePut) | **PUT** /resources/stores/kv/{store_id} | Update a KV store.


## `kvStoreCreate`

```javascript
kvStoreCreate({ , [location, ][kv_store_request_create_or_update] })
```

Create a KV store.

### Example

```javascript
const options = {
  location: "US",
  kv_store_request_create_or_update: {"name":"my-store"},
};

apiInstance.kvStoreCreate(options)
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
**location** | **String** |  | [optional] [one of: "US", "EU", "ASIA", "AUS"]
**kv_store_request_create_or_update** | [**KvStoreRequestCreateOrUpdate**](KvStoreRequestCreateOrUpdate.md) |  | [optional]

### Return type

[**KvStoreDetails**](KvStoreDetails.md)


## `kvStoreDelete`

```javascript
kvStoreDelete({ store_id })
```

A KV store must be empty before it can be deleted. Attempting to delete a KV store that contains items will result in a response with a `409` status code.

### Example

```javascript
const options = {
  store_id: "store_id_example", // required
};

apiInstance.kvStoreDelete(options)
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


## `kvStoreGet`

```javascript
kvStoreGet({ store_id })
```

Get details of a KV store.

### Example

```javascript
const options = {
  store_id: "store_id_example", // required
};

apiInstance.kvStoreGet(options)
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

[**KvStoreDetails**](KvStoreDetails.md)


## `kvStoreList`

```javascript
kvStoreList({ , [cursor, ][limit, ][name] })
```

List all KV stores.

### Example

```javascript
const options = {
  cursor: "cursor_example",
  limit: 1000,
  name: "name_example",
};

apiInstance.kvStoreList(options)
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
**cursor** | **String** |  | [optional]
**limit** | **Number** |  | [optional] [defaults to 1000]
**name** | **String** | Returns a one-element array containing the details for the named KV store. | [optional]

### Return type

[**InlineResponse20010**](InlineResponse20010.md)


## `kvStorePut`

```javascript
kvStorePut({ store_id, [kv_store_request_create_or_update] })
```

Update the name of a KV store.

### Example

```javascript
const options = {
  store_id: "store_id_example", // required
  kv_store_request_create_or_update: {"name":"my-renamed-store"},
};

apiInstance.kvStorePut(options)
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
**kv_store_request_create_or_update** | [**KvStoreRequestCreateOrUpdate**](KvStoreRequestCreateOrUpdate.md) |  | [optional]

### Return type

null (empty response body)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
