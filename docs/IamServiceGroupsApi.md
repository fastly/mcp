# Fastly.IamServiceGroupsApi

```javascript
const apiInstance = new Fastly.IamServiceGroupsApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**addServiceGroupServices**](IamServiceGroupsApi.md#addServiceGroupServices) | **POST** /service-groups/{service_group_id}/services | Add services in a service group
[**createAServiceGroup**](IamServiceGroupsApi.md#createAServiceGroup) | **POST** /service-groups | Create a service group
[**deleteAServiceGroup**](IamServiceGroupsApi.md#deleteAServiceGroup) | **DELETE** /service-groups/{service_group_id} | Delete a service group
[**getAServiceGroup**](IamServiceGroupsApi.md#getAServiceGroup) | **GET** /service-groups/{service_group_id} | Get a service group
[**listServiceGroupServices**](IamServiceGroupsApi.md#listServiceGroupServices) | **GET** /service-groups/{service_group_id}/services | List services to a service group
[**listServiceGroups**](IamServiceGroupsApi.md#listServiceGroups) | **GET** /service-groups | List service groups
[**removeServiceGroupServices**](IamServiceGroupsApi.md#removeServiceGroupServices) | **DELETE** /service-groups/{service_group_id}/services | Remove services from a service group
[**updateAServiceGroup**](IamServiceGroupsApi.md#updateAServiceGroup) | **PATCH** /service-groups/{service_group_id} | Update a service group


## `addServiceGroupServices`

```javascript
addServiceGroupServices({ service_group_id, [request_body] })
```

Add services in a service group.

### Example

```javascript
const options = {
  service_group_id: "service_group_id_example", // required
  request_body: {"services":[{"id":"0QbayrOodFILsM58jum2nt"},{"id":"5QoWSdPgkxvL9eoDMXRDr4"}]},
};

apiInstance.addServiceGroupServices(options)
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
**service_group_id** | **String** | Alphanumeric string identifying the service group. |
**request_body** | [**{String: Object}**](Object.md) |  | [optional]

### Return type

**Object**


## `createAServiceGroup`

```javascript
createAServiceGroup({ , [request_body] })
```

Create a service group.

### Example

```javascript
const options = {
  request_body: {"name":"Prod Services"},
};

apiInstance.createAServiceGroup(options)
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
**request_body** | [**{String: Object}**](Object.md) |  | [optional]

### Return type

**Object**


## `deleteAServiceGroup`

```javascript
deleteAServiceGroup({ service_group_id })
```

Delete a service group.

### Example

```javascript
const options = {
  service_group_id: "service_group_id_example", // required
};

apiInstance.deleteAServiceGroup(options)
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
**service_group_id** | **String** | Alphanumeric string identifying the service group. |

### Return type

null (empty response body)


## `getAServiceGroup`

```javascript
getAServiceGroup({ service_group_id })
```

Get a service group.

### Example

```javascript
const options = {
  service_group_id: "service_group_id_example", // required
};

apiInstance.getAServiceGroup(options)
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
**service_group_id** | **String** | Alphanumeric string identifying the service group. |

### Return type

**Object**


## `listServiceGroupServices`

```javascript
listServiceGroupServices({ service_group_id, [per_page, ][page] })
```

List services to a service group.

### Example

```javascript
const options = {
  service_group_id: "service_group_id_example", // required
  per_page: 20,
  page: 1,
};

apiInstance.listServiceGroupServices(options)
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
**service_group_id** | **String** | Alphanumeric string identifying the service group. |
**per_page** | **Number** | Number of records per page. | [optional] [defaults to 20]
**page** | **Number** | Current page. | [optional]

### Return type

**Object**


## `listServiceGroups`

```javascript
listServiceGroups({ , [per_page, ][page] })
```

List all service groups.

### Example

```javascript
const options = {
  per_page: 20,
  page: 1,
};

apiInstance.listServiceGroups(options)
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
**per_page** | **Number** | Number of records per page. | [optional] [defaults to 20]
**page** | **Number** | Current page. | [optional]

### Return type

**Object**


## `removeServiceGroupServices`

```javascript
removeServiceGroupServices({ service_group_id, [request_body] })
```

Remove services from a service group.

### Example

```javascript
const options = {
  service_group_id: "service_group_id_example", // required
  request_body: {"services":[{"id":"0QbayrOodFILsM58jum2nt"},{"id":"5QoWSdPgkxvL9eoDMXRDr4"}]},
};

apiInstance.removeServiceGroupServices(options)
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
**service_group_id** | **String** | Alphanumeric string identifying the service group. |
**request_body** | [**{String: Object}**](Object.md) |  | [optional]

### Return type

null (empty response body)


## `updateAServiceGroup`

```javascript
updateAServiceGroup({ service_group_id, [request_body] })
```

Update a service group.

### Example

```javascript
const options = {
  service_group_id: "service_group_id_example", // required
  request_body: {"name":"Prod Services","description":"Services running in the production environment."},
};

apiInstance.updateAServiceGroup(options)
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
**service_group_id** | **String** | Alphanumeric string identifying the service group. |
**request_body** | [**{String: Object}**](Object.md) |  | [optional]

### Return type

**Object**


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
