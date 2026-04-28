# Fastly.ImageOptimizerDefaultSettingsApi

```javascript
const apiInstance = new Fastly.ImageOptimizerDefaultSettingsApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**getDefaultSettings**](ImageOptimizerDefaultSettingsApi.md#getDefaultSettings) | **GET** /service/{service_id}/version/{version_id}/image_optimizer_default_settings | Get current Image Optimizer Default Settings
[**updateDefaultSettings**](ImageOptimizerDefaultSettingsApi.md#updateDefaultSettings) | **PATCH** /service/{service_id}/version/{version_id}/image_optimizer_default_settings | Update Image Optimizer Default Settings


## `getDefaultSettings`

```javascript
getDefaultSettings({ service_id, version_id })
```

Retrieve the current Image Optimizer default settings. All properties in the response will be populated. 

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.getDefaultSettings(options)
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

[**DefaultSettingsResponse**](DefaultSettingsResponse.md)


## `updateDefaultSettings`

```javascript
updateDefaultSettings({ service_id, version_id, [default_settings] })
```

Update one or more default settings. A minimum of one property is required. The endpoint will respond with the new Image Optimizer default settings, with all properties populated. 

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  default_settings: new Fastly.DefaultSettings(),
};

apiInstance.updateDefaultSettings(options)
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
**default_settings** | [**DefaultSettings**](DefaultSettings.md) |  | [optional]

### Return type

[**DefaultSettingsResponse**](DefaultSettingsResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
