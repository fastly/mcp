# Fastly.VersionResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**active** | **Boolean** | Whether this is the active version or not. | [optional]  [defaults to false]
**comment** | **String** | A freeform descriptive note. | [optional] 
**deployed** | **Boolean** | Unused at this time. | [optional] 
**locked** | **Boolean** | Whether this version is locked or not. Objects can not be added or edited on locked versions. | [optional]  [defaults to false]
**number** | **Number** | The number of this version. | [optional] [readonly] 
**staging** | **Boolean** | Unused at this time. | [optional]  [defaults to false]
**testing** | **Boolean** | Unused at this time. | [optional]  [defaults to false]
**created_at** | **Date** | Date and time in ISO 8601 format. | [optional] [readonly] 
**deleted_at** | **Date** | Date and time in ISO 8601 format. | [optional] [readonly] 
**updated_at** | **Date** | Date and time in ISO 8601 format. | [optional] [readonly] 
**service_id** | **String** |  | [optional] [readonly] 
**environments** | [**[Environment]**](Environment.md) | A list of environments where the service has been deployed. | [optional] 


[[Back to API list]](../../README.md#endpoints) [[Back to README]](../../README.md)
