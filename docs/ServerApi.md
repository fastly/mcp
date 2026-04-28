# Fastly.ServerApi

```javascript
const apiInstance = new Fastly.ServerApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createPoolServer**](ServerApi.md#createPoolServer) | **POST** /service/{service_id}/pool/{pool_id}/server | Add a server to a pool
[**deletePoolServer**](ServerApi.md#deletePoolServer) | **DELETE** /service/{service_id}/pool/{pool_id}/server/{server_id} | Delete a server from a pool
[**getPoolServer**](ServerApi.md#getPoolServer) | **GET** /service/{service_id}/pool/{pool_id}/server/{server_id} | Get a pool server
[**listPoolServers**](ServerApi.md#listPoolServers) | **GET** /service/{service_id}/pool/{pool_id}/servers | List servers in a pool
[**updatePoolServer**](ServerApi.md#updatePoolServer) | **PUT** /service/{service_id}/pool/{pool_id}/server/{server_id} | Update a server


## `createPoolServer`

```javascript
createPoolServer({ service_id, pool_id, [weight, ][max_conn, ][port, ][address, ][comment, ][disabled, ][override_host] })
```

Creates a single server for a particular service and pool.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  pool_id: "pool_id_example", // required
  weight: 100,
  max_conn: 0,
  port: 80,
  address: "address_example",
  comment: "comment_example",
  disabled: false,
  override_host: "'null'",
};

apiInstance.createPoolServer(options)
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
**pool_id** | **String** | Alphanumeric string identifying a Pool. |
**weight** | **Number** | Weight (`1-100`) used to load balance this server against others. | [optional] [defaults to 100]
**max_conn** | **Number** | Maximum number of connections. If the value is `0`, it inherits the value from pool&#39;s `max_conn_default`. | [optional] [defaults to 0]
**port** | **Number** | Port number. Setting port `443` does not force TLS. Set `use_tls` in pool to force TLS. | [optional] [defaults to 80]
**address** | **String** | A hostname, IPv4, or IPv6 address for the server. Required. | [optional]
**comment** | **String** | A freeform descriptive note. | [optional]
**disabled** | **Boolean** | Allows servers to be enabled and disabled in a pool. | [optional] [defaults to false]
**override_host** | **String** | The hostname to override the Host header. Defaults to `null` meaning no override of the Host header if not set. This setting can also be added to a Pool definition. However, the server setting will override the Pool setting. | [optional] [defaults to 'null']

### Return type

[**ServerResponse**](ServerResponse.md)


## `deletePoolServer`

```javascript
deletePoolServer({ service_id, pool_id, server_id })
```

Deletes a single server for a particular service and pool.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  pool_id: "pool_id_example", // required
  server_id: "server_id_example", // required
};

apiInstance.deletePoolServer(options)
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
**pool_id** | **String** | Alphanumeric string identifying a Pool. |
**server_id** | **String** | Alphanumeric string identifying a Server. |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `getPoolServer`

```javascript
getPoolServer({ service_id, pool_id, server_id })
```

Gets a single server for a particular service and pool.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  pool_id: "pool_id_example", // required
  server_id: "server_id_example", // required
};

apiInstance.getPoolServer(options)
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
**pool_id** | **String** | Alphanumeric string identifying a Pool. |
**server_id** | **String** | Alphanumeric string identifying a Server. |

### Return type

[**ServerResponse**](ServerResponse.md)


## `listPoolServers`

```javascript
listPoolServers({ service_id, pool_id })
```

Lists all servers for a particular service and pool.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  pool_id: "pool_id_example", // required
};

apiInstance.listPoolServers(options)
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
**pool_id** | **String** | Alphanumeric string identifying a Pool. |

### Return type

[**[ServerResponse]**](ServerResponse.md)


## `updatePoolServer`

```javascript
updatePoolServer({ service_id, pool_id, server_id, [weight, ][max_conn, ][port, ][address, ][comment, ][disabled, ][override_host] })
```

Updates a single server for a particular service and pool.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  pool_id: "pool_id_example", // required
  server_id: "server_id_example", // required
  weight: 100,
  max_conn: 0,
  port: 80,
  address: "address_example",
  comment: "comment_example",
  disabled: false,
  override_host: "'null'",
};

apiInstance.updatePoolServer(options)
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
**pool_id** | **String** | Alphanumeric string identifying a Pool. |
**server_id** | **String** | Alphanumeric string identifying a Server. |
**weight** | **Number** | Weight (`1-100`) used to load balance this server against others. | [optional] [defaults to 100]
**max_conn** | **Number** | Maximum number of connections. If the value is `0`, it inherits the value from pool&#39;s `max_conn_default`. | [optional] [defaults to 0]
**port** | **Number** | Port number. Setting port `443` does not force TLS. Set `use_tls` in pool to force TLS. | [optional] [defaults to 80]
**address** | **String** | A hostname, IPv4, or IPv6 address for the server. Required. | [optional]
**comment** | **String** | A freeform descriptive note. | [optional]
**disabled** | **Boolean** | Allows servers to be enabled and disabled in a pool. | [optional] [defaults to false]
**override_host** | **String** | The hostname to override the Host header. Defaults to `null` meaning no override of the Host header if not set. This setting can also be added to a Pool definition. However, the server setting will override the Pool setting. | [optional] [defaults to 'null']

### Return type

[**ServerResponse**](ServerResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
