# Fastly.LoggingFtpApi

```javascript
const apiInstance = new Fastly.LoggingFtpApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createLogFtp**](LoggingFtpApi.md#createLogFtp) | **POST** /service/{service_id}/version/{version_id}/logging/ftp | Create an FTP log endpoint
[**deleteLogFtp**](LoggingFtpApi.md#deleteLogFtp) | **DELETE** /service/{service_id}/version/{version_id}/logging/ftp/{logging_ftp_name} | Delete an FTP log endpoint
[**getLogFtp**](LoggingFtpApi.md#getLogFtp) | **GET** /service/{service_id}/version/{version_id}/logging/ftp/{logging_ftp_name} | Get an FTP log endpoint
[**listLogFtp**](LoggingFtpApi.md#listLogFtp) | **GET** /service/{service_id}/version/{version_id}/logging/ftp | List FTP log endpoints
[**updateLogFtp**](LoggingFtpApi.md#updateLogFtp) | **PUT** /service/{service_id}/version/{version_id}/logging/ftp/{logging_ftp_name} | Update an FTP log endpoint


## `createLogFtp`

```javascript
createLogFtp({ service_id, version_id, [name, ][placement, ][response_condition, ][format, ][log_processing_region, ][format_version, ][message_type, ][timestamp_format, ][compression_codec, ][period, ][gzip_level, ][address, ][hostname, ][ipv4, ][password, ][path, ][public_key, ][user, ][port] })
```

Create a FTP for a particular service and version.

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
  address: "address_example",
  hostname: "hostname_example",
  ipv4: "ipv4_example",
  password: "password_example",
  path: "path_example",
  public_key: "'null'",
  user: "user_example",
  port: 21,
};

apiInstance.createLogFtp(options)
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
**address** | **String** | An hostname or IPv4 address. | [optional]
**hostname** | **String** | Hostname used. | [optional]
**ipv4** | **String** | IPv4 address of the host. | [optional]
**password** | **String** | The password for the server. For anonymous use an email address. | [optional]
**path** | **String** | The path to upload log files to. If the path ends in `/` then it is treated as a directory. | [optional]
**public_key** | **String** | A PGP public key that Fastly will use to encrypt your log files before writing them to disk. | [optional] [defaults to 'null']
**user** | **String** | The username for the server. Can be anonymous. | [optional]
**port** | **Number** | The port number. | [optional] [defaults to 21]

### Return type

[**LoggingFtpResponse**](LoggingFtpResponse.md)


## `deleteLogFtp`

```javascript
deleteLogFtp({ service_id, version_id, logging_ftp_name })
```

Delete the FTP for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_ftp_name: "logging_ftp_name_example", // required
};

apiInstance.deleteLogFtp(options)
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
**logging_ftp_name** | **String** | The name for the real-time logging configuration. |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `getLogFtp`

```javascript
getLogFtp({ service_id, version_id, logging_ftp_name })
```

Get the FTP for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_ftp_name: "logging_ftp_name_example", // required
};

apiInstance.getLogFtp(options)
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
**logging_ftp_name** | **String** | The name for the real-time logging configuration. |

### Return type

[**LoggingFtpResponse**](LoggingFtpResponse.md)


## `listLogFtp`

```javascript
listLogFtp({ service_id, version_id })
```

List all of the FTPs for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.listLogFtp(options)
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

[**[LoggingFtpResponse]**](LoggingFtpResponse.md)


## `updateLogFtp`

```javascript
updateLogFtp({ service_id, version_id, logging_ftp_name, [name, ][placement, ][response_condition, ][format, ][log_processing_region, ][format_version, ][message_type, ][timestamp_format, ][compression_codec, ][period, ][gzip_level, ][address, ][hostname, ][ipv4, ][password, ][path, ][public_key, ][user, ][port] })
```

Update the FTP for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_ftp_name: "logging_ftp_name_example", // required
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
  address: "address_example",
  hostname: "hostname_example",
  ipv4: "ipv4_example",
  password: "password_example",
  path: "path_example",
  public_key: "'null'",
  user: "user_example",
  port: 21,
};

apiInstance.updateLogFtp(options)
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
**logging_ftp_name** | **String** | The name for the real-time logging configuration. |
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
**address** | **String** | An hostname or IPv4 address. | [optional]
**hostname** | **String** | Hostname used. | [optional]
**ipv4** | **String** | IPv4 address of the host. | [optional]
**password** | **String** | The password for the server. For anonymous use an email address. | [optional]
**path** | **String** | The path to upload log files to. If the path ends in `/` then it is treated as a directory. | [optional]
**public_key** | **String** | A PGP public key that Fastly will use to encrypt your log files before writing them to disk. | [optional] [defaults to 'null']
**user** | **String** | The username for the server. Can be anonymous. | [optional]
**port** | **Number** | The port number. | [optional] [defaults to 21]

### Return type

[**LoggingFtpResponse**](LoggingFtpResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
