# Fastly.StarApi

```javascript
const apiInstance = new Fastly.StarApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createServiceStar**](StarApi.md#createServiceStar) | **POST** /stars | Create a star
[**deleteServiceStar**](StarApi.md#deleteServiceStar) | **DELETE** /stars/{star_id} | Delete a star
[**getServiceStar**](StarApi.md#getServiceStar) | **GET** /stars/{star_id} | Get a star
[**listServiceStars**](StarApi.md#listServiceStars) | **GET** /stars | List stars


## `createServiceStar`

```javascript
createServiceStar({ , [star] })
```

Create star.

### Example

```javascript
const options = {
  star: {"data":{"type":"star","relationships":{"user":{"data":{"type":"user","id":"6c7kAlo4vACNchGOdQxP37"}},"service":{"data":{"type":"service","id":"SU1Z0isxPaozGVKXdv0eY"}}}}},
};

apiInstance.createServiceStar(options)
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
**star** | [**Star**](Star.md) |  | [optional]

### Return type

[**StarResponse**](StarResponse.md)


## `deleteServiceStar`

```javascript
deleteServiceStar({ star_id })
```

Delete star.

### Example

```javascript
const options = {
  star_id: "star_id_example", // required
};

apiInstance.deleteServiceStar(options)
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
**star_id** | **String** | Alphanumeric string identifying a star. |

### Return type

null (empty response body)


## `getServiceStar`

```javascript
getServiceStar({ star_id })
```

Show star.

### Example

```javascript
const options = {
  star_id: "star_id_example", // required
};

apiInstance.getServiceStar(options)
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
**star_id** | **String** | Alphanumeric string identifying a star. |

### Return type

[**StarResponse**](StarResponse.md)


## `listServiceStars`

```javascript
listServiceStars()
```

List stars.

### Example

```javascript
apiInstance.listServiceStars()
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

[**Pagination**](Pagination.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
