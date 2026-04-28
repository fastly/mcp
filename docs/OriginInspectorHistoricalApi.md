# Fastly.OriginInspectorHistoricalApi

```javascript
const apiInstance = new Fastly.OriginInspectorHistoricalApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**getOriginInspectorHistorical**](OriginInspectorHistoricalApi.md#getOriginInspectorHistorical) | **GET** /metrics/origins/services/{service_id} | Get historical origin data for a service


## `getOriginInspectorHistorical`

```javascript
getOriginInspectorHistorical({ service_id, [start, ][end, ][downsample, ][metric, ][group_by, ][limit, ][cursor, ][region, ][datacenter, ][host] })
```

Fetches historical origin metrics for a given Fastly service, optionally filtering and grouping the results by origin host, region, or POP. 

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  start: 2021-08-01T00:00:00.000Z,
  end: 2020-08-02T00:00:00.000Z,
  downsample: "hour",
  metric: resp_body_bytes,status_2xx,
  group_by: "host",
  limit: "'100'",
  cursor: "cursor_example",
  region: "africa_std",
  datacenter: SJC,STP,
  host: origin_1,origin_2,
};

apiInstance.getOriginInspectorHistorical(options)
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
**start** | **String** | A valid ISO-8601-formatted date and time, or UNIX timestamp, indicating the inclusive start of the query time range. If not provided, a default is chosen based on the provided `downsample` value. | [optional]
**end** | **String** | A valid ISO-8601-formatted date and time, or UNIX timestamp, indicating the exclusive end of the query time range. If not provided, a default is chosen based on the provided `downsample` value. | [optional]
**downsample** | **String** | Duration of sample windows. | [optional] [one of: "hour", "minute", "day"]
**metric** | **String** | The metrics to retrieve. Multiple values should be comma-separated. | [optional] [defaults to 'responses']
**group_by** | **String** | Dimensions to return in the query. Multiple dimensions may be separated by commas. For example, `group_by&#x3D;host` will return one timeseries for every origin host, as a total across all POPs.  | [optional] [one of: "host", "datacenter", "region", "none"]
**limit** | **String** | Number of results per page. The maximum is 200. | [optional] [defaults to '100']
**cursor** | **String** | Cursor value from the `next_cursor` field of a previous response, used to retrieve the next page. To request the first page, this should be empty. | [optional]
**region** | **String** | Limit query to one or more specific geographic regions. Values should be comma-separated.  | [optional] [one of: "africa_std", "anzac", "asia", "asia_india", "asia_southkorea", "europe", "mexico", "southamerica_std", "usa"]
**datacenter** | **String** | Limit query to one or more specific POPs. Values should be comma-separated. | [optional]
**host** | **String** | Limit query to one or more specific origin hosts. Values should be comma-separated. | [optional]

### Return type

[**HistoricalOriginsResponse**](HistoricalOriginsResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
