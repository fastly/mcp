# Fastly.ProductFanoutApi

```javascript
const apiInstance = new Fastly.ProductFanoutApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**disableProductFanout**](ProductFanoutApi.md#disableProductFanout) | **DELETE** /enabled-products/v1/fanout/services/{service_id} | Disable product
[**enableProductFanout**](ProductFanoutApi.md#enableProductFanout) | **PUT** /enabled-products/v1/fanout/services/{service_id} | Enable product
[**getProductFanout**](ProductFanoutApi.md#getProductFanout) | **GET** /enabled-products/v1/fanout/services/{service_id} | Get product enablement status
[**getServicesProductFanout**](ProductFanoutApi.md#getServicesProductFanout) | **GET** /enabled-products/v1/fanout/services | Get services with product enabled


## `disableProductFanout`

```javascript
disableProductFanout({ service_id })
```

Disable the Fanout product on a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.disableProductFanout(options)
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


## `enableProductFanout`

```javascript
enableProductFanout({ service_id })
```

Enable the Fanout product on a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.enableProductFanout(options)
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

[**FanoutResponseBodyEnable**](FanoutResponseBodyEnable.md)


## `getProductFanout`

```javascript
getProductFanout({ service_id })
```

Get the enablement status of the Fanout product on a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.getProductFanout(options)
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

[**FanoutResponseBodyEnable**](FanoutResponseBodyEnable.md)


## `getServicesProductFanout`

```javascript
getServicesProductFanout()
```

Get all the services which have the Fanout product enabled.

### Example

```javascript
apiInstance.getServicesProductFanout()
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

[**FanoutResponseBodyGetAllServices**](FanoutResponseBodyGetAllServices.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
