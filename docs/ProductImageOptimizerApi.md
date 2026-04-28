# Fastly.ProductImageOptimizerApi

```javascript
const apiInstance = new Fastly.ProductImageOptimizerApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**disableProductImageOptimizer**](ProductImageOptimizerApi.md#disableProductImageOptimizer) | **DELETE** /enabled-products/v1/image_optimizer/services/{service_id} | Disable product
[**enableProductImageOptimizer**](ProductImageOptimizerApi.md#enableProductImageOptimizer) | **PUT** /enabled-products/v1/image_optimizer/services/{service_id} | Enable product
[**getProductImageOptimizer**](ProductImageOptimizerApi.md#getProductImageOptimizer) | **GET** /enabled-products/v1/image_optimizer/services/{service_id} | Get product enablement status
[**getServicesProductImageOptimizer**](ProductImageOptimizerApi.md#getServicesProductImageOptimizer) | **GET** /enabled-products/v1/image_optimizer/services | Get services with product enabled


## `disableProductImageOptimizer`

```javascript
disableProductImageOptimizer({ service_id })
```

Disable the Image Optimizer product on a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.disableProductImageOptimizer(options)
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


## `enableProductImageOptimizer`

```javascript
enableProductImageOptimizer({ service_id })
```

Enable the Image Optimizer product on a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.enableProductImageOptimizer(options)
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

[**ImageOptimizerResponseBodyEnable**](ImageOptimizerResponseBodyEnable.md)


## `getProductImageOptimizer`

```javascript
getProductImageOptimizer({ service_id })
```

Get the enablement status of the Image Optimizer product on a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.getProductImageOptimizer(options)
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

[**ImageOptimizerResponseBodyEnable**](ImageOptimizerResponseBodyEnable.md)


## `getServicesProductImageOptimizer`

```javascript
getServicesProductImageOptimizer()
```

Get all the services which have the Image Optimizer product enabled.

### Example

```javascript
apiInstance.getServicesProductImageOptimizer()
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

[**ImageOptimizerResponseBodyGetAllServices**](ImageOptimizerResponseBodyGetAllServices.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
