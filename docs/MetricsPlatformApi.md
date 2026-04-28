# Fastly.MetricsPlatformApi

```javascript
const apiInstance = new Fastly.MetricsPlatformApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**getPlatformMetricsServiceHistorical**](MetricsPlatformApi.md#getPlatformMetricsServiceHistorical) | **GET** /metrics/platform/services/{service_id}/{granularity} | Get historical time series metrics for a single service


## `getPlatformMetricsServiceHistorical`

```javascript
getPlatformMetricsServiceHistorical({ service_id, granularity, [from, ][to, ][metric, ][metric_set, ][group_by, ][region, ][datacenter, ][cursor, ][limit] })
```

Fetches historical metrics for a single service for a given granularity.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  granularity: daily, // required
  from: 2025-06-08T00:00:00.000Z,
  to: 2025-08-02T00:00:00.000Z,
  metric: ttfb_edge_p95_us,ttfb_edge_p99_us,
  metric_set: "ttfb",
  group_by: "datacenter",
  region: "africa_std",
  datacenter: SJC,STP,
  cursor: "cursor_example",
  limit: "'1000'",
};

apiInstance.getPlatformMetricsServiceHistorical(options)
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
**granularity** | **String** | Duration of sample windows. | [one of: "minutely", "hourly", "daily"]
**from** | **String** | A valid RFC-8339-formatted date and time indicating the inclusive start of the query time range. If not provided, a default is chosen based on the provided `granularity` value. | [optional]
**to** | **String** | A valid RFC-8339-formatted date and time indicating the exclusive end of the query time range. If not provided, a default is chosen based on the provided `granularity` value. | [optional]
**metric** | **String** | The metric(s) to retrieve. Multiple values should be comma-separated. | [optional]
**metric_set** | **String** | The metric set(s) to retrieve. Multiple values should be comma-separated. | [optional] [one of: "ttfb"]
**group_by** | **String** | Field to group_by in the query. For example, `group_by&#x3D;region` will return entries for grouped by timestamp and region.  | [optional] [one of: "datacenter", "region"]
**region** | **String** | Limit query to one or more specific geographic regions. Values should be comma-separated.  | [optional] [one of: "africa_std", "anzac", "asia", "asia_india", "asia_southkorea", "europe", "mexico", "southamerica_std", "usa"]
**datacenter** | **String** | Limit query to one or more specific POPs. Values should be comma-separated. | [optional]
**cursor** | **String** | Cursor value from the `next_cursor` field of a previous response, used to retrieve the next page. To request the first page, this should be empty. | [optional]
**limit** | **String** | Number of results per page. The maximum is 10000. | [optional] [defaults to '1000']

### Return type

[**PlatformMetricsResponse**](PlatformMetricsResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
