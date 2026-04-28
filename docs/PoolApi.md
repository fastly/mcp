# Fastly.PoolApi

```javascript
const apiInstance = new Fastly.PoolApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createServerPool**](PoolApi.md#createServerPool) | **POST** /service/{service_id}/version/{version_id}/pool | Create a server pool
[**deleteServerPool**](PoolApi.md#deleteServerPool) | **DELETE** /service/{service_id}/version/{version_id}/pool/{pool_name} | Delete a server pool
[**getServerPool**](PoolApi.md#getServerPool) | **GET** /service/{service_id}/version/{version_id}/pool/{pool_name} | Get a server pool
[**listServerPools**](PoolApi.md#listServerPools) | **GET** /service/{service_id}/version/{version_id}/pool | List server pools
[**updateServerPool**](PoolApi.md#updateServerPool) | **PUT** /service/{service_id}/version/{version_id}/pool/{pool_name} | Update a server pool


## `createServerPool`

```javascript
createServerPool({ service_id, version_id, [tls_ca_cert, ][tls_client_cert, ][tls_client_key, ][tls_cert_hostname, ][use_tls, ][created_at, ][deleted_at, ][updated_at, ][service_id2, ][version, ][name, ][shield, ][request_condition, ][tls_ciphers, ][tls_sni_hostname, ][min_tls_version, ][max_tls_version, ][healthcheck, ][comment, ][type, ][override_host, ][between_bytes_timeout, ][connect_timeout, ][first_byte_timeout, ][max_conn_default, ][quorum, ][tls_check_cert] })
```

Creates a pool for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  tls_ca_cert: "'null'",
  tls_client_cert: "'null'",
  tls_client_key: "'null'",
  tls_cert_hostname: "'null'",
  use_tls: 0,
  created_at: new Date("2013-10-20T19:20:30+01:00"),
  deleted_at: new Date("2013-10-20T19:20:30+01:00"),
  updated_at: new Date("2013-10-20T19:20:30+01:00"),
  service_id2: "service_id_example",
  version: "version_example",
  name: "name_example",
  shield: "'null'",
  request_condition: "request_condition_example",
  tls_ciphers: "tls_ciphers_example",
  tls_sni_hostname: "tls_sni_hostname_example",
  min_tls_version: 56,
  max_tls_version: 56,
  healthcheck: "healthcheck_example",
  comment: "comment_example",
  type: "random",
  override_host: "'null'",
  between_bytes_timeout: 10000,
  connect_timeout: 56,
  first_byte_timeout: 56,
  max_conn_default: 200,
  quorum: 75,
  tls_check_cert: 56,
};

apiInstance.createServerPool(options)
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
**tls_ca_cert** | **String** | A secure certificate to authenticate a server with. Must be in PEM format. | [optional] [defaults to 'null']
**tls_client_cert** | **String** | The client certificate used to make authenticated requests. Must be in PEM format. | [optional] [defaults to 'null']
**tls_client_key** | **String** | The client private key used to make authenticated requests. Must be in PEM format. | [optional] [defaults to 'null']
**tls_cert_hostname** | **String** | The hostname used to verify a server&#39;s certificate. It can either be the Common Name (CN) or a Subject Alternative Name (SAN). | [optional] [defaults to 'null']
**use_tls** | **Number** | Whether to use TLS. | [optional] [one of: 0, 1]
**created_at** | **Date** | Date and time in ISO 8601 format. | [optional]
**deleted_at** | **Date** | Date and time in ISO 8601 format. | [optional]
**updated_at** | **Date** | Date and time in ISO 8601 format. | [optional]
**service_id2** | **String** |  | [optional]
**version** | **String** |  | [optional]
**name** | **String** | Name for the Pool. | [optional]
**shield** | **String** | Selected POP to serve as a shield for the servers. Defaults to `null` meaning no origin shielding if not set. Refer to the [POPs API endpoint](https://www.fastly.com/documentation/reference/api/utils/pops/) to get a list of available POPs used for shielding. | [optional] [defaults to 'null']
**request_condition** | **String** | Condition which, if met, will select this configuration during a request. Optional. | [optional]
**tls_ciphers** | **String** | List of OpenSSL ciphers (see the [openssl.org manpages](https://www.openssl.org/docs/man1.1.1/man1/ciphers.html) for details). Optional. | [optional]
**tls_sni_hostname** | **String** | SNI hostname. Optional. | [optional]
**min_tls_version** | **Number** | Minimum allowed TLS version on connections to this server. Optional. | [optional]
**max_tls_version** | **Number** | Maximum allowed TLS version on connections to this server. Optional. | [optional]
**healthcheck** | **String** | Name of the healthcheck to use with this pool. Can be empty and could be reused across multiple backend and pools. | [optional]
**comment** | **String** | A freeform descriptive note. | [optional]
**type** | **String** | What type of load balance group to use. | [optional] [one of: "random", "hash", "client"]
**override_host** | **String** | The hostname to [override the Host header](https://www.fastly.com/documentation/guides/full-site-delivery/domains-and-origins/specifying-an-override-host/). Defaults to `null` meaning no override of the Host header will occur. This setting can also be added to a Server definition. If the field is set on a Server definition it will override the Pool setting. | [optional] [defaults to 'null']
**between_bytes_timeout** | **Number** | Maximum duration in milliseconds that Fastly will wait while receiving no data on a download from a backend. If exceeded, for Delivery services, the response received so far will be considered complete and the fetch will end. For Compute services, timeout expiration is treated as a failure of the backend connection, and an error is generated. May be set at runtime using `bereq.between_bytes_timeout`. | [optional] [defaults to 10000]
**connect_timeout** | **Number** | How long to wait for a timeout in milliseconds. Optional. | [optional]
**first_byte_timeout** | **Number** | How long to wait for the first byte in milliseconds. Optional. | [optional]
**max_conn_default** | **Number** | Maximum number of connections. Optional. | [optional] [defaults to 200]
**quorum** | **Number** | Percentage of capacity (`0-100`) that needs to be operationally available for a pool to be considered up. | [optional] [defaults to 75]
**tls_check_cert** | **Number** | Be strict on checking TLS certs. Optional. | [optional]

### Return type

[**PoolResponsePost**](PoolResponsePost.md)


## `deleteServerPool`

```javascript
deleteServerPool({ service_id, version_id, pool_name })
```

Deletes a specific pool for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  pool_name: "pool_name_example", // required
};

apiInstance.deleteServerPool(options)
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
**pool_name** | **String** | Name for the Pool. |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `getServerPool`

```javascript
getServerPool({ service_id, version_id, pool_name })
```

Gets a single pool for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  pool_name: "pool_name_example", // required
};

apiInstance.getServerPool(options)
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
**pool_name** | **String** | Name for the Pool. |

### Return type

[**PoolResponse**](PoolResponse.md)


## `listServerPools`

```javascript
listServerPools({ service_id, version_id })
```

Lists all pools for a particular service and pool.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.listServerPools(options)
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

[**[PoolResponse]**](PoolResponse.md)


## `updateServerPool`

```javascript
updateServerPool({ service_id, version_id, pool_name, [tls_ca_cert, ][tls_client_cert, ][tls_client_key, ][tls_cert_hostname, ][use_tls, ][created_at, ][deleted_at, ][updated_at, ][service_id2, ][version, ][name, ][shield, ][request_condition, ][tls_ciphers, ][tls_sni_hostname, ][min_tls_version, ][max_tls_version, ][healthcheck, ][comment, ][type, ][override_host, ][between_bytes_timeout, ][connect_timeout, ][first_byte_timeout, ][max_conn_default, ][quorum, ][tls_check_cert] })
```

Updates a specific pool for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  pool_name: "pool_name_example", // required
  tls_ca_cert: "'null'",
  tls_client_cert: "'null'",
  tls_client_key: "'null'",
  tls_cert_hostname: "'null'",
  use_tls: 0,
  created_at: new Date("2013-10-20T19:20:30+01:00"),
  deleted_at: new Date("2013-10-20T19:20:30+01:00"),
  updated_at: new Date("2013-10-20T19:20:30+01:00"),
  service_id2: "service_id_example",
  version: "version_example",
  name: "name_example",
  shield: "'null'",
  request_condition: "request_condition_example",
  tls_ciphers: "tls_ciphers_example",
  tls_sni_hostname: "tls_sni_hostname_example",
  min_tls_version: 56,
  max_tls_version: 56,
  healthcheck: "healthcheck_example",
  comment: "comment_example",
  type: "random",
  override_host: "'null'",
  between_bytes_timeout: 10000,
  connect_timeout: 56,
  first_byte_timeout: 56,
  max_conn_default: 200,
  quorum: 75,
  tls_check_cert: 56,
};

apiInstance.updateServerPool(options)
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
**pool_name** | **String** | Name for the Pool. |
**tls_ca_cert** | **String** | A secure certificate to authenticate a server with. Must be in PEM format. | [optional] [defaults to 'null']
**tls_client_cert** | **String** | The client certificate used to make authenticated requests. Must be in PEM format. | [optional] [defaults to 'null']
**tls_client_key** | **String** | The client private key used to make authenticated requests. Must be in PEM format. | [optional] [defaults to 'null']
**tls_cert_hostname** | **String** | The hostname used to verify a server&#39;s certificate. It can either be the Common Name (CN) or a Subject Alternative Name (SAN). | [optional] [defaults to 'null']
**use_tls** | **Number** | Whether to use TLS. | [optional] [one of: 0, 1]
**created_at** | **Date** | Date and time in ISO 8601 format. | [optional]
**deleted_at** | **Date** | Date and time in ISO 8601 format. | [optional]
**updated_at** | **Date** | Date and time in ISO 8601 format. | [optional]
**service_id2** | **String** |  | [optional]
**version** | **String** |  | [optional]
**name** | **String** | Name for the Pool. | [optional]
**shield** | **String** | Selected POP to serve as a shield for the servers. Defaults to `null` meaning no origin shielding if not set. Refer to the [POPs API endpoint](https://www.fastly.com/documentation/reference/api/utils/pops/) to get a list of available POPs used for shielding. | [optional] [defaults to 'null']
**request_condition** | **String** | Condition which, if met, will select this configuration during a request. Optional. | [optional]
**tls_ciphers** | **String** | List of OpenSSL ciphers (see the [openssl.org manpages](https://www.openssl.org/docs/man1.1.1/man1/ciphers.html) for details). Optional. | [optional]
**tls_sni_hostname** | **String** | SNI hostname. Optional. | [optional]
**min_tls_version** | **Number** | Minimum allowed TLS version on connections to this server. Optional. | [optional]
**max_tls_version** | **Number** | Maximum allowed TLS version on connections to this server. Optional. | [optional]
**healthcheck** | **String** | Name of the healthcheck to use with this pool. Can be empty and could be reused across multiple backend and pools. | [optional]
**comment** | **String** | A freeform descriptive note. | [optional]
**type** | **String** | What type of load balance group to use. | [optional] [one of: "random", "hash", "client"]
**override_host** | **String** | The hostname to [override the Host header](https://www.fastly.com/documentation/guides/full-site-delivery/domains-and-origins/specifying-an-override-host/). Defaults to `null` meaning no override of the Host header will occur. This setting can also be added to a Server definition. If the field is set on a Server definition it will override the Pool setting. | [optional] [defaults to 'null']
**between_bytes_timeout** | **Number** | Maximum duration in milliseconds that Fastly will wait while receiving no data on a download from a backend. If exceeded, for Delivery services, the response received so far will be considered complete and the fetch will end. For Compute services, timeout expiration is treated as a failure of the backend connection, and an error is generated. May be set at runtime using `bereq.between_bytes_timeout`. | [optional] [defaults to 10000]
**connect_timeout** | **Number** | How long to wait for a timeout in milliseconds. Optional. | [optional]
**first_byte_timeout** | **Number** | How long to wait for the first byte in milliseconds. Optional. | [optional]
**max_conn_default** | **Number** | Maximum number of connections. Optional. | [optional] [defaults to 200]
**quorum** | **Number** | Percentage of capacity (`0-100`) that needs to be operationally available for a pool to be considered up. | [optional] [defaults to 75]
**tls_check_cert** | **Number** | Be strict on checking TLS certs. Optional. | [optional]

### Return type

[**PoolResponse**](PoolResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
