# Fastly.ClientSideProtectionApi

```javascript
const apiInstance = new Fastly.ClientSideProtectionApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**cspCreatePage**](ClientSideProtectionApi.md#cspCreatePage) | **POST** /client-side-protection/v1/pages | Create page
[**cspCreatePolicy**](ClientSideProtectionApi.md#cspCreatePolicy) | **POST** /client-side-protection/v1/pages/{page_id}/policies | Create policy
[**cspCreateWebsite**](ClientSideProtectionApi.md#cspCreateWebsite) | **POST** /client-side-protection/v1/websites | Create website
[**cspDeletePage**](ClientSideProtectionApi.md#cspDeletePage) | **DELETE** /client-side-protection/v1/pages/{page_id} | Delete page
[**cspDeleteWebsite**](ClientSideProtectionApi.md#cspDeleteWebsite) | **DELETE** /client-side-protection/v1/websites/{website_id} | Delete website
[**cspGetPage**](ClientSideProtectionApi.md#cspGetPage) | **GET** /client-side-protection/v1/pages/{page_id} | Get page
[**cspGetPolicy**](ClientSideProtectionApi.md#cspGetPolicy) | **GET** /client-side-protection/v1/pages/{page_id}/policies/{policy_id} | Get policy
[**cspGetScript**](ClientSideProtectionApi.md#cspGetScript) | **GET** /client-side-protection/v1/pages/{page_id}/scripts/{script_id} | Get script
[**cspGetWebsite**](ClientSideProtectionApi.md#cspGetWebsite) | **GET** /client-side-protection/v1/websites/{website_id} | Get website
[**cspListHeaderEvents**](ClientSideProtectionApi.md#cspListHeaderEvents) | **GET** /client-side-protection/v1/pages/{page_id}/events | List header events
[**cspListHeaders**](ClientSideProtectionApi.md#cspListHeaders) | **GET** /client-side-protection/v1/pages/{page_id}/headers | List security headers
[**cspListPages**](ClientSideProtectionApi.md#cspListPages) | **GET** /client-side-protection/v1/pages | List pages
[**cspListPolicies**](ClientSideProtectionApi.md#cspListPolicies) | **GET** /client-side-protection/v1/pages/{page_id}/policies | List policies
[**cspListPolicyReports**](ClientSideProtectionApi.md#cspListPolicyReports) | **GET** /client-side-protection/v1/pages/{page_id}/policies/{policy_id}/reports | List policy reports
[**cspListScripts**](ClientSideProtectionApi.md#cspListScripts) | **GET** /client-side-protection/v1/pages/{page_id}/scripts | List scripts
[**cspListWebsites**](ClientSideProtectionApi.md#cspListWebsites) | **GET** /client-side-protection/v1/websites | List websites
[**cspUpdatePage**](ClientSideProtectionApi.md#cspUpdatePage) | **PATCH** /client-side-protection/v1/pages/{page_id} | Update page
[**cspUpdatePolicy**](ClientSideProtectionApi.md#cspUpdatePolicy) | **PATCH** /client-side-protection/v1/pages/{page_id}/policies/{policy_id} | Update policy
[**cspUpdateScript**](ClientSideProtectionApi.md#cspUpdateScript) | **PATCH** /client-side-protection/v1/pages/{page_id}/scripts/{script_id} | Update script
[**cspUpdateWebsite**](ClientSideProtectionApi.md#cspUpdateWebsite) | **PATCH** /client-side-protection/v1/websites/{website_id} | Update website


## `cspCreatePage`

```javascript
cspCreatePage({ , [page_create] })
```

Create a new page for monitoring.

### Example

```javascript
const options = {
  page_create: new Fastly.PageCreate(),
};

apiInstance.cspCreatePage(options)
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
**page_create** | [**PageCreate**](PageCreate.md) |  | [optional]

### Return type

[**Page**](Page.md)


## `cspCreatePolicy`

```javascript
cspCreatePolicy({ page_id, [policy_create] })
```

Create a new Content Security Policy for a page.

### Example

```javascript
const options = {
  page_id: 3Yl0KhQDlg2OaWtOnLsFDq, // required
  policy_create: new Fastly.PolicyCreate(),
};

apiInstance.cspCreatePolicy(options)
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
**page_id** | **String** | Page identifier |
**policy_create** | [**PolicyCreate**](PolicyCreate.md) |  | [optional]

### Return type

[**Policy**](Policy.md)


## `cspCreateWebsite`

```javascript
cspCreateWebsite({ , [website_create] })
```

Create a new website for Client-Side Protection monitoring.

### Example

```javascript
const options = {
  website_create: new Fastly.WebsiteCreate(),
};

apiInstance.cspCreateWebsite(options)
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
**website_create** | [**WebsiteCreate**](WebsiteCreate.md) |  | [optional]

### Return type

[**Website**](Website.md)


## `cspDeletePage`

```javascript
cspDeletePage({ page_id })
```

Delete a page and all associated scripts and policies.

### Example

```javascript
const options = {
  page_id: 3Yl0KhQDlg2OaWtOnLsFDq, // required
};

apiInstance.cspDeletePage(options)
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
**page_id** | **String** | Page identifier |

### Return type

null (empty response body)


## `cspDeleteWebsite`

```javascript
cspDeleteWebsite({ website_id })
```

Delete a website and all associated pages, scripts, and policies.

### Example

```javascript
const options = {
  website_id: 2Xk9JgPCkf1NzVsNmKrECp, // required
};

apiInstance.cspDeleteWebsite(options)
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
**website_id** | **String** | Website identifier |

### Return type

null (empty response body)


## `cspGetPage`

```javascript
cspGetPage({ page_id })
```

Get details for a specific page.

### Example

```javascript
const options = {
  page_id: 3Yl0KhQDlg2OaWtOnLsFDq, // required
};

apiInstance.cspGetPage(options)
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
**page_id** | **String** | Page identifier |

### Return type

[**Page**](Page.md)


## `cspGetPolicy`

```javascript
cspGetPolicy({ page_id, policy_id })
```

Get details for a specific policy.

### Example

```javascript
const options = {
  page_id: 3Yl0KhQDlg2OaWtOnLsFDq, // required
  policy_id: 7Cp4OlUHqj6SfAwSrQwJHu, // required
};

apiInstance.cspGetPolicy(options)
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
**page_id** | **String** | Page identifier |
**policy_id** | **String** | Policy identifier |

### Return type

[**Policy**](Policy.md)


## `cspGetScript`

```javascript
cspGetScript({ page_id, script_id })
```

Get details for a specific script.

### Example

```javascript
const options = {
  page_id: 3Yl0KhQDlg2OaWtOnLsFDq, // required
  script_id: 5An2MjSFoh4QcYvQpNuHFs, // required
};

apiInstance.cspGetScript(options)
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
**page_id** | **String** | Page identifier |
**script_id** | **String** | Script identifier |

### Return type

[**Script**](Script.md)


## `cspGetWebsite`

```javascript
cspGetWebsite({ website_id })
```

Get details for a specific website.

### Example

```javascript
const options = {
  website_id: 2Xk9JgPCkf1NzVsNmKrECp, // required
};

apiInstance.cspGetWebsite(options)
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
**website_id** | **String** | Website identifier |

### Return type

[**Website**](Website.md)


## `cspListHeaderEvents`

```javascript
cspListHeaderEvents({ page_id, [limit, ][page] })
```

List security header change events for a page.

### Example

```javascript
const options = {
  page_id: 3Yl0KhQDlg2OaWtOnLsFDq, // required
  limit: 100,
  page: 1,
};

apiInstance.cspListHeaderEvents(options)
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
**page_id** | **String** | Page identifier |
**limit** | **Number** | Limit how many results are returned. | [optional] [defaults to 100]
**page** | **Number** | Page number of the collection to request. | [optional] [defaults to 0]

### Return type

[**InlineResponse20011**](InlineResponse20011.md)


## `cspListHeaders`

```javascript
cspListHeaders({ page_id, [limit, ][page] })
```

List security headers detected on a page.

### Example

```javascript
const options = {
  page_id: 3Yl0KhQDlg2OaWtOnLsFDq, // required
  limit: 100,
  page: 1,
};

apiInstance.cspListHeaders(options)
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
**page_id** | **String** | Page identifier |
**limit** | **Number** | Limit how many results are returned. | [optional] [defaults to 100]
**page** | **Number** | Page number of the collection to request. | [optional] [defaults to 0]

### Return type

[**InlineResponse20010**](InlineResponse20010.md)


## `cspListPages`

```javascript
cspListPages({ , [website_id, ][limit, ][page] })
```

List all pages. Optionally filter by website.

### Example

```javascript
const options = {
  website_id: "website_id_example",
  limit: 100,
  page: 1,
};

apiInstance.cspListPages(options)
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
**website_id** | **String** | Filter pages by website ID | [optional]
**limit** | **Number** | Limit how many results are returned. | [optional] [defaults to 100]
**page** | **Number** | Page number of the collection to request. | [optional] [defaults to 0]

### Return type

[**InlineResponse2006**](InlineResponse2006.md)


## `cspListPolicies`

```javascript
cspListPolicies({ page_id, [limit, ][page] })
```

List all Content Security Policies for a page.

### Example

```javascript
const options = {
  page_id: 3Yl0KhQDlg2OaWtOnLsFDq, // required
  limit: 100,
  page: 1,
};

apiInstance.cspListPolicies(options)
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
**page_id** | **String** | Page identifier |
**limit** | **Number** | Limit how many results are returned. | [optional] [defaults to 100]
**page** | **Number** | Page number of the collection to request. | [optional] [defaults to 0]

### Return type

[**InlineResponse2008**](InlineResponse2008.md)


## `cspListPolicyReports`

```javascript
cspListPolicyReports({ page_id, policy_id, [limit, ][page] })
```

List CSP violation reports for a policy.

### Example

```javascript
const options = {
  page_id: 3Yl0KhQDlg2OaWtOnLsFDq, // required
  policy_id: 7Cp4OlUHqj6SfAwSrQwJHu, // required
  limit: 100,
  page: 1,
};

apiInstance.cspListPolicyReports(options)
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
**page_id** | **String** | Page identifier |
**policy_id** | **String** | Policy identifier |
**limit** | **Number** | Limit how many results are returned. | [optional] [defaults to 100]
**page** | **Number** | Page number of the collection to request. | [optional] [defaults to 0]

### Return type

[**InlineResponse2009**](InlineResponse2009.md)


## `cspListScripts`

```javascript
cspListScripts({ page_id, [limit, ][page] })
```

List all scripts detected on a page.

### Example

```javascript
const options = {
  page_id: 3Yl0KhQDlg2OaWtOnLsFDq, // required
  limit: 100,
  page: 1,
};

apiInstance.cspListScripts(options)
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
**page_id** | **String** | Page identifier |
**limit** | **Number** | Limit how many results are returned. | [optional] [defaults to 100]
**page** | **Number** | Page number of the collection to request. | [optional] [defaults to 0]

### Return type

[**InlineResponse2007**](InlineResponse2007.md)


## `cspListWebsites`

```javascript
cspListWebsites({ , [limit, ][page] })
```

List all websites configured for Client-Side Protection.

### Example

```javascript
const options = {
  limit: 100,
  page: 1,
};

apiInstance.cspListWebsites(options)
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
**limit** | **Number** | Limit how many results are returned. | [optional] [defaults to 100]
**page** | **Number** | Page number of the collection to request. | [optional] [defaults to 0]

### Return type

[**InlineResponse2005**](InlineResponse2005.md)


## `cspUpdatePage`

```javascript
cspUpdatePage({ page_id, [page_update] })
```

Update a page's configuration.

### Example

```javascript
const options = {
  page_id: 3Yl0KhQDlg2OaWtOnLsFDq, // required
  page_update: new Fastly.PageUpdate(),
};

apiInstance.cspUpdatePage(options)
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
**page_id** | **String** | Page identifier |
**page_update** | [**PageUpdate**](PageUpdate.md) |  | [optional]

### Return type

[**Page**](Page.md)


## `cspUpdatePolicy`

```javascript
cspUpdatePolicy({ page_id, policy_id, [policy_update] })
```

Update a policy's configuration.

### Example

```javascript
const options = {
  page_id: 3Yl0KhQDlg2OaWtOnLsFDq, // required
  policy_id: 7Cp4OlUHqj6SfAwSrQwJHu, // required
  policy_update: new Fastly.PolicyUpdate(),
};

apiInstance.cspUpdatePolicy(options)
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
**page_id** | **String** | Page identifier |
**policy_id** | **String** | Policy identifier |
**policy_update** | [**PolicyUpdate**](PolicyUpdate.md) |  | [optional]

### Return type

[**Policy**](Policy.md)


## `cspUpdateScript`

```javascript
cspUpdateScript({ page_id, script_id, [script_update] })
```

Update a script's authorization status or justification.

### Example

```javascript
const options = {
  page_id: 3Yl0KhQDlg2OaWtOnLsFDq, // required
  script_id: 5An2MjSFoh4QcYvQpNuHFs, // required
  script_update: new Fastly.ScriptUpdate(),
};

apiInstance.cspUpdateScript(options)
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
**page_id** | **String** | Page identifier |
**script_id** | **String** | Script identifier |
**script_update** | [**ScriptUpdate**](ScriptUpdate.md) |  | [optional]

### Return type

[**Script**](Script.md)


## `cspUpdateWebsite`

```javascript
cspUpdateWebsite({ website_id, [website_update] })
```

Update a website's configuration.

### Example

```javascript
const options = {
  website_id: 2Xk9JgPCkf1NzVsNmKrECp, // required
  website_update: new Fastly.WebsiteUpdate(),
};

apiInstance.cspUpdateWebsite(options)
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
**website_id** | **String** | Website identifier |
**website_update** | [**WebsiteUpdate**](WebsiteUpdate.md) |  | [optional]

### Return type

[**Website**](Website.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
