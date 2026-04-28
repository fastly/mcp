# Fastly.ConditionApi

```javascript
const apiInstance = new Fastly.ConditionApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createCondition**](ConditionApi.md#createCondition) | **POST** /service/{service_id}/version/{version_id}/condition | Create a condition
[**deleteCondition**](ConditionApi.md#deleteCondition) | **DELETE** /service/{service_id}/version/{version_id}/condition/{condition_name} | Delete a condition
[**getCondition**](ConditionApi.md#getCondition) | **GET** /service/{service_id}/version/{version_id}/condition/{condition_name} | Describe a condition
[**listConditions**](ConditionApi.md#listConditions) | **GET** /service/{service_id}/version/{version_id}/condition | List conditions
[**updateCondition**](ConditionApi.md#updateCondition) | **PUT** /service/{service_id}/version/{version_id}/condition/{condition_name} | Update a condition


## `createCondition`

```javascript
createCondition({ service_id, version_id, [comment, ][name, ][priority, ][statement, ][service_id2, ][version, ][type] })
```

Creates a new condition.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  comment: "comment_example",
  name: "name_example",
  priority: "'100'",
  statement: "statement_example",
  service_id2: "service_id_example",
  version: "version_example",
  type: "REQUEST",
};

apiInstance.createCondition(options)
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
**comment** | **String** | A freeform descriptive note. | [optional]
**name** | **String** | Name of the condition. Required. | [optional]
**priority** | **String** | A numeric string. Priority determines execution order. Lower numbers execute first. | [optional] [defaults to '100']
**statement** | **String** | A conditional expression in VCL used to determine if the condition is met. | [optional]
**service_id2** | **String** |  | [optional]
**version** | **String** | A numeric string that represents the service version. | [optional]
**type** | **String** | Type of the condition. Required. | [optional] [one of: "REQUEST", "CACHE", "RESPONSE", "PREFETCH"]

### Return type

[**ConditionResponse**](ConditionResponse.md)


## `deleteCondition`

```javascript
deleteCondition({ service_id, version_id, condition_name })
```

Deletes the specified condition.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  condition_name: "condition_name_example", // required
};

apiInstance.deleteCondition(options)
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
**condition_name** | **String** | Name of the condition. Required. |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `getCondition`

```javascript
getCondition({ service_id, version_id, condition_name })
```

Gets the specified condition.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  condition_name: "condition_name_example", // required
};

apiInstance.getCondition(options)
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
**condition_name** | **String** | Name of the condition. Required. |

### Return type

[**ConditionResponse**](ConditionResponse.md)


## `listConditions`

```javascript
listConditions({ service_id, version_id })
```

Gets all conditions for a particular service and version.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
};

apiInstance.listConditions(options)
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

[**[ConditionResponse]**](ConditionResponse.md)


## `updateCondition`

```javascript
updateCondition({ service_id, version_id, condition_name, [comment, ][name, ][priority, ][statement, ][service_id2, ][version, ][type] })
```

Updates the specified condition.

### Example

```javascript
const options = {
  service_id: "service_id_example", // required
  version_id: 56, // required
  condition_name: "condition_name_example", // required
  comment: "comment_example",
  name: "name_example",
  priority: "'100'",
  statement: "statement_example",
  service_id2: "service_id_example",
  version: "version_example",
  type: "REQUEST",
};

apiInstance.updateCondition(options)
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
**condition_name** | **String** | Name of the condition. Required. |
**comment** | **String** | A freeform descriptive note. | [optional]
**name** | **String** | Name of the condition. Required. | [optional]
**priority** | **String** | A numeric string. Priority determines execution order. Lower numbers execute first. | [optional] [defaults to '100']
**statement** | **String** | A conditional expression in VCL used to determine if the condition is met. | [optional]
**service_id2** | **String** |  | [optional]
**version** | **String** | A numeric string that represents the service version. | [optional]
**type** | **String** | Type of the condition. Required. | [optional] [one of: "REQUEST", "CACHE", "RESPONSE", "PREFETCH"]

### Return type

[**ConditionResponse**](ConditionResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
