# Fastly.AclApi

```javascript
const apiInstance = new Fastly.AclApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createAcl**](AclApi.md#createAcl) | **POST** /service/{service_id}/version/{version_id}/acl | Create a new ACL
[**deleteAcl**](AclApi.md#deleteAcl) | **DELETE** /service/{service_id}/version/{version_id}/acl/{acl_name} | Delete an ACL
[**getAcl**](AclApi.md#getAcl) | **GET** /service/{service_id}/version/{version_id}/acl/{acl_name} | Describe an ACL
[**listAcls**](AclApi.md#listAcls) | **GET** /service/{service_id}/version/{version_id}/acl | List ACLs
[**updateAcl**](AclApi.md#updateAcl) | **PUT** /service/{service_id}/version/{version_id}/acl/{acl_name} | Update an ACL


## `createAcl`

```javascript
createAcl({ service_id, version_id, [name] })
```

Create a new ACL attached to the specified service version. A new, empty ACL must be attached to a draft version of a service. The version associated with the ACL must be activated to be used.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  name: "name_example",
};

apiInstance.createAcl(options)
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
**name** | **String** | Name for the ACL. Must start with an alphanumeric character and contain only alphanumeric characters, underscores, and whitespace. | [optional]

### Return type

[**AclResponse**](AclResponse.md)


## `deleteAcl`

```javascript
deleteAcl({ service_id, version_id, acl_name })
```

Delete an ACL from the specified service version. To remove an ACL from use, the ACL must be deleted from a draft version and the version without the ACL must be activated.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  acl_name: "acl_name_example", // required
};

apiInstance.deleteAcl(options)
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
**acl_name** | **String** | Name for the ACL. Must start with an alphanumeric character and contain only alphanumeric characters, underscores, and whitespace. |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `getAcl`

```javascript
getAcl({ service_id, version_id, acl_name })
```

Retrieve a single ACL by name for the version and service.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  acl_name: "acl_name_example", // required
};

apiInstance.getAcl(options)
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
**acl_name** | **String** | Name for the ACL. Must start with an alphanumeric character and contain only alphanumeric characters, underscores, and whitespace. |

### Return type

[**AclResponse**](AclResponse.md)


## `listAcls`

```javascript
listAcls({ service_id, version_id })
```

List ACLs.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.listAcls(options)
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

[**[AclResponse]**](AclResponse.md)


## `updateAcl`

```javascript
updateAcl({ service_id, version_id, acl_name, [name] })
```

Update an ACL for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  acl_name: "acl_name_example", // required
  name: "name_example",
};

apiInstance.updateAcl(options)
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
**acl_name** | **String** | Name for the ACL. Must start with an alphanumeric character and contain only alphanumeric characters, underscores, and whitespace. |
**name** | **String** | Name for the ACL. Must start with an alphanumeric character and contain only alphanumeric characters, underscores, and whitespace. | [optional]

### Return type

[**AclResponse**](AclResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
