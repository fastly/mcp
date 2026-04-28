# Fastly.DomainInspectorRealtimeApi

```javascript
const apiInstance = new Fastly.DomainInspectorRealtimeApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**getDomainInspectorLast120Seconds**](DomainInspectorRealtimeApi.md#getDomainInspectorLast120Seconds) | **GET** /v1/domains/{service_id}/ts/h | Get real-time domain data for the last 120 seconds
[**getDomainInspectorLastMaxEntries**](DomainInspectorRealtimeApi.md#getDomainInspectorLastMaxEntries) | **GET** /v1/domains/{service_id}/ts/h/limit/{max_entries} | Get a limited number of real-time domain data entries
[**getDomainInspectorLastSecond**](DomainInspectorRealtimeApi.md#getDomainInspectorLastSecond) | **GET** /v1/domains/{service_id}/ts/{start_timestamp} | Get real-time domain data from a specified time


## `getDomainInspectorLast120Seconds`

```javascript
getDomainInspectorLast120Seconds({ service_id })
```

Get data for the 120 seconds preceding the latest timestamp available for a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.getDomainInspectorLast120Seconds(options)
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

[**DomainInspector**](DomainInspector.md)


## `getDomainInspectorLastMaxEntries`

```javascript
getDomainInspectorLastMaxEntries({ service_id, max_entries })
```

Get data for the `max_entries` seconds preceding the latest timestamp available for a service, up to a maximum of 120 entries.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  max_entries: 1, // required
};

apiInstance.getDomainInspectorLastMaxEntries(options)
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

[**DomainInspector**](DomainInspector.md)


## `getDomainInspectorLastSecond`

```javascript
getDomainInspectorLastSecond({ service_id, start_timestamp })
```

Get real-time domain data for the specified reporting period. Specify `0` to get a single entry for the last complete second. The `Timestamp` field included in the response provides the time index of the latest entry in the dataset and can be provided as the `start_timestamp` of the next request for a seamless continuation of the dataset from one request to the next. Due to processing latency, the earliest entry in the response dataset may be earlier than `start_timestamp` by the value of `AggregateDelay`. 

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  start_timestamp: 56, // required
};

apiInstance.getDomainInspectorLastSecond(options)
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

[**DomainInspector**](DomainInspector.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
