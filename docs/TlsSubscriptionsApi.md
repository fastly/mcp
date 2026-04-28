# Fastly.TlsSubscriptionsApi

```javascript
const apiInstance = new Fastly.TlsSubscriptionsApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createGlobalsignEmailChallenge**](TlsSubscriptionsApi.md#createGlobalsignEmailChallenge) | **POST** /tls/subscriptions/{tls_subscription_id}/authorizations/{tls_authorization_id}/globalsign_email_challenges | Creates a GlobalSign email challenge.
[**createTlsSub**](TlsSubscriptionsApi.md#createTlsSub) | **POST** /tls/subscriptions | Create a TLS subscription
[**deleteGlobalsignEmailChallenge**](TlsSubscriptionsApi.md#deleteGlobalsignEmailChallenge) | **DELETE** /tls/subscriptions/{tls_subscription_id}/authorizations/{tls_authorization_id}/globalsign_email_challenges/{globalsign_email_challenge_id} | Delete a GlobalSign email challenge
[**deleteTlsSub**](TlsSubscriptionsApi.md#deleteTlsSub) | **DELETE** /tls/subscriptions/{tls_subscription_id} | Delete a TLS subscription
[**getTlsSub**](TlsSubscriptionsApi.md#getTlsSub) | **GET** /tls/subscriptions/{tls_subscription_id} | Get a TLS subscription
[**listTlsSubs**](TlsSubscriptionsApi.md#listTlsSubs) | **GET** /tls/subscriptions | List TLS subscriptions
[**patchTlsSub**](TlsSubscriptionsApi.md#patchTlsSub) | **PATCH** /tls/subscriptions/{tls_subscription_id} | Update a TLS subscription


## `createGlobalsignEmailChallenge`

```javascript
createGlobalsignEmailChallenge({ tls_subscription_id, tls_authorization_id, [request_body] })
```

Creates an email challenge for a domain on a GlobalSign subscription. An email challenge will generate an email that can be used to validate domain ownership. If this challenge is created, then the domain can only be validated using email for the given subscription. 

### Example

```javascript
const options = {
  tls_subscription_id: "tls_subscription_id_example", // required
  tls_authorization_id: "tls_authorization_id_example", // required
  request_body: {"data":{"type":"globalsign_email_challenge","attributes":{"preferred_email":"admin@example.com"}}},
};

apiInstance.createGlobalsignEmailChallenge(options)
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
**tls_subscription_id** | **String** | Alphanumeric string identifying a TLS subscription. |
**tls_authorization_id** | **String** | Alphanumeric string identifying a TLS subscription. |
**request_body** | [**{String: Object}**](Object.md) |  | [optional]

### Return type

**Object**


## `createTlsSub`

```javascript
createTlsSub({ , [tls_subscription] })
```

Create a new TLS subscription. This response includes a list of possible challenges to verify domain ownership.

### Example

```javascript
const options = {
  tls_subscription: {"data":{"type":"tls_subscription","attributes":{"certificate_authority":"certainly"},"relationships":{"tls_domains":{"data":[{"type":"tls_domain","id":"DOMAIN_NAME"}]},"tls_configuration":{"data":{"type":"tls_configuration","id":"t7CguUGZzb2W9Euo5FoKa"}}}}},
};

apiInstance.createTlsSub(options)
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
**tls_subscription** | [**TlsSubscription**](TlsSubscription.md) |  | [optional]

### Return type

[**TlsSubscriptionResponse**](TlsSubscriptionResponse.md)


## `deleteGlobalsignEmailChallenge`

```javascript
deleteGlobalsignEmailChallenge({ tls_subscription_id, tls_authorization_id, globalsign_email_challenge_id })
```

Deletes a GlobalSign email challenge. After a GlobalSign email challenge is deleted, the domain can use HTTP and DNS validation methods again.

### Example

```javascript
const options = {
  tls_subscription_id: "tls_subscription_id_example", // required
  tls_authorization_id: "tls_authorization_id_example", // required
  globalsign_email_challenge_id: gU3guUGZzb2W9Euo4Mo0r, // required
};

apiInstance.deleteGlobalsignEmailChallenge(options)
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
**tls_subscription_id** | **String** | Alphanumeric string identifying a TLS subscription. |
**tls_authorization_id** | **String** | Alphanumeric string identifying a TLS subscription. |
**globalsign_email_challenge_id** | **String** | Alphanumeric string identifying a GlobalSign email challenge. |

### Return type

null (empty response body)


## `deleteTlsSub`

```javascript
deleteTlsSub({ tls_subscription_id })
```

Destroy a TLS subscription. A subscription cannot be destroyed if there are domains in the TLS enabled state.

### Example

```javascript
const options = {
  tls_subscription_id: "tls_subscription_id_example", // required
};

apiInstance.deleteTlsSub(options)
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
**tls_subscription_id** | **String** | Alphanumeric string identifying a TLS subscription. |

### Return type

null (empty response body)


## `getTlsSub`

```javascript
getTlsSub({ tls_subscription_id, [include] })
```

Show a TLS subscription.

### Example

```javascript
const options = {
  tls_subscription_id: "tls_subscription_id_example", // required
  include: tls_authorizations,
};

apiInstance.getTlsSub(options)
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
**tls_subscription_id** | **String** | Alphanumeric string identifying a TLS subscription. |
**include** | **String** | Include related objects. Optional, comma-separated values. Permitted values: `tls_authorizations`, `tls_authorizations.globalsign_email_challenge`, `tls_authorizations.self_managed_http_challenge`, and `tls_certificates`.  | [optional]

### Return type

[**TlsSubscriptionResponse**](TlsSubscriptionResponse.md)


## `listTlsSubs`

```javascript
listTlsSubs({ , [filter_state, ][filter_tls_domains_id, ][filter_has_active_order, ][filter_certificate_authority, ][sort, ][include, ][page_number, ][page_size] })
```

List all TLS subscriptions.

### Example

```javascript
const options = {
  filter_state: "filter_state_example",
  filter_tls_domains_id: "filter_tls_domains_id_example",
  filter_has_active_order: true,
  filter_certificate_authority: "filter_certificate_authority_example",
  sort: "created_at",
  include: tls_authorizations,
  page_number: 1,
  page_size: 20,
};

apiInstance.listTlsSubs(options)
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
**filter_state** | **String** | Limit the returned subscriptions by state. Valid values are `pending`, `processing`, `issued`, `renewing`, and `failed`. Accepts parameters: `not` (e.g., `filter[state][not]&#x3D;renewing`).  | [optional]
**filter_tls_domains_id** | **String** | Limit the returned subscriptions to those that include the specific domain. | [optional]
**filter_has_active_order** | **Boolean** | Limit the returned subscriptions to those that have currently active orders. Permitted values: `true`.  | [optional]
**filter_certificate_authority** | **String** | Limit the returned subscriptions to a specific certification authority. Values may include `certainly`, `lets-encrypt`, or `globalsign`.  | [optional]
**sort** | **String** | The order in which to list the results. | [optional] [one of: "created_at", "-created_at", "tls_certificates.not_after", "-tls_certificates.not_after"]
**include** | **String** | Include related objects. Optional, comma-separated values. Permitted values: `tls_authorizations`, `tls_authorizations.globalsign_email_challenge`, `tls_authorizations.self_managed_http_challenge`, and `tls_certificates`.  | [optional]
**page_number** | **Number** | Current page. | [optional]
**page_size** | **Number** | Number of records per page. | [optional] [defaults to 20]

### Return type

[**TlsSubscriptionsResponse**](TlsSubscriptionsResponse.md)


## `patchTlsSub`

```javascript
patchTlsSub({ tls_subscription_id, [force, ][tls_subscription] })
```

Change the TLS domains or common name associated with this subscription, update the TLS configuration for this set of domains, or retry a subscription with state `failed` by setting the state to `retry`.

### Example

```javascript
const options = {
  tls_subscription_id: "tls_subscription_id_example", // required
  force: true,
  tls_subscription: {"data":{"type":"tls_subscription","attributes":{"state":"retry"},"relationships":{"common_name":{"data":{"type":"tls_domain","id":"DOMAIN_NAME"}},"tls_domains":{"data":[{"type":"tls_domain","id":"DOMAIN_NAME"}]},"tls_configuration":{"data":{"type":"tls_configuration","id":"t7CguUGZzb2W9Euo5FoKa"}}}}},
};

apiInstance.patchTlsSub(options)
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
**tls_subscription_id** | **String** | Alphanumeric string identifying a TLS subscription. |
**force** | **Boolean** | A flag that allows you to edit and delete a subscription with active domains. Valid to use on PATCH and DELETE actions. As a warning, removing an active domain from a subscription or forcing the deletion of a subscription may result in breaking TLS termination to that domain.  | [optional]
**tls_subscription** | [**TlsSubscription**](TlsSubscription.md) |  | [optional]

### Return type

[**TlsSubscriptionResponse**](TlsSubscriptionResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
