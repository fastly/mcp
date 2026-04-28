# Fastly.LoggingNewrelicotlpApi

```javascript
const apiInstance = new Fastly.LoggingNewrelicotlpApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createLogNewrelicotlp**](LoggingNewrelicotlpApi.md#createLogNewrelicotlp) | **POST** /service/{service_id}/version/{version_id}/logging/newrelicotlp | Create a New Relic OTLP endpoint
[**deleteLogNewrelicotlp**](LoggingNewrelicotlpApi.md#deleteLogNewrelicotlp) | **DELETE** /service/{service_id}/version/{version_id}/logging/newrelicotlp/{logging_newrelicotlp_name} | Delete a New Relic OTLP endpoint
[**getLogNewrelicotlp**](LoggingNewrelicotlpApi.md#getLogNewrelicotlp) | **GET** /service/{service_id}/version/{version_id}/logging/newrelicotlp/{logging_newrelicotlp_name} | Get a New Relic OTLP endpoint
[**listLogNewrelicotlp**](LoggingNewrelicotlpApi.md#listLogNewrelicotlp) | **GET** /service/{service_id}/version/{version_id}/logging/newrelicotlp | List New Relic OTLP endpoints
[**updateLogNewrelicotlp**](LoggingNewrelicotlpApi.md#updateLogNewrelicotlp) | **PUT** /service/{service_id}/version/{version_id}/logging/newrelicotlp/{logging_newrelicotlp_name} | Update a New Relic log endpoint


## `createLogNewrelicotlp`

```javascript
createLogNewrelicotlp({ service_id, version_id, [name, ][placement, ][response_condition, ][format, ][log_processing_region, ][format_version, ][token, ][region, ][url] })
```

Create a New Relic OTLP logging object for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  name: "name_example",
  placement: "none",
  response_condition: "response_condition_example",
  format: "'{\"timestamp\":\"%{begin:%Y-%m-%dT%H:%M:%S}t\",\"time_elapsed\":\"%{time.elapsed.usec}V\",\"is_tls\":\"%{if(req.is_ssl, \\\"true\\\", \\\"false\\\")}V\",\"client_ip\":\"%{req.http.Fastly-Client-IP}V\",\"geo_city\":\"%{client.geo.city}V\",\"geo_country_code\":\"%{client.geo.country_code}V\",\"request\":\"%{req.request}V\",\"host\":\"%{req.http.Fastly-Orig-Host}V\",\"url\":\"%{json.escape(req.url)}V\",\"request_referer\":\"%{json.escape(req.http.Referer)}V\",\"request_user_agent\":\"%{json.escape(req.http.User-Agent)}V\",\"request_accept_language\":\"%{json.escape(req.http.Accept-Language)}V\",\"request_accept_charset\":\"%{json.escape(req.http.Accept-Charset)}V\",\"cache_status\":\"%{regsub(fastly_info.state, \\\"^(HIT-(SYNTH)|(HITPASS|HIT|MISS|PASS|ERROR|PIPE)).*\\\", \\\"\\\\2\\\\3\\\") }V\"}'",
  log_processing_region: "none",
  format_version: 1,
  token: "token_example",
  region: "US",
  url: "'null'",
};

apiInstance.createLogNewrelicotlp(options)
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
**format** | **String** | A Fastly [log format string](https://www.fastly.com/documentation/guides/integrations/streaming-logs/custom-log-formats/). | [optional] [defaults to '{"timestamp":"%{begin:%Y-%m-%dT%H:%M:%S}t","time_elapsed":"%{time.elapsed.usec}V","is_tls":"%{if(req.is_ssl, \"true\", \"false\")}V","client_ip":"%{req.http.Fastly-Client-IP}V","geo_city":"%{client.geo.city}V","geo_country_code":"%{client.geo.country_code}V","request":"%{req.request}V","host":"%{req.http.Fastly-Orig-Host}V","url":"%{json.escape(req.url)}V","request_referer":"%{json.escape(req.http.Referer)}V","request_user_agent":"%{json.escape(req.http.User-Agent)}V","request_accept_language":"%{json.escape(req.http.Accept-Language)}V","request_accept_charset":"%{json.escape(req.http.Accept-Charset)}V","cache_status":"%{regsub(fastly_info.state, \"^(HIT-(SYNTH)|(HITPASS|HIT|MISS|PASS|ERROR|PIPE)).*\", \"\\2\\3\") }V"}']
**log_processing_region** | **String** | The geographic region where the logs will be processed before streaming. Valid values are `us`, `eu`, and `none` for global. | [optional] [one of: "none", "eu", "us"]
**format_version** | **Number** | The version of the custom logging format used for the configured endpoint. The logging call gets placed by default in `vcl_log` if `format_version` is set to `2` and in `vcl_deliver` if `format_version` is set to `1`.  | [optional] [one of: 1, 2]
**token** | **String** | The Insert API key from the Account page of your New Relic account. Required. | [optional]
**region** | **String** | The region to which to stream logs. | [optional] [one of: "US", "EU"]
**url** | **String** | (Optional) URL of the New Relic Trace Observer, if you are using New Relic Infinite Tracing. | [optional] [defaults to 'null']

### Return type

[**LoggingNewrelicotlpResponse**](LoggingNewrelicotlpResponse.md)


## `deleteLogNewrelicotlp`

```javascript
deleteLogNewrelicotlp({ service_id, version_id, logging_newrelicotlp_name })
```

Delete the New Relic OTLP logging object for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_newrelicotlp_name: "logging_newrelicotlp_name_example", // required
};

apiInstance.deleteLogNewrelicotlp(options)
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
**logging_newrelicotlp_name** | **String** | The name for the real-time logging configuration. |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `getLogNewrelicotlp`

```javascript
getLogNewrelicotlp({ service_id, version_id, logging_newrelicotlp_name })
```

Get the details of a New Relic OTLP logging object for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_newrelicotlp_name: "logging_newrelicotlp_name_example", // required
};

apiInstance.getLogNewrelicotlp(options)
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
**logging_newrelicotlp_name** | **String** | The name for the real-time logging configuration. |

### Return type

[**LoggingNewrelicotlpResponse**](LoggingNewrelicotlpResponse.md)


## `listLogNewrelicotlp`

```javascript
listLogNewrelicotlp({ service_id, version_id })
```

List all of the New Relic OTLP logging objects for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.listLogNewrelicotlp(options)
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

[**[LoggingNewrelicotlpResponse]**](LoggingNewrelicotlpResponse.md)


## `updateLogNewrelicotlp`

```javascript
updateLogNewrelicotlp({ service_id, version_id, logging_newrelicotlp_name, [name, ][placement, ][response_condition, ][format, ][log_processing_region, ][format_version, ][token, ][region, ][url] })
```

Update a New Relic OTLP logging object for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_newrelicotlp_name: "logging_newrelicotlp_name_example", // required
  name: "name_example",
  placement: "none",
  response_condition: "response_condition_example",
  format: "'{\"timestamp\":\"%{begin:%Y-%m-%dT%H:%M:%S}t\",\"time_elapsed\":\"%{time.elapsed.usec}V\",\"is_tls\":\"%{if(req.is_ssl, \\\"true\\\", \\\"false\\\")}V\",\"client_ip\":\"%{req.http.Fastly-Client-IP}V\",\"geo_city\":\"%{client.geo.city}V\",\"geo_country_code\":\"%{client.geo.country_code}V\",\"request\":\"%{req.request}V\",\"host\":\"%{req.http.Fastly-Orig-Host}V\",\"url\":\"%{json.escape(req.url)}V\",\"request_referer\":\"%{json.escape(req.http.Referer)}V\",\"request_user_agent\":\"%{json.escape(req.http.User-Agent)}V\",\"request_accept_language\":\"%{json.escape(req.http.Accept-Language)}V\",\"request_accept_charset\":\"%{json.escape(req.http.Accept-Charset)}V\",\"cache_status\":\"%{regsub(fastly_info.state, \\\"^(HIT-(SYNTH)|(HITPASS|HIT|MISS|PASS|ERROR|PIPE)).*\\\", \\\"\\\\2\\\\3\\\") }V\"}'",
  log_processing_region: "none",
  format_version: 1,
  token: "token_example",
  region: "US",
  url: "'null'",
};

apiInstance.updateLogNewrelicotlp(options)
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
**logging_newrelicotlp_name** | **String** | The name for the real-time logging configuration. |
**name** | **String** | The name for the real-time logging configuration. | [optional]
**placement** | **String** | Where in the generated VCL the logging call should be placed. If not set, endpoints with `format_version` of 2 are placed in `vcl_log` and those with `format_version` of 1 are placed in `vcl_deliver`.  | [optional] [one of: "none", "null"]
**response_condition** | **String** | The name of an existing condition in the configured endpoint, or leave blank to always execute. | [optional]
**format** | **String** | A Fastly [log format string](https://www.fastly.com/documentation/guides/integrations/streaming-logs/custom-log-formats/). | [optional] [defaults to '{"timestamp":"%{begin:%Y-%m-%dT%H:%M:%S}t","time_elapsed":"%{time.elapsed.usec}V","is_tls":"%{if(req.is_ssl, \"true\", \"false\")}V","client_ip":"%{req.http.Fastly-Client-IP}V","geo_city":"%{client.geo.city}V","geo_country_code":"%{client.geo.country_code}V","request":"%{req.request}V","host":"%{req.http.Fastly-Orig-Host}V","url":"%{json.escape(req.url)}V","request_referer":"%{json.escape(req.http.Referer)}V","request_user_agent":"%{json.escape(req.http.User-Agent)}V","request_accept_language":"%{json.escape(req.http.Accept-Language)}V","request_accept_charset":"%{json.escape(req.http.Accept-Charset)}V","cache_status":"%{regsub(fastly_info.state, \"^(HIT-(SYNTH)|(HITPASS|HIT|MISS|PASS|ERROR|PIPE)).*\", \"\\2\\3\") }V"}']
**log_processing_region** | **String** | The geographic region where the logs will be processed before streaming. Valid values are `us`, `eu`, and `none` for global. | [optional] [one of: "none", "eu", "us"]
**format_version** | **Number** | The version of the custom logging format used for the configured endpoint. The logging call gets placed by default in `vcl_log` if `format_version` is set to `2` and in `vcl_deliver` if `format_version` is set to `1`.  | [optional] [one of: 1, 2]
**token** | **String** | The Insert API key from the Account page of your New Relic account. Required. | [optional]
**region** | **String** | The region to which to stream logs. | [optional] [one of: "US", "EU"]
**url** | **String** | (Optional) URL of the New Relic Trace Observer, if you are using New Relic Infinite Tracing. | [optional] [defaults to 'null']

### Return type

[**LoggingNewrelicotlpResponse**](LoggingNewrelicotlpResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
