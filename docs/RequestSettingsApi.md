# Fastly.RequestSettingsApi

```javascript
const apiInstance = new Fastly.RequestSettingsApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createRequestSettings**](RequestSettingsApi.md#createRequestSettings) | **POST** /service/{service_id}/version/{version_id}/request_settings | Create a Request Settings object
[**deleteRequestSettings**](RequestSettingsApi.md#deleteRequestSettings) | **DELETE** /service/{service_id}/version/{version_id}/request_settings/{request_settings_name} | Delete a Request Settings object
[**getRequestSettings**](RequestSettingsApi.md#getRequestSettings) | **GET** /service/{service_id}/version/{version_id}/request_settings/{request_settings_name} | Get a Request Settings object
[**listRequestSettings**](RequestSettingsApi.md#listRequestSettings) | **GET** /service/{service_id}/version/{version_id}/request_settings | List Request Settings objects
[**updateRequestSettings**](RequestSettingsApi.md#updateRequestSettings) | **PUT** /service/{service_id}/version/{version_id}/request_settings/{request_settings_name} | Update a Request Settings object


## `createRequestSettings`

```javascript
createRequestSettings({ service_id, version_id })
```

Creates a new Request Settings object.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.createRequestSettings(options)
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

[**RequestSettingsResponse**](RequestSettingsResponse.md)


## `deleteRequestSettings`

```javascript
deleteRequestSettings({ service_id, version_id, request_settings_name })
```

Removes the specified Request Settings object.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  request_settings_name: "request_settings_name_example", // required
};

apiInstance.deleteRequestSettings(options)
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
**request_settings_name** | **String** | Name for the request settings. |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `getRequestSettings`

```javascript
getRequestSettings({ service_id, version_id, request_settings_name })
```

Gets the specified Request Settings object.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  request_settings_name: "request_settings_name_example", // required
};

apiInstance.getRequestSettings(options)
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
**request_settings_name** | **String** | Name for the request settings. |

### Return type

[**RequestSettingsResponse**](RequestSettingsResponse.md)


## `listRequestSettings`

```javascript
listRequestSettings({ service_id, version_id })
```

Returns a list of all Request Settings objects for the given service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.listRequestSettings(options)
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

[**[RequestSettingsResponse]**](RequestSettingsResponse.md)


## `updateRequestSettings`

```javascript
updateRequestSettings({ service_id, version_id, request_settings_name, [action, ][default_host, ][hash_keys, ][name, ][request_condition, ][xff, ][bypass_busy_wait, ][force_miss, ][force_ssl, ][geo_headers, ][max_stale_age, ][timer_support] })
```

Updates the specified Request Settings object.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  request_settings_name: "request_settings_name_example", // required
  action: "lookup",
  default_host: "default_host_example",
  hash_keys: "hash_keys_example",
  name: "name_example",
  request_condition: "request_condition_example",
  xff: "clear",
  bypass_busy_wait: 56,
  force_miss: 56,
  force_ssl: 56,
  geo_headers: 56,
  max_stale_age: 56,
  timer_support: 56,
};

apiInstance.updateRequestSettings(options)
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
**request_settings_name** | **String** | Name for the request settings. |
**action** | **String** | Allows you to terminate request handling and immediately perform an action. | [optional] [one of: "lookup", "pass"]
**default_host** | **String** | Sets the host header. | [optional]
**hash_keys** | **String** | Comma separated list of varnish request object fields that should be in the hash key. | [optional]
**name** | **String** | Name for the request settings. | [optional]
**request_condition** | **String** | Condition which, if met, will select this configuration during a request. Optional. | [optional]
**xff** | **String** | Short for X-Forwarded-For. | [optional] [one of: "clear", "leave", "append", "append_all", "overwrite"]
**bypass_busy_wait** | **Number** | Disable collapsed forwarding, so you don&#39;t wait for other objects to origin. | [optional]
**force_miss** | **Number** | Allows you to force a cache miss for the request. Replaces the item in the cache if the content is cacheable. | [optional]
**force_ssl** | **Number** | Forces the request use SSL (redirects a non-SSL to SSL). | [optional]
**geo_headers** | **Number** | Injects Fastly-Geo-Country, Fastly-Geo-City, and Fastly-Geo-Region into the request headers. | [optional]
**max_stale_age** | **Number** | How old an object is allowed to be to serve stale-if-error or stale-while-revalidate. | [optional]
**timer_support** | **Number** | Injects the X-Timer info into the request for viewing origin fetch durations. | [optional]

### Return type

[**RequestSettingsResponse**](RequestSettingsResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
