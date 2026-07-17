# Fastly.ProductBotManagementApi

```javascript
const apiInstance = new Fastly.ProductBotManagementApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**disableProductBotManagement**](ProductBotManagementApi.md#disableProductBotManagement) | **DELETE** /enabled-products/v1/bot_management/services/{service_id} | Disable product
[**enableProductBotManagement**](ProductBotManagementApi.md#enableProductBotManagement) | **PUT** /enabled-products/v1/bot_management/services/{service_id} | Enable product
[**getProductBotManagement**](ProductBotManagementApi.md#getProductBotManagement) | **GET** /enabled-products/v1/bot_management/services/{service_id} | Get product enablement status
[**getProductBotManagementConfiguration**](ProductBotManagementApi.md#getProductBotManagementConfiguration) | **GET** /enabled-products/v1/bot_management/services/{service_id}/configuration | Get configuration
[**getServicesProductBotManagement**](ProductBotManagementApi.md#getServicesProductBotManagement) | **GET** /enabled-products/v1/bot_management/services | Get services with product enabled
[**setProductBotManagementConfiguration**](ProductBotManagementApi.md#setProductBotManagementConfiguration) | **PATCH** /enabled-products/v1/bot_management/services/{service_id}/configuration | Update configuration


## `disableProductBotManagement`

```javascript
disableProductBotManagement({ service_id })
```

Disable the Bot Management product on a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.disableProductBotManagement(options)
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


## `enableProductBotManagement`

```javascript
enableProductBotManagement({ service_id })
```

Enable the Bot Management product on a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.enableProductBotManagement(options)
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

[**BotManagementResponseBodyEnable**](BotManagementResponseBodyEnable.md)


## `getProductBotManagement`

```javascript
getProductBotManagement({ service_id })
```

Get the enablement status of the Bot Management product on a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.getProductBotManagement(options)
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

[**BotManagementResponseBodyEnable**](BotManagementResponseBodyEnable.md)


## `getProductBotManagementConfiguration`

```javascript
getProductBotManagementConfiguration({ service_id })
```

Get the configuration of the Bot Management product on a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.getProductBotManagementConfiguration(options)
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

[**BotManagementResponseConfigure**](BotManagementResponseConfigure.md)


## `getServicesProductBotManagement`

```javascript
getServicesProductBotManagement()
```

Get all the services which have the Bot Management product enabled.

### Example

```javascript
apiInstance.getServicesProductBotManagement()
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

[**BotManagementResponseBodyGetAllServices**](BotManagementResponseBodyGetAllServices.md)


## `setProductBotManagementConfiguration`

```javascript
setProductBotManagementConfiguration({ service_id, [bot_management_request_update_configuration] })
```

Update the configuration of the Bot Management product on a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  bot_management_request_update_configuration: {"contentguard":true},
};

apiInstance.setProductBotManagementConfiguration(options)
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
**bot_management_request_update_configuration** | [**BotManagementRequestUpdateConfiguration**](BotManagementRequestUpdateConfiguration.md) |  | [optional]

### Return type

[**BotManagementResponseConfigure**](BotManagementResponseConfigure.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
