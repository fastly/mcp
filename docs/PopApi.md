# Fastly.PopApi

```javascript
const apiInstance = new Fastly.PopApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**listPops**](PopApi.md#listPops) | **GET** /datacenters | List Fastly POPs


## `listPops`

```javascript
listPops()
```

Get a list of all Fastly POPs.

### Example

```javascript
apiInstance.listPops()
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

[**[Pop]**](Pop.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
