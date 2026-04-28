# Fastly.LoggingElasticsearchApi

```javascript
const apiInstance = new Fastly.LoggingElasticsearchApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createLogElasticsearch**](LoggingElasticsearchApi.md#createLogElasticsearch) | **POST** /service/{service_id}/version/{version_id}/logging/elasticsearch | Create an Elasticsearch log endpoint
[**deleteLogElasticsearch**](LoggingElasticsearchApi.md#deleteLogElasticsearch) | **DELETE** /service/{service_id}/version/{version_id}/logging/elasticsearch/{logging_elasticsearch_name} | Delete an Elasticsearch log endpoint
[**getLogElasticsearch**](LoggingElasticsearchApi.md#getLogElasticsearch) | **GET** /service/{service_id}/version/{version_id}/logging/elasticsearch/{logging_elasticsearch_name} | Get an Elasticsearch log endpoint
[**listLogElasticsearch**](LoggingElasticsearchApi.md#listLogElasticsearch) | **GET** /service/{service_id}/version/{version_id}/logging/elasticsearch | List Elasticsearch log endpoints
[**updateLogElasticsearch**](LoggingElasticsearchApi.md#updateLogElasticsearch) | **PUT** /service/{service_id}/version/{version_id}/logging/elasticsearch/{logging_elasticsearch_name} | Update an Elasticsearch log endpoint


## `createLogElasticsearch`

```javascript
createLogElasticsearch({ service_id, version_id, [name, ][placement, ][response_condition, ][format, ][log_processing_region, ][format_version, ][tls_ca_cert, ][tls_client_cert, ][tls_client_key, ][tls_hostname, ][request_max_entries, ][request_max_bytes, ][index, ][url, ][pipeline, ][user, ][password] })
```

Create a Elasticsearch logging endpoint for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  name: "name_example",
  placement: "none",
  response_condition: "response_condition_example",
  format: "format_example",
  log_processing_region: "none",
  format_version: 1,
  tls_ca_cert: "'null'",
  tls_client_cert: "'null'",
  tls_client_key: "'null'",
  tls_hostname: "'null'",
  request_max_entries: 0,
  request_max_bytes: 0,
  index: "index_example",
  url: "url_example",
  pipeline: "pipeline_example",
  user: "user_example",
  password: "password_example",
};

apiInstance.createLogElasticsearch(options)
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
**format** | **String** | A Fastly [log format string](https://www.fastly.com/documentation/guides/integrations/streaming-logs/custom-log-formats/). Must produce valid JSON that Elasticsearch can ingest. | [optional]
**log_processing_region** | **String** | The geographic region where the logs will be processed before streaming. Valid values are `us`, `eu`, and `none` for global. | [optional] [one of: "none", "eu", "us"]
**format_version** | **Number** | The version of the custom logging format used for the configured endpoint. The logging call gets placed by default in `vcl_log` if `format_version` is set to `2` and in `vcl_deliver` if `format_version` is set to `1`.  | [optional] [one of: 1, 2]
**tls_ca_cert** | **String** | A secure certificate to authenticate a server with. Must be in PEM format. | [optional] [defaults to 'null']
**tls_client_cert** | **String** | The client certificate used to make authenticated requests. Must be in PEM format. | [optional] [defaults to 'null']
**tls_client_key** | **String** | The client private key used to make authenticated requests. Must be in PEM format. | [optional] [defaults to 'null']
**tls_hostname** | **String** | The hostname to verify the server&#39;s certificate. This should be one of the Subject Alternative Name (SAN) fields for the certificate. Common Names (CN) are not supported. | [optional] [defaults to 'null']
**request_max_entries** | **Number** | The maximum number of logs sent in one request. Defaults `0` for unbounded. | [optional] [defaults to 0]
**request_max_bytes** | **Number** | The maximum number of bytes sent in one request. Defaults `0` for unbounded. | [optional] [defaults to 0]
**index** | **String** | The name of the Elasticsearch index to send documents (logs) to. The index must follow the Elasticsearch [index format rules](https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-create-index.html). We support [strftime](https://www.man7.org/linux/man-pages/man3/strftime.3.html) interpolated variables inside braces prefixed with a pound symbol. For example, `#{%F}` will interpolate as `YYYY-MM-DD` with today&#39;s date. | [optional]
**url** | **String** | The URL to stream logs to. Must use HTTPS. | [optional]
**pipeline** | **String** | The ID of the Elasticsearch ingest pipeline to apply pre-process transformations to before indexing. Learn more about creating a pipeline in the [Elasticsearch docs](https://www.elastic.co/guide/en/elasticsearch/reference/current/ingest.html). | [optional]
**user** | **String** | Basic Auth username. | [optional]
**password** | **String** | Basic Auth password. | [optional]

### Return type

[**LoggingElasticsearchResponse**](LoggingElasticsearchResponse.md)


## `deleteLogElasticsearch`

```javascript
deleteLogElasticsearch({ service_id, version_id, logging_elasticsearch_name })
```

Delete the Elasticsearch logging endpoint for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_elasticsearch_name: "logging_elasticsearch_name_example", // required
};

apiInstance.deleteLogElasticsearch(options)
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
**logging_elasticsearch_name** | **String** | The name for the real-time logging configuration. |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `getLogElasticsearch`

```javascript
getLogElasticsearch({ service_id, version_id, logging_elasticsearch_name })
```

Get the Elasticsearch logging endpoint for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_elasticsearch_name: "logging_elasticsearch_name_example", // required
};

apiInstance.getLogElasticsearch(options)
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
**logging_elasticsearch_name** | **String** | The name for the real-time logging configuration. |

### Return type

[**LoggingElasticsearchResponse**](LoggingElasticsearchResponse.md)


## `listLogElasticsearch`

```javascript
listLogElasticsearch({ service_id, version_id })
```

List all of the Elasticsearch logging endpoints for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.listLogElasticsearch(options)
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

[**[LoggingElasticsearchResponse]**](LoggingElasticsearchResponse.md)


## `updateLogElasticsearch`

```javascript
updateLogElasticsearch({ service_id, version_id, logging_elasticsearch_name, [name, ][placement, ][response_condition, ][format, ][log_processing_region, ][format_version, ][tls_ca_cert, ][tls_client_cert, ][tls_client_key, ][tls_hostname, ][request_max_entries, ][request_max_bytes, ][index, ][url, ][pipeline, ][user, ][password] })
```

Update the Elasticsearch logging endpoint for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_elasticsearch_name: "logging_elasticsearch_name_example", // required
  name: "name_example",
  placement: "none",
  response_condition: "response_condition_example",
  format: "format_example",
  log_processing_region: "none",
  format_version: 1,
  tls_ca_cert: "'null'",
  tls_client_cert: "'null'",
  tls_client_key: "'null'",
  tls_hostname: "'null'",
  request_max_entries: 0,
  request_max_bytes: 0,
  index: "index_example",
  url: "url_example",
  pipeline: "pipeline_example",
  user: "user_example",
  password: "password_example",
};

apiInstance.updateLogElasticsearch(options)
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
**logging_elasticsearch_name** | **String** | The name for the real-time logging configuration. |
**name** | **String** | The name for the real-time logging configuration. | [optional]
**placement** | **String** | Where in the generated VCL the logging call should be placed. If not set, endpoints with `format_version` of 2 are placed in `vcl_log` and those with `format_version` of 1 are placed in `vcl_deliver`.  | [optional] [one of: "none", "null"]
**response_condition** | **String** | The name of an existing condition in the configured endpoint, or leave blank to always execute. | [optional]
**format** | **String** | A Fastly [log format string](https://www.fastly.com/documentation/guides/integrations/streaming-logs/custom-log-formats/). Must produce valid JSON that Elasticsearch can ingest. | [optional]
**log_processing_region** | **String** | The geographic region where the logs will be processed before streaming. Valid values are `us`, `eu`, and `none` for global. | [optional] [one of: "none", "eu", "us"]
**format_version** | **Number** | The version of the custom logging format used for the configured endpoint. The logging call gets placed by default in `vcl_log` if `format_version` is set to `2` and in `vcl_deliver` if `format_version` is set to `1`.  | [optional] [one of: 1, 2]
**tls_ca_cert** | **String** | A secure certificate to authenticate a server with. Must be in PEM format. | [optional] [defaults to 'null']
**tls_client_cert** | **String** | The client certificate used to make authenticated requests. Must be in PEM format. | [optional] [defaults to 'null']
**tls_client_key** | **String** | The client private key used to make authenticated requests. Must be in PEM format. | [optional] [defaults to 'null']
**tls_hostname** | **String** | The hostname to verify the server&#39;s certificate. This should be one of the Subject Alternative Name (SAN) fields for the certificate. Common Names (CN) are not supported. | [optional] [defaults to 'null']
**request_max_entries** | **Number** | The maximum number of logs sent in one request. Defaults `0` for unbounded. | [optional] [defaults to 0]
**request_max_bytes** | **Number** | The maximum number of bytes sent in one request. Defaults `0` for unbounded. | [optional] [defaults to 0]
**index** | **String** | The name of the Elasticsearch index to send documents (logs) to. The index must follow the Elasticsearch [index format rules](https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-create-index.html). We support [strftime](https://www.man7.org/linux/man-pages/man3/strftime.3.html) interpolated variables inside braces prefixed with a pound symbol. For example, `#{%F}` will interpolate as `YYYY-MM-DD` with today&#39;s date. | [optional]
**url** | **String** | The URL to stream logs to. Must use HTTPS. | [optional]
**pipeline** | **String** | The ID of the Elasticsearch ingest pipeline to apply pre-process transformations to before indexing. Learn more about creating a pipeline in the [Elasticsearch docs](https://www.elastic.co/guide/en/elasticsearch/reference/current/ingest.html). | [optional]
**user** | **String** | Basic Auth username. | [optional]
**password** | **String** | Basic Auth password. | [optional]

### Return type

[**LoggingElasticsearchResponse**](LoggingElasticsearchResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
