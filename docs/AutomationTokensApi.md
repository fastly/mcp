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
  automation_token_create_request: new Fastly.AutomationTokenCreateRequest(),
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
