# Fastly.LoggingGenericCommonResponseAllOf1

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**period** | **String** | How frequently log files are finalized so they can be available for reading (in seconds). | [optional]  [defaults to '3600']
**gzip_level** | **String** | The level of gzip encoding when sending logs (default `0`, no compression). Specifying both `compression_codec` and `gzip_level` in the same API request will result in an error. | [optional]  [defaults to '0']


[[Back to API list]](../../README.md#endpoints) [[Back to README]](../../README.md)
