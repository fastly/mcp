# Fastly.LoggingEndpointErrorsApi

```javascript
const apiInstance = new Fastly.LoggingEndpointErrorsApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**getLogEndpointErrors**](LoggingEndpointErrorsApi.md#getLogEndpointErrors) | **GET** /observability/service/{service_id}/logging/errors | Stream Log Endpoint Errors


## `getLogEndpointErrors`

```javascript
getLogEndpointErrors({ service_id, [from, ][to, ][filter_endpoint] })
```

Provides a near real-time stream of log errors through a hybrid short-polling model. A client should make an initial request using the `from` parameter to specify a start time. The `to` parameter should be used alongside the `from` parameter since the default bucket is 10 seconds.  For pagination, use the URLs provided in the Link header of the response. These contain updated `from` timestamps for retrieving the next or previous page of logs.  Defaults to `application/x-ndjson` format. Use `Accept: application/json` header to request standard JSON array format instead.

### Example

```javascript
const options = {
  service_id: SU1Z0isxPaozGVKXdv0eY, // required
  from: 1756123200,
  to: 1756209600,
  filter_endpoint: MyS3,BigQuery,
};

apiInstance.getLogEndpointErrors(options)
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
**service_id** | **String** |  |
**from** | **Number** |  | [optional]
**to** | **Number** |  | [optional]
**filter_endpoint** | **String** |  | [optional]

### Return type

**String**


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
