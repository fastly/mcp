# Fastly.TlsBulkCertificatesApi

```javascript
const apiInstance = new Fastly.TlsBulkCertificatesApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**deleteBulkTlsCert**](TlsBulkCertificatesApi.md#deleteBulkTlsCert) | **DELETE** /tls/bulk/certificates/{certificate_id} | Delete a certificate
[**getTlsBulkCert**](TlsBulkCertificatesApi.md#getTlsBulkCert) | **GET** /tls/bulk/certificates/{certificate_id} | Get a certificate
[**listTlsBulkCerts**](TlsBulkCertificatesApi.md#listTlsBulkCerts) | **GET** /tls/bulk/certificates | List certificates
[**updateBulkTlsCert**](TlsBulkCertificatesApi.md#updateBulkTlsCert) | **PATCH** /tls/bulk/certificates/{certificate_id} | Update a certificate
[**uploadTlsBulkCert**](TlsBulkCertificatesApi.md#uploadTlsBulkCert) | **POST** /tls/bulk/certificates | Upload a certificate


## `deleteBulkTlsCert`

```javascript
deleteBulkTlsCert({ certificate_id })
```

Destroy a certificate. This disables TLS for all domains listed as SAN entries.

### Example

```javascript
const options = {
  certificate_id: "certificate_id_example", // required
};

apiInstance.deleteBulkTlsCert(options)
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
**certificate_id** | **String** | Alphanumeric string identifying a TLS bulk certificate. |

### Return type

null (empty response body)


## `getTlsBulkCert`

```javascript
getTlsBulkCert({ certificate_id })
```

Retrieve a single certificate.

### Example

```javascript
const options = {
  certificate_id: "certificate_id_example", // required
};

apiInstance.getTlsBulkCert(options)
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
**certificate_id** | **String** | Alphanumeric string identifying a TLS bulk certificate. |

### Return type

[**TlsBulkCertificateResponse**](TlsBulkCertificateResponse.md)


## `listTlsBulkCerts`

```javascript
listTlsBulkCerts({ , [filter_tls_domain_id, ][filter_not_before, ][filter_not_after, ][page_number, ][page_size, ][sort] })
```

List all certificates.

### Example

```javascript
const options = {
  filter_tls_domain_id: "filter_tls_domain_id_example",
  filter_not_before: "filter_not_before_example",
  filter_not_after: "filter_not_after_example",
  page_number: 1,
  page_size: 20,
  sort: "created_at",
};

apiInstance.listTlsBulkCerts(options)
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
**filter_tls_domain_id** | **String** | Filter certificates by their matching, fully-qualified domain name. | [optional]
**filter_not_before** | **String** | Filter the returned certificates by not_before date in UTC.  Accepts parameters: lt, lte, gt, gte (e.g., filter[not_before][gte]&#x3D;2020-05-05).  | [optional]
**filter_not_after** | **String** | Filter the returned certificates by expiry date in UTC.  Accepts parameters: lt, lte, gt, gte (e.g., filter[not_after][lte]&#x3D;2020-05-05).  | [optional]
**page_number** | **Number** | Current page. | [optional]
**page_size** | **Number** | Number of records per page. | [optional] [defaults to 20]
**sort** | **String** | The order in which to list the results by creation date. | [optional] [one of: "created_at", "-created_at"]

### Return type

[**TlsBulkCertificatesResponse**](TlsBulkCertificatesResponse.md)


## `updateBulkTlsCert`

```javascript
updateBulkTlsCert({ certificate_id, [tls_bulk_certificate] })
```

Replace a certificate with a newly reissued certificate. By using this endpoint, the original certificate will cease to be used for future TLS handshakes. Thus, only SAN entries that appear in the replacement certificate will become TLS enabled. Any SAN entries that are missing in the replacement certificate will become disabled.

### Example

```javascript
const options = {
  certificate_id: "certificate_id_example", // required
  tls_bulk_certificate: {"data":{"id":"cRTguUGZzb2W9Euo4moOr","type":"tls_bulk_certificate","attributes":{"allow_untrusted_root":false,"cert_blob":"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n","intermediates_blob":"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n"}}},
};

apiInstance.updateBulkTlsCert(options)
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
**certificate_id** | **String** | Alphanumeric string identifying a TLS bulk certificate. |
**tls_bulk_certificate** | [**TlsBulkCertificate**](TlsBulkCertificate.md) |  | [optional]

### Return type

[**TlsBulkCertificateResponse**](TlsBulkCertificateResponse.md)


## `uploadTlsBulkCert`

```javascript
uploadTlsBulkCert({ , [tls_bulk_certificate] })
```

Upload a new certificate. TLS domains are automatically enabled upon certificate creation. If a domain is already enabled on a previously uploaded certificate, that domain will be updated to use the new certificate for all future TLS handshake requests.

### Example

```javascript
const options = {
  tls_bulk_certificate: {"data":{"type":"tls_bulk_certificate","attributes":{"allow_untrusted_root":false,"cert_blob":"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n","intermediates_blob":"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n"},"relationships":{"tls_configurations":{"data":[{"type":"tls_configuration","id":"t7CguUGZzb2W9Euo5FoKa"}]}}}},
};

apiInstance.uploadTlsBulkCert(options)
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
**tls_bulk_certificate** | [**TlsBulkCertificate**](TlsBulkCertificate.md) |  | [optional]

### Return type

[**TlsBulkCertificateResponse**](TlsBulkCertificateResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
