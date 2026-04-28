# Fastly.VclApi

```javascript
const apiInstance = new Fastly.VclApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createCustomVcl**](VclApi.md#createCustomVcl) | **POST** /service/{service_id}/version/{version_id}/vcl | Create a custom VCL file
[**deleteCustomVcl**](VclApi.md#deleteCustomVcl) | **DELETE** /service/{service_id}/version/{version_id}/vcl/{vcl_name} | Delete a custom VCL file
[**getCustomVcl**](VclApi.md#getCustomVcl) | **GET** /service/{service_id}/version/{version_id}/vcl/{vcl_name} | Get a custom VCL file
[**getCustomVclBoilerplate**](VclApi.md#getCustomVclBoilerplate) | **GET** /service/{service_id}/version/{version_id}/boilerplate | Get boilerplate VCL
[**getCustomVclGenerated**](VclApi.md#getCustomVclGenerated) | **GET** /service/{service_id}/version/{version_id}/generated_vcl | Get the generated VCL for a service
[**getCustomVclGeneratedHighlighted**](VclApi.md#getCustomVclGeneratedHighlighted) | **GET** /service/{service_id}/version/{version_id}/generated_vcl/content | Get the generated VCL with syntax highlighting
[**getCustomVclHighlighted**](VclApi.md#getCustomVclHighlighted) | **GET** /service/{service_id}/version/{version_id}/vcl/{vcl_name}/content | Get a custom VCL file with syntax highlighting
[**getCustomVclRaw**](VclApi.md#getCustomVclRaw) | **GET** /service/{service_id}/version/{version_id}/vcl/{vcl_name}/download | Download a custom VCL file
[**lintVclDefault**](VclApi.md#lintVclDefault) | **POST** /vcl_lint | Lint (validate) VCL using a default set of flags.
[**lintVclForService**](VclApi.md#lintVclForService) | **POST** /service/{service_id}/lint | Lint (validate) VCL using flags set for the service.
[**listCustomVcl**](VclApi.md#listCustomVcl) | **GET** /service/{service_id}/version/{version_id}/vcl | List custom VCL files
[**setCustomVclMain**](VclApi.md#setCustomVclMain) | **PUT** /service/{service_id}/version/{version_id}/vcl/{vcl_name}/main | Set a custom VCL file as main
[**updateCustomVcl**](VclApi.md#updateCustomVcl) | **PUT** /service/{service_id}/version/{version_id}/vcl/{vcl_name} | Update a custom VCL file


## `createCustomVcl`

```javascript
createCustomVcl({ service_id, version_id, [content, ][main, ][name] })
```

Upload a VCL for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  content: "content_example",
  main: true,
  name: "name_example",
};

apiInstance.createCustomVcl(options)
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
**content** | **String** | The VCL code to be included. | [optional]
**main** | **Boolean** | Set to `true` when this is the main VCL, otherwise `false`. | [optional]
**name** | **String** | The name of this VCL. | [optional]

### Return type

[**VclResponse**](VclResponse.md)


## `deleteCustomVcl`

```javascript
deleteCustomVcl({ service_id, version_id, vcl_name })
```

Delete the uploaded VCL for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  vcl_name: "vcl_name_example", // required
};

apiInstance.deleteCustomVcl(options)
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
**vcl_name** | **String** | The name of this VCL. |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `getCustomVcl`

```javascript
getCustomVcl({ service_id, version_id, vcl_name, [no_content] })
```

Get the uploaded VCL for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  vcl_name: "vcl_name_example", // required
  no_content: "'0'",
};

apiInstance.getCustomVcl(options)
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
**vcl_name** | **String** | The name of this VCL. |
**no_content** | **String** | Omit VCL content. | [optional] [defaults to '0']

### Return type

[**VclResponse**](VclResponse.md)


## `getCustomVclBoilerplate`

```javascript
getCustomVclBoilerplate({ service_id, version_id })
```

Return boilerplate VCL with the service's TTL from the [settings](https://www.fastly.com/documentation/reference/api/vcl-services/settings/).

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.getCustomVclBoilerplate(options)
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

**String**


## `getCustomVclGenerated`

```javascript
getCustomVclGenerated({ service_id, version_id })
```

Display the generated VCL for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.getCustomVclGenerated(options)
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

[**VclResponse**](VclResponse.md)


## `getCustomVclGeneratedHighlighted`

```javascript
getCustomVclGeneratedHighlighted({ service_id, version_id })
```

Display the content of generated VCL with HTML syntax highlighting. Include line numbers by sending `lineno=true` as a request parameter.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.getCustomVclGeneratedHighlighted(options)
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

[**VclSyntaxHighlightingResponse**](VclSyntaxHighlightingResponse.md)


## `getCustomVclHighlighted`

```javascript
getCustomVclHighlighted({ service_id, version_id, vcl_name })
```

Get the uploaded VCL for a particular service and version with HTML syntax highlighting. Include line numbers by sending `lineno=true` as a request parameter.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  vcl_name: "vcl_name_example", // required
};

apiInstance.getCustomVclHighlighted(options)
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
**vcl_name** | **String** | The name of this VCL. |

### Return type

[**VclSyntaxHighlightingResponse**](VclSyntaxHighlightingResponse.md)


## `getCustomVclRaw`

```javascript
getCustomVclRaw({ service_id, version_id, vcl_name })
```

Download the specified VCL.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  vcl_name: "vcl_name_example", // required
};

apiInstance.getCustomVclRaw(options)
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
**vcl_name** | **String** | The name of this VCL. |

### Return type

**String**


## `lintVclDefault`

```javascript
lintVclDefault({ inline_object1 })
```

This endpoint validates the submitted VCL against a default set of enabled flags. Consider using the `/service/{service_id}/lint` operation to validate VCL in the context of a specific service.

### Example

```javascript
const options = {
  inline_object1: new Fastly.InlineObject1(), // required
};

apiInstance.lintVclDefault(options)
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
**inline_object1** | [**InlineObject1**](InlineObject1.md) |  |

### Return type

[**ValidatorResult**](ValidatorResult.md)


## `lintVclForService`

```javascript
lintVclForService({ service_id, inline_object })
```

Services may have flags set by a Fastly employee or by the purchase of products as addons to the service, which modify the way VCL is interpreted by that service.  This endpoint validates the submitted VCL in the context of the specified service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  inline_object: new Fastly.InlineObject(), // required
};

apiInstance.lintVclForService(options)
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
**inline_object** | [**InlineObject**](InlineObject.md) |  |

### Return type

[**ValidatorResult**](ValidatorResult.md)


## `listCustomVcl`

```javascript
listCustomVcl({ service_id, version_id })
```

List the uploaded VCLs for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.listCustomVcl(options)
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

[**[VclResponse]**](VclResponse.md)


## `setCustomVclMain`

```javascript
setCustomVclMain({ service_id, version_id, vcl_name })
```

Set the specified VCL as the main.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  vcl_name: "vcl_name_example", // required
};

apiInstance.setCustomVclMain(options)
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
**vcl_name** | **String** | The name of this VCL. |

### Return type

[**VclResponse**](VclResponse.md)


## `updateCustomVcl`

```javascript
updateCustomVcl({ service_id, version_id, vcl_name, [content, ][main, ][name] })
```

Update the uploaded VCL for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  vcl_name: "vcl_name_example", // required
  content: "content_example",
  main: true,
  name: "name_example",
};

apiInstance.updateCustomVcl(options)
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
**vcl_name** | **String** | The name of this VCL. |
**content** | **String** | The VCL code to be included. | [optional]
**main** | **Boolean** | Set to `true` when this is the main VCL, otherwise `false`. | [optional]
**name** | **String** | The name of this VCL. | [optional]

### Return type

[**VclResponse**](VclResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
