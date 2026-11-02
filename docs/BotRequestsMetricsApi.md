# Fastly.BotRequestsMetricsApi

```javascript
const apiInstance = new Fastly.BotRequestsMetricsApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**getBotRequestMetricsServiceHistorical**](BotRequestsMetricsApi.md#getBotRequestMetricsServiceHistorical) | **GET** /metrics/bots/entities/{service_id}/{granularity} | Get per-service historical time series metrics for bot requests broken down by bot-type.


## `getBotRequestMetricsServiceHistorical`

```javascript
getBotRequestMetricsServiceHistorical({ granularity, service_id, [from, ][to, ][group_by, ][datacenter, ][bot, ][region, ][cursor, ][metric, ][metric_set, ][limit] })
```

Return historical time series metrics for bot requests broken down by bot-type.

### Example

```javascript
const options = {
  granularity: minutely, // required
  service_id: "service_id_example", // required
  from: 2025-06-08T00:00:00.000Z,
  to: 2025-08-02T00:00:00.000Z,
  group_by: "datacenter",
  datacenter: SJC,STP,
  bot: "bot_example",
  region: "africa_std",
  cursor: "cursor_example",
  metric: status_4xx,status_5xx,ipv6,http3,
  metric_set: "content_guard",
  limit: "'1000'",
};

apiInstance.getBotRequestMetricsServiceHistorical(options)
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
**service_id** | **String** | Alphanumeric string identifying the service. |
**from** | **String** | A valid RFC-8339-formatted date and time indicating the inclusive start of the query time range. If not provided, a default is chosen based on the provided `granularity` value. | [optional]
**to** | **String** | A valid RFC-8339-formatted date and time indicating the exclusive end of the query time range. If not provided, a default is chosen based on the provided `granularity` value. | [optional]
**group_by** | **String** | Field to group by in the query. For example, `group_by&#x3D;bot_id` will return entries grouped by `timestamp` and `bot_id`.  | [optional] [one of: "datacenter", "bot_id"]
**datacenter** | **String** | Limit query to one or more specific POPs. Values should be comma-separated. | [optional]
**bot** | **String** | Filter results based by Bot ID. | [optional]
**region** | **String** | Limit query to one or more specific geographic regions. Values should be comma-separated.  | [optional] [one of: "africa_std", "anzac", "asia", "asia_india", "asia_southkorea", "europe", "mexico", "southamerica_std", "usa"]
**cursor** | **String** | Cursor value from the `next_cursor` field of a previous response, used to retrieve the next page. To request the first page, this should be empty. | [optional]
**metric** | **String** | One or more metrics to retrieve. Multiple values should be comma-separated. | [optional]
**metric_set** | **String** | The metric set to retrieve. | [optional] [one of: "content_guard"]
**limit** | **String** | Number of results per page. The maximum is 10000. | [optional] [defaults to '1000']

### Return type

[**BotRequestMetricsResponse**](BotRequestMetricsResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
