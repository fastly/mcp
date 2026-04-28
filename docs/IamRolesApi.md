# Fastly.IamRolesApi

```javascript
const apiInstance = new Fastly.IamRolesApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**iamV1RolesGet**](IamRolesApi.md#iamV1RolesGet) | **GET** /iam/v1/roles/{role_id} | Get IAM role by ID
[**iamV1RolesList**](IamRolesApi.md#iamV1RolesList) | **GET** /iam/v1/roles | List IAM roles


## `iamV1RolesGet`

```javascript
iamV1RolesGet({ role_id, [include] })
```

Retrieve a single IAM role by its unique identifier. 

### Example

```javascript
const options = {
  role_id: Q4rXe9vN1szK8a2fUjYtWp, // required
  include: "permissions",
};

apiInstance.iamV1RolesGet(options)
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
**role_id** | **String** | Alphanumeric string identifying the role. |
**include** | **String** | Include related data (i.e., permissions). | [optional] [one of: "permissions"]

### Return type

[**IamV1RoleResponse**](IamV1RoleResponse.md)


## `iamV1RolesList`

```javascript
iamV1RolesList({ , [limit, ][cursor] })
```

Retrieve a paginated list of IAM roles available in the account. 

### Example

```javascript
const options = {
  limit: 100,
  cursor: "cursor_example",
};

apiInstance.iamV1RolesList(options)
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
**limit** | **Number** | Number of results per page. The maximum is 1000. | [optional] [defaults to 100]
**cursor** | **String** | Cursor value from the `next_cursor` field of a previous response, used to retrieve the next page. To request the first page, this should be empty. | [optional]

### Return type

[**IamV1RoleListResponse**](IamV1RoleListResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
