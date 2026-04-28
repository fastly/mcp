# Fastly.AutomationToken

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **String** | The name of the token. | [optional] 
**role** | **String** | The role on the token. | [optional]  [one of: "billing", "engineer", "user"]
**services** | **[String]** | (Optional) The service IDs of the services the token will have access to. Separate service IDs with a space. If no services are specified, the token will have access to all services on the account.  | [optional] 
**scope** | **String** | A space-delimited list of authorization scope. | [optional]  [one of: "global", "purge_select", "purge_all", "global:read"]
**expires_at** | **String** | A UTC timestamp of when the token expires. | [optional] 


[[Back to API list]](../../README.md#endpoints) [[Back to README]](../../README.md)
