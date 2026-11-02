# Fastly.ProductAiRuntimeControlApi

```javascript
const apiInstance = new Fastly.ProductAiRuntimeControlApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**disableProductAiRuntimeControl**](ProductAiRuntimeControlApi.md#disableProductAiRuntimeControl) | **DELETE** /enabled-products/v1/ai_runtime_control | Disable product
[**enableProductAiRuntimeControl**](ProductAiRuntimeControlApi.md#enableProductAiRuntimeControl) | **PUT** /enabled-products/v1/ai_runtime_control | Enable product
[**getProductAiRuntimeControl**](ProductAiRuntimeControlApi.md#getProductAiRuntimeControl) | **GET** /enabled-products/v1/ai_runtime_control | Get product enablement status


## `disableProductAiRuntimeControl`

```javascript
disableProductAiRuntimeControl()
```

Disable the AI Runtime Control product

### Example

```javascript
apiInstance.disableProductAiRuntimeControl()
  .then(() => {
    console.log('API called successfully.');
  })
  .catch((error) => {
    console.error(error);
  });
```

### Options

This endpoint does not need any parameters.

### Return type

null (empty response body)


## `enableProductAiRuntimeControl`

```javascript
enableProductAiRuntimeControl()
```

Enable the AI Runtime Control product

### Example

```javascript
apiInstance.enableProductAiRuntimeControl()
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

[**AiRuntimeControlResponseBodyEnable**](AiRuntimeControlResponseBodyEnable.md)


## `getProductAiRuntimeControl`

```javascript
getProductAiRuntimeControl()
```

Get the enablement status of the AI Runtime Control product

### Example

```javascript
apiInstance.getProductAiRuntimeControl()
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

[**AiRuntimeControlResponseBodyEnable**](AiRuntimeControlResponseBodyEnable.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
