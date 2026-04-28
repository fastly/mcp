# Fastly.ProductOriginInspectorApi

```javascript
const apiInstance = new Fastly.ProductOriginInspectorApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**disableProductOriginInspector**](ProductOriginInspectorApi.md#disableProductOriginInspector) | **DELETE** /enabled-products/v1/origin_inspector/services/{service_id} | Disable product
[**enableProductOriginInspector**](ProductOriginInspectorApi.md#enableProductOriginInspector) | **PUT** /enabled-products/v1/origin_inspector/services/{service_id} | Enable product
[**getProductOriginInspector**](ProductOriginInspectorApi.md#getProductOriginInspector) | **GET** /enabled-products/v1/origin_inspector/services/{service_id} | Get product enablement status
[**getServicesProductOriginInspector**](ProductOriginInspectorApi.md#getServicesProductOriginInspector) | **GET** /enabled-products/v1/origin_inspector/services | Get services with product enabled


## `disableProductOriginInspector`

```javascript
disableProductOriginInspector({ service_id })
```

Disable the Origin Inspector product on a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.disableProductOriginInspector(options)
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


## `enableProductOriginInspector`

```javascript
enableProductOriginInspector({ service_id })
```

Enable the Origin Inspector product on a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.enableProductOriginInspector(options)
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

[**OriginInspectorResponseBodyEnable**](OriginInspectorResponseBodyEnable.md)


## `getProductOriginInspector`

```javascript
getProductOriginInspector({ service_id })
```

Get the enablement status of the Origin Inspector product on a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.getProductOriginInspector(options)
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

[**OriginInspectorResponseBodyEnable**](OriginInspectorResponseBodyEnable.md)


## `getServicesProductOriginInspector`

```javascript
getServicesProductOriginInspector()
```

Get all the services which have the Origin Inspector product enabled.

### Example

```javascript
apiInstance.getServicesProductOriginInspector()
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

[**OriginInspectorResponseBodyGetAllServices**](OriginInspectorResponseBodyGetAllServices.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
