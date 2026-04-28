# Fastly.Healthcheck

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**check_interval** | **Number** | How often to run the health check in milliseconds. Minimum 1 second, maximum 1 hour. | [optional] 
**comment** | **String** | A freeform descriptive note. | [optional] 
**expected_response** | **Number** | The status code expected from the host. | [optional] 
**headers** | **[String]** | Array of custom headers that will be added to the health check probes. | [optional] 
**host** | **String** | Which host to check. | [optional] 
**http_version** | **String** | Whether to use version 1.0 or 1.1 HTTP. | [optional] 
**initial** | **Number** | When loading a config, the initial number of probes to be seen as OK. | [optional] 
**method** | **String** | Which HTTP method to use. | [optional] 
**name** | **String** | The name of the health check. | [optional] 
**path** | **String** | The path to check. | [optional] 
**threshold** | **Number** | How many health checks must succeed to be considered healthy. | [optional] 
**timeout** | **Number** | Timeout in milliseconds. | [optional] 
**window** | **Number** | The number of most recent health check queries to keep for this health check. | [optional] 


[[Back to API list]](../../README.md#endpoints) [[Back to README]](../../README.md)
