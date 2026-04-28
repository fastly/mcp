# Fastly.DomainApi

```javascript
const apiInstance = new Fastly.DomainApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**checkDomain**](DomainApi.md#checkDomain) | **GET** /service/{service_id}/version/{version_id}/domain/{domain_name}/check | Validate DNS configuration for a single domain on a service
[**checkDomains**](DomainApi.md#checkDomains) | **GET** /service/{service_id}/version/{version_id}/domain/check_all | Validate DNS configuration for all domains on a service
[**createDomain**](DomainApi.md#createDomain) | **POST** /service/{service_id}/version/{version_id}/domain | Add a domain name to a service
[**deleteDomain**](DomainApi.md#deleteDomain) | **DELETE** /service/{service_id}/version/{version_id}/domain/{domain_name} | Remove a domain from a service
[**getDomain**](DomainApi.md#getDomain) | **GET** /service/{service_id}/version/{version_id}/domain/{domain_name} | Describe a domain
[**listDomains**](DomainApi.md#listDomains) | **GET** /service/{service_id}/version/{version_id}/domain | List domains
[**updateDomain**](DomainApi.md#updateDomain) | **PUT** /service/{service_id}/version/{version_id}/domain/{domain_name} | Update a domain


## `checkDomain`

```javascript
checkDomain({ service_id, version_id, domain_name })
```

Checks the status of a specific domain's DNS record for a Service Version. Returns an array in the same format as domain/check_all.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  domain_name: "domain_name_example", // required
};

apiInstance.checkDomain(options)
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
**domain_name** | **String** | The name of the domain or domains associated with this service. |

### Return type

**[Object]**


## `checkDomains`

```javascript
checkDomains({ service_id, version_id })
```

Checks the status of all domains' DNS records for a Service Version. Returns an array of 3 items for each domain; the first is the details for the domain, the second is the current CNAME of the domain, and the third is a boolean indicating whether or not it has been properly setup to use Fastly.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.checkDomains(options)
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

**[Array]**


## `createDomain`

```javascript
createDomain({ service_id, version_id, [comment, ][name] })
```

Create a domain for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  comment: "comment_example",
  name: "name_example",
};

apiInstance.createDomain(options)
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
**comment** | **String** | A freeform descriptive note. | [optional]
**name** | **String** | The name of the domain or domains associated with this service. | [optional]

### Return type

[**DomainResponse**](DomainResponse.md)


## `deleteDomain`

```javascript
deleteDomain({ service_id, version_id, domain_name })
```

Delete the domain for a particular service and versions.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  domain_name: "domain_name_example", // required
};

apiInstance.deleteDomain(options)
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
**domain_name** | **String** | The name of the domain or domains associated with this service. |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `getDomain`

```javascript
getDomain({ service_id, version_id, domain_name })
```

Get the domain for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  domain_name: "domain_name_example", // required
};

apiInstance.getDomain(options)
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
**domain_name** | **String** | The name of the domain or domains associated with this service. |

### Return type

[**DomainResponse**](DomainResponse.md)


## `listDomains`

```javascript
listDomains({ service_id, version_id })
```

List all the domains for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.listDomains(options)
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

[**[DomainResponse]**](DomainResponse.md)


## `updateDomain`

```javascript
updateDomain({ service_id, version_id, domain_name, [comment, ][name] })
```

Update the domain for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  domain_name: "domain_name_example", // required
  comment: "comment_example",
  name: "name_example",
};

apiInstance.updateDomain(options)
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
**domain_name** | **String** | The name of the domain or domains associated with this service. |
**comment** | **String** | A freeform descriptive note. | [optional]
**name** | **String** | The name of the domain or domains associated with this service. | [optional]

### Return type

[**DomainResponse**](DomainResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
