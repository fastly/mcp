# Fastly.LoggingHttpsResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **String** | The name for the real-time logging configuration. | [optional] 
**placement** | **String** | Where in the generated VCL the logging call should be placed. If not set, endpoints with `format_version` of 2 are placed in `vcl_log` and those with `format_version` of 1 are placed in `vcl_deliver`.  | [optional]  [one of: "none", "null"]
**response_condition** | **String** | The name of an existing condition in the configured endpoint, or leave blank to always execute. | [optional] 
**format** | **String** | A Fastly [log format string](https://www.fastly.com/documentation/guides/integrations/streaming-logs/custom-log-formats/). | [optional]  [defaults to '%h %l %u %t "%r" %&gt;s %b']
**log_processing_region** | **String** | The geographic region where the logs will be processed before streaming. Valid values are `us`, `eu`, and `none` for global. | [optional]  [one of: "none", "eu", "us"]
**format_version** | **String** | The version of the custom logging format used for the configured endpoint. The logging call gets placed by default in `vcl_log` if `format_version` is set to `2` and in `vcl_deliver` if `format_version` is set to `1`.  | [optional]  [one of: "1", "2"]
**tls_ca_cert** | **String** | A secure certificate to authenticate a server with. Must be in PEM format. | [optional]  [defaults to 'null']
**tls_client_cert** | **String** | The client certificate used to make authenticated requests. Must be in PEM format. | [optional]  [defaults to 'null']
**tls_client_key** | **String** | The client private key used to make authenticated requests. Must be in PEM format. | [optional]  [defaults to 'null']
**tls_hostname** | **String** | The hostname to verify the server&#39;s certificate. This should be one of the Subject Alternative Name (SAN) fields for the certificate. Common Names (CN) are not supported. | [optional]  [defaults to 'null']
**request_max_entries** | **Number** | The maximum number of logs sent in one request. Defaults `0` (10k). | [optional]  [defaults to 0]
**request_max_bytes** | **Number** | The maximum number of bytes sent in one request. Defaults `0` (100MB). | [optional]  [defaults to 0]
**url** | **String** | The URL to send logs to. Must use HTTPS. Required. | [optional] 
**content_type** | **String** | Content type of the header sent with the request. | [optional]  [defaults to 'null']
**header_name** | **String** | Name of the custom header sent with the request. | [optional]  [defaults to 'null']
**message_type** | [**LoggingMessageType**](LoggingMessageType.md) |  | [optional] 
**header_value** | **String** | Value of the custom header sent with the request. | [optional]  [defaults to 'null']
**method** | **String** | HTTP method used for request. | [optional]  [one of: "POST", "PUT"]
**json_format** | **String** | Enforces valid JSON formatting for log entries. | [optional]  [one of: "0", "1", "2"]
**period** | **Number** | How frequently, in seconds, batches of log data are sent to the HTTPS endpoint. A value of `0` sends logs at the same interval as the default, which is `5` seconds. | [optional]  [defaults to 5]
**created_at** | **Date** | Date and time in ISO 8601 format. | [optional] [readonly] 
**deleted_at** | **Date** | Date and time in ISO 8601 format. | [optional] [readonly] 
**updated_at** | **Date** | Date and time in ISO 8601 format. | [optional] [readonly] 
**service_id** | **String** |  | [optional] [readonly] 
**version** | **String** |  | [optional] [readonly] 


[[Back to API list]](../../README.md#endpoints) [[Back to README]](../../README.md)
