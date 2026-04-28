# Fastly.TokenCreatedResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**services** | **[String]** | List of alphanumeric strings identifying services (optional). If no services are specified, the token will have access to all services on the account.  | [optional] [readonly] 
**name** | **String** | Name of the token. | [optional] 
**scope** | **String** | Space-delimited list of authorization scope. | [optional]  [one of: "global", "purge_select", "purge_all", "global:read"]
**created_at** | **String** | Time-stamp (UTC) of when the token was created. | [optional] 
**deleted_at** | **Date** | Date and time in ISO 8601 format. | [optional] [readonly] 
**updated_at** | **Date** | Date and time in ISO 8601 format. | [optional] [readonly] 
**id** | **String** |  | [optional] [readonly] 
**user_id** | **String** |  | [optional] [readonly] 
**last_used_at** | **String** | Time-stamp (UTC) of when the token was last used. | [optional] [readonly] 
**expires_at** | **String** | Time-stamp (UTC) of when the token will expire (optional). | [optional] 
**ip** | **String** | IP Address of the client that last used the token. | [optional] 
**user_agent** | **String** | User-Agent header of the client that last used the token. | [optional] 
**access_token** | **String** | The alphanumeric string for accessing the API (only available on token creation). | [optional] 


[[Back to API list]](../../README.md#endpoints) [[Back to README]](../../README.md)
