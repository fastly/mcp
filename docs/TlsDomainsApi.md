# Fastly.TlsDomainsApi

```javascript
const apiInstance = new Fastly.TlsDomainsApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**listTlsDomains**](TlsDomainsApi.md#listTlsDomains) | **GET** /tls/domains | List TLS domains


## `listTlsDomains`

```javascript
listTlsDomains({ , [filter_in_use, ][filter_tls_certificates_id, ][filter_tls_subscriptions_id, ][include, ][sort, ][page_number, ][page_size] })
```

List all TLS domains.

### Example

```javascript
const options = {
  filter_in_use: "filter_in_use_example",
  filter_tls_certificates_id: "filter_tls_certificates_id_example",
  filter_tls_subscriptions_id: "filter_tls_subscriptions_id_example",
  include: "include_example",
  sort: "tls_activations.created_at",
  page_number: 1,
  page_size: 20,
};

apiInstance.listTlsDomains(options)
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
**filter_in_use** | **String** | Optional. Limit the returned domains to those currently using Fastly to terminate TLS with SNI (that is, domains considered \&quot;in use\&quot;) Permitted values: true, false. | [optional]
**filter_tls_certificates_id** | **String** | Optional. Limit the returned domains to those listed in the given TLS certificate&#39;s SAN list. | [optional]
**filter_tls_subscriptions_id** | **String** | Optional. Limit the returned domains to those for a given TLS subscription. | [optional]
**include** | **String** | Include related objects. Optional, comma-separated values. Permitted values: `tls_activations`, `tls_certificates`, `tls_subscriptions`, `tls_subscriptions.tls_authorizations`, `tls_authorizations.globalsign_email_challenge`, and `tls_authorizations.self_managed_http_challenge`.  | [optional]
**sort** | **String** | The order in which to list the results. | [optional] [one of: "tls_activations.created_at", "-tls_activations.created_at", "id", "-id"]
**page_number** | **Number** | Current page. | [optional]
**page_size** | **Number** | Number of records per page. | [optional] [defaults to 20]

### Return type

[**TlsDomainsResponse**](TlsDomainsResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
