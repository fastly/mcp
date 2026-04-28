# Fastly.IamUserGroupsApi

```javascript
const apiInstance = new Fastly.IamUserGroupsApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**addUserGroupMembers**](IamUserGroupsApi.md#addUserGroupMembers) | **POST** /user-groups/{user_group_id}/members | Add members to a user group
[**addUserGroupRoles**](IamUserGroupsApi.md#addUserGroupRoles) | **POST** /user-groups/{user_group_id}/roles | Add roles to a user group
[**addUserGroupServiceGroups**](IamUserGroupsApi.md#addUserGroupServiceGroups) | **POST** /user-groups/{user_group_id}/service-groups | Add service groups to a user group
[**createAUserGroup**](IamUserGroupsApi.md#createAUserGroup) | **POST** /user-groups | Create a user group
[**deleteAUserGroup**](IamUserGroupsApi.md#deleteAUserGroup) | **DELETE** /user-groups/{user_group_id} | Delete a user group
[**getAUserGroup**](IamUserGroupsApi.md#getAUserGroup) | **GET** /user-groups/{user_group_id} | Get a user group
[**listUserGroupMembers**](IamUserGroupsApi.md#listUserGroupMembers) | **GET** /user-groups/{user_group_id}/members | List members of a user group
[**listUserGroupRoles**](IamUserGroupsApi.md#listUserGroupRoles) | **GET** /user-groups/{user_group_id}/roles | List roles in a user group
[**listUserGroupServiceGroups**](IamUserGroupsApi.md#listUserGroupServiceGroups) | **GET** /user-groups/{user_group_id}/service-groups | List service groups in a user group
[**listUserGroups**](IamUserGroupsApi.md#listUserGroups) | **GET** /user-groups | List user groups
[**removeUserGroupMembers**](IamUserGroupsApi.md#removeUserGroupMembers) | **DELETE** /user-groups/{user_group_id}/members | Remove members of a user group
[**removeUserGroupRoles**](IamUserGroupsApi.md#removeUserGroupRoles) | **DELETE** /user-groups/{user_group_id}/roles | Remove roles from a user group
[**removeUserGroupServiceGroups**](IamUserGroupsApi.md#removeUserGroupServiceGroups) | **DELETE** /user-groups/{user_group_id}/service-groups | Remove service groups from a user group
[**updateAUserGroup**](IamUserGroupsApi.md#updateAUserGroup) | **PATCH** /user-groups/{user_group_id} | Update a user group


## `addUserGroupMembers`

```javascript
addUserGroupMembers({ user_group_id, [request_body] })
```

Add members to a user group.

### Example

```javascript
const options = {
  user_group_id: "user_group_id_example", // required
  request_body: {"members":[{"id":"0QbayrOodFILsM58jum2nt","object":"user"},{"id":"5QoWSdPgkxvL9eoDMXRDr4","object":"invitation"}]},
};

apiInstance.addUserGroupMembers(options)
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
**user_group_id** | **String** | Alphanumeric string identifying the user group. |
**request_body** | [**{String: Object}**](Object.md) |  | [optional]

### Return type

**Object**


## `addUserGroupRoles`

```javascript
addUserGroupRoles({ user_group_id, [request_body] })
```

Add roles to a user group.

### Example

```javascript
const options = {
  user_group_id: "user_group_id_example", // required
  request_body: {"roles":[{"id":"0QbayrOodFILsM58jum2nt"},{"id":"5QoWSdPgkxvL9eoDMXRDr4"}]},
};

apiInstance.addUserGroupRoles(options)
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
**user_group_id** | **String** | Alphanumeric string identifying the user group. |
**request_body** | [**{String: Object}**](Object.md) |  | [optional]

### Return type

**Object**


## `addUserGroupServiceGroups`

```javascript
addUserGroupServiceGroups({ user_group_id, [request_body] })
```

Add service groups to a user group.

### Example

```javascript
const options = {
  user_group_id: "user_group_id_example", // required
  request_body: {"service_groups":[{"id":"0QbayrOodFILsM58jum2nt"},{"id":"5QoWSdPgkxvL9eoDMXRDr4"}]},
};

apiInstance.addUserGroupServiceGroups(options)
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
**user_group_id** | **String** | Alphanumeric string identifying the user group. |
**request_body** | [**{String: Object}**](Object.md) |  | [optional]

### Return type

**Object**


## `createAUserGroup`

```javascript
createAUserGroup({ , [request_body] })
```

Create a user group.

### Example

```javascript
const options = {
  request_body: {"name":"Security Engineers"},
};

apiInstance.createAUserGroup(options)
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


## `deleteAUserGroup`

```javascript
deleteAUserGroup({ user_group_id })
```

Delete a user group.

### Example

```javascript
const options = {
  user_group_id: "user_group_id_example", // required
};

apiInstance.deleteAUserGroup(options)
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
**user_group_id** | **String** | Alphanumeric string identifying the user group. |

### Return type

null (empty response body)


## `getAUserGroup`

```javascript
getAUserGroup({ user_group_id })
```

Get a user group.

### Example

```javascript
const options = {
  user_group_id: "user_group_id_example", // required
};

apiInstance.getAUserGroup(options)
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
**user_group_id** | **String** | Alphanumeric string identifying the user group. |

### Return type

**Object**


## `listUserGroupMembers`

```javascript
listUserGroupMembers({ user_group_id, [per_page, ][page] })
```

List members of a user group.

### Example

```javascript
const options = {
  user_group_id: "user_group_id_example", // required
  per_page: 20,
  page: 1,
};

apiInstance.listUserGroupMembers(options)
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
**user_group_id** | **String** | Alphanumeric string identifying the user group. |
**per_page** | **Number** | Number of records per page. | [optional] [defaults to 20]
**page** | **Number** | Current page. | [optional]

### Return type

**Object**


## `listUserGroupRoles`

```javascript
listUserGroupRoles({ user_group_id, [per_page, ][page] })
```

List roles in a user group.

### Example

```javascript
const options = {
  user_group_id: "user_group_id_example", // required
  per_page: 20,
  page: 1,
};

apiInstance.listUserGroupRoles(options)
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
**user_group_id** | **String** | Alphanumeric string identifying the user group. |
**per_page** | **Number** | Number of records per page. | [optional] [defaults to 20]
**page** | **Number** | Current page. | [optional]

### Return type

**Object**


## `listUserGroupServiceGroups`

```javascript
listUserGroupServiceGroups({ user_group_id, [per_page, ][page] })
```

List service groups in a user group.

### Example

```javascript
const options = {
  user_group_id: "user_group_id_example", // required
  per_page: 20,
  page: 1,
};

apiInstance.listUserGroupServiceGroups(options)
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
**user_group_id** | **String** | Alphanumeric string identifying the user group. |
**per_page** | **Number** | Number of records per page. | [optional] [defaults to 20]
**page** | **Number** | Current page. | [optional]

### Return type

**Object**


## `listUserGroups`

```javascript
listUserGroups({ , [per_page, ][page] })
```

List all user groups.

### Example

```javascript
const options = {
  per_page: 20,
  page: 1,
};

apiInstance.listUserGroups(options)
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


## `removeUserGroupMembers`

```javascript
removeUserGroupMembers({ user_group_id, [request_body] })
```

Remove members of a user group

### Example

```javascript
const options = {
  user_group_id: "user_group_id_example", // required
  request_body: {"members":[{"id":"0QbayrOodFILsM58jum2nt","object":"user"},{"id":"5QoWSdPgkxvL9eoDMXRDr4","object":"invitation"}]},
};

apiInstance.removeUserGroupMembers(options)
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
**user_group_id** | **String** | Alphanumeric string identifying the user group. |
**request_body** | [**{String: Object}**](Object.md) |  | [optional]

### Return type

null (empty response body)


## `removeUserGroupRoles`

```javascript
removeUserGroupRoles({ user_group_id, [request_body] })
```

Remove roles from a user group.

### Example

```javascript
const options = {
  user_group_id: "user_group_id_example", // required
  request_body: {"roles":[{"id":"2bxSauWWdQ5Hmg2d7WQiPU"},{"id":"5QoWSdPgkxvL9eoDMXRDr4"}]},
};

apiInstance.removeUserGroupRoles(options)
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
**user_group_id** | **String** | Alphanumeric string identifying the user group. |
**request_body** | [**{String: Object}**](Object.md) |  | [optional]

### Return type

null (empty response body)


## `removeUserGroupServiceGroups`

```javascript
removeUserGroupServiceGroups({ user_group_id, [request_body] })
```

Remove service groups from a user group.

### Example

```javascript
const options = {
  user_group_id: "user_group_id_example", // required
  request_body: {"service_groups":[{"id":"0QbayrOodFILsM58jum2nt"},{"id":"5QoWSdPgkxvL9eoDMXRDr4"}]},
};

apiInstance.removeUserGroupServiceGroups(options)
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
**user_group_id** | **String** | Alphanumeric string identifying the user group. |
**request_body** | [**{String: Object}**](Object.md) |  | [optional]

### Return type

null (empty response body)


## `updateAUserGroup`

```javascript
updateAUserGroup({ user_group_id, [request_body] })
```

Update a user group.

### Example

```javascript
const options = {
  user_group_id: "user_group_id_example", // required
  request_body: {"name":"Security Engineers","description":"Managing security on staging and production services."},
};

apiInstance.updateAUserGroup(options)
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
**user_group_id** | **String** | Alphanumeric string identifying the user group. |
**request_body** | [**{String: Object}**](Object.md) |  | [optional]

### Return type

**Object**


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
