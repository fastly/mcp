# Fastly.AiRuntimeControlSessionsApi

```javascript
const apiInstance = new Fastly.AiRuntimeControlSessionsApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**arcGetSessionLogs**](AiRuntimeControlSessionsApi.md#arcGetSessionLogs) | **GET** /ai-runtime-control/v1/sessions | Get session logs


## `arcGetSessionLogs`

```javascript
arcGetSessionLogs({ , [key, ][provider, ][model, ][from, ][to, ][cursor, ][limit, ][sort] })
```

Returns session logs, including request and response data and metadata, for debugging and audit purposes.

### Example

```javascript
const options = {
  key: 7fVVQb1nZaJgnzCn4B4v3B,
  provider: pTfnUUBcU1yv8SoRJn5PZ2,
  model: claude-sonnet-4-20250514,
  from: 2026-09-01T00:00Z,
  to: 2026-09-22T00:00Z,
  cursor: MTAwOjA,
  limit: 100,
  sort: "created_at",
};

apiInstance.arcGetSessionLogs(options)
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
**to** | **Date** | The end of the time range, in RFC 3339 format. Defaults to `now`. | [optional]
**cursor** | **String** | Cursor for pagination. Use the `next_cursor` value from a previous response to request the next page of results, or the `prev_cursor` value to request the previous page.  | [optional]
**limit** | **Number** | Limit how many results are returned. | [optional] [defaults to 100]
**sort** | **String** | Sort field. Prefix with `-` for descending order (e.g., `sort&#x3D;-created_at`).  | [optional] [one of: "created_at", "-created_at"]

### Return type

[**ArcSessionsResponse**](ArcSessionsResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
