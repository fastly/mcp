# Fastly.HealthcheckApi

```javascript
const apiInstance = new Fastly.HealthcheckApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createHealthcheck**](HealthcheckApi.md#createHealthcheck) | **POST** /service/{service_id}/version/{version_id}/healthcheck | Create a health check
[**deleteHealthcheck**](HealthcheckApi.md#deleteHealthcheck) | **DELETE** /service/{service_id}/version/{version_id}/healthcheck/{healthcheck_name} | Delete a health check
[**getHealthcheck**](HealthcheckApi.md#getHealthcheck) | **GET** /service/{service_id}/version/{version_id}/healthcheck/{healthcheck_name} | Get a health check
[**listHealthchecks**](HealthcheckApi.md#listHealthchecks) | **GET** /service/{service_id}/version/{version_id}/healthcheck | List health checks
[**updateHealthcheck**](HealthcheckApi.md#updateHealthcheck) | **PUT** /service/{service_id}/version/{version_id}/healthcheck/{healthcheck_name} | Update a health check


## `createHealthcheck`

```javascript
createHealthcheck({ service_id, version_id, [check_interval, ][comment, ][expected_response, ][headers, ][host, ][http_version, ][initial, ][method, ][name, ][path, ][threshold, ][timeout, ][window] })
```

Create a health check for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  check_interval: 56,
  comment: "comment_example",
  expected_response: 56,
  headers: ["null"],
  host: "host_example",
  http_version: "http_version_example",
  initial: 56,
  method: "method_example",
  name: "name_example",
  path: "path_example",
  threshold: 56,
  timeout: 56,
  window: 56,
};

apiInstance.createHealthcheck(options)
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
**check_interval** | **Number** | How often to run the health check in milliseconds. Minimum 1 second, maximum 1 hour. | [optional]
**comment** | **String** | A freeform descriptive note. | [optional]
**expected_response** | **Number** | The status code expected from the host. | [optional]
**headers** | [**[String]**](String.md) | Array of custom headers that will be added to the health check probes. | [optional]
**host** | **String** | Which host to check. | [optional]
**http_version** | **String** | Whether to use version 1.0 or 1.1 HTTP. | [optional]
**initial** | **Number** | When loading a config, the initial number of probes to be seen as OK. | [optional]
**method** | **String** | Which HTTP method to use. | [optional]
**name** | **String** | The name of the health check. | [optional]
**path** | **String** | The path to check. | [optional]
**threshold** | **Number** | How many health checks must succeed to be considered healthy. | [optional]
**timeout** | **Number** | Timeout in milliseconds. | [optional]
**window** | **Number** | The number of most recent health check queries to keep for this health check. | [optional]

### Return type

[**HealthcheckResponse**](HealthcheckResponse.md)


## `deleteHealthcheck`

```javascript
deleteHealthcheck({ service_id, version_id, healthcheck_name })
```

Delete the health check for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  healthcheck_name: "healthcheck_name_example", // required
};

apiInstance.deleteHealthcheck(options)
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
**healthcheck_name** | **String** | The name of the health check. |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `getHealthcheck`

```javascript
getHealthcheck({ service_id, version_id, healthcheck_name })
```

Get the health check for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  healthcheck_name: "healthcheck_name_example", // required
};

apiInstance.getHealthcheck(options)
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
**healthcheck_name** | **String** | The name of the health check. |

### Return type

[**HealthcheckResponse**](HealthcheckResponse.md)


## `listHealthchecks`

```javascript
listHealthchecks({ service_id, version_id })
```

List all of the health checks for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.listHealthchecks(options)
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

[**[HealthcheckResponse]**](HealthcheckResponse.md)


## `updateHealthcheck`

```javascript
updateHealthcheck({ service_id, version_id, healthcheck_name, [check_interval, ][comment, ][expected_response, ][headers, ][host, ][http_version, ][initial, ][method, ][name, ][path, ][threshold, ][timeout, ][window] })
```

Update the health check for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  healthcheck_name: "healthcheck_name_example", // required
  check_interval: 56,
  comment: "comment_example",
  expected_response: 56,
  headers: ["null"],
  host: "host_example",
  http_version: "http_version_example",
  initial: 56,
  method: "method_example",
  name: "name_example",
  path: "path_example",
  threshold: 56,
  timeout: 56,
  window: 56,
};

apiInstance.updateHealthcheck(options)
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
**healthcheck_name** | **String** | The name of the health check. |
**check_interval** | **Number** | How often to run the health check in milliseconds. Minimum 1 second, maximum 1 hour. | [optional]
**comment** | **String** | A freeform descriptive note. | [optional]
**expected_response** | **Number** | The status code expected from the host. | [optional]
**headers** | [**[String]**](String.md) | Array of custom headers that will be added to the health check probes. | [optional]
**host** | **String** | Which host to check. | [optional]
**http_version** | **String** | Whether to use version 1.0 or 1.1 HTTP. | [optional]
**initial** | **Number** | When loading a config, the initial number of probes to be seen as OK. | [optional]
**method** | **String** | Which HTTP method to use. | [optional]
**name** | **String** | The name of the health check. | [optional]
**path** | **String** | The path to check. | [optional]
**threshold** | **Number** | How many health checks must succeed to be considered healthy. | [optional]
**timeout** | **Number** | Timeout in milliseconds. | [optional]
**window** | **Number** | The number of most recent health check queries to keep for this health check. | [optional]

### Return type

[**HealthcheckResponse**](HealthcheckResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
