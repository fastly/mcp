# Fastly.Http3Api

```javascript
const apiInstance = new Fastly.Http3Api();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createHttp3**](Http3Api.md#createHttp3) | **POST** /service/{service_id}/version/{version_id}/http3 | Enable support for HTTP/3
[**deleteHttp3**](Http3Api.md#deleteHttp3) | **DELETE** /service/{service_id}/version/{version_id}/http3 | Disable support for HTTP/3
[**getHttp3**](Http3Api.md#getHttp3) | **GET** /service/{service_id}/version/{version_id}/http3 | Get HTTP/3 status


## `createHttp3`

```javascript
createHttp3({ service_id, version_id, [service_id2, ][version, ][created_at, ][deleted_at, ][updated_at, ][feature_revision] })
```

Enable HTTP/3 (QUIC) support for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  service_id2: "service_id_example",
  version: 56,
  created_at: new Date("2013-10-20T19:20:30+01:00"),
  deleted_at: new Date("2013-10-20T19:20:30+01:00"),
  updated_at: new Date("2013-10-20T19:20:30+01:00"),
  feature_revision: 56,
};

apiInstance.createHttp3(options)
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
**service_id2** | **String** |  | [optional]
**version** | **Number** |  | [optional]
**created_at** | **Date** | Date and time in ISO 8601 format. | [optional]
**deleted_at** | **Date** | Date and time in ISO 8601 format. | [optional]
**updated_at** | **Date** | Date and time in ISO 8601 format. | [optional]
**feature_revision** | **Number** | Revision number of the HTTP/3 feature implementation. Defaults to the most recent revision. | [optional]

### Return type

[**Http3**](Http3.md)


## `deleteHttp3`

```javascript
deleteHttp3({ service_id, version_id })
```

Disable HTTP/3 (QUIC) support for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.deleteHttp3(options)
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

[**InlineResponse200**](InlineResponse200.md)


## `getHttp3`

```javascript
getHttp3({ service_id, version_id })
```

Get the status of HTTP/3 (QUIC) support for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.getHttp3(options)
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

[**Http3**](Http3.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
