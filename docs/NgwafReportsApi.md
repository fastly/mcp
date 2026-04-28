# Fastly.NgwafReportsApi

```javascript
const apiInstance = new Fastly.NgwafReportsApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**getAttacksReport**](NgwafReportsApi.md#getAttacksReport) | **GET** /ngwaf/v1/reports/attacks | Get attacks report
[**getSignalsReport**](NgwafReportsApi.md#getSignalsReport) | **GET** /ngwaf/v1/reports/signals | Get signals report


## `getAttacksReport`

```javascript
getAttacksReport({ from, [to] })
```

Get attacks report

### Example

```javascript
const options = {
  from: 2019-08-20T18:07:33Z, // required
  to: 2019-08-21T18:07:33Z,
};

apiInstance.getAttacksReport(options)
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
**from** | **Date** | The start of a time range in RFC 3339 format. |
**to** | **Date** | The end of a time range in RFC 3339 format. Defaults to the current time. | [optional]

### Return type

[**ListAttackReport**](ListAttackReport.md)


## `getSignalsReport`

```javascript
getSignalsReport({ from, [to, ][signal_type] })
```

Get signals report

### Example

```javascript
const options = {
  from: 2019-08-20T18:07:33Z, // required
  to: 2019-08-21T18:07:33Z,
  signal_type: "account",
};

apiInstance.getSignalsReport(options)
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
**from** | **Date** | The start of a time range in RFC 3339 format. |
**to** | **Date** | The end of a time range in RFC 3339 format. Defaults to the current time. | [optional]
**signal_type** | **String** | The type of signal | [optional] [one of: "account", "anomaly", "attack", "bot", "all"]

### Return type

[**ListSignalReport**](ListSignalReport.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
