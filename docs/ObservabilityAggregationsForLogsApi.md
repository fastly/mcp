# Fastly.ObservabilityAggregationsForLogsApi

```javascript
const apiInstance = new Fastly.ObservabilityAggregationsForLogsApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**logAggregationsGet**](ObservabilityAggregationsForLogsApi.md#logAggregationsGet) | **GET** /observability/aggregations | Retrieve aggregated log results


## `logAggregationsGet`

```javascript
logAggregationsGet({ source, service_id, start, end, series, [limit, ][filter, ][dimensions, ][sort] })
```

Retrieves aggregated log results.

### Example

```javascript
const options = {
  source: "source_example", // required
  service_id: "service_id_example", // required
  start: "start_example", // required
  end: "end_example", // required
  series: "series_example", // required
  limit: 3.4,
  filter: "filter_example",
  dimensions: "dimensions_example",
  sort: "sort_example",
};

apiInstance.logAggregationsGet(options)
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
**source** | **String** |  |
**service_id** | **String** |  |
**start** | **String** |  |
**end** | **String** |  |
**series** | **String** |  |
**limit** | **Number** |  | [optional]
**filter** | **String** |  | [optional]
**dimensions** | **String** |  | [optional]
**sort** | **String** |  | [optional]

### Return type

[**LogAggregationsGetResponse**](LogAggregationsGetResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
