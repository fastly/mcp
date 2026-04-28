# Fastly.ProductLogExplorerInsightsApi

```javascript
const apiInstance = new Fastly.ProductLogExplorerInsightsApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**disableProductLogExplorerInsights**](ProductLogExplorerInsightsApi.md#disableProductLogExplorerInsights) | **DELETE** /enabled-products/v1/log_explorer_insights/services/{service_id} | Disable product
[**enableProductLogExplorerInsights**](ProductLogExplorerInsightsApi.md#enableProductLogExplorerInsights) | **PUT** /enabled-products/v1/log_explorer_insights/services/{service_id} | Enable product
[**getProductLogExplorerInsights**](ProductLogExplorerInsightsApi.md#getProductLogExplorerInsights) | **GET** /enabled-products/v1/log_explorer_insights/services/{service_id} | Get product enablement status
[**getServicesProductLogExplorerInsights**](ProductLogExplorerInsightsApi.md#getServicesProductLogExplorerInsights) | **GET** /enabled-products/v1/log_explorer_insights/services | Get services with product enabled


## `disableProductLogExplorerInsights`

```javascript
disableProductLogExplorerInsights({ service_id })
```

Disable the Log Explorer & Insights product on a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.disableProductLogExplorerInsights(options)
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


## `enableProductLogExplorerInsights`

```javascript
enableProductLogExplorerInsights({ service_id })
```

Enable the Log Explorer & Insights product on a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.enableProductLogExplorerInsights(options)
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

[**LogExplorerInsightsResponseBodyEnable**](LogExplorerInsightsResponseBodyEnable.md)


## `getProductLogExplorerInsights`

```javascript
getProductLogExplorerInsights({ service_id })
```

Get the enablement status of the Log Explorer & Insights product on a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.getProductLogExplorerInsights(options)
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

[**LogExplorerInsightsResponseBodyEnable**](LogExplorerInsightsResponseBodyEnable.md)


## `getServicesProductLogExplorerInsights`

```javascript
getServicesProductLogExplorerInsights()
```

Get all the services which have the Log Explorer & Insights product enabled.

### Example

```javascript
apiInstance.getServicesProductLogExplorerInsights()
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

[**LogExplorerInsightsResponseBodyGetAllServices**](LogExplorerInsightsResponseBodyGetAllServices.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
