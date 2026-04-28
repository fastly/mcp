# Fastly.SudoApi

```javascript
const apiInstance = new Fastly.SudoApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**requestSudoAccess**](SudoApi.md#requestSudoAccess) | **POST** /sudo | Request Sudo access


## `requestSudoAccess`

```javascript
requestSudoAccess({ , [sudo_request] })
```

Re-authenticate to allow the provided user to obtain sudo access.

### Example

```javascript
const options = {
  sudo_request: new Fastly.SudoRequest(),
};

apiInstance.requestSudoAccess(options)
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
**sudo_request** | [**SudoRequest**](SudoRequest.md) |  | [optional]

### Return type

[**SudoResponse**](SudoResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
