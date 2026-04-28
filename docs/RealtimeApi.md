# Fastly.RealtimeApi

```javascript
const apiInstance = new Fastly.RealtimeApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**getStatsLast120Seconds**](RealtimeApi.md#getStatsLast120Seconds) | **GET** /v1/channel/{service_id}/ts/h | Get real-time data for the last 120 seconds
[**getStatsLast120SecondsLimitEntries**](RealtimeApi.md#getStatsLast120SecondsLimitEntries) | **GET** /v1/channel/{service_id}/ts/h/limit/{max_entries} | Get a limited number of real-time data entries
[**getStatsLastSecond**](RealtimeApi.md#getStatsLastSecond) | **GET** /v1/channel/{service_id}/ts/{timestamp_in_seconds} | Get real-time data from specified time


## `getStatsLast120Seconds`

```javascript
getStatsLast120Seconds({ service_id })
```

Get data for the 120 seconds preceding the latest timestamp available for a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.getStatsLast120Seconds(options)
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

### Return type

[**Realtime**](Realtime.md)


## `getStatsLast120SecondsLimitEntries`

```javascript
getStatsLast120SecondsLimitEntries({ service_id, max_entries })
```

Get data for the 120 seconds preceding the latest timestamp available for a service, up to a maximum of `max_entries` entries.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  max_entries: 1, // required
};

apiInstance.getStatsLast120SecondsLimitEntries(options)
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
**max_entries** | **Number** | Maximum number of results to show. |

### Return type

[**Realtime**](Realtime.md)


## `getStatsLastSecond`

```javascript
getStatsLastSecond({ service_id, timestamp_in_seconds })
```

Get real-time data for the specified reporting period. Specify `0` to get a single entry for the last complete second. The `Timestamp` field included in the response provides the time index of the latest entry in the dataset and can be provided as the `start_timestamp` of the next request for a seamless continuation of the dataset from one request to the next.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  timestamp_in_seconds: 56, // required
};

apiInstance.getStatsLastSecond(options)
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
**timestamp_in_seconds** | **Number** | Timestamp in seconds (Unix epoch time). |

### Return type

[**Realtime**](Realtime.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
