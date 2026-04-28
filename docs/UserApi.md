# Fastly.UserApi

```javascript
const apiInstance = new Fastly.UserApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createUser**](UserApi.md#createUser) | **POST** /user | Create a user
[**deleteUser**](UserApi.md#deleteUser) | **DELETE** /user/{user_id} | Delete a user
[**getCurrentUser**](UserApi.md#getCurrentUser) | **GET** /current_user | Get the current user
[**getUser**](UserApi.md#getUser) | **GET** /user/{user_id} | Get a user
[**requestPasswordReset**](UserApi.md#requestPasswordReset) | **POST** /user/{user_login}/password/request_reset | Request a password reset
[**updateUser**](UserApi.md#updateUser) | **PUT** /user/{user_id} | Update a user
[**updateUserPassword**](UserApi.md#updateUserPassword) | **POST** /current_user/password | Update the user&#39;s password


## `createUser`

```javascript
createUser({ , [login, ][name, ][limit_services, ][locked, ][require_new_password, ][role, ][roles, ][two_factor_auth_enabled, ][two_factor_setup_required] })
```

Create a user.

### Example

```javascript
const options = {
  login: "login_example",
  name: "name_example",
  limit_services: true,
  locked: true,
  require_new_password: true,
  role: new Fastly.RoleUser(),
  roles: ["6bKsDElwPt8vZXCArszK9x"],
  two_factor_auth_enabled: true,
  two_factor_setup_required: true,
};

apiInstance.createUser(options)
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
**login** | **String** |  | [optional]
**name** | **String** | The real life name of the user. | [optional]
**limit_services** | **Boolean** | Indicates that the user has limited access to the customer&#39;s services. | [optional]
**locked** | **Boolean** | Indicates whether the is account is locked for editing or not. | [optional]
**require_new_password** | **Boolean** | Indicates if a new password is required at next login. | [optional]
**role** | [**RoleUser**](RoleUser.md) |  | [optional]
**roles** | [**[String]**](String.md) | A list of role IDs assigned to the user. | [optional]
**two_factor_auth_enabled** | **Boolean** | Indicates if 2FA is enabled on the user. | [optional]
**two_factor_setup_required** | **Boolean** | Indicates if 2FA is required by the user&#39;s customer account. | [optional]

### Return type

[**UserResponse**](UserResponse.md)


## `deleteUser`

```javascript
deleteUser({ user_id })
```

Delete a user.

### Example

```javascript
const options = {
  user_id: "user_id_example", // required
};

apiInstance.deleteUser(options)
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
**user_id** | **String** | Alphanumeric string identifying the user. |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `getCurrentUser`

```javascript
getCurrentUser()
```

Get the logged in user.

### Example

```javascript
apiInstance.getCurrentUser()
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

[**UserResponse**](UserResponse.md)


## `getUser`

```javascript
getUser({ user_id })
```

Get a specific user.

### Example

```javascript
const options = {
  user_id: "user_id_example", // required
};

apiInstance.getUser(options)
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
**user_id** | **String** | Alphanumeric string identifying the user. |

### Return type

[**UserResponse**](UserResponse.md)


## `requestPasswordReset`

```javascript
requestPasswordReset({ user_login })
```

Requests a password reset for the specified user.

### Example

```javascript
const options = {
  user_login: "user_login_example", // required
};

apiInstance.requestPasswordReset(options)
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
**user_login** | **String** | The login associated with the user (typically, an email address). |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `updateUser`

```javascript
updateUser({ user_id, [login, ][name, ][limit_services, ][locked, ][require_new_password, ][role, ][roles, ][two_factor_auth_enabled, ][two_factor_setup_required] })
```

Update a user. Only users with the role of `superuser` can make changes to other users on the account. Non-superusers may use this endpoint to make changes to their own account. Two-factor attributes are not editable via this endpoint.

### Example

```javascript
const options = {
  user_id: "user_id_example", // required
  login: "login_example",
  name: "name_example",
  limit_services: true,
  locked: true,
  require_new_password: true,
  role: new Fastly.RoleUser(),
  roles: ["6bKsDElwPt8vZXCArszK9x"],
  two_factor_auth_enabled: true,
  two_factor_setup_required: true,
};

apiInstance.updateUser(options)
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
**user_id** | **String** | Alphanumeric string identifying the user. |
**login** | **String** |  | [optional]
**name** | **String** | The real life name of the user. | [optional]
**limit_services** | **Boolean** | Indicates that the user has limited access to the customer&#39;s services. | [optional]
**locked** | **Boolean** | Indicates whether the is account is locked for editing or not. | [optional]
**require_new_password** | **Boolean** | Indicates if a new password is required at next login. | [optional]
**role** | [**RoleUser**](RoleUser.md) |  | [optional]
**roles** | [**[String]**](String.md) | A list of role IDs assigned to the user. | [optional]
**two_factor_auth_enabled** | **Boolean** | Indicates if 2FA is enabled on the user. | [optional]
**two_factor_setup_required** | **Boolean** | Indicates if 2FA is required by the user&#39;s customer account. | [optional]

### Return type

[**UserResponse**](UserResponse.md)


## `updateUserPassword`

```javascript
updateUserPassword({ , [old_password, ][new_password] })
```

Update the user's password to a new one.

### Example

```javascript
const options = {
  old_password: "old_password_example",
  new_password: "new_password_example",
};

apiInstance.updateUserPassword(options)
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
**old_password** | **String** | The user&#39;s current password. | [optional]
**new_password** | **String** | The user&#39;s new password. | [optional]

### Return type

[**UserResponse**](UserResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
