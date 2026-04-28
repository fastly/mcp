# Fastly.DiffApi

```javascript
const apiInstance = new Fastly.DiffApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**diffServiceVersions**](DiffApi.md#diffServiceVersions) | **GET** /service/{service_id}/diff/from/{from_version_id}/to/{to_version_id} | Diff two service versions


## `diffServiceVersions`

```javascript
diffServiceVersions({ service_id, from_version_id, to_version_id, [format] })
```

Get diff between two versions.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  from_version_id: 1, // required
  to_version_id: 2, // required
  format: "text",
};

apiInstance.diffServiceVersions(options)
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
**from_version_id** | **Number** | The version number of the service to which changes in the generated VCL are being compared. Can either be a positive number from 1 to your maximum version or a negative number from -1 down (-1 is latest version etc). |
**to_version_id** | **Number** | The version number of the service from which changes in the generated VCL are being compared. Uses same numbering scheme as `from`. |
**format** | **String** | Optional method to format the diff field. | [optional] [one of: "text", "html", "html_simple"]

### Return type

[**DiffResponse**](DiffResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
