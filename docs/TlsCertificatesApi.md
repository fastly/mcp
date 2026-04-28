# Fastly.TlsCertificatesApi

```javascript
const apiInstance = new Fastly.TlsCertificatesApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createTlsCert**](TlsCertificatesApi.md#createTlsCert) | **POST** /tls/certificates | Create a TLS certificate
[**deleteTlsCert**](TlsCertificatesApi.md#deleteTlsCert) | **DELETE** /tls/certificates/{tls_certificate_id} | Delete a TLS certificate
[**getTlsCert**](TlsCertificatesApi.md#getTlsCert) | **GET** /tls/certificates/{tls_certificate_id} | Get a TLS certificate
[**getTlsCertBlob**](TlsCertificatesApi.md#getTlsCertBlob) | **GET** /tls/certificates/{tls_certificate_id}/blob | Get a TLS certificate blob (Limited Availability)
[**listTlsCerts**](TlsCertificatesApi.md#listTlsCerts) | **GET** /tls/certificates | List TLS certificates
[**updateTlsCert**](TlsCertificatesApi.md#updateTlsCert) | **PATCH** /tls/certificates/{tls_certificate_id} | Update a TLS certificate


## `createTlsCert`

```javascript
createTlsCert({ , [tls_certificate] })
```

Create a TLS certificate.

### Example

```javascript
const options = {
  tls_certificate: {"data":{"type":"tls_certificate","attributes":{"cert_blob":"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n","name":"My certificate"}}},
};

apiInstance.createTlsCert(options)
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
**tls_certificate** | [**TlsCertificate**](TlsCertificate.md) |  | [optional]

### Return type

**Object**


## `deleteTlsCert`

```javascript
deleteTlsCert({ tls_certificate_id })
```

Destroy a TLS certificate. TLS certificates already enabled for a domain cannot be destroyed.

### Example

```javascript
const options = {
  tls_certificate_id: "tls_certificate_id_example", // required
};

apiInstance.deleteTlsCert(options)
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
**tls_certificate_id** | **String** | Alphanumeric string identifying a TLS certificate. |

### Return type

null (empty response body)


## `getTlsCert`

```javascript
getTlsCert({ tls_certificate_id })
```

Show a TLS certificate.

### Example

```javascript
const options = {
  tls_certificate_id: "tls_certificate_id_example", // required
};

apiInstance.getTlsCert(options)
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
**tls_certificate_id** | **String** | Alphanumeric string identifying a TLS certificate. |

### Return type

[**TlsCertificateResponse**](TlsCertificateResponse.md)


## `getTlsCertBlob`

```javascript
getTlsCertBlob({ tls_certificate_id })
```

Retrieve a TLS certificate blob. This feature is part of a [limited availability](https://docs.fastly.com/products/fastly-product-lifecycle#limited-availability) release.

### Example

```javascript
const options = {
  tls_certificate_id: "tls_certificate_id_example", // required
};

apiInstance.getTlsCertBlob(options)
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
**tls_certificate_id** | **String** | Alphanumeric string identifying a TLS certificate. |

### Return type

[**TlsCertificateBlobResponse**](TlsCertificateBlobResponse.md)


## `listTlsCerts`

```javascript
listTlsCerts({ , [filter_in_use, ][filter_not_after, ][filter_tls_domains_id, ][include, ][sort, ][page_number, ][page_size] })
```

List all TLS certificates.

### Example

```javascript
const options = {
  filter_in_use: "filter_in_use_example",
  filter_not_after: "filter_not_after_example",
  filter_tls_domains_id: "filter_tls_domains_id_example",
  include: "include_example",
  sort: "created_at",
  page_number: 1,
  page_size: 20,
};

apiInstance.listTlsCerts(options)
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
**filter_in_use** | **String** | Optional. Limit the returned certificates to those currently using Fastly to terminate TLS (that is, certificates associated with an activation). Permitted values: true, false. | [optional]
**filter_not_after** | **String** | Limit the returned certificates to those that expire prior to the specified date in UTC. Accepts parameters: lte (e.g., filter[not_after][lte]&#x3D;2020-05-05).  | [optional]
**filter_tls_domains_id** | **String** | Limit the returned certificates to those that include the specific domain. | [optional]
**include** | **String** | Include related objects. Optional, comma-separated values. Permitted values: `tls_activations`.  | [optional]
**sort** | **String** | The order in which to list the results. | [optional] [one of: "created_at", "-created_at", "not_before", "-not_before", "not_after", "-not_after", "tls_activations.created_at", "-tls_activations.created_at"]
**page_number** | **Number** | Current page. | [optional]
**page_size** | **Number** | Number of records per page. | [optional] [defaults to 20]

### Return type

[**TlsCertificatesResponse**](TlsCertificatesResponse.md)


## `updateTlsCert`

```javascript
updateTlsCert({ tls_certificate_id, [tls_certificate] })
```

Replace a TLS certificate with a newly reissued TLS certificate, or update a TLS certificate's name. If replacing a TLS certificate, the new TLS certificate must contain all SAN entries as the current TLS certificate. It must either have an exact matching list or contain a superset.

### Example

```javascript
const options = {
  tls_certificate_id: "tls_certificate_id_example", // required
  tls_certificate: {"data":{"type":"tls_certificate","attributes":{"cert_blob":"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n","name":"My certificate"}}},
};

apiInstance.updateTlsCert(options)
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
**tls_certificate_id** | **String** | Alphanumeric string identifying a TLS certificate. |
**tls_certificate** | [**TlsCertificate**](TlsCertificate.md) |  | [optional]

### Return type

[**TlsCertificateResponse**](TlsCertificateResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
