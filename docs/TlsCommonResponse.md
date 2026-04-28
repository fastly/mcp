# Fastly.TlsCommonResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tls_ca_cert** | **String** | A secure certificate to authenticate a server with. Must be in PEM format. | [optional]  [defaults to 'null']
**tls_client_cert** | **String** | The client certificate used to make authenticated requests. Must be in PEM format. | [optional]  [defaults to 'null']
**tls_client_key** | **String** | The client private key used to make authenticated requests. Must be in PEM format. | [optional]  [defaults to 'null']
**tls_cert_hostname** | **String** | The hostname used to verify a server&#39;s certificate. It can either be the Common Name (CN) or a Subject Alternative Name (SAN). | [optional]  [defaults to 'null']
**use_tls** | **String** | Whether to use TLS. | [optional]  [one of: "0", "1"]


[[Back to API list]](../../README.md#endpoints) [[Back to README]](../../README.md)
