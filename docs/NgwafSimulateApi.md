# Fastly.NgwafSimulateApi

```javascript
const apiInstance = new Fastly.NgwafSimulateApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**ngwafSimulateWafRequest**](NgwafSimulateApi.md#ngwafSimulateWafRequest) | **POST** /ngwaf/v1/workspaces/{workspace_id}/simulate | Simulate a WAF request


## `ngwafSimulateWafRequest`

```javascript
ngwafSimulateWafRequest({ workspace_id, waf_simulate_request })
```

Simulates a request through the workspace's WAF configuration and returns the WAF response code and any signals that would be detected. The operation is stateless — no simulation data is persisted. 

### Example

```javascript
const options = {
  workspace_id: SU1Z0isxPaozGVKXdv0eY, // required
  waf_simulate_request: new Fastly.WafSimulateRequest(), // required
};

apiInstance.ngwafSimulateWafRequest(options)
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
**waf_simulate_request** | [**WafSimulateRequest**](WafSimulateRequest.md) |  |

### Return type

[**WafSimulateResponse**](WafSimulateResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
