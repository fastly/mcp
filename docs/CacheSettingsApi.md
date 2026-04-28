# Fastly.CacheSettingsApi

```javascript
const apiInstance = new Fastly.CacheSettingsApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createCacheSettings**](CacheSettingsApi.md#createCacheSettings) | **POST** /service/{service_id}/version/{version_id}/cache_settings | Create a cache settings object
[**deleteCacheSettings**](CacheSettingsApi.md#deleteCacheSettings) | **DELETE** /service/{service_id}/version/{version_id}/cache_settings/{cache_settings_name} | Delete a cache settings object
[**getCacheSettings**](CacheSettingsApi.md#getCacheSettings) | **GET** /service/{service_id}/version/{version_id}/cache_settings/{cache_settings_name} | Get a cache settings object
[**listCacheSettings**](CacheSettingsApi.md#listCacheSettings) | **GET** /service/{service_id}/version/{version_id}/cache_settings | List cache settings objects
[**updateCacheSettings**](CacheSettingsApi.md#updateCacheSettings) | **PUT** /service/{service_id}/version/{version_id}/cache_settings/{cache_settings_name} | Update a cache settings object


## `createCacheSettings`

```javascript
createCacheSettings({ service_id, version_id, [action, ][cache_condition, ][name, ][stale_ttl, ][ttl] })
```

Create a cache settings object.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  action: "pass",
  cache_condition: "cache_condition_example",
  name: "name_example",
  stale_ttl: "stale_ttl_example",
  ttl: "ttl_example",
};

apiInstance.createCacheSettings(options)
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
**action** | **String** | If set, will cause vcl_fetch to terminate after processing this rule with the return state specified. If not set, other configuration logic in vcl_fetch with a lower priority will run after this rule.  | [optional] [one of: "pass", "cache", "restart"]
**cache_condition** | **String** | Name of the cache condition controlling when this configuration applies. | [optional]
**name** | **String** | Name for the cache settings object. | [optional]
**stale_ttl** | **String** | Maximum time in seconds to continue to use a stale version of the object if future requests to your backend server fail (also known as &#39;stale if error&#39;). | [optional]
**ttl** | **String** | Maximum time to consider the object fresh in the cache (the cache &#39;time to live&#39;). | [optional]

### Return type

[**CacheSettingResponse**](CacheSettingResponse.md)


## `deleteCacheSettings`

```javascript
deleteCacheSettings({ service_id, version_id, cache_settings_name })
```

Delete a specific cache settings object.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  cache_settings_name: "cache_settings_name_example", // required
};

apiInstance.deleteCacheSettings(options)
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
**cache_settings_name** | **String** | Name for the cache settings object. |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `getCacheSettings`

```javascript
getCacheSettings({ service_id, version_id, cache_settings_name })
```

Get a specific cache settings object.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  cache_settings_name: "cache_settings_name_example", // required
};

apiInstance.getCacheSettings(options)
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
**cache_settings_name** | **String** | Name for the cache settings object. |

### Return type

[**CacheSettingResponse**](CacheSettingResponse.md)


## `listCacheSettings`

```javascript
listCacheSettings({ service_id, version_id })
```

Get a list of all cache settings for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.listCacheSettings(options)
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

[**[CacheSettingResponse]**](CacheSettingResponse.md)


## `updateCacheSettings`

```javascript
updateCacheSettings({ service_id, version_id, cache_settings_name, [action, ][cache_condition, ][name, ][stale_ttl, ][ttl] })
```

Update a specific cache settings object.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  cache_settings_name: "cache_settings_name_example", // required
  action: "pass",
  cache_condition: "cache_condition_example",
  name: "name_example",
  stale_ttl: "stale_ttl_example",
  ttl: "ttl_example",
};

apiInstance.updateCacheSettings(options)
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
**cache_settings_name** | **String** | Name for the cache settings object. |
**action** | **String** | If set, will cause vcl_fetch to terminate after processing this rule with the return state specified. If not set, other configuration logic in vcl_fetch with a lower priority will run after this rule.  | [optional] [one of: "pass", "cache", "restart"]
**cache_condition** | **String** | Name of the cache condition controlling when this configuration applies. | [optional]
**name** | **String** | Name for the cache settings object. | [optional]
**stale_ttl** | **String** | Maximum time in seconds to continue to use a stale version of the object if future requests to your backend server fail (also known as &#39;stale if error&#39;). | [optional]
**ttl** | **String** | Maximum time to consider the object fresh in the cache (the cache &#39;time to live&#39;). | [optional]

### Return type

[**CacheSettingResponse**](CacheSettingResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
