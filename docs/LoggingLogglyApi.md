# Fastly.LoggingLogglyApi

```javascript
const apiInstance = new Fastly.LoggingLogglyApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createLogLoggly**](LoggingLogglyApi.md#createLogLoggly) | **POST** /service/{service_id}/version/{version_id}/logging/loggly | Create a Loggly log endpoint
[**deleteLogLoggly**](LoggingLogglyApi.md#deleteLogLoggly) | **DELETE** /service/{service_id}/version/{version_id}/logging/loggly/{logging_loggly_name} | Delete a Loggly log endpoint
[**getLogLoggly**](LoggingLogglyApi.md#getLogLoggly) | **GET** /service/{service_id}/version/{version_id}/logging/loggly/{logging_loggly_name} | Get a Loggly log endpoint
[**listLogLoggly**](LoggingLogglyApi.md#listLogLoggly) | **GET** /service/{service_id}/version/{version_id}/logging/loggly | List Loggly log endpoints
[**updateLogLoggly**](LoggingLogglyApi.md#updateLogLoggly) | **PUT** /service/{service_id}/version/{version_id}/logging/loggly/{logging_loggly_name} | Update a Loggly log endpoint


## `createLogLoggly`

```javascript
createLogLoggly({ service_id, version_id, [name, ][placement, ][response_condition, ][format, ][log_processing_region, ][format_version, ][token] })
```

Create a Loggly logging object for a particular service and version.

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
  token: "token_example",
};

apiInstance.createLogLoggly(options)
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
**token** | **String** | The token to use for authentication ([https://www.loggly.com/docs/customer-token-authentication-token/](https://www.loggly.com/docs/customer-token-authentication-token/)). | [optional]

### Return type

[**LoggingLogglyResponse**](LoggingLogglyResponse.md)


## `deleteLogLoggly`

```javascript
deleteLogLoggly({ service_id, version_id, logging_loggly_name })
```

Delete the Loggly logging object for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_loggly_name: "logging_loggly_name_example", // required
};

apiInstance.deleteLogLoggly(options)
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
**logging_loggly_name** | **String** | The name for the real-time logging configuration. |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `getLogLoggly`

```javascript
getLogLoggly({ service_id, version_id, logging_loggly_name })
```

Get the Loggly logging object for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_loggly_name: "logging_loggly_name_example", // required
};

apiInstance.getLogLoggly(options)
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
**logging_loggly_name** | **String** | The name for the real-time logging configuration. |

### Return type

[**LoggingLogglyResponse**](LoggingLogglyResponse.md)


## `listLogLoggly`

```javascript
listLogLoggly({ service_id, version_id })
```

List all Loggly logging objects for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.listLogLoggly(options)
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

[**[LoggingLogglyResponse]**](LoggingLogglyResponse.md)


## `updateLogLoggly`

```javascript
updateLogLoggly({ service_id, version_id, logging_loggly_name, [name, ][placement, ][response_condition, ][format, ][log_processing_region, ][format_version, ][token] })
```

Update the Loggly logging object for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_loggly_name: "logging_loggly_name_example", // required
  name: "name_example",
  placement: "none",
  response_condition: "response_condition_example",
  format: "'%h %l %u %t \"%r\" %&gt;s %b'",
  log_processing_region: "none",
  format_version: 1,
  token: "token_example",
};

apiInstance.updateLogLoggly(options)
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
**logging_loggly_name** | **String** | The name for the real-time logging configuration. |
**name** | **String** | The name for the real-time logging configuration. | [optional]
**placement** | **String** | Where in the generated VCL the logging call should be placed. If not set, endpoints with `format_version` of 2 are placed in `vcl_log` and those with `format_version` of 1 are placed in `vcl_deliver`.  | [optional] [one of: "none", "null"]
**response_condition** | **String** | The name of an existing condition in the configured endpoint, or leave blank to always execute. | [optional]
**format** | **String** | A Fastly [log format string](https://www.fastly.com/documentation/guides/integrations/streaming-logs/custom-log-formats/). | [optional] [defaults to '%h %l %u %t "%r" %&gt;s %b']
**log_processing_region** | **String** | The geographic region where the logs will be processed before streaming. Valid values are `us`, `eu`, and `none` for global. | [optional] [one of: "none", "eu", "us"]
**format_version** | **Number** | The version of the custom logging format used for the configured endpoint. The logging call gets placed by default in `vcl_log` if `format_version` is set to `2` and in `vcl_deliver` if `format_version` is set to `1`.  | [optional] [one of: 1, 2]
**token** | **String** | The token to use for authentication ([https://www.loggly.com/docs/customer-token-authentication-token/](https://www.loggly.com/docs/customer-token-authentication-token/)). | [optional]

### Return type

[**LoggingLogglyResponse**](LoggingLogglyResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
