# Fastly.LoggingGcsApi

```javascript
const apiInstance = new Fastly.LoggingGcsApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createLogGcs**](LoggingGcsApi.md#createLogGcs) | **POST** /service/{service_id}/version/{version_id}/logging/gcs | Create a GCS log endpoint
[**deleteLogGcs**](LoggingGcsApi.md#deleteLogGcs) | **DELETE** /service/{service_id}/version/{version_id}/logging/gcs/{logging_gcs_name} | Delete a GCS log endpoint
[**getLogGcs**](LoggingGcsApi.md#getLogGcs) | **GET** /service/{service_id}/version/{version_id}/logging/gcs/{logging_gcs_name} | Get a GCS log endpoint
[**listLogGcs**](LoggingGcsApi.md#listLogGcs) | **GET** /service/{service_id}/version/{version_id}/logging/gcs | List GCS log endpoints
[**updateLogGcs**](LoggingGcsApi.md#updateLogGcs) | **PUT** /service/{service_id}/version/{version_id}/logging/gcs/{logging_gcs_name} | Update a GCS log endpoint


## `createLogGcs`

```javascript
createLogGcs({ service_id, version_id, [name, ][placement, ][response_condition, ][format, ][log_processing_region, ][format_version, ][message_type, ][timestamp_format, ][compression_codec, ][period, ][gzip_level, ][user, ][secret_key, ][account_name, ][bucket_name, ][path, ][public_key, ][project_id] })
```

Create GCS logging for a particular service and version.

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
  user: "user_example",
  secret_key: "secret_key_example",
  account_name: "account_name_example",
  bucket_name: "bucket_name_example",
  path: "'/'",
  public_key: "'null'",
  project_id: "project_id_example",
};

apiInstance.createLogGcs(options)
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
**user** | **String** | Your Google Cloud Platform service account email address. The `client_email` field in your service account authentication JSON. Not required if `account_name` is specified. | [optional]
**secret_key** | **String** | Your Google Cloud Platform account secret key. The `private_key` field in your service account authentication JSON. Not required if `account_name` is specified. | [optional]
**account_name** | **String** | The name of the Google Cloud Platform service account associated with the target log collection service. Not required if `user` and `secret_key` are provided. | [optional]
**bucket_name** | **String** | The name of the GCS bucket. | [optional]
**path** | **String** |  | [optional] [defaults to '/']
**public_key** | **String** | A PGP public key that Fastly will use to encrypt your log files before writing them to disk. | [optional] [defaults to 'null']
**project_id** | **String** | Your Google Cloud Platform project ID. Required | [optional]

### Return type

[**LoggingGcsResponse**](LoggingGcsResponse.md)


## `deleteLogGcs`

```javascript
deleteLogGcs({ service_id, version_id, logging_gcs_name })
```

Delete the GCS Logging for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_gcs_name: "logging_gcs_name_example", // required
};

apiInstance.deleteLogGcs(options)
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
**logging_gcs_name** | **String** | The name for the real-time logging configuration. |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `getLogGcs`

```javascript
getLogGcs({ service_id, version_id, logging_gcs_name })
```

Get the GCS Logging for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_gcs_name: "logging_gcs_name_example", // required
};

apiInstance.getLogGcs(options)
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
**logging_gcs_name** | **String** | The name for the real-time logging configuration. |

### Return type

[**LoggingGcsResponse**](LoggingGcsResponse.md)


## `listLogGcs`

```javascript
listLogGcs({ service_id, version_id })
```

List all of the GCS log endpoints for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.listLogGcs(options)
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

[**[LoggingGcsResponse]**](LoggingGcsResponse.md)


## `updateLogGcs`

```javascript
updateLogGcs({ service_id, version_id, logging_gcs_name, [name, ][placement, ][response_condition, ][format, ][log_processing_region, ][format_version, ][message_type, ][timestamp_format, ][compression_codec, ][period, ][gzip_level, ][user, ][secret_key, ][account_name, ][bucket_name, ][path, ][public_key, ][project_id] })
```

Update the GCS for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_gcs_name: "logging_gcs_name_example", // required
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
  user: "user_example",
  secret_key: "secret_key_example",
  account_name: "account_name_example",
  bucket_name: "bucket_name_example",
  path: "'/'",
  public_key: "'null'",
  project_id: "project_id_example",
};

apiInstance.updateLogGcs(options)
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
**logging_gcs_name** | **String** | The name for the real-time logging configuration. |
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
**user** | **String** | Your Google Cloud Platform service account email address. The `client_email` field in your service account authentication JSON. Not required if `account_name` is specified. | [optional]
**secret_key** | **String** | Your Google Cloud Platform account secret key. The `private_key` field in your service account authentication JSON. Not required if `account_name` is specified. | [optional]
**account_name** | **String** | The name of the Google Cloud Platform service account associated with the target log collection service. Not required if `user` and `secret_key` are provided. | [optional]
**bucket_name** | **String** | The name of the GCS bucket. | [optional]
**path** | **String** |  | [optional] [defaults to '/']
**public_key** | **String** | A PGP public key that Fastly will use to encrypt your log files before writing them to disk. | [optional] [defaults to 'null']
**project_id** | **String** | Your Google Cloud Platform project ID. Required | [optional]

### Return type

[**LoggingGcsResponse**](LoggingGcsResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
