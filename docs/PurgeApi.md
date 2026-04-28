# Fastly.PurgeApi

```javascript
const apiInstance = new Fastly.PurgeApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**bulkPurgeTag**](PurgeApi.md#bulkPurgeTag) | **POST** /service/{service_id}/purge | Purge multiple surrogate key tags
[**purgeAll**](PurgeApi.md#purgeAll) | **POST** /service/{service_id}/purge_all | Purge everything from a service
[**purgeSingleUrl**](PurgeApi.md#purgeSingleUrl) | **POST** /purge/{cached_url} | Purge a URL
[**purgeTag**](PurgeApi.md#purgeTag) | **POST** /service/{service_id}/purge/{surrogate_key} | Purge by surrogate key tag


## `bulkPurgeTag`

```javascript
bulkPurgeTag({ service_id, [fastly_soft_purge, ][surrogate_key, ][purge_response] })
```

Instant Purge a particular service of items tagged with surrogate keys. Up to 256 surrogate keys can be purged in one batch request. As an alternative to sending the keys in a JSON object in the body of the request, this endpoint also supports listing keys in a <code>Surrogate-Key</code> request header, e.g. <code>Surrogate-Key: key_1 key_2 key_3</code>. 

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  fastly_soft_purge: 1,
  surrogate_key: key_1 key_2 key_3,
  purge_response: {"surrogate_keys":["key_1","key_2","key_3"]},
};

apiInstance.bulkPurgeTag(options)
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
**fastly_soft_purge** | **Number** | If present, this header triggers the purge to be &#39;soft&#39;, which marks the affected object as stale rather than making it inaccessible.  Typically set to \&quot;1\&quot; when used, but the value is not important. | [optional]
**surrogate_key** | **String** | Purge multiple surrogate key tags using a request header. Not required if a JSON POST body is specified. | [optional]
**purge_response** | [**PurgeResponse**](PurgeResponse.md) |  | [optional]

### Return type

**{String: String}**


## `purgeAll`

```javascript
purgeAll({ service_id })
```

Instant Purge everything from a service.  Purge-all requests cannot be done in soft mode and will always immediately invalidate all cached content associated with the service. To do a soft-purge-all, consider applying a constant [surrogate key](https://www.fastly.com/documentation/guides/full-site-delivery/purging/working-with-surrogate-keys/) tag (e.g., `\"all\"`) to all objects. 

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
};

apiInstance.purgeAll(options)
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

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `purgeSingleUrl`

```javascript
purgeSingleUrl({ cached_url, [fastly_soft_purge] })
```

Instant Purge an individual URL.

### Example

```javascript
const options = {
  cached_url: www.example.com/path/to/object-to-purge, // required
  fastly_soft_purge: 1,
};

apiInstance.purgeSingleUrl(options)
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
**cached_url** | **String** | URL of object in cache to be purged. |
**fastly_soft_purge** | **Number** | If present, this header triggers the purge to be &#39;soft&#39;, which marks the affected object as stale rather than making it inaccessible.  Typically set to \&quot;1\&quot; when used, but the value is not important. | [optional]

### Return type

[**PurgeResponse**](PurgeResponse.md)


## `purgeTag`

```javascript
purgeTag({ service_id, surrogate_key, [fastly_soft_purge] })
```

Instant Purge a particular service of items tagged with a Surrogate Key. Only one surrogate key can be purged at a time. Multiple keys can be purged using a batch surrogate key purge request.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  surrogate_key: key_1, // required
  fastly_soft_purge: 1,
};

apiInstance.purgeTag(options)
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
**surrogate_key** | **String** | Surrogate keys are used to efficiently purge content from cache. Instead of purging your entire site or individual URLs, you can tag related assets (like all images and descriptions associated with a single product) with surrogate keys, and these grouped URLs can be purged in a single request. |
**fastly_soft_purge** | **Number** | If present, this header triggers the purge to be &#39;soft&#39;, which marks the affected object as stale rather than making it inaccessible.  Typically set to \&quot;1\&quot; when used, but the value is not important. | [optional]

### Return type

[**PurgeResponse**](PurgeResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
