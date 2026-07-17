# Fastly.DomainOwnershipsApi

```javascript
const apiInstance = new Fastly.DomainOwnershipsApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**listDomainOwnerships**](DomainOwnershipsApi.md#listDomainOwnerships) | **GET** /domain-ownerships | List domain-ownerships


## `listDomainOwnerships`

```javascript
listDomainOwnerships()
```

List all domain-ownerships.

### Example

```javascript
apiInstance.listDomainOwnerships()
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

[**InlineResponse20015**](InlineResponse20015.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
