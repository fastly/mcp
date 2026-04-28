# Fastly.ProductDdosProtectionApi

```javascript
const apiInstance = new Fastly.ProductDdosProtectionApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**disableProductDdosProtection**](ProductDdosProtectionApi.md#disableProductDdosProtection) | **DELETE** /enabled-products/v1/ddos_protection/services/{service_id} | Disable product
[**enableProductDdosProtection**](ProductDdosProtectionApi.md#enableProductDdosProtection) | **PUT** /enabled-products/v1/ddos_protection/services/{service_id} | Enable product
[**getProductDdosProtection**](ProductDdosProtectionApi.md#getProductDdosProtection) | **GET** /enabled-products/v1/ddos_protection/services/{service_id} | Get product enablement status
[**getProductDdosProtectionConfiguration**](ProductDdosProtectionApi.md#getProductDdosProtectionConfiguration) | **GET** /enabled-products/v1/ddos_protection/services/{service_id}/configuration | Get configuration
[**getServicesProductDdosProtection**](ProductDdosProtectionApi.md#getServicesProductDdosProtection) | **GET** /enabled-products/v1/ddos_protection/services | Get services with product enabled
[**setProductDdosProtectionConfiguration**](ProductDdosProtectionApi.md#setProductDdosProtectionConfiguration) | **PATCH** /enabled-products/v1/ddos_protection/services/{service_id}/configuration | Update configuration


## `disableProductDdosProtection`

```javascript
disableProductDdosProtection({ service_id })
```

Disable the DDoS Protection product on a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.disableProductDdosProtection(options)
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


## `enableProductDdosProtection`

```javascript
enableProductDdosProtection({ service_id, [ddos_protection_request_enable_mode] })
```

Enable the DDoS Protection product on a service in default 'log' mode unless otherwise specified in the request body.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  ddos_protection_request_enable_mode: {"mode":"block"},
};

apiInstance.enableProductDdosProtection(options)
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
**ddos_protection_request_enable_mode** | [**DdosProtectionRequestEnableMode**](DdosProtectionRequestEnableMode.md) |  | [optional]

### Return type

[**DdosProtectionResponseEnable**](DdosProtectionResponseEnable.md)


## `getProductDdosProtection`

```javascript
getProductDdosProtection({ service_id })
```

Get the enablement status of the DDoS Protection product on a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.getProductDdosProtection(options)
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

[**DdosProtectionResponseEnable**](DdosProtectionResponseEnable.md)


## `getProductDdosProtectionConfiguration`

```javascript
getProductDdosProtectionConfiguration({ service_id })
```

Get configuration of the DDoS Protection product on a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.getProductDdosProtectionConfiguration(options)
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

[**DdosProtectionResponseConfigure**](DdosProtectionResponseConfigure.md)


## `getServicesProductDdosProtection`

```javascript
getServicesProductDdosProtection()
```

Get all the services which have the DDoS Protection product enabled.

### Example

```javascript
apiInstance.getServicesProductDdosProtection()
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

[**DdosProtectionResponseBodyGetAllServices**](DdosProtectionResponseBodyGetAllServices.md)


## `setProductDdosProtectionConfiguration`

```javascript
setProductDdosProtectionConfiguration({ service_id, [ddos_protection_request_update_configuration] })
```

Update configuration of the DDoS Protection product on a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  ddos_protection_request_update_configuration: {"mode":"log"},
};

apiInstance.setProductDdosProtectionConfiguration(options)
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
**ddos_protection_request_update_configuration** | [**DdosProtectionRequestUpdateConfiguration**](DdosProtectionRequestUpdateConfiguration.md) |  | [optional]

### Return type

[**DdosProtectionResponseConfigure**](DdosProtectionResponseConfigure.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
