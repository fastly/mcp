# Fastly.DirectorBackendApi

```javascript
const apiInstance = new Fastly.DirectorBackendApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createDirectorBackend**](DirectorBackendApi.md#createDirectorBackend) | **POST** /service/{service_id}/version/{version_id}/director/{director_name}/backend/{backend_name} | Create a director-backend relationship
[**deleteDirectorBackend**](DirectorBackendApi.md#deleteDirectorBackend) | **DELETE** /service/{service_id}/version/{version_id}/director/{director_name}/backend/{backend_name} | Delete a director-backend relationship
[**getDirectorBackend**](DirectorBackendApi.md#getDirectorBackend) | **GET** /service/{service_id}/version/{version_id}/director/{director_name}/backend/{backend_name} | Get a director-backend relationship


## `createDirectorBackend`

```javascript
createDirectorBackend({ director_name, service_id, version_id, backend_name })
```

Establishes a relationship between a Backend and a Director. The Backend is then considered a member of the Director and can be used to balance traffic onto.

### Example

```javascript
const options = {
  director_name: "director_name_example", // required
  service_id: "service_id_example", // required
  version_id: 56, // required
  backend_name: "backend_name_example", // required
};

apiInstance.createDirectorBackend(options)
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
**director_name** | **String** | Name for the Director. |
**service_id** | **String** | Alphanumeric string identifying the service. |
**version_id** | **Number** | Integer identifying a service version. |
**backend_name** | **String** | The name of the backend. |

### Return type

[**DirectorBackend**](DirectorBackend.md)


## `deleteDirectorBackend`

```javascript
deleteDirectorBackend({ director_name, service_id, version_id, backend_name })
```

Deletes the relationship between a Backend and a Director. The Backend is no longer considered a member of the Director and thus will not have traffic balanced onto it from this Director.

### Example

```javascript
const options = {
  director_name: "director_name_example", // required
  service_id: "service_id_example", // required
  version_id: 56, // required
  backend_name: "backend_name_example", // required
};

apiInstance.deleteDirectorBackend(options)
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
**director_name** | **String** | Name for the Director. |
**service_id** | **String** | Alphanumeric string identifying the service. |
**version_id** | **Number** | Integer identifying a service version. |
**backend_name** | **String** | The name of the backend. |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `getDirectorBackend`

```javascript
getDirectorBackend({ director_name, service_id, version_id, backend_name })
```

Returns the relationship between a Backend and a Director. If the Backend has been associated with the Director, it returns a simple record indicating this. Otherwise, returns a 404.

### Example

```javascript
const options = {
  director_name: "director_name_example", // required
  service_id: "service_id_example", // required
  version_id: 56, // required
  backend_name: "backend_name_example", // required
};

apiInstance.getDirectorBackend(options)
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
**director_name** | **String** | Name for the Director. |
**service_id** | **String** | Alphanumeric string identifying the service. |
**version_id** | **Number** | Integer identifying a service version. |
**backend_name** | **String** | The name of the backend. |

### Return type

[**DirectorBackend**](DirectorBackend.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
