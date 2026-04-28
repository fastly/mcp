# Fastly.DmDomainsApi

```javascript
const apiInstance = new Fastly.DmDomainsApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createDmDomain**](DmDomainsApi.md#createDmDomain) | **POST** /domain-management/v1/domains | Create a domain
[**deleteDmDomain**](DmDomainsApi.md#deleteDmDomain) | **DELETE** /domain-management/v1/domains/{domain_id} | Delete a domain
[**getDmDomain**](DmDomainsApi.md#getDmDomain) | **GET** /domain-management/v1/domains/{domain_id} | Get a domain
[**listDmDomains**](DmDomainsApi.md#listDmDomains) | **GET** /domain-management/v1/domains | List domains
[**updateDmDomain**](DmDomainsApi.md#updateDmDomain) | **PATCH** /domain-management/v1/domains/{domain_id} | Update a domain


## `createDmDomain`

```javascript
createDmDomain({ , [request_body_for_create] })
```

Create a domain

### Example

```javascript
const options = {
  request_body_for_create: new Fastly.RequestBodyForCreate(),
};

apiInstance.createDmDomain(options)
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
**request_body_for_create** | [**RequestBodyForCreate**](RequestBodyForCreate.md) |  | [optional]

### Return type

[**SuccessfulResponseAsObject**](SuccessfulResponseAsObject.md)


## `deleteDmDomain`

```javascript
deleteDmDomain({ domain_id })
```

Delete a domain

### Example

```javascript
const options = {
  domain_id: "domain_id_example", // required
};

apiInstance.deleteDmDomain(options)
  .then(() => {
    console.log('API called successfully.');
  })
  .catch((error) => {
    console.error(error);
  });
```

### Options

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**domain_id** | **String** |  |

### Return type

null (empty response body)


## `getDmDomain`

```javascript
getDmDomain({ domain_id })
```

Show a domain

### Example

```javascript
const options = {
  domain_id: "domain_id_example", // required
};

apiInstance.getDmDomain(options)
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
**domain_id** | **String** |  |

### Return type

[**SuccessfulResponseAsObject**](SuccessfulResponseAsObject.md)


## `listDmDomains`

```javascript
listDmDomains({ , [fqdn, ][fqdn_match, ][service_id, ][sort, ][activated, ][verified, ][cursor, ][limit] })
```

List all domains

### Example

```javascript
const options = {
  fqdn: "fqdn_example",
  fqdn_match: "contains",
  service_id: "service_id_example",
  sort: "fqdn",
  activated: true,
  verified: true,
  cursor: "cursor_example",
  limit: 20,
};

apiInstance.listDmDomains(options)
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
**fqdn** | **String** |  | [optional]
**fqdn_match** | **String** | (Optional) Filter fully-qualified domain name (FQDN) specifically by match type. If used, requires filtering by FQDN. | [optional] [one of: "contains", "exact", "starts_with", "ends_with"]
**service_id** | **String** | Filter results based on a service_id. | [optional]
**sort** | **String** | The order in which to list the results. | [optional] [one of: "fqdn", "-fqdn"]
**activated** | **Boolean** |  | [optional]
**verified** | **Boolean** |  | [optional]
**cursor** | **String** | Cursor value from the `next_cursor` field of a previous response, used to retrieve the next page. To request the first page, this should be empty. | [optional]
**limit** | **Number** | Limit how many results are returned. | [optional] [defaults to 20]

### Return type

[**InlineResponse2007**](InlineResponse2007.md)


## `updateDmDomain`

```javascript
updateDmDomain({ domain_id, [request_body_for_update] })
```

Update a domain

### Example

```javascript
const options = {
  domain_id: "domain_id_example", // required
  request_body_for_update: new Fastly.RequestBodyForUpdate(),
};

apiInstance.updateDmDomain(options)
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
**domain_id** | **String** |  |
**request_body_for_update** | [**RequestBodyForUpdate**](RequestBodyForUpdate.md) |  | [optional]

### Return type

[**SuccessfulResponseAsObject**](SuccessfulResponseAsObject.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
