# Fastly.BackendApi

```javascript
const apiInstance = new Fastly.BackendApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createBackend**](BackendApi.md#createBackend) | **POST** /service/{service_id}/version/{version_id}/backend | Create a backend
[**deleteBackend**](BackendApi.md#deleteBackend) | **DELETE** /service/{service_id}/version/{version_id}/backend/{backend_name} | Delete a backend
[**getBackend**](BackendApi.md#getBackend) | **GET** /service/{service_id}/version/{version_id}/backend/{backend_name} | Describe a backend
[**listBackends**](BackendApi.md#listBackends) | **GET** /service/{service_id}/version/{version_id}/backend | List backends
[**updateBackend**](BackendApi.md#updateBackend) | **PUT** /service/{service_id}/version/{version_id}/backend/{backend_name} | Update a backend


## `createBackend`

```javascript
createBackend({ service_id, version_id, [address, ][auto_loadbalance, ][between_bytes_timeout, ][client_cert, ][comment, ][connect_timeout, ][first_byte_timeout, ][fetch_timeout, ][healthcheck, ][hostname, ][ipv4, ][ipv6, ][keepalive_time, ][max_conn, ][max_tls_version, ][min_tls_version, ][name, ][override_host, ][port, ][prefer_ipv6, ][request_condition, ][share_key, ][shield, ][ssl_ca_cert, ][ssl_cert_hostname, ][ssl_check_cert, ][ssl_ciphers, ][ssl_client_cert, ][ssl_client_key, ][ssl_hostname, ][ssl_sni_hostname, ][tcp_keepalive_enable, ][tcp_keepalive_interval, ][tcp_keepalive_probes, ][tcp_keepalive_time, ][use_ssl, ][weight] })
```

Create a backend for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  address: "address_example",
  auto_loadbalance: true,
  between_bytes_timeout: 56,
  client_cert: "client_cert_example",
  comment: "comment_example",
  connect_timeout: 56,
  first_byte_timeout: 56,
  fetch_timeout: 56,
  healthcheck: "healthcheck_example",
  hostname: "hostname_example",
  ipv4: "ipv4_example",
  ipv6: "ipv6_example",
  keepalive_time: 56,
  max_conn: 56,
  max_tls_version: "max_tls_version_example",
  min_tls_version: "min_tls_version_example",
  name: "name_example",
  override_host: "override_host_example",
  port: 56,
  prefer_ipv6: true,
  request_condition: "request_condition_example",
  share_key: "share_key_example",
  shield: "shield_example",
  ssl_ca_cert: "ssl_ca_cert_example",
  ssl_cert_hostname: "ssl_cert_hostname_example",
  ssl_check_cert: true,
  ssl_ciphers: "ssl_ciphers_example",
  ssl_client_cert: "ssl_client_cert_example",
  ssl_client_key: "ssl_client_key_example",
  ssl_hostname: "ssl_hostname_example",
  ssl_sni_hostname: "ssl_sni_hostname_example",
  tcp_keepalive_enable: true,
  tcp_keepalive_interval: 10,
  tcp_keepalive_probes: 3,
  tcp_keepalive_time: 300,
  use_ssl: true,
  weight: 56,
};

apiInstance.createBackend(options)
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
**service_id** | **String** | Alphanumeric string identifying the service. |
**version_id** | **Number** | Integer identifying a service version. |
**address** | **String** | A hostname, IPv4, or IPv6 address for the backend. This is the preferred way to specify the location of your backend. | [optional]
**auto_loadbalance** | **Boolean** | Whether or not this backend should be automatically load balanced. If true, all backends with this setting that don&#39;t have a `request_condition` will be selected based on their `weight`. | [optional]
**between_bytes_timeout** | **Number** | Maximum duration in milliseconds that Fastly will wait while receiving no data on a download from a backend. If exceeded, for Delivery services, the response received so far will be considered complete and the fetch will end. For Compute services, timeout expiration is treated as a failure of the backend connection, and an error is generated. May be set at runtime using `bereq.between_bytes_timeout`. | [optional]
**client_cert** | **String** | Unused. | [optional]
**comment** | **String** | A freeform descriptive note. | [optional]
**connect_timeout** | **Number** | Maximum duration in milliseconds to wait for a connection to this backend to be established. If exceeded, the connection is aborted and a synthetic `503` response will be presented instead. May be set at runtime using `bereq.connect_timeout`. | [optional]
**first_byte_timeout** | **Number** | Maximum duration in milliseconds to wait for the server response to begin after a TCP connection is established and the request has been sent. If exceeded, the connection is aborted and a synthetic `503` response will be presented instead. May be set at runtime using `bereq.first_byte_timeout`. | [optional]
**fetch_timeout** | **Number** | Maximum duration in milliseconds to wait for the entire response to be received after a TCP connection is established and the request has been sent. If exceeded, the connection is aborted and a synthetic `503` response will be presented instead. May be set at runtime using `bereq.fetch_timeout`. | [optional]
**healthcheck** | **String** | The name of the healthcheck to use with this backend. | [optional]
**hostname** | **String** | The hostname of the backend. May be used as an alternative to `address` to set the backend location. | [optional]
**ipv4** | **String** | IPv4 address of the backend. May be used as an alternative to `address` to set the backend location. | [optional]
**ipv6** | **String** | IPv6 address of the backend. May be used as an alternative to `address` to set the backend location. | [optional]
**keepalive_time** | **Number** | How long in seconds to keep a persistent connection to the backend between requests. By default, Varnish keeps connections open as long as it can. | [optional]
**max_conn** | **Number** | Maximum number of concurrent connections this backend will accept. | [optional]
**max_tls_version** | **String** | Maximum allowed TLS version on SSL connections to this backend. If your backend server is not able to negotiate a connection meeting this constraint, a synthetic `503` error response will be generated. | [optional]
**min_tls_version** | **String** | Minimum allowed TLS version on SSL connections to this backend. If your backend server is not able to negotiate a connection meeting this constraint, a synthetic `503` error response will be generated. | [optional]
**name** | **String** | The name of the backend. | [optional]
**override_host** | **String** | If set, will replace the client-supplied HTTP `Host` header on connections to this backend. Applied after VCL has been processed, so this setting will take precedence over changing `bereq.http.Host` in VCL. | [optional]
**port** | **Number** | Port on which the backend server is listening for connections from Fastly. Setting `port` to 80 or 443 will also set `use_ssl` automatically (to false and true respectively), unless explicitly overridden by setting `use_ssl` in the same request. | [optional]
**prefer_ipv6** | **Boolean** | Prefer IPv6 connections to origins for hostname backends. Default is &#39;false&#39; for Delivery services and &#39;true&#39; for Compute services. | [optional]
**request_condition** | **String** | Name of a Condition, which if satisfied, will select this backend during a request. If set, will override any `auto_loadbalance` setting. By default, the first backend added to a service is selected for all requests. | [optional]
**share_key** | **String** | Value that when shared across backends will enable those backends to share the same health check. | [optional]
**shield** | **String** | Identifier of the POP to use as a [shield](https://www.fastly.com/documentation/guides/getting-started/hosts/shielding/). | [optional]
**ssl_ca_cert** | **String** | CA certificate attached to origin. | [optional]
**ssl_cert_hostname** | **String** | Overrides `ssl_hostname`, but only for cert verification. Does not affect SNI at all. | [optional]
**ssl_check_cert** | **Boolean** | Be strict on checking SSL certs. | [optional] [defaults to true]
**ssl_ciphers** | **String** | List of [OpenSSL ciphers](https://www.openssl.org/docs/man1.1.1/man1/ciphers.html) to support for connections to this origin. If your backend server is not able to negotiate a connection meeting this constraint, a synthetic `503` error response will be generated. | [optional]
**ssl_client_cert** | **String** | Client certificate attached to origin. | [optional]
**ssl_client_key** | **String** | Client key attached to origin. | [optional]
**ssl_hostname** | **String** | Use `ssl_cert_hostname` and `ssl_sni_hostname` to configure certificate validation. | [optional]
**ssl_sni_hostname** | **String** | Overrides `ssl_hostname`, but only for SNI in the handshake. Does not affect cert validation at all. | [optional]
**tcp_keepalive_enable** | **Boolean** | Whether to enable TCP keepalives for backend connections. Varnish defaults to using keepalives if this is unspecified. | [optional]
**tcp_keepalive_interval** | **Number** | Interval in seconds between subsequent keepalive probes. | [optional] [defaults to 10]
**tcp_keepalive_probes** | **Number** | Number of unacknowledged probes to send before considering the connection dead. | [optional] [defaults to 3]
**tcp_keepalive_time** | **Number** | Interval in seconds between the last data packet sent and the first keepalive probe. | [optional] [defaults to 300]
**use_ssl** | **Boolean** | Whether or not to require TLS for connections to this backend. | [optional]
**weight** | **Number** | Weight used to load balance this backend against others. May be any positive integer. If `auto_loadbalance` is true, the chance of this backend being selected is equal to its own weight over the sum of all weights for backends that have `auto_loadbalance` set to true. | [optional]

### Return type

[**BackendResponse**](BackendResponse.md)


## `deleteBackend`

```javascript
deleteBackend({ service_id, version_id, backend_name })
```

Delete the backend for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  backend_name: "backend_name_example", // required
};

apiInstance.deleteBackend(options)
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
**service_id** | **String** | Alphanumeric string identifying the service. |
**version_id** | **Number** | Integer identifying a service version. |
**backend_name** | **String** | The name of the backend. |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `getBackend`

```javascript
getBackend({ service_id, version_id, backend_name })
```

Get the backend for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  backend_name: "backend_name_example", // required
};

apiInstance.getBackend(options)
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
**service_id** | **String** | Alphanumeric string identifying the service. |
**version_id** | **Number** | Integer identifying a service version. |
**backend_name** | **String** | The name of the backend. |

### Return type

[**BackendResponse**](BackendResponse.md)


## `listBackends`

```javascript
listBackends({ service_id, version_id })
```

List all backends for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.listBackends(options)
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
**service_id** | **String** | Alphanumeric string identifying the service. |
**version_id** | **Number** | Integer identifying a service version. |

### Return type

[**[BackendResponse]**](BackendResponse.md)


## `updateBackend`

```javascript
updateBackend({ service_id, version_id, backend_name, [address, ][auto_loadbalance, ][between_bytes_timeout, ][client_cert, ][comment, ][connect_timeout, ][first_byte_timeout, ][fetch_timeout, ][healthcheck, ][hostname, ][ipv4, ][ipv6, ][keepalive_time, ][max_conn, ][max_tls_version, ][min_tls_version, ][name, ][override_host, ][port, ][prefer_ipv6, ][request_condition, ][share_key, ][shield, ][ssl_ca_cert, ][ssl_cert_hostname, ][ssl_check_cert, ][ssl_ciphers, ][ssl_client_cert, ][ssl_client_key, ][ssl_hostname, ][ssl_sni_hostname, ][tcp_keepalive_enable, ][tcp_keepalive_interval, ][tcp_keepalive_probes, ][tcp_keepalive_time, ][use_ssl, ][weight] })
```

Update the backend for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  backend_name: "backend_name_example", // required
  address: "address_example",
  auto_loadbalance: true,
  between_bytes_timeout: 56,
  client_cert: "client_cert_example",
  comment: "comment_example",
  connect_timeout: 56,
  first_byte_timeout: 56,
  fetch_timeout: 56,
  healthcheck: "healthcheck_example",
  hostname: "hostname_example",
  ipv4: "ipv4_example",
  ipv6: "ipv6_example",
  keepalive_time: 56,
  max_conn: 56,
  max_tls_version: "max_tls_version_example",
  min_tls_version: "min_tls_version_example",
  name: "name_example",
  override_host: "override_host_example",
  port: 56,
  prefer_ipv6: true,
  request_condition: "request_condition_example",
  share_key: "share_key_example",
  shield: "shield_example",
  ssl_ca_cert: "ssl_ca_cert_example",
  ssl_cert_hostname: "ssl_cert_hostname_example",
  ssl_check_cert: true,
  ssl_ciphers: "ssl_ciphers_example",
  ssl_client_cert: "ssl_client_cert_example",
  ssl_client_key: "ssl_client_key_example",
  ssl_hostname: "ssl_hostname_example",
  ssl_sni_hostname: "ssl_sni_hostname_example",
  tcp_keepalive_enable: true,
  tcp_keepalive_interval: 10,
  tcp_keepalive_probes: 3,
  tcp_keepalive_time: 300,
  use_ssl: true,
  weight: 56,
};

apiInstance.updateBackend(options)
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
**service_id** | **String** | Alphanumeric string identifying the service. |
**version_id** | **Number** | Integer identifying a service version. |
**backend_name** | **String** | The name of the backend. |
**address** | **String** | A hostname, IPv4, or IPv6 address for the backend. This is the preferred way to specify the location of your backend. | [optional]
**auto_loadbalance** | **Boolean** | Whether or not this backend should be automatically load balanced. If true, all backends with this setting that don&#39;t have a `request_condition` will be selected based on their `weight`. | [optional]
**between_bytes_timeout** | **Number** | Maximum duration in milliseconds that Fastly will wait while receiving no data on a download from a backend. If exceeded, for Delivery services, the response received so far will be considered complete and the fetch will end. For Compute services, timeout expiration is treated as a failure of the backend connection, and an error is generated. May be set at runtime using `bereq.between_bytes_timeout`. | [optional]
**client_cert** | **String** | Unused. | [optional]
**comment** | **String** | A freeform descriptive note. | [optional]
**connect_timeout** | **Number** | Maximum duration in milliseconds to wait for a connection to this backend to be established. If exceeded, the connection is aborted and a synthetic `503` response will be presented instead. May be set at runtime using `bereq.connect_timeout`. | [optional]
**first_byte_timeout** | **Number** | Maximum duration in milliseconds to wait for the server response to begin after a TCP connection is established and the request has been sent. If exceeded, the connection is aborted and a synthetic `503` response will be presented instead. May be set at runtime using `bereq.first_byte_timeout`. | [optional]
**fetch_timeout** | **Number** | Maximum duration in milliseconds to wait for the entire response to be received after a TCP connection is established and the request has been sent. If exceeded, the connection is aborted and a synthetic `503` response will be presented instead. May be set at runtime using `bereq.fetch_timeout`. | [optional]
**healthcheck** | **String** | The name of the healthcheck to use with this backend. | [optional]
**hostname** | **String** | The hostname of the backend. May be used as an alternative to `address` to set the backend location. | [optional]
**ipv4** | **String** | IPv4 address of the backend. May be used as an alternative to `address` to set the backend location. | [optional]
**ipv6** | **String** | IPv6 address of the backend. May be used as an alternative to `address` to set the backend location. | [optional]
**keepalive_time** | **Number** | How long in seconds to keep a persistent connection to the backend between requests. By default, Varnish keeps connections open as long as it can. | [optional]
**max_conn** | **Number** | Maximum number of concurrent connections this backend will accept. | [optional]
**max_tls_version** | **String** | Maximum allowed TLS version on SSL connections to this backend. If your backend server is not able to negotiate a connection meeting this constraint, a synthetic `503` error response will be generated. | [optional]
**min_tls_version** | **String** | Minimum allowed TLS version on SSL connections to this backend. If your backend server is not able to negotiate a connection meeting this constraint, a synthetic `503` error response will be generated. | [optional]
**name** | **String** | The name of the backend. | [optional]
**override_host** | **String** | If set, will replace the client-supplied HTTP `Host` header on connections to this backend. Applied after VCL has been processed, so this setting will take precedence over changing `bereq.http.Host` in VCL. | [optional]
**port** | **Number** | Port on which the backend server is listening for connections from Fastly. Setting `port` to 80 or 443 will also set `use_ssl` automatically (to false and true respectively), unless explicitly overridden by setting `use_ssl` in the same request. | [optional]
**prefer_ipv6** | **Boolean** | Prefer IPv6 connections to origins for hostname backends. Default is &#39;false&#39; for Delivery services and &#39;true&#39; for Compute services. | [optional]
**request_condition** | **String** | Name of a Condition, which if satisfied, will select this backend during a request. If set, will override any `auto_loadbalance` setting. By default, the first backend added to a service is selected for all requests. | [optional]
**share_key** | **String** | Value that when shared across backends will enable those backends to share the same health check. | [optional]
**shield** | **String** | Identifier of the POP to use as a [shield](https://www.fastly.com/documentation/guides/getting-started/hosts/shielding/). | [optional]
**ssl_ca_cert** | **String** | CA certificate attached to origin. | [optional]
**ssl_cert_hostname** | **String** | Overrides `ssl_hostname`, but only for cert verification. Does not affect SNI at all. | [optional]
**ssl_check_cert** | **Boolean** | Be strict on checking SSL certs. | [optional] [defaults to true]
**ssl_ciphers** | **String** | List of [OpenSSL ciphers](https://www.openssl.org/docs/man1.1.1/man1/ciphers.html) to support for connections to this origin. If your backend server is not able to negotiate a connection meeting this constraint, a synthetic `503` error response will be generated. | [optional]
**ssl_client_cert** | **String** | Client certificate attached to origin. | [optional]
**ssl_client_key** | **String** | Client key attached to origin. | [optional]
**ssl_hostname** | **String** | Use `ssl_cert_hostname` and `ssl_sni_hostname` to configure certificate validation. | [optional]
**ssl_sni_hostname** | **String** | Overrides `ssl_hostname`, but only for SNI in the handshake. Does not affect cert validation at all. | [optional]
**tcp_keepalive_enable** | **Boolean** | Whether to enable TCP keepalives for backend connections. Varnish defaults to using keepalives if this is unspecified. | [optional]
**tcp_keepalive_interval** | **Number** | Interval in seconds between subsequent keepalive probes. | [optional] [defaults to 10]
**tcp_keepalive_probes** | **Number** | Number of unacknowledged probes to send before considering the connection dead. | [optional] [defaults to 3]
**tcp_keepalive_time** | **Number** | Interval in seconds between the last data packet sent and the first keepalive probe. | [optional] [defaults to 300]
**use_ssl** | **Boolean** | Whether or not to require TLS for connections to this backend. | [optional]
**weight** | **Number** | Weight used to load balance this backend against others. May be any positive integer. If `auto_loadbalance` is true, the chance of this backend being selected is equal to its own weight over the sum of all weights for backends that have `auto_loadbalance` set to true. | [optional]

### Return type

[**BackendResponse**](BackendResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
