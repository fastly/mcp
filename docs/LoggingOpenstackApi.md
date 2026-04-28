# Fastly.LoggingOpenstackApi

```javascript
const apiInstance = new Fastly.LoggingOpenstackApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createLogOpenstack**](LoggingOpenstackApi.md#createLogOpenstack) | **POST** /service/{service_id}/version/{version_id}/logging/openstack | Create an OpenStack log endpoint
[**deleteLogOpenstack**](LoggingOpenstackApi.md#deleteLogOpenstack) | **DELETE** /service/{service_id}/version/{version_id}/logging/openstack/{logging_openstack_name} | Delete an OpenStack log endpoint
[**getLogOpenstack**](LoggingOpenstackApi.md#getLogOpenstack) | **GET** /service/{service_id}/version/{version_id}/logging/openstack/{logging_openstack_name} | Get an OpenStack log endpoint
[**listLogOpenstack**](LoggingOpenstackApi.md#listLogOpenstack) | **GET** /service/{service_id}/version/{version_id}/logging/openstack | List OpenStack log endpoints
[**updateLogOpenstack**](LoggingOpenstackApi.md#updateLogOpenstack) | **PUT** /service/{service_id}/version/{version_id}/logging/openstack/{logging_openstack_name} | Update an OpenStack log endpoint


## `createLogOpenstack`

```javascript
createLogOpenstack({ service_id, version_id, [name, ][placement, ][response_condition, ][format, ][log_processing_region, ][format_version, ][message_type, ][timestamp_format, ][compression_codec, ][period, ][gzip_level, ][access_key, ][bucket_name, ][path, ][public_key, ][url, ][user] })
```

Create a openstack for a particular service and version.

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
  message_type: "classic",
  timestamp_format: "timestamp_format_example",
  compression_codec: "zstd",
  period: 3600,
  gzip_level: 0,
  access_key: "access_key_example",
  bucket_name: "bucket_name_example",
  path: "'null'",
  public_key: "'null'",
  url: "url_example",
  user: "user_example",
};

apiInstance.createLogOpenstack(options)
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
**message_type** | **String** | How the message should be formatted. | [optional] [one of: "classic", "loggly", "logplex", "blank"]
**timestamp_format** | **String** | A timestamp format | [optional]
**compression_codec** | **String** | The codec used for compressing your logs. Valid values are `zstd`, `snappy`, and `gzip`. Specifying both `compression_codec` and `gzip_level` in the same API request will result in an error. | [optional] [one of: "zstd", "snappy", "gzip"]
**period** | **Number** | How frequently log files are finalized so they can be available for reading (in seconds). | [optional] [defaults to 3600]
**gzip_level** | **Number** | The level of gzip encoding when sending logs (default `0`, no compression). Specifying both `compression_codec` and `gzip_level` in the same API request will result in an error. | [optional] [defaults to 0]
**access_key** | **String** | Your OpenStack account access key. | [optional]
**bucket_name** | **String** | The name of your OpenStack container. | [optional]
**path** | **String** | The path to upload logs to. | [optional] [defaults to 'null']
**public_key** | **String** | A PGP public key that Fastly will use to encrypt your log files before writing them to disk. | [optional] [defaults to 'null']
**url** | **String** | Your OpenStack auth url. | [optional]
**user** | **String** | The username for your OpenStack account. | [optional]

### Return type

[**LoggingOpenstackResponse**](LoggingOpenstackResponse.md)


## `deleteLogOpenstack`

```javascript
deleteLogOpenstack({ service_id, version_id, logging_openstack_name })
```

Delete the openstack for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_openstack_name: "logging_openstack_name_example", // required
};

apiInstance.deleteLogOpenstack(options)
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
**logging_openstack_name** | **String** | The name for the real-time logging configuration. |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `getLogOpenstack`

```javascript
getLogOpenstack({ service_id, version_id, logging_openstack_name })
```

Get the openstack for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_openstack_name: "logging_openstack_name_example", // required
};

apiInstance.getLogOpenstack(options)
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
**logging_openstack_name** | **String** | The name for the real-time logging configuration. |

### Return type

[**LoggingOpenstackResponse**](LoggingOpenstackResponse.md)


## `listLogOpenstack`

```javascript
listLogOpenstack({ service_id, version_id })
```

List all of the openstacks for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.listLogOpenstack(options)
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

[**[LoggingOpenstackResponse]**](LoggingOpenstackResponse.md)


## `updateLogOpenstack`

```javascript
updateLogOpenstack({ service_id, version_id, logging_openstack_name, [name, ][placement, ][response_condition, ][format, ][log_processing_region, ][format_version, ][message_type, ][timestamp_format, ][compression_codec, ][period, ][gzip_level, ][access_key, ][bucket_name, ][path, ][public_key, ][url, ][user] })
```

Update the openstack for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_openstack_name: "logging_openstack_name_example", // required
  name: "name_example",
  placement: "none",
  response_condition: "response_condition_example",
  format: "'%h %l %u %t \"%r\" %&gt;s %b'",
  log_processing_region: "none",
  format_version: 1,
  message_type: "classic",
  timestamp_format: "timestamp_format_example",
  compression_codec: "zstd",
  period: 3600,
  gzip_level: 0,
  access_key: "access_key_example",
  bucket_name: "bucket_name_example",
  path: "'null'",
  public_key: "'null'",
  url: "url_example",
  user: "user_example",
};

apiInstance.updateLogOpenstack(options)
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
**logging_openstack_name** | **String** | The name for the real-time logging configuration. |
**name** | **String** | The name for the real-time logging configuration. | [optional]
**placement** | **String** | Where in the generated VCL the logging call should be placed. If not set, endpoints with `format_version` of 2 are placed in `vcl_log` and those with `format_version` of 1 are placed in `vcl_deliver`.  | [optional] [one of: "none", "null"]
**response_condition** | **String** | The name of an existing condition in the configured endpoint, or leave blank to always execute. | [optional]
**format** | **String** | A Fastly [log format string](https://www.fastly.com/documentation/guides/integrations/streaming-logs/custom-log-formats/). | [optional] [defaults to '%h %l %u %t "%r" %&gt;s %b']
**log_processing_region** | **String** | The geographic region where the logs will be processed before streaming. Valid values are `us`, `eu`, and `none` for global. | [optional] [one of: "none", "eu", "us"]
**format_version** | **Number** | The version of the custom logging format used for the configured endpoint. The logging call gets placed by default in `vcl_log` if `format_version` is set to `2` and in `vcl_deliver` if `format_version` is set to `1`.  | [optional] [one of: 1, 2]
**message_type** | **String** | How the message should be formatted. | [optional] [one of: "classic", "loggly", "logplex", "blank"]
**timestamp_format** | **String** | A timestamp format | [optional]
**compression_codec** | **String** | The codec used for compressing your logs. Valid values are `zstd`, `snappy`, and `gzip`. Specifying both `compression_codec` and `gzip_level` in the same API request will result in an error. | [optional] [one of: "zstd", "snappy", "gzip"]
**period** | **Number** | How frequently log files are finalized so they can be available for reading (in seconds). | [optional] [defaults to 3600]
**gzip_level** | **Number** | The level of gzip encoding when sending logs (default `0`, no compression). Specifying both `compression_codec` and `gzip_level` in the same API request will result in an error. | [optional] [defaults to 0]
**access_key** | **String** | Your OpenStack account access key. | [optional]
**bucket_name** | **String** | The name of your OpenStack container. | [optional]
**path** | **String** | The path to upload logs to. | [optional] [defaults to 'null']
**public_key** | **String** | A PGP public key that Fastly will use to encrypt your log files before writing them to disk. | [optional] [defaults to 'null']
**url** | **String** | Your OpenStack auth url. | [optional]
**user** | **String** | The username for your OpenStack account. | [optional]

### Return type

[**LoggingOpenstackResponse**](LoggingOpenstackResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
