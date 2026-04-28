# Fastly.ServiceVersionDetailOrNull

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
**backends** | [**[BackendResponse]**](BackendResponse.md) | List of backends associated to this service. | [optional] 
**cache_settings** | [**[CacheSettingResponse]**](CacheSettingResponse.md) | List of cache settings associated to this service. | [optional] 
**conditions** | [**[ConditionResponse]**](ConditionResponse.md) | List of conditions associated to this service. | [optional] 
**directors** | [**[Director]**](Director.md) | List of directors associated to this service. | [optional] 
**domains** | [**[DomainResponse]**](DomainResponse.md) | List of domains associated to this service. | [optional] 
**gzips** | [**[GzipResponse]**](GzipResponse.md) | List of gzip rules associated to this service. | [optional] 
**headers** | [**[HeaderResponse]**](HeaderResponse.md) | List of headers associated to this service. | [optional] 
**healthchecks** | [**[HealthcheckResponse]**](HealthcheckResponse.md) | List of healthchecks associated to this service. | [optional] 
**request_settings** | [**[RequestSettingsResponse]**](RequestSettingsResponse.md) | List of request settings for this service. | [optional] 
**response_objects** | [**[ResponseObjectResponse]**](ResponseObjectResponse.md) | List of response objects for this service. | [optional] 
**settings** | [**VersionDetailSettings**](VersionDetailSettings.md) |  | [optional] 
**snippets** | [**[SchemasSnippetResponse]**](SchemasSnippetResponse.md) | List of VCL snippets for this service. | [optional] 
**vcls** | [**[SchemasVclResponse]**](SchemasVclResponse.md) | List of VCL files for this service. | [optional] 
**wordpress** | **[Object]** | A list of Wordpress rules with this service. | [optional] 


[[Back to API list]](../../README.md#endpoints) [[Back to README]](../../README.md)
