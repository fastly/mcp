# Fastly.DdosProtectionEvent

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**created_at** | **Date** | Date and time in ISO 8601 format. | [optional] [readonly] 
**updated_at** | **Date** | Date and time in ISO 8601 format. | [optional] [readonly] 
**id** | **String** | Unique ID of the event. | [optional] 
**name** | **String** | A human-readable name for the event. | [optional] 
**requests_allowed** | **Number** | Number of requests classified as non-attack traffic for an event. | [optional] 
**requests_detected** | **Number** | Number of requests classified as DDoS attack traffic for an event. | [optional] 
**customer_id** | **String** | Alphanumeric string identifying the customer. | [optional] 
**service_id** | **String** | Alphanumeric string identifying the service. | [optional] 
**started_at** | **Date** | Date and time in ISO 8601 format. | [optional] [readonly] 
**ended_at** | **Date** | Date and time in ISO 8601 format. | [optional] [readonly] 


[[Back to API list]](../../README.md#endpoints) [[Back to README]](../../README.md)
