# Fastly.DirectorApi

```javascript
const apiInstance = new Fastly.DirectorApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createDirector**](DirectorApi.md#createDirector) | **POST** /service/{service_id}/version/{version_id}/director | Create a director
[**deleteDirector**](DirectorApi.md#deleteDirector) | **DELETE** /service/{service_id}/version/{version_id}/director/{director_name} | Delete a director
[**getDirector**](DirectorApi.md#getDirector) | **GET** /service/{service_id}/version/{version_id}/director/{director_name} | Get a director
[**listDirectors**](DirectorApi.md#listDirectors) | **GET** /service/{service_id}/version/{version_id}/director | List directors
[**updateDirector**](DirectorApi.md#updateDirector) | **PUT** /service/{service_id}/version/{version_id}/director/{director_name} | Update a director


## `createDirector`

```javascript
createDirector({ service_id, version_id, [backends, ][capacity, ][comment, ][name, ][quorum, ][shield, ][type, ][retries] })
```

Create a director for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  backends: [new Fastly.Backend()],
  capacity: 56,
  comment: "comment_example",
  name: "name_example",
  quorum: 75,
  shield: "'null'",
  type: 1,
  retries: 5,
};

apiInstance.createDirector(options)
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
**backends** | [**[Backend]**](Backend.md) | List of backends associated to a director. | [optional]
**capacity** | **Number** | Unused. | [optional]
**comment** | **String** | A freeform descriptive note. | [optional]
**name** | **String** | Name for the Director. | [optional]
**quorum** | **Number** | The percentage of capacity that needs to be up for a director to be considered up. `0` to `100`. | [optional] [defaults to 75]
**shield** | **String** | Selected POP to serve as a shield for the backends. Defaults to `null` meaning no origin shielding if not set. Refer to the [POPs API endpoint](https://www.fastly.com/documentation/reference/api/utils/pops/) to get a list of available POPs used for shielding. | [optional] [defaults to 'null']
**type** | **Number** | What type of load balance group to use. | [optional] [one of: 1, 3, 4]
**retries** | **Number** | How many backends to search if it fails. | [optional] [defaults to 5]

### Return type

[**DirectorResponse**](DirectorResponse.md)


## `deleteDirector`

```javascript
deleteDirector({ service_id, version_id, director_name })
```

Delete the director for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  director_name: "director_name_example", // required
};

apiInstance.deleteDirector(options)
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
**director_name** | **String** | Name for the Director. |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `getDirector`

```javascript
getDirector({ service_id, version_id, director_name })
```

Get the director for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  director_name: "director_name_example", // required
};

apiInstance.getDirector(options)
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
**director_name** | **String** | Name for the Director. |

### Return type

[**DirectorResponse**](DirectorResponse.md)


## `listDirectors`

```javascript
listDirectors({ service_id, version_id })
```

List the directors for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.listDirectors(options)
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

[**[DirectorResponse]**](DirectorResponse.md)


## `updateDirector`

```javascript
updateDirector({ service_id, version_id, director_name })
```

Update the director for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  director_name: "director_name_example", // required
};

apiInstance.updateDirector(options)
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
**director_name** | **String** | Name for the Director. |

### Return type

[**DirectorResponse**](DirectorResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
