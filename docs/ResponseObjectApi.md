# Fastly.ResponseObjectApi

```javascript
const apiInstance = new Fastly.ResponseObjectApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createResponseObject**](ResponseObjectApi.md#createResponseObject) | **POST** /service/{service_id}/version/{version_id}/response_object | Create a Response object
[**deleteResponseObject**](ResponseObjectApi.md#deleteResponseObject) | **DELETE** /service/{service_id}/version/{version_id}/response_object/{response_object_name} | Delete a Response Object
[**getResponseObject**](ResponseObjectApi.md#getResponseObject) | **GET** /service/{service_id}/version/{version_id}/response_object/{response_object_name} | Get a Response object
[**listResponseObjects**](ResponseObjectApi.md#listResponseObjects) | **GET** /service/{service_id}/version/{version_id}/response_object | List Response objects
[**updateResponseObject**](ResponseObjectApi.md#updateResponseObject) | **PUT** /service/{service_id}/version/{version_id}/response_object/{response_object_name} | Update a Response object


## `createResponseObject`

```javascript
createResponseObject({ service_id, version_id, [create_response_object_request] })
```

Creates a new Response Object.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  create_response_object_request: new Fastly.CreateResponseObjectRequest(),
};

apiInstance.createResponseObject(options)
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
**create_response_object_request** | [**CreateResponseObjectRequest**](CreateResponseObjectRequest.md) |  | [optional]

### Return type

[**ResponseObjectResponse**](ResponseObjectResponse.md)


## `deleteResponseObject`

```javascript
deleteResponseObject({ service_id, version_id, response_object_name })
```

Deletes the specified Response Object.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  response_object_name: "response_object_name_example", // required
};

apiInstance.deleteResponseObject(options)
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
**response_object_name** | **String** | Name for the request settings. |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `getResponseObject`

```javascript
getResponseObject({ service_id, version_id, response_object_name })
```

Gets the specified Response Object.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  response_object_name: "response_object_name_example", // required
};

apiInstance.getResponseObject(options)
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
**response_object_name** | **String** | Name for the request settings. |

### Return type

[**ResponseObjectResponse**](ResponseObjectResponse.md)


## `listResponseObjects`

```javascript
listResponseObjects({ service_id, version_id })
```

Returns all Response Objects for the specified service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.listResponseObjects(options)
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

[**[ResponseObjectResponse]**](ResponseObjectResponse.md)


## `updateResponseObject`

```javascript
updateResponseObject({ service_id, version_id, response_object_name, [create_response_object_request] })
```

Updates the specified Response Object.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  response_object_name: "response_object_name_example", // required
  create_response_object_request: new Fastly.CreateResponseObjectRequest(),
};

apiInstance.updateResponseObject(options)
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
**response_object_name** | **String** | Name for the request settings. |
**create_response_object_request** | [**CreateResponseObjectRequest**](CreateResponseObjectRequest.md) |  | [optional]

### Return type

[**ResponseObjectResponse**](ResponseObjectResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
