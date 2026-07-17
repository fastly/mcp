# Fastly.RoutingConfigResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**created_at** | **Date** | Date and time in ISO 8601 format. | [optional] [readonly] 
**updated_at** | **Date** | Date and time in ISO 8601 format. | [optional] [readonly] 
**id** | **String** | Alphanumeric string identifying the routing config. | [optional] [readonly] 
**name** | **String** | The user-defined name for the routing config. | [optional] 
**state** | [**RoutingConfigState**](RoutingConfigState.md) |  | [optional] 
**activated_at** | **Date** | Timestamp of when the version was most recently activated. `null` if the version has never been activated. | [optional] [readonly] 
**links** | **{String: String}** | HATEOAS links to related resources. | [optional] [readonly] 


[[Back to API list]](../../README.md#endpoints) [[Back to README]](../../README.md)
