# Fastly.InsightsApi

```javascript
const apiInstance = new Fastly.InsightsApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**getLogInsights**](InsightsApi.md#getLogInsights) | **GET** /observability/log-insights | Retrieve log insights


## `getLogInsights`

```javascript
getLogInsights({ visualization, service_id, start, end, [pops, ][domain, ][domain_exact_match, ][limit] })
```

Retrieves statistics from sampled log records.

### Example

```javascript
const options = {
  visualization: top-url-by-requests, // required
  service_id: 1jlmtMz1ncwA0KC3TBGD0X, // required
  start: 2024-01-01T14:30:23Z, // required
  end: 2024-01-05T14:30:23Z, // required
  pops: "pops_example",
  domain: "domain_example",
  domain_exact_match: true,
  limit: 3.4,
};

apiInstance.getLogInsights(options)
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
**visualization** | **String** |  | [one of: "top-url-by-bandwidth", "bottom-url-by-cache-hit-ratio", "top-url-by-cache-hit-ratio", "country-statistics", "top-url-by-duration-sum", "top-4xx-urls", "top-5xx-urls", "top-url-by-misses", "top-url-by-requests", "top-browser-by-requests", "top-content-type-by-requests", "top-device-by-requests", "top-os-by-requests", "response-status-codes", "top-503-responses"]
**service_id** | **String** |  |
**start** | **String** |  |
**end** | **String** |  |
**pops** | **String** |  | [optional]
**domain** | **String** |  | [optional]
**domain_exact_match** | **Boolean** |  | [optional]
**limit** | **Number** |  | [optional]

### Return type

[**GetLogInsightsResponse**](GetLogInsightsResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
