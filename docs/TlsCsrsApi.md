# Fastly.TlsCsrsApi

```javascript
const apiInstance = new Fastly.TlsCsrsApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createCsr**](TlsCsrsApi.md#createCsr) | **POST** /tls/certificate_signing_requests | Create CSR


## `createCsr`

```javascript
createCsr({ , [tls_csr] })
```

Creates a certificate signing request (CSR).

### Example

```javascript
const options = {
  tls_csr: {"data":{"type":"csr","attributes":{"sans":["DOMAIN_NAME"],"common_name":"DOMAIN_NAME","key_type":"RSA2048","country":"US","state":"California","city":"San Francisco","organization":"Fastly, Inc.","organizational_unit":"Engineering"},"relationships":{"tls_private_key":{"data":{"type":"tls_private_key","id":"KeYguUGZzb2W9Euo4moOR"}}}}},
};

apiInstance.createCsr(options)
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
**tls_csr** | [**TlsCsr**](TlsCsr.md) |  | [optional]

### Return type

[**TlsCsrResponse**](TlsCsrResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
