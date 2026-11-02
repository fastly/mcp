# Fastly.MetricsPlatformApi

```javascript
const apiInstance = new Fastly.MetricsPlatformApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**getPlatformMetricsAggregateHistorical**](MetricsPlatformApi.md#getPlatformMetricsAggregateHistorical) | **GET** /metrics/v2/platform/aggregate/{granularity} | Get aggregated historical time series metrics for all entities
[**getPlatformMetricsEntityHistorical**](MetricsPlatformApi.md#getPlatformMetricsEntityHistorical) | **GET** /metrics/v2/platform/entities/{entity_id}/{granularity} | Get historical time series metrics for a single entity.


## `getPlatformMetricsAggregateHistorical`

```javascript
getPlatformMetricsAggregateHistorical({ granularity, [from, ][to, ][metric, ][metric_set, ][group_by, ][region, ][datacenter, ][cursor, ][limit] })
```

Fetches historical metrics for all entities for a customer for a given granularity. Entity in this context refers to an instance of a Fastly resource, such as a VCL service, Compute service, or NGWAF workspace.

### Example

```javascript
const options = {
  granularity: minutely, // required
  from: 2025-06-08T00:00:00.000Z,
  to: 2025-08-02T00:00:00.000Z,
  metric: status_4xx,status_5xx,ipv6,http3,
  metric_set: "delivery_traffic_flow",
  group_by: "datacenter",
  region: "africa_std",
  datacenter: SJC,STP,
  cursor: "cursor_example",
  limit: "'1000'",
};

apiInstance.getPlatformMetricsAggregateHistorical(options)
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
**granularity** | **String** | Duration of sample windows. | [one of: "minutely", "hourly", "daily"]
**from** | **String** | A valid RFC-8339-formatted date and time indicating the inclusive start of the query time range. If not provided, a default is chosen based on the provided `granularity` value. | [optional]
**to** | **String** | A valid RFC-8339-formatted date and time indicating the exclusive end of the query time range. If not provided, a default is chosen based on the provided `granularity` value. | [optional]
**metric** | **String** | One or more metrics to retrieve. Multiple values should be comma-separated. | [optional]
**metric_set** | **String** | One or more metric sets to retrieve. Multiple values should be comma-separated. A metric set expands to a list of metrics; see the Metric Sets section above for the metrics in each set. A metric that appears in more than one requested set is returned once.  | [optional] [one of: "delivery_traffic_flow", "delivery_cache_performance", "delivery_errors", "compute_traffic_flow", "compute_performance", "compute_errors", "content_guard", "content_security", "ddos", "domain_api", "fanout", "image_opto", "ngwaf", "object_storage", "websockets"]
**group_by** | **String** | Field to group_by in the query. For example, `group_by&#x3D;region` will return entries for grouped by timestamp and region.  | [optional] [one of: "datacenter", "region"]
**region** | **String** | Limit query to one or more specific geographic regions. Values should be comma-separated.  | [optional] [one of: "africa_std", "anzac", "asia", "asia_india", "asia_southkorea", "europe", "mexico", "southamerica_std", "usa"]
**datacenter** | **String** | Limit query to one or more specific POPs. Values should be comma-separated. | [optional]
**cursor** | **String** | Cursor value from the `next_cursor` field of a previous response, used to retrieve the next page. To request the first page, this should be empty. | [optional]
**limit** | **String** | Number of results per page. The maximum is 10000. | [optional] [defaults to '1000']

### Return type

[**PlatformMetricsResponse**](PlatformMetricsResponse.md)


## `getPlatformMetricsEntityHistorical`

```javascript
getPlatformMetricsEntityHistorical({ entity_id, granularity, [from, ][to, ][metric, ][metric_set, ][group_by, ][region, ][datacenter, ][cursor, ][limit] })
```

Fetches historical metrics for a single entity for a given granularity. Entity in this context refers to an instance of a Fastly resource, such as a VCL service, Compute service, or NGWAF workspace.

### Example

```javascript
const options = {
  entity_id: l4c2G719JnG5z0qbt512fG, // required
  granularity: minutely, // required
  from: 2025-06-08T00:00:00.000Z,
  to: 2025-08-02T00:00:00.000Z,
  metric: status_4xx,status_5xx,ipv6,http3,
  metric_set: "delivery_traffic_flow",
  group_by: "datacenter",
  region: "africa_std",
  datacenter: SJC,STP,
  cursor: "cursor_example",
  limit: "'1000'",
};

apiInstance.getPlatformMetricsEntityHistorical(options)
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
**entity_id** | **String** | Alphanumeric string identifying the entity. |
**granularity** | **String** | Duration of sample windows. | [one of: "minutely", "hourly", "daily"]
**from** | **String** | A valid RFC-8339-formatted date and time indicating the inclusive start of the query time range. If not provided, a default is chosen based on the provided `granularity` value. | [optional]
**to** | **String** | A valid RFC-8339-formatted date and time indicating the exclusive end of the query time range. If not provided, a default is chosen based on the provided `granularity` value. | [optional]
**metric** | **String** | One or more metrics to retrieve. Multiple values should be comma-separated. | [optional]
**metric_set** | **String** | One or more metric sets to retrieve. Multiple values should be comma-separated. A metric set expands to a list of metrics; see the Metric Sets section above for the metrics in each set. A metric that appears in more than one requested set is returned once.  | [optional] [one of: "delivery_traffic_flow", "delivery_cache_performance", "delivery_errors", "compute_traffic_flow", "compute_performance", "compute_errors", "content_guard", "content_security", "ddos", "domain_api", "fanout", "image_opto", "ngwaf", "object_storage", "websockets"]
**group_by** | **String** | Field to group_by in the query. For example, `group_by&#x3D;region` will return entries for grouped by timestamp and region.  | [optional] [one of: "datacenter", "region"]
**region** | **String** | Limit query to one or more specific geographic regions. Values should be comma-separated.  | [optional] [one of: "africa_std", "anzac", "asia", "asia_india", "asia_southkorea", "europe", "mexico", "southamerica_std", "usa"]
**datacenter** | **String** | Limit query to one or more specific POPs. Values should be comma-separated. | [optional]
**cursor** | **String** | Cursor value from the `next_cursor` field of a previous response, used to retrieve the next page. To request the first page, this should be empty. | [optional]
**limit** | **String** | Number of results per page. The maximum is 10000. | [optional] [defaults to '1000']

### Return type

[**PlatformMetricsResponse**](PlatformMetricsResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
