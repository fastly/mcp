# Fastly.BotManagementApi

```javascript
const apiInstance = new Fastly.BotManagementApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**botManagementGetBot**](BotManagementApi.md#botManagementGetBot) | **GET** /bot-management/v1/workspaces/{workspace_id}/policy/categories/{category_id}/bots/{bot_id} | Get a bot
[**botManagementGetCategory**](BotManagementApi.md#botManagementGetCategory) | **GET** /bot-management/v1/workspaces/{workspace_id}/policy/categories/{category_id} | Get a category
[**botManagementGetWorkspace**](BotManagementApi.md#botManagementGetWorkspace) | **GET** /bot-management/v1/workspaces/{workspace_id} | Get a workspace
[**botManagementListBots**](BotManagementApi.md#botManagementListBots) | **GET** /bot-management/v1/workspaces/{workspace_id}/policy/bots | List all bots in a workspace
[**botManagementListCategories**](BotManagementApi.md#botManagementListCategories) | **GET** /bot-management/v1/workspaces/{workspace_id}/policy/categories | List categories
[**botManagementListCategoryBots**](BotManagementApi.md#botManagementListCategoryBots) | **GET** /bot-management/v1/workspaces/{workspace_id}/policy/categories/{category_id}/bots | List bots in a category
[**botManagementListWorkspaces**](BotManagementApi.md#botManagementListWorkspaces) | **GET** /bot-management/v1/workspaces | List workspaces
[**botManagementUpdateBot**](BotManagementApi.md#botManagementUpdateBot) | **PATCH** /bot-management/v1/workspaces/{workspace_id}/policy/categories/{category_id}/bots/{bot_id} | Set a bot action
[**botManagementUpdateCategory**](BotManagementApi.md#botManagementUpdateCategory) | **PATCH** /bot-management/v1/workspaces/{workspace_id}/policy/categories/{category_id} | Set a category action
[**botManagementUpdateWorkspace**](BotManagementApi.md#botManagementUpdateWorkspace) | **PATCH** /bot-management/v1/workspaces/{workspace_id} | Update a workspace


## `botManagementGetBot`

```javascript
botManagementGetBot({ workspace_id, category_id, bot_id })
```

Get the attributes of a bot in a category.

### Example

```javascript
const options = {
  workspace_id: SU1Z0isxPaozGVKXdv0eY, // required
  category_id: ai_crawlers, // required
  bot_id: gptbot, // required
};

apiInstance.botManagementGetBot(options)
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
**workspace_id** | **String** | The ID of the bot management workspace. |
**category_id** | **String** | The ID of the bot category. |
**bot_id** | **String** | The ID of the bot. |

### Return type

[**BotManagementBotResponse**](BotManagementBotResponse.md)


## `botManagementGetCategory`

```javascript
botManagementGetCategory({ workspace_id, category_id })
```

Get the attributes of a bot category.

### Example

```javascript
const options = {
  workspace_id: SU1Z0isxPaozGVKXdv0eY, // required
  category_id: ai_crawlers, // required
};

apiInstance.botManagementGetCategory(options)
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
**workspace_id** | **String** | The ID of the bot management workspace. |
**category_id** | **String** | The ID of the bot category. |

### Return type

[**BotManagementCategoryResponse**](BotManagementCategoryResponse.md)


## `botManagementGetWorkspace`

```javascript
botManagementGetWorkspace({ workspace_id })
```

Retrieve a bot management workspace.

### Example

```javascript
const options = {
  workspace_id: SU1Z0isxPaozGVKXdv0eY, // required
};

apiInstance.botManagementGetWorkspace(options)
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
**workspace_id** | **String** | The ID of the bot management workspace. |

### Return type

[**BotManagementWorkspaceResponse**](BotManagementWorkspaceResponse.md)


## `botManagementListBots`

```javascript
botManagementListBots({ workspace_id, [limit, ][cursor] })
```

List all bots in a workspace's policy across all categories.

### Example

```javascript
const options = {
  workspace_id: SU1Z0isxPaozGVKXdv0eY, // required
  limit: 100,
  cursor: MTAwOjA,
};

apiInstance.botManagementListBots(options)
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
**workspace_id** | **String** | The ID of the bot management workspace. |
**limit** | **Number** | Limit how many results are returned. | [optional] [defaults to 100]
**cursor** | **String** | Cursor for pagination. Use the `next_cursor` value from a previous response to request the next page of results. | [optional]

### Return type

[**BotManagementWorkspaceBotsResponse**](BotManagementWorkspaceBotsResponse.md)


## `botManagementListCategories`

```javascript
botManagementListCategories({ workspace_id, [limit, ][cursor] })
```

List all bot categories in a workspace's policy. Each category has an action that applies to every bot in the category. To list the bots themselves, use [list all bots in a workspace](#bot-management-list-bots) or [list bots in a category](#bot-management-list-category-bots).

### Example

```javascript
const options = {
  workspace_id: SU1Z0isxPaozGVKXdv0eY, // required
  limit: 100,
  cursor: MTAwOjA,
};

apiInstance.botManagementListCategories(options)
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
**workspace_id** | **String** | The ID of the bot management workspace. |
**limit** | **Number** | Limit how many results are returned. | [optional] [defaults to 100]
**cursor** | **String** | Cursor for pagination. Use the `next_cursor` value from a previous response to request the next page of results. | [optional]

### Return type

[**BotManagementCategoriesResponse**](BotManagementCategoriesResponse.md)


## `botManagementListCategoryBots`

```javascript
botManagementListCategoryBots({ workspace_id, category_id, [limit, ][cursor] })
```

List all bots in a bot category.

### Example

```javascript
const options = {
  workspace_id: SU1Z0isxPaozGVKXdv0eY, // required
  category_id: ai_crawlers, // required
  limit: 100,
  cursor: MTAwOjA,
};

apiInstance.botManagementListCategoryBots(options)
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
**workspace_id** | **String** | The ID of the bot management workspace. |
**category_id** | **String** | The ID of the bot category. |
**limit** | **Number** | Limit how many results are returned. | [optional] [defaults to 100]
**cursor** | **String** | Cursor for pagination. Use the `next_cursor` value from a previous response to request the next page of results. | [optional]

### Return type

[**BotManagementBotsResponse**](BotManagementBotsResponse.md)


## `botManagementListWorkspaces`

```javascript
botManagementListWorkspaces({ , [service_id, ][limit, ][cursor] })
```

List bot management workspaces.

### Example

```javascript
const options = {
  service_id: 6oMkSHsKCMBjQJPLHgMxu1,
  limit: 100,
  cursor: MTAwOjA,
};

apiInstance.botManagementListWorkspaces(options)
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
**service_id** | **String** | Filter results to the workspace attached to this service. Returns an empty list if the service is not attached to a workspace. | [optional]
**limit** | **Number** | Limit how many results are returned. | [optional] [defaults to 100]
**cursor** | **String** | Cursor for pagination. Use the `next_cursor` value from a previous response to request the next page of results. | [optional]

### Return type

[**BotManagementWorkspacesResponse**](BotManagementWorkspacesResponse.md)


## `botManagementUpdateBot`

```javascript
botManagementUpdateBot({ workspace_id, category_id, bot_id, bot_management_bot })
```

Set the action for a bot. Set the action to 'inherit' to apply the category's action or to a specific value to override the category's action.

### Example

```javascript
const options = {
  workspace_id: SU1Z0isxPaozGVKXdv0eY, // required
  category_id: ai_crawlers, // required
  bot_id: gptbot, // required
  bot_management_bot: new Fastly.BotManagementBot(), // required
};

apiInstance.botManagementUpdateBot(options)
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
**workspace_id** | **String** | The ID of the bot management workspace. |
**category_id** | **String** | The ID of the bot category. |
**bot_id** | **String** | The ID of the bot. |
**bot_management_bot** | [**BotManagementBot**](BotManagementBot.md) |  |

### Return type

[**BotManagementBotResponse**](BotManagementBotResponse.md)


## `botManagementUpdateCategory`

```javascript
botManagementUpdateCategory({ workspace_id, category_id, bot_management_category })
```

Set the action for a bot category. Every bot in the category configured with the 'inherit' action uses the action set for the category.

### Example

```javascript
const options = {
  workspace_id: SU1Z0isxPaozGVKXdv0eY, // required
  category_id: ai_crawlers, // required
  bot_management_category: new Fastly.BotManagementCategory(), // required
};

apiInstance.botManagementUpdateCategory(options)
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
**workspace_id** | **String** | The ID of the bot management workspace. |
**category_id** | **String** | The ID of the bot category. |
**bot_management_category** | [**BotManagementCategory**](BotManagementCategory.md) |  |

### Return type

[**BotManagementCategoryResponse**](BotManagementCategoryResponse.md)


## `botManagementUpdateWorkspace`

```javascript
botManagementUpdateWorkspace({ workspace_id, bot_management_workspace })
```

Update the attributes of a bot management workspace.

### Example

```javascript
const options = {
  workspace_id: SU1Z0isxPaozGVKXdv0eY, // required
  bot_management_workspace: new Fastly.BotManagementWorkspace(), // required
};

apiInstance.botManagementUpdateWorkspace(options)
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
**workspace_id** | **String** | The ID of the bot management workspace. |
**bot_management_workspace** | [**BotManagementWorkspace**](BotManagementWorkspace.md) |  |

### Return type

[**BotManagementWorkspaceResponse**](BotManagementWorkspaceResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
