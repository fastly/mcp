# Fastly.LoggingSyslogApi

```javascript
const apiInstance = new Fastly.LoggingSyslogApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createLogSyslog**](LoggingSyslogApi.md#createLogSyslog) | **POST** /service/{service_id}/version/{version_id}/logging/syslog | Create a syslog log endpoint
[**deleteLogSyslog**](LoggingSyslogApi.md#deleteLogSyslog) | **DELETE** /service/{service_id}/version/{version_id}/logging/syslog/{logging_syslog_name} | Delete a syslog log endpoint
[**getLogSyslog**](LoggingSyslogApi.md#getLogSyslog) | **GET** /service/{service_id}/version/{version_id}/logging/syslog/{logging_syslog_name} | Get a syslog log endpoint
[**listLogSyslog**](LoggingSyslogApi.md#listLogSyslog) | **GET** /service/{service_id}/version/{version_id}/logging/syslog | List Syslog log endpoints
[**updateLogSyslog**](LoggingSyslogApi.md#updateLogSyslog) | **PUT** /service/{service_id}/version/{version_id}/logging/syslog/{logging_syslog_name} | Update a syslog log endpoint


## `createLogSyslog`

```javascript
createLogSyslog({ service_id, version_id, [name, ][placement, ][response_condition, ][format, ][log_processing_region, ][format_version, ][tls_ca_cert, ][tls_client_cert, ][tls_client_key, ][tls_hostname, ][address, ][port, ][message_type, ][hostname, ][ipv4, ][token, ][use_tls] })
```

Create a Syslog for a particular service and version.

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
  tls_ca_cert: "'null'",
  tls_client_cert: "'null'",
  tls_client_key: "'null'",
  tls_hostname: "'null'",
  address: "address_example",
  port: 514,
  message_type: new Fastly.LoggingMessageType(),
  hostname: "hostname_example",
  ipv4: "ipv4_example",
  token: "'null'",
  use_tls: new Fastly.LoggingUseTlsString(),
};

apiInstance.createLogSyslog(options)
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
**tls_ca_cert** | **String** | A secure certificate to authenticate a server with. Must be in PEM format. | [optional] [defaults to 'null']
**tls_client_cert** | **String** | The client certificate used to make authenticated requests. Must be in PEM format. | [optional] [defaults to 'null']
**tls_client_key** | **String** | The client private key used to make authenticated requests. Must be in PEM format. | [optional] [defaults to 'null']
**tls_hostname** | **String** | The hostname to verify the server&#39;s certificate. This should be one of the Subject Alternative Name (SAN) fields for the certificate. Common Names (CN) are not supported. | [optional] [defaults to 'null']
**address** | **String** | A hostname or IPv4 address. | [optional]
**port** | **Number** | The port number. | [optional] [defaults to 514]
**message_type** | [**LoggingMessageType**](LoggingMessageType.md) |  | [optional]
**hostname** | **String** | The hostname used for the syslog endpoint. | [optional]
**ipv4** | **String** | The IPv4 address used for the syslog endpoint. | [optional]
**token** | **String** | Whether to prepend each message with a specific token. | [optional] [defaults to 'null']
**use_tls** | [**LoggingUseTlsString**](LoggingUseTlsString.md) |  | [optional]

### Return type

[**LoggingSyslogResponse**](LoggingSyslogResponse.md)


## `deleteLogSyslog`

```javascript
deleteLogSyslog({ service_id, version_id, logging_syslog_name })
```

Delete the Syslog for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_syslog_name: "logging_syslog_name_example", // required
};

apiInstance.deleteLogSyslog(options)
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
**logging_syslog_name** | **String** | The name for the real-time logging configuration. |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `getLogSyslog`

```javascript
getLogSyslog({ service_id, version_id, logging_syslog_name })
```

Get the Syslog for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_syslog_name: "logging_syslog_name_example", // required
};

apiInstance.getLogSyslog(options)
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
**logging_syslog_name** | **String** | The name for the real-time logging configuration. |

### Return type

[**LoggingSyslogResponse**](LoggingSyslogResponse.md)


## `listLogSyslog`

```javascript
listLogSyslog({ service_id, version_id })
```

List all of the Syslogs for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.listLogSyslog(options)
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

[**[LoggingSyslogResponse]**](LoggingSyslogResponse.md)


## `updateLogSyslog`

```javascript
updateLogSyslog({ service_id, version_id, logging_syslog_name, [name, ][placement, ][response_condition, ][format, ][log_processing_region, ][format_version, ][tls_ca_cert, ][tls_client_cert, ][tls_client_key, ][tls_hostname, ][address, ][port, ][message_type, ][hostname, ][ipv4, ][token, ][use_tls] })
```

Update the Syslog for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_syslog_name: "logging_syslog_name_example", // required
  name: "name_example",
  placement: "none",
  response_condition: "response_condition_example",
  format: "'%h %l %u %t \"%r\" %&gt;s %b'",
  log_processing_region: "none",
  format_version: 1,
  tls_ca_cert: "'null'",
  tls_client_cert: "'null'",
  tls_client_key: "'null'",
  tls_hostname: "'null'",
  address: "address_example",
  port: 514,
  message_type: new Fastly.LoggingMessageType(),
  hostname: "hostname_example",
  ipv4: "ipv4_example",
  token: "'null'",
  use_tls: new Fastly.LoggingUseTlsString(),
};

apiInstance.updateLogSyslog(options)
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
**logging_syslog_name** | **String** | The name for the real-time logging configuration. |
**name** | **String** | The name for the real-time logging configuration. | [optional]
**placement** | **String** | Where in the generated VCL the logging call should be placed. If not set, endpoints with `format_version` of 2 are placed in `vcl_log` and those with `format_version` of 1 are placed in `vcl_deliver`.  | [optional] [one of: "none", "null"]
**response_condition** | **String** | The name of an existing condition in the configured endpoint, or leave blank to always execute. | [optional]
**format** | **String** | A Fastly [log format string](https://www.fastly.com/documentation/guides/integrations/streaming-logs/custom-log-formats/). | [optional] [defaults to '%h %l %u %t "%r" %&gt;s %b']
**log_processing_region** | **String** | The geographic region where the logs will be processed before streaming. Valid values are `us`, `eu`, and `none` for global. | [optional] [one of: "none", "eu", "us"]
**format_version** | **Number** | The version of the custom logging format used for the configured endpoint. The logging call gets placed by default in `vcl_log` if `format_version` is set to `2` and in `vcl_deliver` if `format_version` is set to `1`.  | [optional] [one of: 1, 2]
**tls_ca_cert** | **String** | A secure certificate to authenticate a server with. Must be in PEM format. | [optional] [defaults to 'null']
**tls_client_cert** | **String** | The client certificate used to make authenticated requests. Must be in PEM format. | [optional] [defaults to 'null']
**tls_client_key** | **String** | The client private key used to make authenticated requests. Must be in PEM format. | [optional] [defaults to 'null']
**tls_hostname** | **String** | The hostname to verify the server&#39;s certificate. This should be one of the Subject Alternative Name (SAN) fields for the certificate. Common Names (CN) are not supported. | [optional] [defaults to 'null']
**address** | **String** | A hostname or IPv4 address. | [optional]
**port** | **Number** | The port number. | [optional] [defaults to 514]
**message_type** | [**LoggingMessageType**](LoggingMessageType.md) |  | [optional]
**hostname** | **String** | The hostname used for the syslog endpoint. | [optional]
**ipv4** | **String** | The IPv4 address used for the syslog endpoint. | [optional]
**token** | **String** | Whether to prepend each message with a specific token. | [optional] [defaults to 'null']
**use_tls** | [**LoggingUseTlsString**](LoggingUseTlsString.md) |  | [optional]

### Return type

[**LoggingSyslogResponse**](LoggingSyslogResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
