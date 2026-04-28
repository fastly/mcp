# Fastly.StatsApi

```javascript
const apiInstance = new Fastly.StatsApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**getServiceStats**](StatsApi.md#getServiceStats) | **GET** /service/{service_id}/stats/summary | Get stats for a service


## `getServiceStats`

```javascript
getServiceStats({ service_id, [month, ][year, ][start_time, ][end_time] })
```

Get the stats from a service for a block of time. This lists all stats by PoP location, starting with AMS. This call requires parameters to select block of time to query. Use either a timestamp range (using start_time and end_time) or a specified month/year combo (using month and year).

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  month: 05,
  year: 2020,
  start_time: 1608560817,
  end_time: 1608560817,
};

apiInstance.getServiceStats(options)
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
**month** | **String** | 2-digit month. | [optional]
**year** | **String** | 4-digit year. | [optional]
**start_time** | **Number** | Epoch timestamp. Limits the results returned. | [optional]
**end_time** | **Number** | Epoch timestamp. Limits the results returned. | [optional]

### Return type

[**Stats**](Stats.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
