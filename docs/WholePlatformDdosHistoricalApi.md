# Fastly.WholePlatformDdosHistoricalApi

```javascript
const apiInstance = new Fastly.WholePlatformDdosHistoricalApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**getPlatformDdosHistorical**](WholePlatformDdosHistoricalApi.md#getPlatformDdosHistorical) | **GET** /metrics/platform/ddos | Get historical DDoS metrics for the entire Fastly platform


## `getPlatformDdosHistorical`

```javascript
getPlatformDdosHistorical({ , [start, ][end, ][downsample] })
```

Fetches historical DDoS metrics for the entire Fastly platform.

### Example

```javascript
const options = {
  start: 2021-08-01T00:00:00.000Z,
  end: 2020-08-02T00:00:00.000Z,
  downsample: "hour",
};

apiInstance.getPlatformDdosHistorical(options)
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
**start** | **String** | A valid ISO-8601-formatted date and time, or UNIX timestamp, indicating the inclusive start of the query time range. If not provided, a default is chosen based on the provided `downsample` value. | [optional]
**end** | **String** | A valid ISO-8601-formatted date and time, or UNIX timestamp, indicating the exclusive end of the query time range. If not provided, a default is chosen based on the provided `downsample` value. | [optional]
**downsample** | **String** | Duration of sample windows. | [optional] [one of: "hour", "day"]

### Return type

[**PlatformDdosResponse**](PlatformDdosResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
