# Fastly.LoggingPubsubApi

```javascript
const apiInstance = new Fastly.LoggingPubsubApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createLogGcpPubsub**](LoggingPubsubApi.md#createLogGcpPubsub) | **POST** /service/{service_id}/version/{version_id}/logging/pubsub | Create a GCP Cloud Pub/Sub log endpoint
[**deleteLogGcpPubsub**](LoggingPubsubApi.md#deleteLogGcpPubsub) | **DELETE** /service/{service_id}/version/{version_id}/logging/pubsub/{logging_google_pubsub_name} | Delete a GCP Cloud Pub/Sub log endpoint
[**getLogGcpPubsub**](LoggingPubsubApi.md#getLogGcpPubsub) | **GET** /service/{service_id}/version/{version_id}/logging/pubsub/{logging_google_pubsub_name} | Get a GCP Cloud Pub/Sub log endpoint
[**listLogGcpPubsub**](LoggingPubsubApi.md#listLogGcpPubsub) | **GET** /service/{service_id}/version/{version_id}/logging/pubsub | List GCP Cloud Pub/Sub log endpoints
[**updateLogGcpPubsub**](LoggingPubsubApi.md#updateLogGcpPubsub) | **PUT** /service/{service_id}/version/{version_id}/logging/pubsub/{logging_google_pubsub_name} | Update a GCP Cloud Pub/Sub log endpoint


## `createLogGcpPubsub`

```javascript
createLogGcpPubsub({ service_id, version_id, [name, ][placement, ][response_condition, ][format, ][log_processing_region, ][format_version, ][user, ][secret_key, ][account_name, ][topic, ][project_id] })
```

Create a Pub/Sub logging object for a particular service and version.

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
  user: "user_example",
  secret_key: "secret_key_example",
  account_name: "account_name_example",
  topic: "topic_example",
  project_id: "project_id_example",
};

apiInstance.createLogGcpPubsub(options)
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
**user** | **String** | Your Google Cloud Platform service account email address. The `client_email` field in your service account authentication JSON. Not required if `account_name` is specified. | [optional]
**secret_key** | **String** | Your Google Cloud Platform account secret key. The `private_key` field in your service account authentication JSON. Not required if `account_name` is specified. | [optional]
**account_name** | **String** | The name of the Google Cloud Platform service account associated with the target log collection service. Not required if `user` and `secret_key` are provided. | [optional]
**topic** | **String** | The Google Cloud Pub/Sub topic to which logs will be published. Required. | [optional]
**project_id** | **String** | Your Google Cloud Platform project ID. Required | [optional]

### Return type

[**LoggingGooglePubsubResponse**](LoggingGooglePubsubResponse.md)


## `deleteLogGcpPubsub`

```javascript
deleteLogGcpPubsub({ service_id, version_id, logging_google_pubsub_name })
```

Delete a Pub/Sub logging object for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_google_pubsub_name: "logging_google_pubsub_name_example", // required
};

apiInstance.deleteLogGcpPubsub(options)
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
**logging_google_pubsub_name** | **String** | The name for the real-time logging configuration. |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `getLogGcpPubsub`

```javascript
getLogGcpPubsub({ service_id, version_id, logging_google_pubsub_name })
```

Get the details for a Pub/Sub logging object for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_google_pubsub_name: "logging_google_pubsub_name_example", // required
};

apiInstance.getLogGcpPubsub(options)
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
**logging_google_pubsub_name** | **String** | The name for the real-time logging configuration. |

### Return type

[**LoggingGooglePubsubResponse**](LoggingGooglePubsubResponse.md)


## `listLogGcpPubsub`

```javascript
listLogGcpPubsub({ service_id, version_id })
```

List all of the Pub/Sub logging objects for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.listLogGcpPubsub(options)
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

[**[LoggingGooglePubsubResponse]**](LoggingGooglePubsubResponse.md)


## `updateLogGcpPubsub`

```javascript
updateLogGcpPubsub({ service_id, version_id, logging_google_pubsub_name, [name, ][placement, ][response_condition, ][format, ][log_processing_region, ][format_version, ][user, ][secret_key, ][account_name, ][topic, ][project_id] })
```

Update a Pub/Sub logging object for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  logging_google_pubsub_name: "logging_google_pubsub_name_example", // required
  name: "name_example",
  placement: "none",
  response_condition: "response_condition_example",
  format: "'%h %l %u %t \"%r\" %&gt;s %b'",
  log_processing_region: "none",
  format_version: 1,
  user: "user_example",
  secret_key: "secret_key_example",
  account_name: "account_name_example",
  topic: "topic_example",
  project_id: "project_id_example",
};

apiInstance.updateLogGcpPubsub(options)
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
**logging_google_pubsub_name** | **String** | The name for the real-time logging configuration. |
**name** | **String** | The name for the real-time logging configuration. | [optional]
**placement** | **String** | Where in the generated VCL the logging call should be placed. If not set, endpoints with `format_version` of 2 are placed in `vcl_log` and those with `format_version` of 1 are placed in `vcl_deliver`.  | [optional] [one of: "none", "null"]
**response_condition** | **String** | The name of an existing condition in the configured endpoint, or leave blank to always execute. | [optional]
**format** | **String** | A Fastly [log format string](https://www.fastly.com/documentation/guides/integrations/streaming-logs/custom-log-formats/). | [optional] [defaults to '%h %l %u %t "%r" %&gt;s %b']
**log_processing_region** | **String** | The geographic region where the logs will be processed before streaming. Valid values are `us`, `eu`, and `none` for global. | [optional] [one of: "none", "eu", "us"]
**format_version** | **Number** | The version of the custom logging format used for the configured endpoint. The logging call gets placed by default in `vcl_log` if `format_version` is set to `2` and in `vcl_deliver` if `format_version` is set to `1`.  | [optional] [one of: 1, 2]
**user** | **String** | Your Google Cloud Platform service account email address. The `client_email` field in your service account authentication JSON. Not required if `account_name` is specified. | [optional]
**secret_key** | **String** | Your Google Cloud Platform account secret key. The `private_key` field in your service account authentication JSON. Not required if `account_name` is specified. | [optional]
**account_name** | **String** | The name of the Google Cloud Platform service account associated with the target log collection service. Not required if `user` and `secret_key` are provided. | [optional]
**topic** | **String** | The Google Cloud Pub/Sub topic to which logs will be published. Required. | [optional]
**project_id** | **String** | Your Google Cloud Platform project ID. Required | [optional]

### Return type

[**LoggingGooglePubsubResponse**](LoggingGooglePubsubResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
