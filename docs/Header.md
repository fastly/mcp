# Fastly.Header

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**action** | **String** | Accepts a string value. | [optional]  [one of: "set", "append", "delete", "regex", "regex_repeat"]
**cache_condition** | **String** | Name of the cache condition controlling when this configuration applies. | [optional] 
**dst** | **String** | Header to set. | [optional] 
**name** | **String** | A handle to refer to this Header object. | [optional] 
**regex** | **String** | Regular expression to use. Only applies to `regex` and `regex_repeat` actions. | [optional] 
**request_condition** | **String** | Condition which, if met, will select this configuration during a request. Optional. | [optional] 
**response_condition** | **String** | Optional name of a response condition to apply. | [optional] 
**src** | **String** | Variable to be used as a source for the header content. Does not apply to `delete` action. | [optional] 
**substitution** | **String** | Value to substitute in place of regular expression. Only applies to `regex` and `regex_repeat` actions. | [optional] 
**type** | **String** | Accepts a string value. | [optional]  [one of: "request", "cache", "response"]
**ignore_if_set** | **String** | Don&#39;t add the header if it is added already. Only applies to &#39;set&#39; action. Numerical value (\&quot;0\&quot; &#x3D; false, \&quot;1\&quot; &#x3D; true) | [optional] 
**priority** | **String** | Priority determines execution order. Lower numbers execute first. | [optional]  [defaults to '100']


[[Back to API list]](../../README.md#endpoints) [[Back to README]](../../README.md)
