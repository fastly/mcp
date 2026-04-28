# Fastly.ProductAiAcceleratorApi

```javascript
const apiInstance = new Fastly.ProductAiAcceleratorApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**disableProductAiAccelerator**](ProductAiAcceleratorApi.md#disableProductAiAccelerator) | **DELETE** /enabled-products/v1/ai_accelerator | Disable product
[**enableAiAccelerator**](ProductAiAcceleratorApi.md#enableAiAccelerator) | **PUT** /enabled-products/v1/ai_accelerator | Enable product
[**getAiAccelerator**](ProductAiAcceleratorApi.md#getAiAccelerator) | **GET** /enabled-products/v1/ai_accelerator | Get product enablement status


## `disableProductAiAccelerator`

```javascript
disableProductAiAccelerator()
```

Disable the AI Accelerator product

### Example

```javascript
apiInstance.disableProductAiAccelerator()
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


## `enableAiAccelerator`

```javascript
enableAiAccelerator()
```

Enable the AI Accelerator product

### Example

```javascript
apiInstance.enableAiAccelerator()
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

[**AiAcceleratorResponseBodyEnable**](AiAcceleratorResponseBodyEnable.md)


## `getAiAccelerator`

```javascript
getAiAccelerator()
```

Get the enablement status of the AI Accelerator product

### Example

```javascript
apiInstance.getAiAccelerator()
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

[**AiAcceleratorResponseBodyEnable**](AiAcceleratorResponseBodyEnable.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
