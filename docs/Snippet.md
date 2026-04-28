# Fastly.Snippet

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **String** | The name for the snippet. | [optional] 
**type** | **String** | The location in generated VCL where the snippet should be placed. | [optional]  [one of: "init", "recv", "hash", "hit", "miss", "pass", "fetch", "error", "deliver", "log", "none"]
**content** | **String** | The VCL code that specifies exactly what the snippet does. | [optional] 
**priority** | **String** | Priority determines execution order. Lower numbers execute first. | [optional]  [defaults to '100']
**dynamic** | **String** | Sets the snippet version. | [optional]  [one of: "0", "1"]


[[Back to API list]](../../README.md#endpoints) [[Back to README]](../../README.md)
