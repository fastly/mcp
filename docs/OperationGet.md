# Fastly.OperationGet

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**method** | **String** | The HTTP method for the operation. |  [one of: "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS", "CONNECT", "TRACE"]
**domain** | **String** | The domain for the operation. | 
**path** | **String** | The path for the operation, which may include path parameters. | 
**id** | **String** | The unique identifier of the operation. | [readonly] 
**updated_at** | **Date** | The timestamp when the operation was last updated. | [readonly] 
**description** | **String** | A description of what the operation does. | [optional] 
**tag_ids** | **[String]** | An array of operation tag IDs associated with this operation. | [optional] 
**created_at** | **Date** | The timestamp when the operation was created. | [optional] [readonly] 
**last_seen_at** | **Date** | The timestamp when the operation was last seen in traffic. | [optional] [readonly] 
**rps** | **Number** | Requests per second observed for this operation. | [optional] [readonly] 
**status** | **String** | The status of the operation. | [optional] [readonly]  [one of: "SAVED", "IGNORED"]


[[Back to API list]](../../README.md#endpoints) [[Back to README]](../../README.md)
