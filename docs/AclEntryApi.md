# Fastly.AclEntryApi

```javascript
const apiInstance = new Fastly.AclEntryApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**bulkUpdateAclEntries**](AclEntryApi.md#bulkUpdateAclEntries) | **PATCH** /service/{service_id}/acl/{acl_id}/entries | Update multiple ACL entries
[**createAclEntry**](AclEntryApi.md#createAclEntry) | **POST** /service/{service_id}/acl/{acl_id}/entry | Create an ACL entry
[**deleteAclEntry**](AclEntryApi.md#deleteAclEntry) | **DELETE** /service/{service_id}/acl/{acl_id}/entry/{acl_entry_id} | Delete an ACL entry
[**getAclEntry**](AclEntryApi.md#getAclEntry) | **GET** /service/{service_id}/acl/{acl_id}/entry/{acl_entry_id} | Describe an ACL entry
[**listAclEntries**](AclEntryApi.md#listAclEntries) | **GET** /service/{service_id}/acl/{acl_id}/entries | List ACL entries
[**updateAclEntry**](AclEntryApi.md#updateAclEntry) | **PATCH** /service/{service_id}/acl/{acl_id}/entry/{acl_entry_id} | Update an ACL entry


## `bulkUpdateAclEntries`

```javascript
bulkUpdateAclEntries({ service_id, acl_id, [bulk_update_acl_entries_request] })
```

Update multiple ACL entries on the same ACL. For faster updates to your service, group your changes into large batches. The maximum batch size is 1000 entries. [Contact support](https://support.fastly.com/) to discuss raising this limit.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  acl_id: "acl_id_example", // required
  bulk_update_acl_entries_request: {"entries":[{"op":"create","ip":"192.168.0.1","subnet":8},{"op":"update","id":"6yxNzlOpW1V7JfSwvLGtOc","ip":"192.168.0.2","subnet":16},{"op":"delete","id":"6yxNzlOpW1V7JfSwvLGtOc"}]},
};

apiInstance.bulkUpdateAclEntries(options)
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
**acl_id** | **String** | Alphanumeric string identifying a ACL. |
**bulk_update_acl_entries_request** | [**BulkUpdateAclEntriesRequest**](BulkUpdateAclEntriesRequest.md) |  | [optional]

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `createAclEntry`

```javascript
createAclEntry({ service_id, acl_id, [acl_entry] })
```

Add an ACL entry to an ACL.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  acl_id: "acl_id_example", // required
  acl_entry: {"subnet":16,"ip":"192.168.0.1"},
};

apiInstance.createAclEntry(options)
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
**acl_id** | **String** | Alphanumeric string identifying a ACL. |
**acl_entry** | [**AclEntry**](AclEntry.md) |  | [optional]

### Return type

[**AclEntryResponse**](AclEntryResponse.md)


## `deleteAclEntry`

```javascript
deleteAclEntry({ service_id, acl_id, acl_entry_id })
```

Delete an ACL entry from a specified ACL.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  acl_id: "acl_id_example", // required
  acl_entry_id: "acl_entry_id_example", // required
};

apiInstance.deleteAclEntry(options)
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
**acl_id** | **String** | Alphanumeric string identifying a ACL. |
**acl_entry_id** | **String** | Alphanumeric string identifying an ACL Entry. |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `getAclEntry`

```javascript
getAclEntry({ service_id, acl_id, acl_entry_id })
```

Retrieve a single ACL entry.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  acl_id: "acl_id_example", // required
  acl_entry_id: "acl_entry_id_example", // required
};

apiInstance.getAclEntry(options)
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
**acl_id** | **String** | Alphanumeric string identifying a ACL. |
**acl_entry_id** | **String** | Alphanumeric string identifying an ACL Entry. |

### Return type

[**AclEntryResponse**](AclEntryResponse.md)


## `listAclEntries`

```javascript
listAclEntries({ service_id, acl_id, [page, ][per_page, ][sort, ][direction] })
```

List ACL entries for a specified ACL.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  acl_id: "acl_id_example", // required
  page: 1,
  per_page: 20,
  sort: created,
  direction: "ascend",
};

apiInstance.listAclEntries(options)
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
**acl_id** | **String** | Alphanumeric string identifying a ACL. |
**page** | **Number** | Current page. | [optional]
**per_page** | **Number** | Number of records per page. | [optional] [defaults to 20]
**sort** | **String** | Field on which to sort. | [optional] [defaults to 'created']
**direction** | **String** | Direction in which to sort results. | [optional] [one of: "ascend", "descend"]

### Return type

[**[AclEntryResponse]**](AclEntryResponse.md)


## `updateAclEntry`

```javascript
updateAclEntry({ service_id, acl_id, acl_entry_id, [acl_entry] })
```

Update an ACL entry for a specified ACL.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  acl_id: "acl_id_example", // required
  acl_entry_id: "acl_entry_id_example", // required
  acl_entry: {"subnet":8},
};

apiInstance.updateAclEntry(options)
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
**acl_id** | **String** | Alphanumeric string identifying a ACL. |
**acl_entry_id** | **String** | Alphanumeric string identifying an ACL Entry. |
**acl_entry** | [**AclEntry**](AclEntry.md) |  | [optional]

### Return type

[**AclEntryResponse**](AclEntryResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
