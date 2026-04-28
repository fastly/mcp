# Fastly.RateLimiterApi

```javascript
const apiInstance = new Fastly.RateLimiterApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createRateLimiter**](RateLimiterApi.md#createRateLimiter) | **POST** /service/{service_id}/version/{version_id}/rate-limiters | Create a rate limiter
[**deleteRateLimiter**](RateLimiterApi.md#deleteRateLimiter) | **DELETE** /rate-limiters/{rate_limiter_id} | Delete a rate limiter
[**getRateLimiter**](RateLimiterApi.md#getRateLimiter) | **GET** /rate-limiters/{rate_limiter_id} | Get a rate limiter
[**listRateLimiters**](RateLimiterApi.md#listRateLimiters) | **GET** /service/{service_id}/version/{version_id}/rate-limiters | List rate limiters
[**updateRateLimiter**](RateLimiterApi.md#updateRateLimiter) | **PUT** /rate-limiters/{rate_limiter_id} | Update a rate limiter


## `createRateLimiter`

```javascript
createRateLimiter({ service_id, version_id, [name, ][uri_dictionary_name, ][http_methods, ][rps_limit, ][window_size, ][client_key, ][penalty_box_duration, ][action, ][response_object_name, ][logger_type, ][feature_revision] })
```

Create a rate limiter for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  name: "name_example",
  uri_dictionary_name: "uri_dictionary_name_example",
  http_methods: "HEAD",
  rps_limit: 56,
  window_size: 1,
  client_key: ["null"],
  penalty_box_duration: 56,
  action: "response",
  response_object_name: "response_object_name_example",
  logger_type: "azureblob",
  feature_revision: 56,
};

apiInstance.createRateLimiter(options)
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
**name** | **String** | A human readable name for the rate limiting rule. | [optional]
**uri_dictionary_name** | **String** | The name of a Dictionary containing URIs as keys. If not defined or `null`, all origin URIs will be rate limited. | [optional]
**http_methods** | [**[String]**](String.md) | Array of HTTP methods to apply rate limiting to. | [optional] [one of: "HEAD", "OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE", "TRACE"]
**rps_limit** | **Number** | Upper limit of requests per second allowed by the rate limiter. | [optional]
**window_size** | **Number** | Number of seconds during which the RPS limit must be exceeded in order to trigger a violation. | [optional] [one of: 1, 10, 60]
**client_key** | [**[String]**](String.md) | Array of VCL variables used to generate a counter key to identify a client. Example variables include `req.http.Fastly-Client-IP`, `req.http.User-Agent`, or a custom header like `req.http.API-Key`. | [optional]
**penalty_box_duration** | **Number** | Length of time in minutes that the rate limiter is in effect after the initial violation is detected. | [optional]
**action** | **String** | The action to take when a rate limiter violation is detected. | [optional] [one of: "response", "response_object", "log_only"]
**response_object_name** | **String** | Name of existing response object. Required if `action` is `response_object`. Note that the rate limiter response is only updated to reflect the response object content when saving the rate limiter configuration. | [optional]
**logger_type** | **String** | Name of the type of logging endpoint to be used when action is `log_only`. The logging endpoint type is used to determine the appropriate log format to use when emitting log entries. | [optional] [one of: "azureblob", "bigquery", "cloudfiles", "datadog", "digitalocean", "elasticsearch", "ftp", "gcs", "googleanalytics", "heroku", "honeycomb", "http", "https", "kafka", "kinesis", "logentries", "loggly", "logshuttle", "newrelic", "newrelicotlp", "openstack", "papertrail", "pubsub", "s3", "scalyr", "sftp", "splunk", "stackdriver", "sumologic", "syslog"]
**feature_revision** | **Number** | Revision number of the rate limiting feature implementation. Defaults to the most recent revision. | [optional]

### Return type

[**RateLimiterResponse**](RateLimiterResponse.md)


## `deleteRateLimiter`

```javascript
deleteRateLimiter({ rate_limiter_id })
```

Delete a rate limiter by its ID.

### Example

```javascript
const options = {
  rate_limiter_id: "rate_limiter_id_example", // required
};

apiInstance.deleteRateLimiter(options)
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
**rate_limiter_id** | **String** | Alphanumeric string identifying the rate limiter. |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `getRateLimiter`

```javascript
getRateLimiter({ rate_limiter_id })
```

Get a rate limiter by its ID.

### Example

```javascript
const options = {
  rate_limiter_id: "rate_limiter_id_example", // required
};

apiInstance.getRateLimiter(options)
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
**rate_limiter_id** | **String** | Alphanumeric string identifying the rate limiter. |

### Return type

[**RateLimiterResponse**](RateLimiterResponse.md)


## `listRateLimiters`

```javascript
listRateLimiters({ service_id, version_id })
```

List all rate limiters for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.listRateLimiters(options)
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

[**[RateLimiterResponse]**](RateLimiterResponse.md)


## `updateRateLimiter`

```javascript
updateRateLimiter({ rate_limiter_id, [name, ][uri_dictionary_name, ][http_methods, ][rps_limit, ][window_size, ][client_key, ][penalty_box_duration, ][action, ][response_object_name, ][logger_type, ][feature_revision] })
```

Update a rate limiter by its ID.

### Example

```javascript
const options = {
  rate_limiter_id: "rate_limiter_id_example", // required
  name: "name_example",
  uri_dictionary_name: "uri_dictionary_name_example",
  http_methods: "HEAD",
  rps_limit: 56,
  window_size: 1,
  client_key: ["null"],
  penalty_box_duration: 56,
  action: "response",
  response_object_name: "response_object_name_example",
  logger_type: "azureblob",
  feature_revision: 56,
};

apiInstance.updateRateLimiter(options)
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
**rate_limiter_id** | **String** | Alphanumeric string identifying the rate limiter. |
**name** | **String** | A human readable name for the rate limiting rule. | [optional]
**uri_dictionary_name** | **String** | The name of a Dictionary containing URIs as keys. If not defined or `null`, all origin URIs will be rate limited. | [optional]
**http_methods** | [**[String]**](String.md) | Array of HTTP methods to apply rate limiting to. | [optional] [one of: "HEAD", "OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE", "TRACE"]
**rps_limit** | **Number** | Upper limit of requests per second allowed by the rate limiter. | [optional]
**window_size** | **Number** | Number of seconds during which the RPS limit must be exceeded in order to trigger a violation. | [optional] [one of: 1, 10, 60]
**client_key** | [**[String]**](String.md) | Array of VCL variables used to generate a counter key to identify a client. Example variables include `req.http.Fastly-Client-IP`, `req.http.User-Agent`, or a custom header like `req.http.API-Key`. | [optional]
**penalty_box_duration** | **Number** | Length of time in minutes that the rate limiter is in effect after the initial violation is detected. | [optional]
**action** | **String** | The action to take when a rate limiter violation is detected. | [optional] [one of: "response", "response_object", "log_only"]
**response_object_name** | **String** | Name of existing response object. Required if `action` is `response_object`. Note that the rate limiter response is only updated to reflect the response object content when saving the rate limiter configuration. | [optional]
**logger_type** | **String** | Name of the type of logging endpoint to be used when action is `log_only`. The logging endpoint type is used to determine the appropriate log format to use when emitting log entries. | [optional] [one of: "azureblob", "bigquery", "cloudfiles", "datadog", "digitalocean", "elasticsearch", "ftp", "gcs", "googleanalytics", "heroku", "honeycomb", "http", "https", "kafka", "kinesis", "logentries", "loggly", "logshuttle", "newrelic", "newrelicotlp", "openstack", "papertrail", "pubsub", "s3", "scalyr", "sftp", "splunk", "stackdriver", "sumologic", "syslog"]
**feature_revision** | **Number** | Revision number of the rate limiting feature implementation. Defaults to the most recent revision. | [optional]

### Return type

[**RateLimiterResponse**](RateLimiterResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
