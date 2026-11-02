# Fastly.AiRuntimeControlProvidersApi

```javascript
const apiInstance = new Fastly.AiRuntimeControlProvidersApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**arcGetBedrockSetup**](AiRuntimeControlProvidersApi.md#arcGetBedrockSetup) | **GET** /ai-runtime-control/v1/providers/bedrock/setup | Get Bedrock setup information
[**arcGetModelsForProvider**](AiRuntimeControlProvidersApi.md#arcGetModelsForProvider) | **GET** /ai-runtime-control/v1/providers/{provider_id}/models | Get models for a provider
[**arcGetSupportedProviders**](AiRuntimeControlProvidersApi.md#arcGetSupportedProviders) | **GET** /ai-runtime-control/v1/providers | Get supported providers


## `arcGetBedrockSetup`

```javascript
arcGetBedrockSetup()
```

Returns the AI Runtime Control IAM role Amazon Resource Name (ARN) and external ID to reference in your AWS account's IAM trust policy before creating an `aws-iam` [provider connection](https://www.fastly.com/documentation/reference/api/ai-runtime-control/provider-connections#arc-create-provider-connection) to Amazon Bedrock.  Requires AWS IAM authentication to be enabled on your account. If it isn't, this endpoint returns a 404 response.

### Example

```javascript
apiInstance.arcGetBedrockSetup()
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

[**ArcBedrockSetupResponse**](ArcBedrockSetupResponse.md)


## `arcGetModelsForProvider`

```javascript
arcGetModelsForProvider({ provider_id })
```

Returns the models available for a specific provider.

### Example

```javascript
const options = {
  provider_id: anthropic, // required
};

apiInstance.arcGetModelsForProvider(options)
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
**provider_id** | **String** | The ID of the provider. |

### Return type

[**ArcModelsResponse**](ArcModelsResponse.md)


## `arcGetSupportedProviders`

```javascript
arcGetSupportedProviders()
```

Returns the AI providers supported by AI Runtime Control, with each provider's available models nested within.

### Example

```javascript
apiInstance.arcGetSupportedProviders()
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

[**ArcProvidersResponse**](ArcProvidersResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
