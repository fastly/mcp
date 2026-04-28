# Fastly.PackageApi

```javascript
const apiInstance = new Fastly.PackageApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**getPackage**](PackageApi.md#getPackage) | **GET** /service/{service_id}/version/{version_id}/package | Get details of the service&#39;s Compute package.
[**putPackage**](PackageApi.md#putPackage) | **PUT** /service/{service_id}/version/{version_id}/package | Upload a Compute package.


## `getPackage`

```javascript
getPackage({ service_id, version_id })
```

List detailed information about the Compute package for the specified service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.getPackage(options)
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

[**PackageResponse**](PackageResponse.md)


## `putPackage`

```javascript
putPackage({ service_id, version_id, [expect, ][_package] })
```

Upload a Compute package associated with the specified service version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  expect: 100-continue,
  _package: "/path/to/file",
};

apiInstance.putPackage(options)
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
**expect** | **String** | We recommend using the Expect header because it may identify issues with the request based upon the headers alone instead of requiring you to wait until the entire binary package upload has completed. | [optional]
**_package** | **File****File** | The content of the Wasm binary package. | [optional]

### Return type

[**PackageResponse**](PackageResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
