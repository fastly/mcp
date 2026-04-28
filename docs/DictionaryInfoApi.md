# Fastly.DictionaryInfoApi

```javascript
const apiInstance = new Fastly.DictionaryInfoApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**getDictionaryInfo**](DictionaryInfoApi.md#getDictionaryInfo) | **GET** /service/{service_id}/version/{version_id}/dictionary/{dictionary_id}/info | Get dictionary metadata


## `getDictionaryInfo`

```javascript
getDictionaryInfo({ service_id, version_id, dictionary_id })
```

Retrieve metadata for a single dictionary by ID for a version and service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  dictionary_id: "dictionary_id_example", // required
};

apiInstance.getDictionaryInfo(options)
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
**dictionary_id** | **String** | Alphanumeric string identifying a Dictionary. |

### Return type

[**DictionaryInfoResponse**](DictionaryInfoResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
