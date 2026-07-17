# Fastly.Script

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **String** | Unique script identifier | [optional] 
**page_id** | **String** | Parent page ID | [optional] 
**source** | **String** | Script source (inline or external URL) | [optional] 
**urls** | **[String]** | URLs where this script was observed | [optional] 
**first_seen_at** | **Date** |  | [optional] 
**last_seen_at** | **Date** |  | [optional] 
**justification** | **String** | Reason for authorization decision | [optional] 
**current_hash** | **String** | Current script content hash | [optional] 
**authorized_hash** | **String** | Hash of authorized script content | [optional] 
**authorization_status** | **String** | Script authorization status | [optional]  [one of: "authorized", "unauthorized"]
**authorized_at** | **Date** |  | [optional] 


[[Back to API list]](../../README.md#endpoints) [[Back to README]](../../README.md)
