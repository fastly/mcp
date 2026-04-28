# Fastly.PublicIpListApi

```javascript
const apiInstance = new Fastly.PublicIpListApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**listFastlyIps**](PublicIpListApi.md#listFastlyIps) | **GET** /public-ip-list | List Fastly&#39;s public IPs


## `listFastlyIps`

```javascript
listFastlyIps()
```

List the public IP addresses for the Fastly network.

### Example

```javascript
apiInstance.listFastlyIps()
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

[**PublicIpList**](PublicIpList.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
