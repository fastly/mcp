# Fastly.MutualAuthenticationApi

```javascript
const apiInstance = new Fastly.MutualAuthenticationApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createMutualTlsAuthentication**](MutualAuthenticationApi.md#createMutualTlsAuthentication) | **POST** /tls/mutual_authentications | Create a Mutual Authentication
[**deleteMutualTls**](MutualAuthenticationApi.md#deleteMutualTls) | **DELETE** /tls/mutual_authentications/{mutual_authentication_id} | Delete a Mutual TLS
[**getMutualAuthentication**](MutualAuthenticationApi.md#getMutualAuthentication) | **GET** /tls/mutual_authentications/{mutual_authentication_id} | Get a Mutual Authentication
[**listMutualAuthentications**](MutualAuthenticationApi.md#listMutualAuthentications) | **GET** /tls/mutual_authentications | List Mutual Authentications
[**patchMutualAuthentication**](MutualAuthenticationApi.md#patchMutualAuthentication) | **PATCH** /tls/mutual_authentications/{mutual_authentication_id} | Update a Mutual Authentication


## `createMutualTlsAuthentication`

```javascript
createMutualTlsAuthentication({ , [mutual_authentication] })
```

Create a mutual authentication using a bundle of certificates to enable client-to-server mutual TLS.

### Example

```javascript
const options = {
  mutual_authentication: {"data":{"type":"mutual_authentication","attributes":{"cert_bundle":"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n","name":"Mutual Authentication A"}}},
};

apiInstance.createMutualTlsAuthentication(options)
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
**mutual_authentication** | [**MutualAuthentication**](MutualAuthentication.md) |  | [optional]

### Return type

[**MutualAuthenticationResponse**](MutualAuthenticationResponse.md)


## `deleteMutualTls`

```javascript
deleteMutualTls({ mutual_authentication_id })
```

Remove a Mutual TLS authentication

### Example

```javascript
const options = {
  mutual_authentication_id: "mutual_authentication_id_example", // required
};

apiInstance.deleteMutualTls(options)
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
**mutual_authentication_id** | **String** | Alphanumeric string identifying a mutual authentication. |

### Return type

null (empty response body)


## `getMutualAuthentication`

```javascript
getMutualAuthentication({ mutual_authentication_id, [include] })
```

Show a Mutual Authentication.

### Example

```javascript
const options = {
  mutual_authentication_id: "mutual_authentication_id_example", // required
  include: "include_example",
};

apiInstance.getMutualAuthentication(options)
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
**mutual_authentication_id** | **String** | Alphanumeric string identifying a mutual authentication. |
**include** | **String** | Comma-separated list of related objects to include (optional). Permitted values: `tls_activations`. Including TLS activations will provide you with the TLS domain names that are related to your Mutual TLS authentication.  | [optional]

### Return type

[**MutualAuthenticationResponse**](MutualAuthenticationResponse.md)


## `listMutualAuthentications`

```javascript
listMutualAuthentications({ , [include, ][page_number, ][page_size] })
```

List all mutual authentications.

### Example

```javascript
const options = {
  include: "include_example",
  page_number: 1,
  page_size: 20,
};

apiInstance.listMutualAuthentications(options)
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
**include** | **String** | Comma-separated list of related objects to include (optional). Permitted values: `tls_activations`. Including TLS activations will provide you with the TLS domain names that are related to your Mutual TLS authentication.  | [optional]
**page_number** | **Number** | Current page. | [optional]
**page_size** | **Number** | Number of records per page. | [optional] [defaults to 20]

### Return type

[**MutualAuthenticationsResponse**](MutualAuthenticationsResponse.md)


## `patchMutualAuthentication`

```javascript
patchMutualAuthentication({ mutual_authentication_id, [mutual_authentication] })
```

Update a Mutual Authentication.

### Example

```javascript
const options = {
  mutual_authentication_id: "mutual_authentication_id_example", // required
  mutual_authentication: {"data":{"type":"mutual_authentication","attributes":{"cert_bundle":"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n","enforced":false,"name":"Mutual Authentication B"}}},
};

apiInstance.patchMutualAuthentication(options)
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
**mutual_authentication_id** | **String** | Alphanumeric string identifying a mutual authentication. |
**mutual_authentication** | [**MutualAuthentication**](MutualAuthentication.md) |  | [optional]

### Return type

[**MutualAuthenticationResponse**](MutualAuthenticationResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
