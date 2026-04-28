# Fastly.OriginInspectorRealtimeApi

```javascript
const apiInstance = new Fastly.OriginInspectorRealtimeApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**getOriginInspectorLast120Seconds**](OriginInspectorRealtimeApi.md#getOriginInspectorLast120Seconds) | **GET** /v1/origins/{service_id}/ts/h | Get real-time origin data for the last 120 seconds
[**getOriginInspectorLastMaxEntries**](OriginInspectorRealtimeApi.md#getOriginInspectorLastMaxEntries) | **GET** /v1/origins/{service_id}/ts/h/limit/{max_entries} | Get a limited number of real-time origin data entries
[**getOriginInspectorLastSecond**](OriginInspectorRealtimeApi.md#getOriginInspectorLastSecond) | **GET** /v1/origins/{service_id}/ts/{start_timestamp} | Get real-time origin data from specific time.


## `getOriginInspectorLast120Seconds`

```javascript
getOriginInspectorLast120Seconds({ service_id })
```

Get data for the 120 seconds preceding the latest timestamp available for a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.getOriginInspectorLast120Seconds(options)
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

[**OriginInspector**](OriginInspector.md)


## `getOriginInspectorLastMaxEntries`

```javascript
getOriginInspectorLastMaxEntries({ service_id, max_entries })
```

Get data for the `max_entries` seconds preceding the latest timestamp available for a service, up to a maximum of 120 entries.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  max_entries: 1, // required
};

apiInstance.getOriginInspectorLastMaxEntries(options)
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
**max_entries** | **Number** | Maximum number of results to display. |

### Return type

[**OriginInspector**](OriginInspector.md)


## `getOriginInspectorLastSecond`

```javascript
getOriginInspectorLastSecond({ service_id, start_timestamp })
```

Get real-time origin data for the specified reporting period. Specify `0` to get a single entry for the last complete second. The `Timestamp` field included in the response provides the time index of the latest entry in the dataset and can be provided as the `start_timestamp` of the next request for a seamless continuation of the dataset from one request to the next. Due to processing latency, the earliest entry in the response dataset may be earlier than `start_timestamp` by the value of `AggregateDelay`. 

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  start_timestamp: 56, // required
};

apiInstance.getOriginInspectorLastSecond(options)
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
**start_timestamp** | **Number** | Timestamp in seconds (Unix epoch time). |

### Return type

[**OriginInspector**](OriginInspector.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
