# Fastly.ObjectStorageAccessKeysApi

```javascript
const apiInstance = new Fastly.ObjectStorageAccessKeysApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createAccessKey**](ObjectStorageAccessKeysApi.md#createAccessKey) | **POST** /resources/object-storage/access-keys | Create an access key
[**deleteAccessKey**](ObjectStorageAccessKeysApi.md#deleteAccessKey) | **DELETE** /resources/object-storage/access-keys/{access_key} | Delete an access key
[**getAccessKey**](ObjectStorageAccessKeysApi.md#getAccessKey) | **GET** /resources/object-storage/access-keys/{access_key} | Get an access key
[**listAccessKeys**](ObjectStorageAccessKeysApi.md#listAccessKeys) | **GET** /resources/object-storage/access-keys | List access keys


## `createAccessKey`

```javascript
createAccessKey({ , [access_key] })
```

Create an access key.

### Example

```javascript
const options = {
  access_key: new Fastly.AccessKey(),
};

apiInstance.createAccessKey(options)
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
**access_key** | [**AccessKey**](AccessKey.md) |  | [optional]

### Return type

[**AccessKeyResponse**](AccessKeyResponse.md)


## `deleteAccessKey`

```javascript
deleteAccessKey({ access_key })
```

Delete an access key.

### Example

```javascript
const options = {
  access_key: "access_key_example", // required
};

apiInstance.deleteAccessKey(options)
  .then(() => {
    console.log('API called successfully.');
  })
  .catch((error) => {
    console.error(error);
  });
```

### Options

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**access_key** | **String** |  |

### Return type

null (empty response body)


## `getAccessKey`

```javascript
getAccessKey({ access_key })
```

Get an access key by its identifier.

### Example

```javascript
const options = {
  access_key: "access_key_example", // required
};

apiInstance.getAccessKey(options)
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
**access_key** | **String** |  |

### Return type

[**AccessKey**](AccessKey.md)


## `listAccessKeys`

```javascript
listAccessKeys()
```

List access keys.

### Example

```javascript
apiInstance.listAccessKeys()
  .then((data) => {
    console.log(data, "API called successfully.");
  })
  .catch((error) => {
    console.error(error);
  });
```

### Options

This endpoint does not need any parameters.

### Return type

[**AccessKeyResponse**](AccessKeyResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
