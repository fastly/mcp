# Fastly.DdosProtectionApi

```javascript
const apiInstance = new Fastly.DdosProtectionApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**ddosProtectionEventGet**](DdosProtectionApi.md#ddosProtectionEventGet) | **GET** /ddos-protection/v1/events/{event_id} | Get event by ID
[**ddosProtectionEventList**](DdosProtectionApi.md#ddosProtectionEventList) | **GET** /ddos-protection/v1/events | Get events
[**ddosProtectionEventRuleList**](DdosProtectionApi.md#ddosProtectionEventRuleList) | **GET** /ddos-protection/v1/events/{event_id}/rules | Get all rules for an event
[**ddosProtectionRuleGet**](DdosProtectionApi.md#ddosProtectionRuleGet) | **GET** /ddos-protection/v1/rules/{rule_id} | Get a rule by ID
[**ddosProtectionRulePatch**](DdosProtectionApi.md#ddosProtectionRulePatch) | **PATCH** /ddos-protection/v1/rules/{rule_id} | Update rule
[**ddosProtectionTrafficStatsRuleGet**](DdosProtectionApi.md#ddosProtectionTrafficStatsRuleGet) | **GET** /ddos-protection/v1/events/{event_id}/rules/{rule_id}/traffic-stats | Get traffic stats for a rule


## `ddosProtectionEventGet`

```javascript
ddosProtectionEventGet({ event_id })
```

Get event by ID.

### Example

```javascript
const options = {
  event_id: "event_id_example", // required
};

apiInstance.ddosProtectionEventGet(options)
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
**event_id** | **String** | Unique ID of the event. |

### Return type

[**DdosProtectionEvent**](DdosProtectionEvent.md)


## `ddosProtectionEventList`

```javascript
ddosProtectionEventList({ , [cursor, ][limit, ][service_id, ][from, ][to, ][name] })
```

Get events.

### Example

```javascript
const options = {
  cursor: "cursor_example",
  limit: 20,
  service_id: "service_id_example",
  from: 2023-01-01T02:30Z,
  to: 2023-01-01T02:30Z,
  name: "name_example",
};

apiInstance.ddosProtectionEventList(options)
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
**cursor** | **String** | Cursor value from the `next_cursor` field of a previous response, used to retrieve the next page. To request the first page, this should be empty. | [optional]
**limit** | **Number** | Limit how many results are returned. | [optional] [defaults to 20]
**service_id** | **String** | Filter results based on a service_id. | [optional]
**from** | **Date** | Represents the start of a date-time range expressed in RFC 3339 format. | [optional]
**to** | **Date** | Represents the end of a date-time range expressed in RFC 3339 format. | [optional]
**name** | **String** |  | [optional]

### Return type

[**InlineResponse2005**](InlineResponse2005.md)


## `ddosProtectionEventRuleList`

```javascript
ddosProtectionEventRuleList({ event_id, [cursor, ][limit, ][include] })
```

Get all rules for an event.

### Example

```javascript
const options = {
  event_id: "event_id_example", // required
  cursor: "cursor_example",
  limit: 20,
  include: "include_example",
};

apiInstance.ddosProtectionEventRuleList(options)
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
**event_id** | **String** | Unique ID of the event. |
**cursor** | **String** | Cursor value from the `next_cursor` field of a previous response, used to retrieve the next page. To request the first page, this should be empty. | [optional]
**limit** | **Number** | Limit how many results are returned. | [optional] [defaults to 20]
**include** | **String** | Include relationships. Optional. Comma-separated values. | [optional]

### Return type

[**InlineResponse2006**](InlineResponse2006.md)


## `ddosProtectionRuleGet`

```javascript
ddosProtectionRuleGet({ rule_id })
```

Get a rule by ID.

### Example

```javascript
const options = {
  rule_id: "rule_id_example", // required
};

apiInstance.ddosProtectionRuleGet(options)
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
**rule_id** | **String** | Unique ID of the rule. |

### Return type

[**DdosProtectionRule**](DdosProtectionRule.md)


## `ddosProtectionRulePatch`

```javascript
ddosProtectionRulePatch({ rule_id, [ddos_protection_rule_patch] })
```

Update rule.

### Example

```javascript
const options = {
  rule_id: "rule_id_example", // required
  ddos_protection_rule_patch: new Fastly.DdosProtectionRulePatch(),
};

apiInstance.ddosProtectionRulePatch(options)
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
**rule_id** | **String** | Unique ID of the rule. |
**ddos_protection_rule_patch** | [**DdosProtectionRulePatch**](DdosProtectionRulePatch.md) |  | [optional]

### Return type

[**DdosProtectionRule**](DdosProtectionRule.md)


## `ddosProtectionTrafficStatsRuleGet`

```javascript
ddosProtectionTrafficStatsRuleGet({ event_id, rule_id })
```

Get traffic stats for a rule.

### Example

```javascript
const options = {
  event_id: "event_id_example", // required
  rule_id: "rule_id_example", // required
};

apiInstance.ddosProtectionTrafficStatsRuleGet(options)
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
**event_id** | **String** | Unique ID of the event. |
**rule_id** | **String** | Unique ID of the rule. |

### Return type

[**DdosProtectionTrafficStats**](DdosProtectionTrafficStats.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
