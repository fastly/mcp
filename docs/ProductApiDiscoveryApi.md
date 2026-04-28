# Fastly.ProductApiDiscoveryApi

```javascript
const apiInstance = new Fastly.ProductApiDiscoveryApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**disableProductApiDiscovery**](ProductApiDiscoveryApi.md#disableProductApiDiscovery) | **DELETE** /enabled-products/v1/api_discovery/services/{service_id} | Disable product
[**enableProductApiDiscovery**](ProductApiDiscoveryApi.md#enableProductApiDiscovery) | **PUT** /enabled-products/v1/api_discovery/services/{service_id} | Enable product
[**getProductApiDiscovery**](ProductApiDiscoveryApi.md#getProductApiDiscovery) | **GET** /enabled-products/v1/api_discovery/services/{service_id} | Get product enablement status
[**getServicesProductApiDiscovery**](ProductApiDiscoveryApi.md#getServicesProductApiDiscovery) | **GET** /enabled-products/v1/api_discovery/services | Get services with product enabled


## `disableProductApiDiscovery`

```javascript
disableProductApiDiscovery({ service_id })
```

Disable the API Discovery product on a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.disableProductApiDiscovery(options)
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


## `enableProductApiDiscovery`

```javascript
enableProductApiDiscovery({ service_id })
```

Enable the API Discovery product on a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.enableProductApiDiscovery(options)
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

[**ApiDiscoveryResponseEnable**](ApiDiscoveryResponseEnable.md)


## `getProductApiDiscovery`

```javascript
getProductApiDiscovery({ service_id })
```

Get the enablement status of the API Discovery product on a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.getProductApiDiscovery(options)
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

[**ApiDiscoveryResponseEnable**](ApiDiscoveryResponseEnable.md)


## `getServicesProductApiDiscovery`

```javascript
getServicesProductApiDiscovery()
```

Get all the services for a customer that has the API Discovery product enabled.

### Example

```javascript
apiInstance.getServicesProductApiDiscovery()
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

[**ApiDiscoveryResponseBodyGetAllServices**](ApiDiscoveryResponseBodyGetAllServices.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
