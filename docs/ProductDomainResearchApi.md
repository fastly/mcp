# Fastly.ProductDomainResearchApi

```javascript
const apiInstance = new Fastly.ProductDomainResearchApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**disableProductDomainResearch**](ProductDomainResearchApi.md#disableProductDomainResearch) | **DELETE** /enabled-products/v1/domain_research | Disable product
[**enableDomainResearch**](ProductDomainResearchApi.md#enableDomainResearch) | **PUT** /enabled-products/v1/domain_research | Enable product
[**getDomainResearch**](ProductDomainResearchApi.md#getDomainResearch) | **GET** /enabled-products/v1/domain_research | Get product enablement status


## `disableProductDomainResearch`

```javascript
disableProductDomainResearch()
```

Disable the Domain Research product.

### Example

```javascript
apiInstance.disableProductDomainResearch()
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


## `enableDomainResearch`

```javascript
enableDomainResearch()
```

Enable the Domain Research product.

### Example

```javascript
apiInstance.enableDomainResearch()
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

[**DomainResearchResponseBodyEnable**](DomainResearchResponseBodyEnable.md)


## `getDomainResearch`

```javascript
getDomainResearch()
```

Get the enablement status of the Domain Research product.

### Example

```javascript
apiInstance.getDomainResearch()
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

[**DomainResearchResponseBodyEnable**](DomainResearchResponseBodyEnable.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
