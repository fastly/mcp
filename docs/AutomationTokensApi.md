# Fastly.AutomationTokensApi

```javascript
const apiInstance = new Fastly.AutomationTokensApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createAutomationToken**](AutomationTokensApi.md#createAutomationToken) | **POST** /automation-tokens | Create Automation Token
[**getAutomationTokenId**](AutomationTokensApi.md#getAutomationTokenId) | **GET** /automation-tokens/{id} | Retrieve an Automation Token by ID
[**getAutomationTokensIdServices**](AutomationTokensApi.md#getAutomationTokensIdServices) | **GET** /automation-tokens/{id}/services | List Automation Token Services
[**getAutomationTokensIdWorkspaces**](AutomationTokensApi.md#getAutomationTokensIdWorkspaces) | **GET** /automation-tokens/{id}/workspaces | List Automation Token Workspaces
[**listAutomationTokens**](AutomationTokensApi.md#listAutomationTokens) | **GET** /automation-tokens | List Customer Automation Tokens
[**revokeAutomationTokenId**](AutomationTokensApi.md#revokeAutomationTokenId) | **DELETE** /automation-tokens/{id} | Revoke an Automation Token by ID


## `createAutomationToken`

```javascript
createAutomationToken({ , [automation_token_create_request] })
```

Creates a new automation token.

### Example

```javascript
const options = {
  automation_token_create_request: {"name":"my_multi_role_token","expires_at":"2027-01-01T20:43:14Z","roles":["t4Gg2uUGZzb2W9Euo4mo0R","x9KzsrACXZv8tPwlEDsKb6"],"services":["SU1Z0isxPaozGVKXdv0eY"],"limit_services":true,"workspaces":["7rWPJST2KqFD37tnQANBo2"],"limit_workspaces":true},
};

apiInstance.createAutomationToken(options)
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
**automation_token_create_request** | [**AutomationTokenCreateRequest**](AutomationTokenCreateRequest.md) |  | [optional]

### Return type

[**AutomationTokenCreateResponse**](AutomationTokenCreateResponse.md)


## `getAutomationTokenId`

```javascript
getAutomationTokenId({ id })
```

Retrieves an automation token by ID.

### Example

```javascript
const options = {
  id: "id_example", // required
};

apiInstance.getAutomationTokenId(options)
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
**id** | **String** |  |

### Return type

[**AutomationTokenResponse**](AutomationTokenResponse.md)


## `getAutomationTokensIdServices`

```javascript
getAutomationTokensIdServices({ id, [per_page, ][page] })
```

List of services associated with the automation token.

### Example

```javascript
const options = {
  id: "id_example", // required
  per_page: 56,
  page: 56,
};

apiInstance.getAutomationTokensIdServices(options)
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
**id** | **String** |  |
**per_page** | **Number** |  | [optional]
**page** | **Number** |  | [optional]

### Return type

[**InlineResponse2004**](InlineResponse2004.md)


## `getAutomationTokensIdWorkspaces`

```javascript
getAutomationTokensIdWorkspaces({ id, [limit, ][cursor] })
```

Lists the Next-Gen WAF workspaces accessible by an automation token. Only applicable for tokens with roles that support workspace access (such as Next-Gen WAF roles).

### Example

```javascript
const options = {
  id: "id_example", // required
  limit: 20,
  cursor: "cursor_example",
};

apiInstance.getAutomationTokensIdWorkspaces(options)
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
**id** | **String** | The alphanumeric string identifying the automation token. |
**limit** | **Number** | Maximum number of workspaces to return per page. | [optional] [defaults to 20]
**cursor** | **String** | Pagination cursor from a previous response. Pass the `next_cursor` value to retrieve the next page, or `previous_cursor` to go back. | [optional]

### Return type

[**AutomationTokenWorkspacesResponse**](AutomationTokenWorkspacesResponse.md)


## `listAutomationTokens`

```javascript
listAutomationTokens({ , [per_page, ][page] })
```

Lists all automation tokens for a customer.

### Example

```javascript
const options = {
  per_page: 56,
  page: 56,
};

apiInstance.listAutomationTokens(options)
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
**per_page** | **Number** |  | [optional]
**page** | **Number** |  | [optional]

### Return type

[**[AutomationTokenResponse]**](AutomationTokenResponse.md)


## `revokeAutomationTokenId`

```javascript
revokeAutomationTokenId({ id })
```

Revoke an automation token by ID.

### Example

```javascript
const options = {
  id: "id_example", // required
};

apiInstance.revokeAutomationTokenId(options)
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
**id** | **String** |  |

### Return type

[**AutomationTokenErrorResponse**](AutomationTokenErrorResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
