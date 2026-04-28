# Fastly.VersionApi

```javascript
const apiInstance = new Fastly.VersionApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**activateServiceVersion**](VersionApi.md#activateServiceVersion) | **PUT** /service/{service_id}/version/{version_id}/activate | Activate a service version
[**activateServiceVersionEnvironment**](VersionApi.md#activateServiceVersionEnvironment) | **PUT** /service/{service_id}/version/{version_id}/activate/{environment_name} | Activate a service version on the specified environment
[**cloneServiceVersion**](VersionApi.md#cloneServiceVersion) | **PUT** /service/{service_id}/version/{version_id}/clone | Clone a service version
[**createServiceVersion**](VersionApi.md#createServiceVersion) | **POST** /service/{service_id}/version | Create a service version
[**deactivateServiceVersion**](VersionApi.md#deactivateServiceVersion) | **PUT** /service/{service_id}/version/{version_id}/deactivate | Deactivate a service version
[**deactivateServiceVersionEnvironment**](VersionApi.md#deactivateServiceVersionEnvironment) | **PUT** /service/{service_id}/version/{version_id}/deactivate/{environment_name} | Deactivate a service version on an environment
[**getServiceVersion**](VersionApi.md#getServiceVersion) | **GET** /service/{service_id}/version/{version_id} | Get a version of a service
[**listServiceVersions**](VersionApi.md#listServiceVersions) | **GET** /service/{service_id}/version | List versions of a service
[**lockServiceVersion**](VersionApi.md#lockServiceVersion) | **PUT** /service/{service_id}/version/{version_id}/lock | Lock a service version
[**updateServiceVersion**](VersionApi.md#updateServiceVersion) | **PUT** /service/{service_id}/version/{version_id} | Update a service version
[**validateServiceVersion**](VersionApi.md#validateServiceVersion) | **GET** /service/{service_id}/version/{version_id}/validate | Validate a service version


## `activateServiceVersion`

```javascript
activateServiceVersion({ service_id, version_id })
```

Activate the current version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.activateServiceVersion(options)
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

[**VersionResponse**](VersionResponse.md)


## `activateServiceVersionEnvironment`

```javascript
activateServiceVersionEnvironment({ service_id, version_id, environment_name })
```

Activate a version on a given environment, i.e. \"staging\"

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  environment_name: new Fastly.EnvironmentName(), // required
};

apiInstance.activateServiceVersionEnvironment(options)
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
**environment_name** | [**EnvironmentName**](.md) |  |

### Return type

[**VersionResponse**](VersionResponse.md)


## `cloneServiceVersion`

```javascript
cloneServiceVersion({ service_id, version_id })
```

Clone the current configuration into a new version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.cloneServiceVersion(options)
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

[**Version**](Version.md)


## `createServiceVersion`

```javascript
createServiceVersion({ service_id })
```

Create a version for a particular service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.createServiceVersion(options)
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

### Return type

[**VersionCreateResponse**](VersionCreateResponse.md)


## `deactivateServiceVersion`

```javascript
deactivateServiceVersion({ service_id, version_id })
```

Deactivate the current version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.deactivateServiceVersion(options)
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

[**VersionResponse**](VersionResponse.md)


## `deactivateServiceVersionEnvironment`

```javascript
deactivateServiceVersionEnvironment({ service_id, version_id, environment_name })
```

Deactivate the current version on a given environment, i.e. \"staging\"

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  environment_name: new Fastly.EnvironmentName(), // required
};

apiInstance.deactivateServiceVersionEnvironment(options)
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
**environment_name** | [**EnvironmentName**](.md) |  |

### Return type

[**VersionResponse**](VersionResponse.md)


## `getServiceVersion`

```javascript
getServiceVersion({ service_id, version_id })
```

Get the version for a particular service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.getServiceVersion(options)
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

[**VersionResponse**](VersionResponse.md)


## `listServiceVersions`

```javascript
listServiceVersions({ service_id })
```

List the versions for a particular service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.listServiceVersions(options)
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

### Return type

[**[VersionResponse]**](VersionResponse.md)


## `lockServiceVersion`

```javascript
lockServiceVersion({ service_id, version_id })
```

Locks the specified version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.lockServiceVersion(options)
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

[**Version**](Version.md)


## `updateServiceVersion`

```javascript
updateServiceVersion({ service_id, version_id, [active, ][comment, ][deployed, ][locked, ][number, ][staging, ][testing] })
```

Update a particular version for a particular service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  active: false,
  comment: "comment_example",
  deployed: true,
  locked: false,
  number: 56,
  staging: false,
  testing: false,
};

apiInstance.updateServiceVersion(options)
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
**active** | **Boolean** | Whether this is the active version or not. | [optional] [defaults to false]
**comment** | **String** | A freeform descriptive note. | [optional]
**deployed** | **Boolean** | Unused at this time. | [optional]
**locked** | **Boolean** | Whether this version is locked or not. Objects can not be added or edited on locked versions. | [optional] [defaults to false]
**number** | **Number** | The number of this version. | [optional]
**staging** | **Boolean** | Unused at this time. | [optional] [defaults to false]
**testing** | **Boolean** | Unused at this time. | [optional] [defaults to false]

### Return type

[**VersionResponse**](VersionResponse.md)


## `validateServiceVersion`

```javascript
validateServiceVersion({ service_id, version_id })
```

Validate the version for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.validateServiceVersion(options)
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

[**InlineResponse200**](InlineResponse200.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
