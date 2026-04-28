# Fastly.LoggingS3Api

```javascript
const apiInstance = new Fastly.LoggingS3Api();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createLogAwsS3**](LoggingS3Api.md#createLogAwsS3) | **POST** /service/{service_id}/version/{version_id}/logging/s3 | Create an AWS S3 log endpoint
[**deleteLogAwsS3**](LoggingS3Api.md#deleteLogAwsS3) | **DELETE** /service/{service_id}/version/{version_id}/logging/s3/{logging_s3_name} | Delete an AWS S3 log endpoint
[**getLogAwsS3**](LoggingS3Api.md#getLogAwsS3) | **GET** /service/{service_id}/version/{version_id}/logging/s3/{logging_s3_name} | Get an AWS S3 log endpoint
[**listLogAwsS3**](LoggingS3Api.md#listLogAwsS3) | **GET** /service/{service_id}/version/{version_id}/logging/s3 | List AWS S3 log endpoints
[**updateLogAwsS3**](LoggingS3Api.md#updateLogAwsS3) | **PUT** /service/{service_id}/version/{version_id}/logging/s3/{logging_s3_name} | Update an AWS S3 log endpoint


## `createLogAwsS3`

```javascript
createLogAwsS3({ service_id, version_id, [name, ][placement, ][response_condition, ][format, ][log_processing_region, ][format_version, ][message_type, ][timestamp_format, ][compression_codec, ][period, ][gzip_level, ][access_key, ][acl, ][bucket_name, ][domain, ][iam_role, ][path, ][public_key, ][redundancy, ][secret_key, ][server_side_encryption_kms_key_id, ][server_side_encryption, ][file_max_bytes] })
```

Create a S3 for a particular service and version.

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
  acl: "acl_example",
  bucket_name: "bucket_name_example",
  domain: "domain_example",
  iam_role: "iam_role_example",
  path: "'null'",
  public_key: "'null'",
  redundancy: "'null'",
  secret_key: "secret_key_example",
  server_side_encryption_kms_key_id: "'null'",
  server_side_encryption: "'null'",
  file_max_bytes: 56,
};

apiInstance.createLogAwsS3(options)
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
**access_key** | **String** | The access key for your S3 account. Not required if `iam_role` is provided. | [optional]
**acl** | **String** | The access control list (ACL) specific request header. See the AWS documentation for [Access Control List (ACL) Specific Request Headers](https://docs.aws.amazon.com/AmazonS3/latest/API/mpUploadInitiate.html#initiate-mpu-acl-specific-request-headers) for more information. | [optional]
**bucket_name** | **String** | The bucket name for S3 account. | [optional]
**domain** | **String** | The domain of the Amazon S3 endpoint. | [optional]
**iam_role** | **String** | The Amazon Resource Name (ARN) for the IAM role granting Fastly access to S3. Not required if `access_key` and `secret_key` are provided. | [optional]
**path** | **String** | The path to upload logs to. | [optional] [defaults to 'null']
**public_key** | **String** | A PGP public key that Fastly will use to encrypt your log files before writing them to disk. | [optional] [defaults to 'null']
**redundancy** | **String** | The S3 redundancy level. | [optional] [defaults to 'null']
**secret_key** | **String** | The secret key for your S3 account. Not required if `iam_role` is provided. | [optional]
**server_side_encryption_kms_key_id** | **String** | Optional server-side KMS Key Id. Must be set if `server_side_encryption` is set to `aws:kms` or `AES256`. | [optional] [defaults to 'null']
**server_side_encryption** | **String** | Set this to `AES256` or `aws:kms` to enable S3 Server Side Encryption. | [optional] [defaults to 'null']
**file_max_bytes** | **Number** | The maximum number of bytes for each uploaded file. A value of 0 can be used to indicate there is no limit on the size of uploaded files, otherwise the minimum value is 1048576 bytes (1 MiB.) | [optional]

### Return type

[**LoggingS3Response**](LoggingS3Response.md)


## `deleteLogAwsS3`

```javascript
deleteLogAwsS3({ service_id, version_id, logging_s3_name })
```

Delete the S3 for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_s3_name: "logging_s3_name_example", // required
};

apiInstance.deleteLogAwsS3(options)
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
**logging_s3_name** | **String** | The name for the real-time logging configuration. |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `getLogAwsS3`

```javascript
getLogAwsS3({ service_id, version_id, logging_s3_name })
```

Get the S3 for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_s3_name: "logging_s3_name_example", // required
};

apiInstance.getLogAwsS3(options)
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
**logging_s3_name** | **String** | The name for the real-time logging configuration. |

### Return type

[**LoggingS3Response**](LoggingS3Response.md)


## `listLogAwsS3`

```javascript
listLogAwsS3({ service_id, version_id })
```

List all of the S3s for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.listLogAwsS3(options)
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

[**[LoggingS3Response]**](LoggingS3Response.md)


## `updateLogAwsS3`

```javascript
updateLogAwsS3({ service_id, version_id, logging_s3_name, [name, ][placement, ][response_condition, ][format, ][log_processing_region, ][format_version, ][message_type, ][timestamp_format, ][compression_codec, ][period, ][gzip_level, ][access_key, ][acl, ][bucket_name, ][domain, ][iam_role, ][path, ][public_key, ][redundancy, ][secret_key, ][server_side_encryption_kms_key_id, ][server_side_encryption, ][file_max_bytes] })
```

Update the S3 for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_s3_name: "logging_s3_name_example", // required
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
  acl: "acl_example",
  bucket_name: "bucket_name_example",
  domain: "domain_example",
  iam_role: "iam_role_example",
  path: "'null'",
  public_key: "'null'",
  redundancy: "'null'",
  secret_key: "secret_key_example",
  server_side_encryption_kms_key_id: "'null'",
  server_side_encryption: "'null'",
  file_max_bytes: 56,
};

apiInstance.updateLogAwsS3(options)
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
**logging_s3_name** | **String** | The name for the real-time logging configuration. |
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
**access_key** | **String** | The access key for your S3 account. Not required if `iam_role` is provided. | [optional]
**acl** | **String** | The access control list (ACL) specific request header. See the AWS documentation for [Access Control List (ACL) Specific Request Headers](https://docs.aws.amazon.com/AmazonS3/latest/API/mpUploadInitiate.html#initiate-mpu-acl-specific-request-headers) for more information. | [optional]
**bucket_name** | **String** | The bucket name for S3 account. | [optional]
**domain** | **String** | The domain of the Amazon S3 endpoint. | [optional]
**iam_role** | **String** | The Amazon Resource Name (ARN) for the IAM role granting Fastly access to S3. Not required if `access_key` and `secret_key` are provided. | [optional]
**path** | **String** | The path to upload logs to. | [optional] [defaults to 'null']
**public_key** | **String** | A PGP public key that Fastly will use to encrypt your log files before writing them to disk. | [optional] [defaults to 'null']
**redundancy** | **String** | The S3 redundancy level. | [optional] [defaults to 'null']
**secret_key** | **String** | The secret key for your S3 account. Not required if `iam_role` is provided. | [optional]
**server_side_encryption_kms_key_id** | **String** | Optional server-side KMS Key Id. Must be set if `server_side_encryption` is set to `aws:kms` or `AES256`. | [optional] [defaults to 'null']
**server_side_encryption** | **String** | Set this to `AES256` or `aws:kms` to enable S3 Server Side Encryption. | [optional] [defaults to 'null']
**file_max_bytes** | **Number** | The maximum number of bytes for each uploaded file. A value of 0 can be used to indicate there is no limit on the size of uploaded files, otherwise the minimum value is 1048576 bytes (1 MiB.) | [optional]

### Return type

[**LoggingS3Response**](LoggingS3Response.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
