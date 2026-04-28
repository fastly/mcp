# Fastly.BillingUsageMetricsApi

```javascript
const apiInstance = new Fastly.BillingUsageMetricsApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**getServiceLevelUsage**](BillingUsageMetricsApi.md#getServiceLevelUsage) | **GET** /billing/v3/service-usage-metrics | Retrieve service-level usage metrics for services with non-zero usage units.
[**getUsageMetrics**](BillingUsageMetricsApi.md#getUsageMetrics) | **GET** /billing/v3/usage-metrics | Get monthly usage metrics


## `getServiceLevelUsage`

```javascript
getServiceLevelUsage({ , [product_id, ][service, ][usage_type_name, ][start_month, ][end_month, ][limit, ][cursor] })
```

Returns product usage, broken down by service.

### Example

```javascript
const options = {
  product_id: "product_id_example",
  service: "service_example",
  usage_type_name: "usage_type_name_example",
  start_month: 2023-01,
  end_month: 2023-03,
  limit: "'1000'",
  cursor: "cursor_example",
};

apiInstance.getServiceLevelUsage(options)
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
**product_id** | **String** | The product identifier for the metrics returned (e.g., `cdn_usage`). This should be used along with `usage_type_name`. | [optional]
**service** | **String** | The service identifier for the metrics being requested. | [optional]
**usage_type_name** | **String** | The usage type name for the metrics returned (e.g., `North America Requests`). This should be used along with `product_id`. | [optional]
**start_month** | **String** |  | [optional]
**end_month** | **String** |  | [optional]
**limit** | **String** | Number of results per page. The maximum is 10000. | [optional] [defaults to '1000']
**cursor** | **String** | Cursor value from the `next_cursor` field of a previous response, used to retrieve the next page. To request the first page, this should be empty. | [optional]

### Return type

[**Serviceusagemetrics**](Serviceusagemetrics.md)


## `getUsageMetrics`

```javascript
getUsageMetrics({ start_month, end_month })
```

Returns monthly usage metrics for customer by product.

### Example

```javascript
const options = {
  start_month: 2024-05, // required
  end_month: 2024-06, // required
};

apiInstance.getUsageMetrics(options)
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
**start_month** | **String** |  |
**end_month** | **String** |  |

### Return type

[**Usagemetric**](Usagemetric.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
