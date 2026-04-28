# Fastly.ObservabilityTimeseriesApi

```javascript
const apiInstance = new Fastly.ObservabilityTimeseriesApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**timeseriesGet**](ObservabilityTimeseriesApi.md#timeseriesGet) | **GET** /observability/timeseries | Retrieve observability data as a time series


## `timeseriesGet`

```javascript
timeseriesGet({ source, from, to, granularity, series, [dimensions, ][filter] })
```

Retrieves observability data as a time series.

### Example

```javascript
const options = {
  source: logs, // required
  from: 2024-01-03T16:00:00Z, // required
  to: 2024-01-03T18:00:00Z, // required
  granularity: hour, // required
  series: avg[response_time],p99[response_time], // required
  dimensions: "dimensions_example",
  filter: filter[response_status]=200,
};

apiInstance.timeseriesGet(options)
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
**source** | **String** |  | [one of: "logs", "sustainability"]
**from** | **String** |  |
**to** | **String** |  |
**granularity** | **String** |  |
**series** | **String** |  |
**dimensions** | **String** |  | [optional]
**filter** | **String** |  | [optional]

### Return type

[**TimeseriesGetResponse**](TimeseriesGetResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
