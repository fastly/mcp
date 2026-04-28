# Fastly.DictionaryItemApi

```javascript
const apiInstance = new Fastly.DictionaryItemApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**bulkUpdateDictionaryItem**](DictionaryItemApi.md#bulkUpdateDictionaryItem) | **PATCH** /service/{service_id}/dictionary/{dictionary_id}/items | Update multiple entries in a dictionary
[**createDictionaryItem**](DictionaryItemApi.md#createDictionaryItem) | **POST** /service/{service_id}/dictionary/{dictionary_id}/item | Create an entry in a dictionary
[**deleteDictionaryItem**](DictionaryItemApi.md#deleteDictionaryItem) | **DELETE** /service/{service_id}/dictionary/{dictionary_id}/item/{dictionary_item_key} | Delete an item from a dictionary
[**getDictionaryItem**](DictionaryItemApi.md#getDictionaryItem) | **GET** /service/{service_id}/dictionary/{dictionary_id}/item/{dictionary_item_key} | Get an item from a dictionary
[**listDictionaryItems**](DictionaryItemApi.md#listDictionaryItems) | **GET** /service/{service_id}/dictionary/{dictionary_id}/items | List items in a dictionary
[**updateDictionaryItem**](DictionaryItemApi.md#updateDictionaryItem) | **PATCH** /service/{service_id}/dictionary/{dictionary_id}/item/{dictionary_item_key} | Update an entry in a dictionary
[**upsertDictionaryItem**](DictionaryItemApi.md#upsertDictionaryItem) | **PUT** /service/{service_id}/dictionary/{dictionary_id}/item/{dictionary_item_key} | Insert or update an entry in a dictionary


## `bulkUpdateDictionaryItem`

```javascript
bulkUpdateDictionaryItem({ service_id, dictionary_id, [bulk_update_dictionary_list_request] })
```

Update multiple items in the same dictionary. For faster updates to your service, group your changes into large batches. The maximum batch size is 1000 items. [Contact support](https://support.fastly.com/) to discuss raising this limit.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  dictionary_id: "dictionary_id_example", // required
  bulk_update_dictionary_list_request: {"items":[{"op":"create","item_key":"test-key","item_value":"new-value"},{"op":"update","item_key":"test-key-2","item_value":"new-value-2"},{"op":"upsert","item_key":"test-key-3","item_value":"new-value-3"},{"op":"delete","item_key":"test-key-4"}]},
};

apiInstance.bulkUpdateDictionaryItem(options)
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
**dictionary_id** | **String** | Alphanumeric string identifying a Dictionary. |
**bulk_update_dictionary_list_request** | [**BulkUpdateDictionaryListRequest**](BulkUpdateDictionaryListRequest.md) |  | [optional]

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `createDictionaryItem`

```javascript
createDictionaryItem({ service_id, dictionary_id, [item_key, ][item_value] })
```

Create DictionaryItem given service, dictionary ID, item key, and item value.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  dictionary_id: "dictionary_id_example", // required
  item_key: "item_key_example",
  item_value: "item_value_example",
};

apiInstance.createDictionaryItem(options)
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
**dictionary_id** | **String** | Alphanumeric string identifying a Dictionary. |
**item_key** | **String** | Item key, maximum 256 characters. | [optional]
**item_value** | **String** | Item value, maximum 8000 characters. | [optional]

### Return type

[**DictionaryItemResponse**](DictionaryItemResponse.md)


## `deleteDictionaryItem`

```javascript
deleteDictionaryItem({ service_id, dictionary_id, dictionary_item_key })
```

Delete DictionaryItem given service, dictionary ID, and item key.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  dictionary_id: "dictionary_id_example", // required
  dictionary_item_key: "dictionary_item_key_example", // required
};

apiInstance.deleteDictionaryItem(options)
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
**dictionary_id** | **String** | Alphanumeric string identifying a Dictionary. |
**dictionary_item_key** | **String** | Item key, maximum 256 characters. |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `getDictionaryItem`

```javascript
getDictionaryItem({ service_id, dictionary_id, dictionary_item_key })
```

Retrieve a single DictionaryItem given service, dictionary ID and item key.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  dictionary_id: "dictionary_id_example", // required
  dictionary_item_key: "dictionary_item_key_example", // required
};

apiInstance.getDictionaryItem(options)
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
**dictionary_id** | **String** | Alphanumeric string identifying a Dictionary. |
**dictionary_item_key** | **String** | Item key, maximum 256 characters. |

### Return type

[**DictionaryItemResponse**](DictionaryItemResponse.md)


## `listDictionaryItems`

```javascript
listDictionaryItems({ service_id, dictionary_id, [page, ][per_page, ][sort, ][direction] })
```

List of DictionaryItems given service and dictionary ID.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  dictionary_id: "dictionary_id_example", // required
  page: 1,
  per_page: 20,
  sort: created,
  direction: "ascend",
};

apiInstance.listDictionaryItems(options)
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
**dictionary_id** | **String** | Alphanumeric string identifying a Dictionary. |
**page** | **Number** | Current page. | [optional]
**per_page** | **Number** | Number of records per page. | [optional] [defaults to 100]
**sort** | **String** | Field on which to sort. | [optional] [defaults to 'created']
**direction** | **String** | Direction in which to sort results. | [optional] [one of: "ascend", "descend"]

### Return type

[**[DictionaryItemResponse]**](DictionaryItemResponse.md)


## `updateDictionaryItem`

```javascript
updateDictionaryItem({ service_id, dictionary_id, dictionary_item_key, [item_key, ][item_value] })
```

Update DictionaryItem given service, dictionary ID, item key, and item value.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  dictionary_id: "dictionary_id_example", // required
  dictionary_item_key: "dictionary_item_key_example", // required
  item_key: "item_key_example",
  item_value: "item_value_example",
};

apiInstance.updateDictionaryItem(options)
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
**dictionary_id** | **String** | Alphanumeric string identifying a Dictionary. |
**dictionary_item_key** | **String** | Item key, maximum 256 characters. |
**item_key** | **String** | Item key, maximum 256 characters. | [optional]
**item_value** | **String** | Item value, maximum 8000 characters. | [optional]

### Return type

[**DictionaryItemResponse**](DictionaryItemResponse.md)


## `upsertDictionaryItem`

```javascript
upsertDictionaryItem({ service_id, dictionary_id, dictionary_item_key, [item_key, ][item_value] })
```

Upsert DictionaryItem given service, dictionary ID, item key, and item value.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  dictionary_id: "dictionary_id_example", // required
  dictionary_item_key: "dictionary_item_key_example", // required
  item_key: "item_key_example",
  item_value: "item_value_example",
};

apiInstance.upsertDictionaryItem(options)
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
**dictionary_id** | **String** | Alphanumeric string identifying a Dictionary. |
**dictionary_item_key** | **String** | Item key, maximum 256 characters. |
**item_key** | **String** | Item key, maximum 256 characters. | [optional]
**item_value** | **String** | Item value, maximum 8000 characters. | [optional]

### Return type

[**DictionaryItemResponse**](DictionaryItemResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
