# Fastly.Server

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**weight** | **Number** | Weight (`1-100`) used to load balance this server against others. | [optional]  [defaults to 100]
**max_conn** | **Number** | Maximum number of connections. If the value is `0`, it inherits the value from pool&#39;s `max_conn_default`. | [optional]  [defaults to 0]
**port** | **Number** | Port number. Setting port `443` does not force TLS. Set `use_tls` in pool to force TLS. | [optional]  [defaults to 80]
**address** | **String** | A hostname, IPv4, or IPv6 address for the server. Required. | [optional] 
**comment** | **String** | A freeform descriptive note. | [optional] 
**disabled** | **Boolean** | Allows servers to be enabled and disabled in a pool. | [optional]  [defaults to false]
**override_host** | **String** | The hostname to override the Host header. Defaults to `null` meaning no override of the Host header if not set. This setting can also be added to a Pool definition. However, the server setting will override the Pool setting. | [optional]  [defaults to 'null']


[[Back to API list]](../../README.md#endpoints) [[Back to README]](../../README.md)
