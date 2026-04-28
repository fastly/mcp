# Fastly.PublishApi

```javascript
const apiInstance = new Fastly.PublishApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**publish**](PublishApi.md#publish) | **POST** /service/{service_id}/publish/ | Send messages to Fanout subscribers


## `publish`

```javascript
publish({ service_id, [publish_request] })
```

Send one or more messages to [Fanout](https://www.fastly.com/documentation/learning/concepts/real-time-messaging/fanout) subscribers. Each message specifies a channel, and Fanout will deliver the message to all subscribers of its channel. > **IMPORTANT:** For compatibility with GRIP, this endpoint requires a trailing slash, and the API token may be provided in the `Authorization` header (instead of the `Fastly-Key` header) using the `Bearer` scheme. 

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  publish_request: {"items":[{"channel":"mychannel","formats":{"ws-message":{"content":"hello world"}}}]},
};

apiInstance.publish(options)
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
**service_id** | **String** | Alphanumeric string identifying the service. |
**publish_request** | [**PublishRequest**](PublishRequest.md) |  | [optional]

### Return type

**String**


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
