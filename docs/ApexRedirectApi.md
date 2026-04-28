# Fastly.ApexRedirectApi

```javascript
const apiInstance = new Fastly.ApexRedirectApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createApexRedirect**](ApexRedirectApi.md#createApexRedirect) | **POST** /service/{service_id}/version/{version_id}/apex-redirects | Create an apex redirect
[**deleteApexRedirect**](ApexRedirectApi.md#deleteApexRedirect) | **DELETE** /apex-redirects/{apex_redirect_id} | Delete an apex redirect
[**getApexRedirect**](ApexRedirectApi.md#getApexRedirect) | **GET** /apex-redirects/{apex_redirect_id} | Get an apex redirect
[**listApexRedirects**](ApexRedirectApi.md#listApexRedirects) | **GET** /service/{service_id}/version/{version_id}/apex-redirects | List apex redirects
[**updateApexRedirect**](ApexRedirectApi.md#updateApexRedirect) | **PUT** /apex-redirects/{apex_redirect_id} | Update an apex redirect


## `createApexRedirect`

```javascript
createApexRedirect({ service_id, version_id, [service_id2, ][version, ][created_at, ][deleted_at, ][updated_at, ][status_code, ][domains, ][feature_revision] })
```

Create an apex redirect for a particular service and version.

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
  status_code: 301,
  domains: ["null"],
  feature_revision: 56,
};

apiInstance.createApexRedirect(options)
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
**status_code** | **Number** | HTTP status code used to redirect the client. | [optional] [one of: 301, 302, 307, 308]
**domains** | [**[String]**](String.md) | Array of apex domains that should redirect to their WWW subdomain. | [optional]
**feature_revision** | **Number** | Revision number of the apex redirect feature implementation. Defaults to the most recent revision. | [optional]

### Return type

[**ApexRedirect**](ApexRedirect.md)


## `deleteApexRedirect`

```javascript
deleteApexRedirect({ apex_redirect_id })
```

Delete an apex redirect by its ID.

### Example

```javascript
const options = {
  apex_redirect_id: 6QI9o6ZZrSP3y9gI0OhMwZ, // required
};

apiInstance.deleteApexRedirect(options)
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
**apex_redirect_id** | **String** |  |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `getApexRedirect`

```javascript
getApexRedirect({ apex_redirect_id })
```

Get an apex redirect by its ID.

### Example

```javascript
const options = {
  apex_redirect_id: 6QI9o6ZZrSP3y9gI0OhMwZ, // required
};

apiInstance.getApexRedirect(options)
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
**apex_redirect_id** | **String** |  |

### Return type

[**ApexRedirect**](ApexRedirect.md)


## `listApexRedirects`

```javascript
listApexRedirects({ service_id, version_id })
```

List all apex redirects for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.listApexRedirects(options)
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

[**[ApexRedirect]**](ApexRedirect.md)


## `updateApexRedirect`

```javascript
updateApexRedirect({ apex_redirect_id, [service_id, ][version, ][created_at, ][deleted_at, ][updated_at, ][status_code, ][domains, ][feature_revision] })
```

Update an apex redirect by its ID.

### Example

```javascript
const options = {
  apex_redirect_id: 6QI9o6ZZrSP3y9gI0OhMwZ, // required
  service_id: "service_id_example",
  version: 56,
  created_at: new Date("2013-10-20T19:20:30+01:00"),
  deleted_at: new Date("2013-10-20T19:20:30+01:00"),
  updated_at: new Date("2013-10-20T19:20:30+01:00"),
  status_code: 301,
  domains: ["null"],
  feature_revision: 56,
};

apiInstance.updateApexRedirect(options)
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
**apex_redirect_id** | **String** |  |
**service_id** | **String** |  | [optional]
**version** | **Number** |  | [optional]
**created_at** | **Date** | Date and time in ISO 8601 format. | [optional]
**deleted_at** | **Date** | Date and time in ISO 8601 format. | [optional]
**updated_at** | **Date** | Date and time in ISO 8601 format. | [optional]
**status_code** | **Number** | HTTP status code used to redirect the client. | [optional] [one of: 301, 302, 307, 308]
**domains** | [**[String]**](String.md) | Array of apex domains that should redirect to their WWW subdomain. | [optional]
**feature_revision** | **Number** | Revision number of the apex redirect feature implementation. Defaults to the most recent revision. | [optional]

### Return type

[**ApexRedirect**](ApexRedirect.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
