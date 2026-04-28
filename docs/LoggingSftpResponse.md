# Fastly.LoggingSftpResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **String** | The name for the real-time logging configuration. | [optional] 
**placement** | **String** | Where in the generated VCL the logging call should be placed. If not set, endpoints with `format_version` of 2 are placed in `vcl_log` and those with `format_version` of 1 are placed in `vcl_deliver`.  | [optional]  [one of: "none", "null"]
**response_condition** | **String** | The name of an existing condition in the configured endpoint, or leave blank to always execute. | [optional] 
**format** | **String** | A Fastly [log format string](https://www.fastly.com/documentation/guides/integrations/streaming-logs/custom-log-formats/). | [optional]  [defaults to '%h %l %u %t "%r" %&gt;s %b']
**log_processing_region** | **String** | The geographic region where the logs will be processed before streaming. Valid values are `us`, `eu`, and `none` for global. | [optional]  [one of: "none", "eu", "us"]
**format_version** | **String** | The version of the custom logging format used for the configured endpoint. The logging call gets placed by default in `vcl_log` if `format_version` is set to `2` and in `vcl_deliver` if `format_version` is set to `1`.  | [optional]  [one of: "1", "2"]
**message_type** | **String** | How the message should be formatted. | [optional]  [one of: "classic", "loggly", "logplex", "blank"]
**timestamp_format** | **String** | A timestamp format | [optional] [readonly] 
**compression_codec** | **String** | The codec used for compressing your logs. Valid values are `zstd`, `snappy`, and `gzip`. Specifying both `compression_codec` and `gzip_level` in the same API request will result in an error. | [optional]  [one of: "zstd", "snappy", "gzip"]
**created_at** | **Date** | Date and time in ISO 8601 format. | [optional] [readonly] 
**deleted_at** | **Date** | Date and time in ISO 8601 format. | [optional] [readonly] 
**updated_at** | **Date** | Date and time in ISO 8601 format. | [optional] [readonly] 
**service_id** | **String** |  | [optional] [readonly] 
**version** | **String** |  | [optional] [readonly] 
**password** | **String** | The password for the server. If both `password` and `secret_key` are passed, `secret_key` will be used in preference. | [optional] 
**path** | **String** | The path to upload logs to. | [optional]  [defaults to 'null']
**public_key** | **String** | A PGP public key that Fastly will use to encrypt your log files before writing them to disk. | [optional]  [defaults to 'null']
**secret_key** | **String** | The SSH private key for the server. If both `password` and `secret_key` are passed, `secret_key` will be used in preference. | [optional]  [defaults to 'null']
**ssh_known_hosts** | **String** | A list of host keys for all hosts we can connect to over SFTP. | [optional] 
**user** | **String** | The username for the server. | [optional] 
**address** | **String** | A hostname or IPv4 address. | [optional] 
**port** | **String** | The port number. | [optional]  [defaults to '22']
**period** | **String** | How frequently log files are finalized so they can be available for reading (in seconds). | [optional]  [defaults to '3600']
**gzip_level** | **Number** | The level of gzip encoding when sending logs (default `0`, no compression). Specifying both `compression_codec` and `gzip_level` in the same API request will result in an error. | [optional]  [defaults to 0]


[[Back to API list]](../../README.md#endpoints) [[Back to README]](../../README.md)
