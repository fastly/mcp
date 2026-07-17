# Fastly.NgwafAgentKeysApi

```javascript
const apiInstance = new Fastly.NgwafAgentKeysApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**ngwafListAgentKeys**](NgwafAgentKeysApi.md#ngwafListAgentKeys) | **GET** /ngwaf/v1/workspaces/{workspace_id}/agent-keys | List agent keys for a workspace


## `ngwafListAgentKeys`

```javascript
ngwafListAgentKeys({ workspace_id })
```

List agent keys for a workspace.

### Example

```javascript
const options = {
  workspace_id: SU1Z0isxPaozGVKXdv0eY, // required
};

apiInstance.ngwafListAgentKeys(options)
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
**workspace_id** | **String** | The ID of the workspace. |

### Return type

[**InlineResponse20019**](InlineResponse20019.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
