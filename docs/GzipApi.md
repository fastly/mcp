# Fastly.GzipApi

```javascript
const apiInstance = new Fastly.GzipApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createGzipConfig**](GzipApi.md#createGzipConfig) | **POST** /service/{service_id}/version/{version_id}/gzip | Create a gzip configuration
[**deleteGzipConfig**](GzipApi.md#deleteGzipConfig) | **DELETE** /service/{service_id}/version/{version_id}/gzip/{gzip_name} | Delete a gzip configuration
[**getGzipConfigs**](GzipApi.md#getGzipConfigs) | **GET** /service/{service_id}/version/{version_id}/gzip/{gzip_name} | Get a gzip configuration
[**listGzipConfigs**](GzipApi.md#listGzipConfigs) | **GET** /service/{service_id}/version/{version_id}/gzip | List gzip configurations
[**updateGzipConfig**](GzipApi.md#updateGzipConfig) | **PUT** /service/{service_id}/version/{version_id}/gzip/{gzip_name} | Update a gzip configuration


## `createGzipConfig`

```javascript
createGzipConfig({ service_id, version_id, [cache_condition, ][content_types, ][extensions, ][name] })
```

Create a named gzip configuration on a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  cache_condition: "cache_condition_example",
  content_types: "content_types_example",
  extensions: "extensions_example",
  name: "name_example",
};

apiInstance.createGzipConfig(options)
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
**cache_condition** | **String** | Name of the cache condition controlling when this configuration applies. | [optional]
**content_types** | **String** | Space-separated list of content types to compress. If you omit this field a default list will be used. | [optional]
**extensions** | **String** | Space-separated list of file extensions to compress. If you omit this field a default list will be used. | [optional]
**name** | **String** | Name of the gzip configuration. | [optional]

### Return type

[**GzipResponse**](GzipResponse.md)


## `deleteGzipConfig`

```javascript
deleteGzipConfig({ service_id, version_id, gzip_name })
```

Delete a named gzip configuration on a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  gzip_name: "gzip_name_example", // required
};

apiInstance.deleteGzipConfig(options)
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
**gzip_name** | **String** | Name of the gzip configuration. |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `getGzipConfigs`

```javascript
getGzipConfigs({ service_id, version_id, gzip_name })
```

Get the gzip configuration for a particular service, version, and name.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  gzip_name: "gzip_name_example", // required
};

apiInstance.getGzipConfigs(options)
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
**gzip_name** | **String** | Name of the gzip configuration. |

### Return type

[**GzipResponse**](GzipResponse.md)


## `listGzipConfigs`

```javascript
listGzipConfigs({ service_id, version_id })
```

List all gzip configurations for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.listGzipConfigs(options)
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

[**[GzipResponse]**](GzipResponse.md)


## `updateGzipConfig`

```javascript
updateGzipConfig({ service_id, version_id, gzip_name, [cache_condition, ][content_types, ][extensions, ][name] })
```

Update a named gzip configuration on a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  gzip_name: "gzip_name_example", // required
  cache_condition: "cache_condition_example",
  content_types: "content_types_example",
  extensions: "extensions_example",
  name: "name_example",
};

apiInstance.updateGzipConfig(options)
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
**gzip_name** | **String** | Name of the gzip configuration. |
**cache_condition** | **String** | Name of the cache condition controlling when this configuration applies. | [optional]
**content_types** | **String** | Space-separated list of content types to compress. If you omit this field a default list will be used. | [optional]
**extensions** | **String** | Space-separated list of file extensions to compress. If you omit this field a default list will be used. | [optional]
**name** | **String** | Name of the gzip configuration. | [optional]

### Return type

[**GzipResponse**](GzipResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
