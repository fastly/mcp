# Fastly.LoggingGrafanacloudlogsApi

```javascript
const apiInstance = new Fastly.LoggingGrafanacloudlogsApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createLogGrafanacloudlogs**](LoggingGrafanacloudlogsApi.md#createLogGrafanacloudlogs) | **POST** /service/{service_id}/version/{version_id}/logging/grafanacloudlogs | Create a Grafana Cloud Logs log endpoint
[**deleteLogGrafanacloudlogs**](LoggingGrafanacloudlogsApi.md#deleteLogGrafanacloudlogs) | **DELETE** /service/{service_id}/version/{version_id}/logging/grafanacloudlogs/{logging_grafanacloudlogs_name} | Delete the Grafana Cloud Logs log endpoint
[**getLogGrafanacloudlogs**](LoggingGrafanacloudlogsApi.md#getLogGrafanacloudlogs) | **GET** /service/{service_id}/version/{version_id}/logging/grafanacloudlogs/{logging_grafanacloudlogs_name} | Get a Grafana Cloud Logs log endpoint
[**listLogGrafanacloudlogs**](LoggingGrafanacloudlogsApi.md#listLogGrafanacloudlogs) | **GET** /service/{service_id}/version/{version_id}/logging/grafanacloudlogs | List Grafana Cloud Logs log endpoints
[**updateLogGrafanacloudlogs**](LoggingGrafanacloudlogsApi.md#updateLogGrafanacloudlogs) | **PUT** /service/{service_id}/version/{version_id}/logging/grafanacloudlogs/{logging_grafanacloudlogs_name} | Update a Grafana Cloud Logs log endpoint


## `createLogGrafanacloudlogs`

```javascript
createLogGrafanacloudlogs({ service_id, version_id, [name, ][placement, ][response_condition, ][format, ][log_processing_region, ][format_version, ][user, ][url, ][token, ][index] })
```

Create a Grafana Cloud Logs logging object for a particular service and version.

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
  user: "user_example",
  url: "url_example",
  token: "token_example",
  index: "index_example",
};

apiInstance.createLogGrafanacloudlogs(options)
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
**format** | **String** | A Fastly [log format string](https://www.fastly.com/documentation/guides/integrations/streaming-logs/custom-log-formats/). | [optional]
**log_processing_region** | **String** | The geographic region where the logs will be processed before streaming. Valid values are `us`, `eu`, and `none` for global. | [optional] [one of: "none", "eu", "us"]
**format_version** | **Number** | The version of the custom logging format used for the configured endpoint. The logging call gets placed by default in `vcl_log` if `format_version` is set to `2` and in `vcl_deliver` if `format_version` is set to `1`.  | [optional] [one of: 1, 2]
**user** | **String** | The Grafana Cloud Logs Dataset you want to log to. | [optional]
**url** | **String** | The URL of the Loki instance in your Grafana stack. | [optional]
**token** | **String** | The Grafana Access Policy token with `logs:write` access scoped to your Loki instance. | [optional]
**index** | **String** | The Stream Labels, a JSON string used to identify the stream. | [optional]

### Return type

[**LoggingGrafanacloudlogsResponse**](LoggingGrafanacloudlogsResponse.md)


## `deleteLogGrafanacloudlogs`

```javascript
deleteLogGrafanacloudlogs({ service_id, version_id, logging_grafanacloudlogs_name })
```

Delete the Grafana Cloud Logs logging object for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_grafanacloudlogs_name: "logging_grafanacloudlogs_name_example", // required
};

apiInstance.deleteLogGrafanacloudlogs(options)
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
**logging_grafanacloudlogs_name** | **String** | The name for the real-time logging configuration. |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `getLogGrafanacloudlogs`

```javascript
getLogGrafanacloudlogs({ service_id, version_id, logging_grafanacloudlogs_name })
```

Get the details of a Grafana Cloud Logs logging object for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_grafanacloudlogs_name: "logging_grafanacloudlogs_name_example", // required
};

apiInstance.getLogGrafanacloudlogs(options)
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
**logging_grafanacloudlogs_name** | **String** | The name for the real-time logging configuration. |

### Return type

[**LoggingGrafanacloudlogsResponse**](LoggingGrafanacloudlogsResponse.md)


## `listLogGrafanacloudlogs`

```javascript
listLogGrafanacloudlogs({ service_id, version_id })
```

List all of the Grafana Cloud Logs logging objects for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.listLogGrafanacloudlogs(options)
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

[**[LoggingGrafanacloudlogsResponse]**](LoggingGrafanacloudlogsResponse.md)


## `updateLogGrafanacloudlogs`

```javascript
updateLogGrafanacloudlogs({ service_id, version_id, logging_grafanacloudlogs_name, [name, ][placement, ][response_condition, ][format, ][log_processing_region, ][format_version, ][user, ][url, ][token, ][index] })
```

Update a Grafana Cloud Logs logging object for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_grafanacloudlogs_name: "logging_grafanacloudlogs_name_example", // required
  name: "name_example",
  placement: "none",
  response_condition: "response_condition_example",
  format: "format_example",
  log_processing_region: "none",
  format_version: 1,
  user: "user_example",
  url: "url_example",
  token: "token_example",
  index: "index_example",
};

apiInstance.updateLogGrafanacloudlogs(options)
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
**logging_grafanacloudlogs_name** | **String** | The name for the real-time logging configuration. |
**name** | **String** | The name for the real-time logging configuration. | [optional]
**placement** | **String** | Where in the generated VCL the logging call should be placed. If not set, endpoints with `format_version` of 2 are placed in `vcl_log` and those with `format_version` of 1 are placed in `vcl_deliver`.  | [optional] [one of: "none", "null"]
**response_condition** | **String** | The name of an existing condition in the configured endpoint, or leave blank to always execute. | [optional]
**format** | **String** | A Fastly [log format string](https://www.fastly.com/documentation/guides/integrations/streaming-logs/custom-log-formats/). | [optional]
**log_processing_region** | **String** | The geographic region where the logs will be processed before streaming. Valid values are `us`, `eu`, and `none` for global. | [optional] [one of: "none", "eu", "us"]
**format_version** | **Number** | The version of the custom logging format used for the configured endpoint. The logging call gets placed by default in `vcl_log` if `format_version` is set to `2` and in `vcl_deliver` if `format_version` is set to `1`.  | [optional] [one of: 1, 2]
**user** | **String** | The Grafana Cloud Logs Dataset you want to log to. | [optional]
**url** | **String** | The URL of the Loki instance in your Grafana stack. | [optional]
**token** | **String** | The Grafana Access Policy token with `logs:write` access scoped to your Loki instance. | [optional]
**index** | **String** | The Stream Labels, a JSON string used to identify the stream. | [optional]

### Return type

[**LoggingGrafanacloudlogsResponse**](LoggingGrafanacloudlogsResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
