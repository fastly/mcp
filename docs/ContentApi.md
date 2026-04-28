# Fastly.ContentApi

```javascript
const apiInstance = new Fastly.ContentApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**contentCheck**](ContentApi.md#contentCheck) | **GET** /content/edge_check | Check status of content in each POP&#39;s cache


## `contentCheck`

```javascript
contentCheck({ , [url] })
```

Retrieve headers and MD5 hash of the content for a particular URL from each Fastly edge server. This API is limited to 200 requests per hour. If the content takes too long to download, the hash will be set to `error-timeout-$pop`. If the response is too large, it will be set to `warning-too-large-$pop`.

### Example

```javascript
const options = {
  url: https://www.example.com/foo/bar,
};

apiInstance.contentCheck(options)
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
**url** | **String** | Full URL (host and path) to check on all nodes. if protocol is omitted, http will be assumed. | [optional]

### Return type

[**[Content]**](Content.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
