# Fastly.LoggingPapertrailApi

```javascript
const apiInstance = new Fastly.LoggingPapertrailApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createLogPapertrail**](LoggingPapertrailApi.md#createLogPapertrail) | **POST** /service/{service_id}/version/{version_id}/logging/papertrail | Create a Papertrail log endpoint
[**deleteLogPapertrail**](LoggingPapertrailApi.md#deleteLogPapertrail) | **DELETE** /service/{service_id}/version/{version_id}/logging/papertrail/{logging_papertrail_name} | Delete a Papertrail log endpoint
[**getLogPapertrail**](LoggingPapertrailApi.md#getLogPapertrail) | **GET** /service/{service_id}/version/{version_id}/logging/papertrail/{logging_papertrail_name} | Get a Papertrail log endpoint
[**listLogPapertrail**](LoggingPapertrailApi.md#listLogPapertrail) | **GET** /service/{service_id}/version/{version_id}/logging/papertrail | List Papertrail log endpoints
[**updateLogPapertrail**](LoggingPapertrailApi.md#updateLogPapertrail) | **PUT** /service/{service_id}/version/{version_id}/logging/papertrail/{logging_papertrail_name} | Update a Papertrail log endpoint


## `createLogPapertrail`

```javascript
createLogPapertrail({ service_id, version_id, [name, ][placement, ][response_condition, ][format, ][log_processing_region, ][format_version, ][address, ][port] })
```

Create a Papertrail for a particular service and version.

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
  address: "address_example",
  port: 514,
};

apiInstance.createLogPapertrail(options)
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
**address** | **String** | A hostname or IPv4 address. | [optional]
**port** | **Number** | The port number. | [optional] [defaults to 514]

### Return type

[**LoggingPapertrailResponse**](LoggingPapertrailResponse.md)


## `deleteLogPapertrail`

```javascript
deleteLogPapertrail({ service_id, version_id, logging_papertrail_name })
```

Delete the Papertrail for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_papertrail_name: "logging_papertrail_name_example", // required
};

apiInstance.deleteLogPapertrail(options)
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
**logging_papertrail_name** | **String** | The name for the real-time logging configuration. |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `getLogPapertrail`

```javascript
getLogPapertrail({ service_id, version_id, logging_papertrail_name })
```

Get the Papertrail for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_papertrail_name: "logging_papertrail_name_example", // required
};

apiInstance.getLogPapertrail(options)
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
**logging_papertrail_name** | **String** | The name for the real-time logging configuration. |

### Return type

[**LoggingPapertrailResponse**](LoggingPapertrailResponse.md)


## `listLogPapertrail`

```javascript
listLogPapertrail({ service_id, version_id })
```

List all of the Papertrails for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.listLogPapertrail(options)
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

[**[LoggingPapertrailResponse]**](LoggingPapertrailResponse.md)


## `updateLogPapertrail`

```javascript
updateLogPapertrail({ service_id, version_id, logging_papertrail_name, [name, ][placement, ][response_condition, ][format, ][log_processing_region, ][format_version, ][address, ][port] })
```

Update the Papertrail for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_papertrail_name: "logging_papertrail_name_example", // required
  name: "name_example",
  placement: "none",
  response_condition: "response_condition_example",
  format: "'%h %l %u %t \"%r\" %&gt;s %b'",
  log_processing_region: "none",
  format_version: 1,
  address: "address_example",
  port: 514,
};

apiInstance.updateLogPapertrail(options)
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
**logging_papertrail_name** | **String** | The name for the real-time logging configuration. |
**name** | **String** | The name for the real-time logging configuration. | [optional]
**placement** | **String** | Where in the generated VCL the logging call should be placed. If not set, endpoints with `format_version` of 2 are placed in `vcl_log` and those with `format_version` of 1 are placed in `vcl_deliver`.  | [optional] [one of: "none", "null"]
**response_condition** | **String** | The name of an existing condition in the configured endpoint, or leave blank to always execute. | [optional]
**format** | **String** | A Fastly [log format string](https://www.fastly.com/documentation/guides/integrations/streaming-logs/custom-log-formats/). | [optional] [defaults to '%h %l %u %t "%r" %&gt;s %b']
**log_processing_region** | **String** | The geographic region where the logs will be processed before streaming. Valid values are `us`, `eu`, and `none` for global. | [optional] [one of: "none", "eu", "us"]
**format_version** | **Number** | The version of the custom logging format used for the configured endpoint. The logging call gets placed by default in `vcl_log` if `format_version` is set to `2` and in `vcl_deliver` if `format_version` is set to `1`.  | [optional] [one of: 1, 2]
**address** | **String** | A hostname or IPv4 address. | [optional]
**port** | **Number** | The port number. | [optional] [defaults to 514]

### Return type

[**LoggingPapertrailResponse**](LoggingPapertrailResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
