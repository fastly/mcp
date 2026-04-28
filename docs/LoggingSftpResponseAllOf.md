# Fastly.LoggingSftpResponseAllOf

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**address** | **String** | A hostname or IPv4 address. | [optional] 
**port** | **String** | The port number. | [optional]  [defaults to '22']
**period** | **String** | How frequently log files are finalized so they can be available for reading (in seconds). | [optional]  [defaults to '3600']
**gzip_level** | **Number** | The level of gzip encoding when sending logs (default `0`, no compression). Specifying both `compression_codec` and `gzip_level` in the same API request will result in an error. | [optional]  [defaults to 0]


[[Back to API list]](../../README.md#endpoints) [[Back to README]](../../README.md)
