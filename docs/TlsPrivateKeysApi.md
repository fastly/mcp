# Fastly.TlsPrivateKeysApi

```javascript
const apiInstance = new Fastly.TlsPrivateKeysApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createTlsKey**](TlsPrivateKeysApi.md#createTlsKey) | **POST** /tls/private_keys | Create a TLS private key
[**deleteTlsKey**](TlsPrivateKeysApi.md#deleteTlsKey) | **DELETE** /tls/private_keys/{tls_private_key_id} | Delete a TLS private key
[**getTlsKey**](TlsPrivateKeysApi.md#getTlsKey) | **GET** /tls/private_keys/{tls_private_key_id} | Get a TLS private key
[**listTlsKeys**](TlsPrivateKeysApi.md#listTlsKeys) | **GET** /tls/private_keys | List TLS private keys


## `createTlsKey`

```javascript
createTlsKey({ , [tls_private_key] })
```

Create a TLS private key.

### Example

```javascript
const options = {
  tls_private_key: {"data":{"type":"tls_private_key","attributes":{"key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","name":"My private key"}}},
};

apiInstance.createTlsKey(options)
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
**tls_private_key** | [**TlsPrivateKey**](TlsPrivateKey.md) |  | [optional]

### Return type

[**TlsPrivateKeyResponse**](TlsPrivateKeyResponse.md)


## `deleteTlsKey`

```javascript
deleteTlsKey({ tls_private_key_id })
```

Destroy a TLS private key. Only private keys not already matched to any certificates can be deleted.

### Example

```javascript
const options = {
  tls_private_key_id: "tls_private_key_id_example", // required
};

apiInstance.deleteTlsKey(options)
  .then(() => {
    console.log('API called successfully.');
  })
  .catch((error) => {
    console.error(error);
  });
```

### Options

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**tls_private_key_id** | **String** | Alphanumeric string identifying a private Key. |

### Return type

null (empty response body)


## `getTlsKey`

```javascript
getTlsKey({ tls_private_key_id })
```

Show a TLS private key.

### Example

```javascript
const options = {
  tls_private_key_id: "tls_private_key_id_example", // required
};

apiInstance.getTlsKey(options)
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
**tls_private_key_id** | **String** | Alphanumeric string identifying a private Key. |

### Return type

[**TlsPrivateKeyResponse**](TlsPrivateKeyResponse.md)


## `listTlsKeys`

```javascript
listTlsKeys({ , [filter_in_use, ][page_number, ][page_size] })
```

List all TLS private keys.

### Example

```javascript
const options = {
  filter_in_use: "filter_in_use_example",
  page_number: 1,
  page_size: 20,
};

apiInstance.listTlsKeys(options)
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
**filter_in_use** | **String** | Limit the returned keys to those without any matching TLS certificates. The only valid value is false. | [optional]
**page_number** | **Number** | Current page. | [optional]
**page_size** | **Number** | Number of records per page. | [optional] [defaults to 20]

### Return type

[**TlsPrivateKeysResponse**](TlsPrivateKeysResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
