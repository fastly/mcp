# Fastly.LogExplorerApi

```javascript
const apiInstance = new Fastly.LogExplorerApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**getLogRecords**](LogExplorerApi.md#getLogRecords) | **GET** /observability/log-explorer | Retrieve log records


## `getLogRecords`

```javascript
getLogRecords({ service_id, start, end, [limit, ][next_cursor, ][filter] })
```

Retrieves log records.

### Example

```javascript
const options = {
  service_id: 1jlmtMz1ncwA0KC3TBGD0X, // required
  start: "start_example", // required
  end: "end_example", // required
  limit: 3.4,
  next_cursor: "next_cursor_example",
  filter: "filter_example",
};

apiInstance.getLogRecords(options)
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
**start** | **String** |  |
**end** | **String** |  |
**limit** | **Number** |  | [optional]
**next_cursor** | **String** |  | [optional]
**filter** | **String** |  | [optional]

### Return type

[**GetLogRecordsResponse**](GetLogRecordsResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
