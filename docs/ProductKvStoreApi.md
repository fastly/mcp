# Fastly.ProductKvStoreApi

```javascript
const apiInstance = new Fastly.ProductKvStoreApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**disableProductKvStore**](ProductKvStoreApi.md#disableProductKvStore) | **DELETE** /enabled-products/v1/kv_store | Disable product
[**enableKvStore**](ProductKvStoreApi.md#enableKvStore) | **PUT** /enabled-products/v1/kv_store | Enable product
[**getKvStore**](ProductKvStoreApi.md#getKvStore) | **GET** /enabled-products/v1/kv_store | Get product enablement status


## `disableProductKvStore`

```javascript
disableProductKvStore()
```

Disable the KV Store product

### Example

```javascript
apiInstance.disableProductKvStore()
  .then(() => {
    console.log('API called successfully.');
  })
  .catch((error) => {
    console.error(error);
  });
```

### Options

This endpoint does not need any parameters.

### Return type

null (empty response body)


## `enableKvStore`

```javascript
enableKvStore()
```

Enable the KV Store product

### Example

```javascript
apiInstance.enableKvStore()
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

[**KvStoreResponseBodyEnable**](KvStoreResponseBodyEnable.md)


## `getKvStore`

```javascript
getKvStore()
```

Get the enablement status of the KV Store product

### Example

```javascript
apiInstance.getKvStore()
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

[**KvStoreResponseBodyEnable**](KvStoreResponseBodyEnable.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
