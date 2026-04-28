# Fastly.AutomationTokenCreateRequestAttributes

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **String** | name of the token | [optional] 
**role** | **String** |  | [optional]  [one of: "engineer", "billing", "user"]
**services** | **[String]** | List of service ids to limit the token | [optional] 
**scope** | **String** |  | [optional]  [one of: "global", "global:read", "purge_all", "purge_select"]
**expires_at** | **Date** | A UTC timestamp of when the token will expire. | [optional] 
**tls_access** | **Boolean** | Indicates whether TLS access is enabled for the token. | [optional] 


[[Back to API list]](../../README.md#endpoints) [[Back to README]](../../README.md)
