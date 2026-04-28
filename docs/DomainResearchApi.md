# Fastly.DomainResearchApi

```javascript
const apiInstance = new Fastly.DomainResearchApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**domainStatus**](DomainResearchApi.md#domainStatus) | **GET** /domain-management/v1/tools/status | Domain status
[**suggestDomains**](DomainResearchApi.md#suggestDomains) | **GET** /domain-management/v1/tools/suggest | Suggest domains


## `domainStatus`

```javascript
domainStatus({ domain, [scope] })
```

The `Status` method checks the availability status of a single domain name.

### Example

```javascript
const options = {
  domain: acmecoffee.shop, // required
  scope: estimate,
};

apiInstance.domainStatus(options)
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
**domain** | **String** |  |
**scope** | **String** |  | [optional]

### Return type

[**Status**](Status.md)


## `suggestDomains`

```javascript
suggestDomains({ query, [defaults, ][keywords, ][location, ][vendor] })
```

The `Suggest` method performs a real-time query of the search term(s) against the [known zone database](http://zonedb.org), making recommendations, stemming, and applying Unicode folding, IDN normalization, registrar supported-zone restrictions, and other refinements. **Note:** `Suggest` method responses do not include domain availability status. 

### Example

```javascript
const options = {
  query: foo%20bar, // required
  defaults: club,
  keywords: food,kitchen,
  location: de,
  vendor: dnsimple.com,
};

apiInstance.suggestDomains(options)
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
**query** | **String** |  |
**defaults** | **String** |  | [optional]
**keywords** | **String** |  | [optional]
**location** | **String** |  | [optional]
**vendor** | **String** |  | [optional]

### Return type

[**InlineResponse2009**](InlineResponse2009.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
