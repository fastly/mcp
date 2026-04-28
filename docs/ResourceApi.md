# Fastly.ResourceApi

```javascript
const apiInstance = new Fastly.ResourceApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createResource**](ResourceApi.md#createResource) | **POST** /service/{service_id}/version/{version_id}/resource | Create a resource link
[**deleteResource**](ResourceApi.md#deleteResource) | **DELETE** /service/{service_id}/version/{version_id}/resource/{id} | Delete a resource link
[**getResource**](ResourceApi.md#getResource) | **GET** /service/{service_id}/version/{version_id}/resource/{id} | Display a resource link
[**listResources**](ResourceApi.md#listResources) | **GET** /service/{service_id}/version/{version_id}/resource | List resource links
[**updateResource**](ResourceApi.md#updateResource) | **PUT** /service/{service_id}/version/{version_id}/resource/{id} | Update a resource link


## `createResource`

```javascript
createResource({ service_id, version_id, [resource_id, ][name] })
```

Create a link between a resource and a service version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  resource_id: "resource_id_example",
  name: "name_example",
};

apiInstance.createResource(options)
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
**resource_id** | **String** | The ID of the underlying linked resource. | [optional]
**name** | **String** | The name of the resource link. Note this is separate from the resource store name and might not match the store name. | [optional]

### Return type

[**ResourceResponse**](ResourceResponse.md)


## `deleteResource`

```javascript
deleteResource({ service_id, version_id, id })
```

Delete a link between a resource and a service version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  id: "id_example", // required
};

apiInstance.deleteResource(options)
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
**id** | **String** | An alphanumeric string identifying the resource link. |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `getResource`

```javascript
getResource({ service_id, version_id, id })
```

Display a resource link by its identifier.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  id: "id_example", // required
};

apiInstance.getResource(options)
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
**id** | **String** | An alphanumeric string identifying the resource link. |

### Return type

[**ResourceResponse**](ResourceResponse.md)


## `listResources`

```javascript
listResources({ service_id, version_id })
```

List links between resources and services

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.listResources(options)
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

[**[ResourceResponse]**](ResourceResponse.md)


## `updateResource`

```javascript
updateResource({ service_id, version_id, id, [resource_id, ][name] })
```

Update a link between a resource and a service version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  id: "id_example", // required
  resource_id: "resource_id_example",
  name: "name_example",
};

apiInstance.updateResource(options)
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
**id** | **String** | An alphanumeric string identifying the resource link. |
**resource_id** | **String** | The ID of the underlying linked resource. | [optional]
**name** | **String** | The name of the resource link. Note this is separate from the resource store name and might not match the store name. | [optional]

### Return type

[**ResourceResponse**](ResourceResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
