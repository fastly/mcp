# Fastly.LoggingTlsCommon

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tls_ca_cert** | **String** | A secure certificate to authenticate a server with. Must be in PEM format. | [optional]  [defaults to 'null']
**tls_client_cert** | **String** | The client certificate used to make authenticated requests. Must be in PEM format. | [optional]  [defaults to 'null']
**tls_client_key** | **String** | The client private key used to make authenticated requests. Must be in PEM format. | [optional]  [defaults to 'null']
**tls_hostname** | **String** | The hostname to verify the server&#39;s certificate. This should be one of the Subject Alternative Name (SAN) fields for the certificate. Common Names (CN) are not supported. | [optional]  [defaults to 'null']


[[Back to API list]](../../README.md#endpoints) [[Back to README]](../../README.md)
