# Fastly.AclsInComputeApi

```javascript
const apiInstance = new Fastly.AclsInComputeApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**computeAclCreateAcls**](AclsInComputeApi.md#computeAclCreateAcls) | **POST** /resources/acls | Create a new ACL
[**computeAclDeleteSAclId**](AclsInComputeApi.md#computeAclDeleteSAclId) | **DELETE** /resources/acls/{acl_id} | Delete an ACL
[**computeAclListAclEntries**](AclsInComputeApi.md#computeAclListAclEntries) | **GET** /resources/acls/{acl_id}/entries | List an ACL
[**computeAclListAcls**](AclsInComputeApi.md#computeAclListAcls) | **GET** /resources/acls | List ACLs
[**computeAclListAclsSAclId**](AclsInComputeApi.md#computeAclListAclsSAclId) | **GET** /resources/acls/{acl_id} | Describe an ACL
[**computeAclLookupAcls**](AclsInComputeApi.md#computeAclLookupAcls) | **GET** /resources/acls/{acl_id}/entry/{acl_ip} | Lookup an ACL
[**computeAclUpdateAcls**](AclsInComputeApi.md#computeAclUpdateAcls) | **PATCH** /resources/acls/{acl_id}/entries | Update an ACL


## `computeAclCreateAcls`

```javascript
computeAclCreateAcls({ , [compute_acl_create_acls_request] })
```

Create a new ACL.

### Example

```javascript
const options = {
  compute_acl_create_acls_request: new Fastly.ComputeAclCreateAclsRequest(),
};

apiInstance.computeAclCreateAcls(options)
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
**compute_acl_create_acls_request** | [**ComputeAclCreateAclsRequest**](ComputeAclCreateAclsRequest.md) |  | [optional]

### Return type

[**ComputeAclCreateAclsResponse**](ComputeAclCreateAclsResponse.md)


## `computeAclDeleteSAclId`

```javascript
computeAclDeleteSAclId({ acl_id })
```

Delete an ACL.

### Example

```javascript
const options = {
  acl_id: "acl_id_example", // required
};

apiInstance.computeAclDeleteSAclId(options)
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
**acl_id** | **String** |  |

### Return type

null (empty response body)


## `computeAclListAclEntries`

```javascript
computeAclListAclEntries({ acl_id, [cursor, ][limit] })
```

List an ACL.

### Example

```javascript
const options = {
  acl_id: "acl_id_example", // required
  cursor: "cursor_example",
  limit: 100,
};

apiInstance.computeAclListAclEntries(options)
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
**acl_id** | **String** |  |
**cursor** | **String** |  | [optional]
**limit** | **Number** |  | [optional] [defaults to 100]

### Return type

[**ComputeAclListEntries**](ComputeAclListEntries.md)


## `computeAclListAcls`

```javascript
computeAclListAcls()
```

List all ACLs.

### Example

```javascript
apiInstance.computeAclListAcls()
  .then((data) => {
    console.log(data, "API called successfully.");
  })
  .catch((error) => {
    console.error(error);
  });
```

### Options

This endpoint does not need any parameters.

### Return type

[**ComputeAclList**](ComputeAclList.md)


## `computeAclListAclsSAclId`

```javascript
computeAclListAclsSAclId({ acl_id })
```

Describe an ACL.

### Example

```javascript
const options = {
  acl_id: "acl_id_example", // required
};

apiInstance.computeAclListAclsSAclId(options)
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
**acl_id** | **String** |  |

### Return type

[**ComputeAclCreateAclsResponse**](ComputeAclCreateAclsResponse.md)


## `computeAclLookupAcls`

```javascript
computeAclLookupAcls({ acl_id, acl_ip })
```

Find a matching ACL entry for an IP address.

### Example

```javascript
const options = {
  acl_id: "acl_id_example", // required
  acl_ip: "acl_ip_example", // required
};

apiInstance.computeAclLookupAcls(options)
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
**acl_id** | **String** |  |
**acl_ip** | **String** |  |

### Return type

[**ComputeAclLookup**](ComputeAclLookup.md)


## `computeAclUpdateAcls`

```javascript
computeAclUpdateAcls({ acl_id, [compute_acl_update] })
```

Update an ACL entry with a new operation or action, this allows you to modify an existing entry or delete it.

### Example

```javascript
const options = {
  acl_id: "acl_id_example", // required
  compute_acl_update: new Fastly.ComputeAclUpdate(),
};

apiInstance.computeAclUpdateAcls(options)
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
**acl_id** | **String** |  |
**compute_acl_update** | [**ComputeAclUpdate**](ComputeAclUpdate.md) |  | [optional]

### Return type

null (empty response body)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
