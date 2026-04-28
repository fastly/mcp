# Fastly.OperationCreate

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**method** | **String** | The HTTP method for the operation. |  [one of: "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS", "CONNECT", "TRACE"]
**domain** | **String** | The domain for the operation. | 
**path** | **String** | The path for the operation, which may include path parameters. | 
**description** | **String** | A description of what the operation does. | [optional] 
**tag_ids** | **[String]** | An array of operation tag IDs associated with this operation. | [optional] 
**status** | **String** | The status to assign to the operation. Defaults to SAVED if omitted. | [optional]  [one of: "SAVED", "IGNORED"]


[[Back to API list]](../../README.md#endpoints) [[Back to README]](../../README.md)
