# Fastly.ServiceApi

```javascript
const apiInstance = new Fastly.ServiceApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createService**](ServiceApi.md#createService) | **POST** /service | Create a service
[**deleteService**](ServiceApi.md#deleteService) | **DELETE** /service/{service_id} | Delete a service
[**getService**](ServiceApi.md#getService) | **GET** /service/{service_id} | Get a service
[**getServiceDetail**](ServiceApi.md#getServiceDetail) | **GET** /service/{service_id}/details | Get service details
[**listServiceDomains**](ServiceApi.md#listServiceDomains) | **GET** /service/{service_id}/domain | List the domains within a service
[**listServices**](ServiceApi.md#listServices) | **GET** /service | List services
[**searchService**](ServiceApi.md#searchService) | **GET** /service/search | Search for a service by name
[**updateService**](ServiceApi.md#updateService) | **PUT** /service/{service_id} | Update a service


## `createService`

```javascript
createService({ , [comment, ][name, ][customer_id, ][type] })
```

Create a service.

### Example

```javascript
const options = {
  comment: "comment_example",
  name: "name_example",
  customer_id: "customer_id_example",
  type: "vcl",
};

apiInstance.createService(options)
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
**comment** | **String** | A freeform descriptive note. | [optional]
**name** | **String** | The name of the service. | [optional]
**customer_id** | **String** | Alphanumeric string identifying the customer. | [optional]
**type** | **String** | The type of this service. | [optional] [one of: "vcl", "wasm"]

### Return type

[**ServiceResponse**](ServiceResponse.md)


## `deleteService`

```javascript
deleteService({ service_id })
```

Delete a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.deleteService(options)
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

[**InlineResponse200**](InlineResponse200.md)


## `getService`

```javascript
getService({ service_id })
```

Get a specific service by id.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.getService(options)
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

[**ServiceResponse**](ServiceResponse.md)


## `getServiceDetail`

```javascript
getServiceDetail({ service_id, [version, ][filter_versions_active] })
```

List detailed information on a specified service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version: 56,
  filter_versions_active: true,
};

apiInstance.getServiceDetail(options)
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
**version** | **Number** | Number identifying a version of the service. | [optional]
**filter_versions_active** | **Boolean** | Limits the versions array to the active versions. Accepts `true` or `false` (defaults to false). | [optional]

### Return type

[**ServiceDetail**](ServiceDetail.md)


## `listServiceDomains`

```javascript
listServiceDomains({ service_id })
```

List the domains within a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.listServiceDomains(options)
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

[**[DomainResponse]**](DomainResponse.md)


## `listServices`

```javascript
listServices({ , [page, ][per_page, ][sort, ][direction] })
```

List services.

### Example

```javascript
const options = {
  page: 1,
  per_page: 20,
  sort: created,
  direction: "ascend",
};

apiInstance.listServices(options)
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
**page** | **Number** | Current page. | [optional]
**per_page** | **Number** | Number of records per page. | [optional] [defaults to 20]
**sort** | **String** | Field on which to sort. | [optional] [defaults to 'created']
**direction** | **String** | Direction in which to sort results. | [optional] [one of: "ascend", "descend"]

### Return type

[**[ServiceListResponse]**](ServiceListResponse.md)


## `searchService`

```javascript
searchService({ name })
```

Get a specific service by name.

### Example

```javascript
const options = {
  name: "name_example", // required
};

apiInstance.searchService(options)
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
**name** | **String** | The name of the service. |

### Return type

[**ServiceResponse**](ServiceResponse.md)


## `updateService`

```javascript
updateService({ service_id, [comment, ][name, ][customer_id] })
```

Update a service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  comment: "comment_example",
  name: "name_example",
  customer_id: "customer_id_example",
};

apiInstance.updateService(options)
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
**comment** | **String** | A freeform descriptive note. | [optional]
**name** | **String** | The name of the service. | [optional]
**customer_id** | **String** | Alphanumeric string identifying the customer. | [optional]

### Return type

[**ServiceResponse**](ServiceResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
