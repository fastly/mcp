# Fastly.TlsActivationsApi

```javascript
const apiInstance = new Fastly.TlsActivationsApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createTlsActivation**](TlsActivationsApi.md#createTlsActivation) | **POST** /tls/activations | Enable TLS for a domain using a custom certificate
[**deleteTlsActivation**](TlsActivationsApi.md#deleteTlsActivation) | **DELETE** /tls/activations/{tls_activation_id} | Disable TLS on a domain
[**getTlsActivation**](TlsActivationsApi.md#getTlsActivation) | **GET** /tls/activations/{tls_activation_id} | Get a TLS activation
[**listTlsActivations**](TlsActivationsApi.md#listTlsActivations) | **GET** /tls/activations | List TLS activations
[**updateTlsActivation**](TlsActivationsApi.md#updateTlsActivation) | **PATCH** /tls/activations/{tls_activation_id} | Update a certificate


## `createTlsActivation`

```javascript
createTlsActivation({ , [tls_activation] })
```

Enable TLS for a particular TLS domain and certificate combination. These relationships must be specified to create the TLS activation.

### Example

```javascript
const options = {
  tls_activation: {"data":{"type":"tls_activation","relationships":{"tls_certificate":{"data":{"id":"cRTguUGZzb2W9Euo4moOr","type":"tls_certificate"}},"tls_configuration":{"data":{"id":"t7CguUGZzb2W9Euo5FoKa","type":"tls_configuration"}},"tls_domain":{"data":{"id":"example.com","type":"tls_domain"}}}}},
};

apiInstance.createTlsActivation(options)
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
**tls_activation** | [**TlsActivation**](TlsActivation.md) |  | [optional]

### Return type

[**TlsActivationResponse**](TlsActivationResponse.md)


## `deleteTlsActivation`

```javascript
deleteTlsActivation({ tls_activation_id })
```

Disable TLS on the domain associated with this TLS activation.

### Example

```javascript
const options = {
  tls_activation_id: "tls_activation_id_example", // required
};

apiInstance.deleteTlsActivation(options)
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
**tls_activation_id** | **String** | Alphanumeric string identifying a TLS activation. |

### Return type

null (empty response body)


## `getTlsActivation`

```javascript
getTlsActivation({ tls_activation_id, [include] })
```

Show a TLS activation.

### Example

```javascript
const options = {
  tls_activation_id: "tls_activation_id_example", // required
  include: tls_certificate,tls_configuration,tls_domain,
};

apiInstance.getTlsActivation(options)
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
**tls_activation_id** | **String** | Alphanumeric string identifying a TLS activation. |
**include** | **String** | Include related objects. Optional, comma-separated values. Permitted values: `tls_certificate`, `tls_configuration`, and `tls_domain`.  | [optional]

### Return type

[**TlsActivationResponse**](TlsActivationResponse.md)


## `listTlsActivations`

```javascript
listTlsActivations({ , [filter_tls_certificate_id, ][filter_tls_configuration_id, ][filter_tls_domain_id, ][include, ][page_number, ][page_size] })
```

List all TLS activations.

### Example

```javascript
const options = {
  filter_tls_certificate_id: "filter_tls_certificate_id_example",
  filter_tls_configuration_id: "filter_tls_configuration_id_example",
  filter_tls_domain_id: "filter_tls_domain_id_example",
  include: tls_certificate,tls_configuration,tls_domain,
  page_number: 1,
  page_size: 20,
};

apiInstance.listTlsActivations(options)
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
**filter_tls_certificate_id** | **String** | Limit the returned activations to a specific certificate. | [optional]
**filter_tls_configuration_id** | **String** | Limit the returned activations to a specific TLS configuration. | [optional]
**filter_tls_domain_id** | **String** | Limit the returned rules to a specific domain name. | [optional]
**include** | **String** | Include related objects. Optional, comma-separated values. Permitted values: `tls_certificate`, `tls_configuration`, and `tls_domain`.  | [optional]
**page_number** | **Number** | Current page. | [optional]
**page_size** | **Number** | Number of records per page. | [optional] [defaults to 20]

### Return type

[**TlsActivationsResponse**](TlsActivationsResponse.md)


## `updateTlsActivation`

```javascript
updateTlsActivation({ tls_activation_id, [tls_activation] })
```

Update the certificate used to terminate TLS traffic for the domain associated with this TLS activation.

### Example

```javascript
const options = {
  tls_activation_id: "tls_activation_id_example", // required
  tls_activation: {"data":{"type":"tls_activation","relationships":{"tls_certificate":{"data":{"type":"tls_certificate","id":"cRTguUGZzb2W9Euo4moOr"}}}}},
};

apiInstance.updateTlsActivation(options)
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
**tls_activation_id** | **String** | Alphanumeric string identifying a TLS activation. |
**tls_activation** | [**TlsActivation**](TlsActivation.md) |  | [optional]

### Return type

[**TlsActivationResponse**](TlsActivationResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
