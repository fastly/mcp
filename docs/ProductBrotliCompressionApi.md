# Fastly.ProductBrotliCompressionApi

```javascript
const apiInstance = new Fastly.ProductBrotliCompressionApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**disableProductBrotliCompression**](ProductBrotliCompressionApi.md#disableProductBrotliCompression) | **DELETE** /enabled-products/v1/brotli_compression/services/{service_id} | Disable product
[**enableProductBrotliCompression**](ProductBrotliCompressionApi.md#enableProductBrotliCompression) | **PUT** /enabled-products/v1/brotli_compression/services/{service_id} | Enable product
[**getProductBrotliCompression**](ProductBrotliCompressionApi.md#getProductBrotliCompression) | **GET** /enabled-products/v1/brotli_compression/services/{service_id} | Get product enablement status
[**getServicesProductBrotliCompression**](ProductBrotliCompressionApi.md#getServicesProductBrotliCompression) | **GET** /enabled-products/v1/brotli_compression/services | Get services with product enabled


## `disableProductBrotliCompression`

```javascript
disableProductBrotliCompression({ service_id })
```

Disable the Brotli Compression product on a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.disableProductBrotliCompression(options)
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
**service_id** | **String** | Alphanumeric string identifying the service. |

### Return type

null (empty response body)


## `enableProductBrotliCompression`

```javascript
enableProductBrotliCompression({ service_id })
```

Enable the Brotli Compression product on a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.enableProductBrotliCompression(options)
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
**service_id** | **String** | Alphanumeric string identifying the service. |

### Return type

[**BrotliCompressionResponseBodyEnable**](BrotliCompressionResponseBodyEnable.md)


## `getProductBrotliCompression`

```javascript
getProductBrotliCompression({ service_id })
```

Get the enablement status of the Brotli Compression product on a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.getProductBrotliCompression(options)
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
**service_id** | **String** | Alphanumeric string identifying the service. |

### Return type

[**BrotliCompressionResponseBodyEnable**](BrotliCompressionResponseBodyEnable.md)


## `getServicesProductBrotliCompression`

```javascript
getServicesProductBrotliCompression()
```

Get all the services which have the Brotli Compression product enabled.

### Example

```javascript
apiInstance.getServicesProductBrotliCompression()
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

[**BrotliCompressionResponseBodyGetAllServices**](BrotliCompressionResponseBodyGetAllServices.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
