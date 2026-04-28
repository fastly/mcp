# Fastly.ProductNgwafApi

```javascript
const apiInstance = new Fastly.ProductNgwafApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**disableProductNgwaf**](ProductNgwafApi.md#disableProductNgwaf) | **DELETE** /enabled-products/v1/ngwaf/services/{service_id} | Disable product
[**enableProductNgwaf**](ProductNgwafApi.md#enableProductNgwaf) | **PUT** /enabled-products/v1/ngwaf/services/{service_id} | Enable product
[**getProductNgwaf**](ProductNgwafApi.md#getProductNgwaf) | **GET** /enabled-products/v1/ngwaf/services/{service_id} | Get product enablement status
[**getProductNgwafConfiguration**](ProductNgwafApi.md#getProductNgwafConfiguration) | **GET** /enabled-products/v1/ngwaf/services/{service_id}/configuration | Get configuration
[**getServicesProductNgwaf**](ProductNgwafApi.md#getServicesProductNgwaf) | **GET** /enabled-products/v1/ngwaf/services | Get services with product enabled
[**setProductNgwafConfiguration**](ProductNgwafApi.md#setProductNgwafConfiguration) | **PATCH** /enabled-products/v1/ngwaf/services/{service_id}/configuration | Update configuration


## `disableProductNgwaf`

```javascript
disableProductNgwaf({ service_id })
```

Disable the Next-Gen WAF product on a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.disableProductNgwaf(options)
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


## `enableProductNgwaf`

```javascript
enableProductNgwaf({ service_id, [ngwaf_request_enable] })
```

Enable the Next-Gen WAF product on a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  ngwaf_request_enable: {"workspace_id":"7JFbo4RNA0OKdFWC04r6B3"},
};

apiInstance.enableProductNgwaf(options)
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
**ngwaf_request_enable** | [**NgwafRequestEnable**](NgwafRequestEnable.md) |  | [optional]

### Return type

[**NgwafResponseEnable**](NgwafResponseEnable.md)


## `getProductNgwaf`

```javascript
getProductNgwaf({ service_id })
```

Get the enablement status of the Next-Gen WAF product on a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.getProductNgwaf(options)
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

[**NgwafResponseEnable**](NgwafResponseEnable.md)


## `getProductNgwafConfiguration`

```javascript
getProductNgwafConfiguration({ service_id })
```

Get configuration of the Next-Gen WAF product on a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.getProductNgwafConfiguration(options)
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

[**NgwafResponseConfigure**](NgwafResponseConfigure.md)


## `getServicesProductNgwaf`

```javascript
getServicesProductNgwaf()
```

Get all the services which have the Next-Gen WAF product enabled.

### Example

```javascript
apiInstance.getServicesProductNgwaf()
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

[**NgwafResponseBodyGetAllServices**](NgwafResponseBodyGetAllServices.md)


## `setProductNgwafConfiguration`

```javascript
setProductNgwafConfiguration({ service_id, [ngwaf_request_update_configuration] })
```

Update configuration of the Next-Gen WAF product on a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  ngwaf_request_update_configuration: {"workspace_id":"7JFbo4RNA0OKdFWC04r6B3","traffic_ramp":"20"},
};

apiInstance.setProductNgwafConfiguration(options)
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
**ngwaf_request_update_configuration** | [**NgwafRequestUpdateConfiguration**](NgwafRequestUpdateConfiguration.md) |  | [optional]

### Return type

[**NgwafResponseConfigure**](NgwafResponseConfigure.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
