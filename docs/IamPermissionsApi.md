# Fastly.IamPermissionsApi

```javascript
const apiInstance = new Fastly.IamPermissionsApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**listPermissions**](IamPermissionsApi.md#listPermissions) | **GET** /permissions | List permissions


## `listPermissions`

```javascript
listPermissions()
```

List all permissions.

### Example

```javascript
apiInstance.listPermissions()
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

**Object**


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
