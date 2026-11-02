# Fastly.AiRuntimeControlUsageMetricsApi

```javascript
const apiInstance = new Fastly.AiRuntimeControlUsageMetricsApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**arcExportUsageMetrics**](AiRuntimeControlUsageMetricsApi.md#arcExportUsageMetrics) | **GET** /ai-runtime-control/v1/usage-metrics/export | Export usage metrics
[**arcGetUsageMetrics**](AiRuntimeControlUsageMetricsApi.md#arcGetUsageMetrics) | **GET** /ai-runtime-control/v1/usage-metrics | Get usage metrics


## `arcExportUsageMetrics`

```javascript
arcExportUsageMetrics({ , [key, ][provider, ][model, ][from, ][to] })
```

Returns usage metrics for AI Runtime Control requests. Accepts the same filter parameters as [get usage metrics](#arc-get-usage-metrics), except `sort` and `granularity`, which aren't supported here.  Set the `Accept` header to `text/csv` to receive a CSV file download instead of a JSON response. In the CSV output, the column named `time` corresponds to the `date` field in the JSON response.

### Example

```javascript
const options = {
  key: 7fVVQb1nZaJgnzCn4B4v3B,
  provider: pTfnUUBcU1yv8SoRJn5PZ2,
  model: claude-sonnet-4-20250514,
  from: 2026-09-01T00:00Z,
  to: 2026-09-22T00:00Z,
};

apiInstance.arcExportUsageMetrics(options)
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
**key** | **String** | Filter results to a specific virtual key ID. | [optional]
**provider** | **String** | Filter results by AI provider connection ID. | [optional]
**model** | **String** | Filter results by AI model identifier. | [optional]
**from** | **Date** | The start of the time range, in RFC 3339 format. | [optional]
**to** | **Date** | The end of the time range, in RFC 3339 format. Defaults to now. | [optional]

### Return type

[**ArcUsageMetricsResponse**](ArcUsageMetricsResponse.md)


## `arcGetUsageMetrics`

```javascript
arcGetUsageMetrics({ , [key, ][provider, ][model, ][from, ][to, ][granularity, ][sort] })
```

Returns usage metrics for AI Runtime Control requests, including request counts, session counts, input token counts, and output token counts.

### Example

```javascript
const options = {
  key: 7fVVQb1nZaJgnzCn4B4v3B,
  provider: pTfnUUBcU1yv8SoRJn5PZ2,
  model: claude-sonnet-4-20250514,
  from: 2026-09-01T00:00Z,
  to: 2026-09-22T00:00Z,
  granularity: "daily",
  sort: "date",
};

apiInstance.arcGetUsageMetrics(options)
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
**key** | **String** | Filter results to a specific virtual key ID. | [optional]
**provider** | **String** | Filter results by AI provider connection ID. | [optional]
**model** | **String** | Filter results by AI model identifier. | [optional]
**from** | **Date** | The start of the time range, in RFC 3339 format. | [optional]
**to** | **Date** | The end of the time range, in RFC 3339 format. Defaults to now. | [optional]
**granularity** | **String** | The time granularity to aggregate usage by. | [optional] [one of: "daily", "hourly"]
**sort** | **String** | Sort field. Prefix with `-` for descending order (e.g., `sort&#x3D;-date`).  | [optional] [one of: "date", "-date"]

### Return type

[**ArcUsageMetricsResponse**](ArcUsageMetricsResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
