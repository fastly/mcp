# Fastly.LoggingCloudfilesAdditional

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**access_key** | **String** | Your Cloud Files account access key. | [optional] 
**bucket_name** | **String** | The name of your Cloud Files container. | [optional] 
**path** | **String** | The path to upload logs to. | [optional]  [defaults to 'null']
**region** | **String** | The region to stream logs to. | [optional]  [one of: "DFW", "ORD", "IAD", "LON", "SYD", "HKG", "null"]
**public_key** | **String** | A PGP public key that Fastly will use to encrypt your log files before writing them to disk. | [optional]  [defaults to 'null']
**user** | **String** | The username for your Cloud Files account. | [optional] 


[[Back to API list]](../../README.md#endpoints) [[Back to README]](../../README.md)
