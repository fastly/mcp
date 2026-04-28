# Fastly.LoggingAzureblobApi

```javascript
const apiInstance = new Fastly.LoggingAzureblobApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createLogAzure**](LoggingAzureblobApi.md#createLogAzure) | **POST** /service/{service_id}/version/{version_id}/logging/azureblob | Create an Azure Blob Storage log endpoint
[**deleteLogAzure**](LoggingAzureblobApi.md#deleteLogAzure) | **DELETE** /service/{service_id}/version/{version_id}/logging/azureblob/{logging_azureblob_name} | Delete the Azure Blob Storage log endpoint
[**getLogAzure**](LoggingAzureblobApi.md#getLogAzure) | **GET** /service/{service_id}/version/{version_id}/logging/azureblob/{logging_azureblob_name} | Get an Azure Blob Storage log endpoint
[**listLogAzure**](LoggingAzureblobApi.md#listLogAzure) | **GET** /service/{service_id}/version/{version_id}/logging/azureblob | List Azure Blob Storage log endpoints
[**updateLogAzure**](LoggingAzureblobApi.md#updateLogAzure) | **PUT** /service/{service_id}/version/{version_id}/logging/azureblob/{logging_azureblob_name} | Update an Azure Blob Storage log endpoint


## `createLogAzure`

```javascript
createLogAzure({ service_id, version_id, [name, ][placement, ][response_condition, ][format, ][log_processing_region, ][format_version, ][message_type, ][timestamp_format, ][compression_codec, ][period, ][gzip_level, ][path, ][account_name, ][container, ][sas_token, ][public_key, ][file_max_bytes] })
```

Create an Azure Blob Storage logging endpoint for a particular service and version.

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
  path: "'null'",
  account_name: "account_name_example",
  container: "container_example",
  sas_token: "sas_token_example",
  public_key: "'null'",
  file_max_bytes: 56,
};

apiInstance.createLogAzure(options)
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
**path** | **String** | The path to upload logs to. | [optional] [defaults to 'null']
**account_name** | **String** | The unique Azure Blob Storage namespace in which your data objects are stored. Required. | [optional]
**container** | **String** | The name of the Azure Blob Storage container in which to store logs. Required. | [optional]
**sas_token** | **String** | The Azure shared access signature providing write access to the blob service objects. Be sure to update your token before it expires or the logging functionality will not work. Required. | [optional]
**public_key** | **String** | A PGP public key that Fastly will use to encrypt your log files before writing them to disk. | [optional] [defaults to 'null']
**file_max_bytes** | **Number** | The maximum number of bytes for each uploaded file. A value of 0 can be used to indicate there is no limit on the size of uploaded files, otherwise the minimum value is 1048576 bytes (1 MiB). Note that Microsoft Azure Storage has [block size limits](https://learn.microsoft.com/en-us/rest/api/storageservices/put-block?tabs&#x3D;microsoft-entra-id#remarks). | [optional]

### Return type

[**LoggingAzureblobResponse**](LoggingAzureblobResponse.md)


## `deleteLogAzure`

```javascript
deleteLogAzure({ service_id, version_id, logging_azureblob_name })
```

Delete the Azure Blob Storage logging endpoint for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_azureblob_name: "logging_azureblob_name_example", // required
};

apiInstance.deleteLogAzure(options)
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
**logging_azureblob_name** | **String** | The name for the real-time logging configuration. |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `getLogAzure`

```javascript
getLogAzure({ service_id, version_id, logging_azureblob_name })
```

Get the Azure Blob Storage logging endpoint for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_azureblob_name: "logging_azureblob_name_example", // required
};

apiInstance.getLogAzure(options)
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
**logging_azureblob_name** | **String** | The name for the real-time logging configuration. |

### Return type

[**LoggingAzureblobResponse**](LoggingAzureblobResponse.md)


## `listLogAzure`

```javascript
listLogAzure({ service_id, version_id })
```

List all of the Azure Blob Storage logging endpoints for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.listLogAzure(options)
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

[**[LoggingAzureblobResponse]**](LoggingAzureblobResponse.md)


## `updateLogAzure`

```javascript
updateLogAzure({ service_id, version_id, logging_azureblob_name, [name, ][placement, ][response_condition, ][format, ][log_processing_region, ][format_version, ][message_type, ][timestamp_format, ][compression_codec, ][period, ][gzip_level, ][path, ][account_name, ][container, ][sas_token, ][public_key, ][file_max_bytes] })
```

Update the Azure Blob Storage logging endpoint for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_azureblob_name: "logging_azureblob_name_example", // required
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
  path: "'null'",
  account_name: "account_name_example",
  container: "container_example",
  sas_token: "sas_token_example",
  public_key: "'null'",
  file_max_bytes: 56,
};

apiInstance.updateLogAzure(options)
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
**logging_azureblob_name** | **String** | The name for the real-time logging configuration. |
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
**path** | **String** | The path to upload logs to. | [optional] [defaults to 'null']
**account_name** | **String** | The unique Azure Blob Storage namespace in which your data objects are stored. Required. | [optional]
**container** | **String** | The name of the Azure Blob Storage container in which to store logs. Required. | [optional]
**sas_token** | **String** | The Azure shared access signature providing write access to the blob service objects. Be sure to update your token before it expires or the logging functionality will not work. Required. | [optional]
**public_key** | **String** | A PGP public key that Fastly will use to encrypt your log files before writing them to disk. | [optional] [defaults to 'null']
**file_max_bytes** | **Number** | The maximum number of bytes for each uploaded file. A value of 0 can be used to indicate there is no limit on the size of uploaded files, otherwise the minimum value is 1048576 bytes (1 MiB). Note that Microsoft Azure Storage has [block size limits](https://learn.microsoft.com/en-us/rest/api/storageservices/put-block?tabs&#x3D;microsoft-entra-id#remarks). | [optional]

### Return type

[**LoggingAzureblobResponse**](LoggingAzureblobResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
