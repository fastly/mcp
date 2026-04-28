# Fastly.LoggingScalyrApi

```javascript
const apiInstance = new Fastly.LoggingScalyrApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createLogScalyr**](LoggingScalyrApi.md#createLogScalyr) | **POST** /service/{service_id}/version/{version_id}/logging/scalyr | Create a Scalyr log endpoint
[**deleteLogScalyr**](LoggingScalyrApi.md#deleteLogScalyr) | **DELETE** /service/{service_id}/version/{version_id}/logging/scalyr/{logging_scalyr_name} | Delete the Scalyr log endpoint
[**getLogScalyr**](LoggingScalyrApi.md#getLogScalyr) | **GET** /service/{service_id}/version/{version_id}/logging/scalyr/{logging_scalyr_name} | Get a Scalyr log endpoint
[**listLogScalyr**](LoggingScalyrApi.md#listLogScalyr) | **GET** /service/{service_id}/version/{version_id}/logging/scalyr | List Scalyr log endpoints
[**updateLogScalyr**](LoggingScalyrApi.md#updateLogScalyr) | **PUT** /service/{service_id}/version/{version_id}/logging/scalyr/{logging_scalyr_name} | Update the Scalyr log endpoint


## `createLogScalyr`

```javascript
createLogScalyr({ service_id, version_id, [name, ][placement, ][response_condition, ][format, ][log_processing_region, ][format_version, ][region, ][token, ][project_id] })
```

Create a Scalyr for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  name: "name_example",
  placement: "none",
  response_condition: "response_condition_example",
  format: "'%h %l %u %t \"%r\" %&gt;s %b'",
  log_processing_region: "none",
  format_version: 1,
  region: "US",
  token: "token_example",
  project_id: "'logplex'",
};

apiInstance.createLogScalyr(options)
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
**version_id** | **Number** | Integer identifying a service version. |
**name** | **String** | The name for the real-time logging configuration. | [optional]
**placement** | **String** | Where in the generated VCL the logging call should be placed. If not set, endpoints with `format_version` of 2 are placed in `vcl_log` and those with `format_version` of 1 are placed in `vcl_deliver`.  | [optional] [one of: "none", "null"]
**response_condition** | **String** | The name of an existing condition in the configured endpoint, or leave blank to always execute. | [optional]
**format** | **String** | A Fastly [log format string](https://www.fastly.com/documentation/guides/integrations/streaming-logs/custom-log-formats/). | [optional] [defaults to '%h %l %u %t "%r" %&gt;s %b']
**log_processing_region** | **String** | The geographic region where the logs will be processed before streaming. Valid values are `us`, `eu`, and `none` for global. | [optional] [one of: "none", "eu", "us"]
**format_version** | **Number** | The version of the custom logging format used for the configured endpoint. The logging call gets placed by default in `vcl_log` if `format_version` is set to `2` and in `vcl_deliver` if `format_version` is set to `1`.  | [optional] [one of: 1, 2]
**region** | **String** | The region that log data will be sent to. | [optional] [one of: "US", "EU"]
**token** | **String** | The token to use for authentication. | [optional]
**project_id** | **String** | The name of the logfile within Scalyr. | [optional] [defaults to 'logplex']

### Return type

[**LoggingScalyrResponse**](LoggingScalyrResponse.md)


## `deleteLogScalyr`

```javascript
deleteLogScalyr({ service_id, version_id, logging_scalyr_name })
```

Delete the Scalyr for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_scalyr_name: "logging_scalyr_name_example", // required
};

apiInstance.deleteLogScalyr(options)
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
**version_id** | **Number** | Integer identifying a service version. |
**logging_scalyr_name** | **String** | The name for the real-time logging configuration. |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `getLogScalyr`

```javascript
getLogScalyr({ service_id, version_id, logging_scalyr_name })
```

Get the Scalyr for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_scalyr_name: "logging_scalyr_name_example", // required
};

apiInstance.getLogScalyr(options)
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
**version_id** | **Number** | Integer identifying a service version. |
**logging_scalyr_name** | **String** | The name for the real-time logging configuration. |

### Return type

[**LoggingScalyrResponse**](LoggingScalyrResponse.md)


## `listLogScalyr`

```javascript
listLogScalyr({ service_id, version_id })
```

List all of the Scalyrs for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.listLogScalyr(options)
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
**version_id** | **Number** | Integer identifying a service version. |

### Return type

[**[LoggingScalyrResponse]**](LoggingScalyrResponse.md)


## `updateLogScalyr`

```javascript
updateLogScalyr({ service_id, version_id, logging_scalyr_name, [name, ][placement, ][response_condition, ][format, ][log_processing_region, ][format_version, ][region, ][token, ][project_id] })
```

Update the Scalyr for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_scalyr_name: "logging_scalyr_name_example", // required
  name: "name_example",
  placement: "none",
  response_condition: "response_condition_example",
  format: "'%h %l %u %t \"%r\" %&gt;s %b'",
  log_processing_region: "none",
  format_version: 1,
  region: "US",
  token: "token_example",
  project_id: "'logplex'",
};

apiInstance.updateLogScalyr(options)
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
**version_id** | **Number** | Integer identifying a service version. |
**logging_scalyr_name** | **String** | The name for the real-time logging configuration. |
**name** | **String** | The name for the real-time logging configuration. | [optional]
**placement** | **String** | Where in the generated VCL the logging call should be placed. If not set, endpoints with `format_version` of 2 are placed in `vcl_log` and those with `format_version` of 1 are placed in `vcl_deliver`.  | [optional] [one of: "none", "null"]
**response_condition** | **String** | The name of an existing condition in the configured endpoint, or leave blank to always execute. | [optional]
**format** | **String** | A Fastly [log format string](https://www.fastly.com/documentation/guides/integrations/streaming-logs/custom-log-formats/). | [optional] [defaults to '%h %l %u %t "%r" %&gt;s %b']
**log_processing_region** | **String** | The geographic region where the logs will be processed before streaming. Valid values are `us`, `eu`, and `none` for global. | [optional] [one of: "none", "eu", "us"]
**format_version** | **Number** | The version of the custom logging format used for the configured endpoint. The logging call gets placed by default in `vcl_log` if `format_version` is set to `2` and in `vcl_deliver` if `format_version` is set to `1`.  | [optional] [one of: 1, 2]
**region** | **String** | The region that log data will be sent to. | [optional] [one of: "US", "EU"]
**token** | **String** | The token to use for authentication. | [optional]
**project_id** | **String** | The name of the logfile within Scalyr. | [optional] [defaults to 'logplex']

### Return type

[**LoggingScalyrResponse**](LoggingScalyrResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
