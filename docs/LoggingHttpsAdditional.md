# Fastly.LoggingHttpsAdditional

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**url** | **String** | The URL to send logs to. Must use HTTPS. Required. | [optional] 
**request_max_entries** | **Number** | The maximum number of logs sent in one request. Defaults `0` (10k). | [optional]  [defaults to 0]
**request_max_bytes** | **Number** | The maximum number of bytes sent in one request. Defaults `0` (100MB). | [optional]  [defaults to 0]
**content_type** | **String** | Content type of the header sent with the request. | [optional]  [defaults to 'null']
**header_name** | **String** | Name of the custom header sent with the request. | [optional]  [defaults to 'null']
**message_type** | [**LoggingMessageType**](LoggingMessageType.md) |  | [optional] 
**header_value** | **String** | Value of the custom header sent with the request. | [optional]  [defaults to 'null']
**method** | **String** | HTTP method used for request. | [optional]  [one of: "POST", "PUT"]
**json_format** | **String** | Enforces valid JSON formatting for log entries. | [optional]  [one of: "0", "1", "2"]
**format** | **String** | A Fastly [log format string](https://www.fastly.com/documentation/guides/integrations/streaming-logs/custom-log-formats/). | [optional]  [defaults to '%h %l %u %t "%r" %&gt;s %b']
**period** | **Number** | How frequently, in seconds, batches of log data are sent to the HTTPS endpoint. A value of `0` sends logs at the same interval as the default, which is `5` seconds. | [optional]  [defaults to 5]


[[Back to API list]](../../README.md#endpoints) [[Back to README]](../../README.md)
