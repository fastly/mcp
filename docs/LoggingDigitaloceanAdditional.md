# Fastly.LoggingDigitaloceanAdditional

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**bucket_name** | **String** | The name of the DigitalOcean Space. | [optional] 
**access_key** | **String** | Your DigitalOcean Spaces account access key. | [optional] 
**secret_key** | **String** | Your DigitalOcean Spaces account secret key. | [optional] 
**domain** | **String** | The domain of the DigitalOcean Spaces endpoint. | [optional]  [defaults to 'nyc3.digitaloceanspaces.com']
**path** | **String** | The path to upload logs to. | [optional]  [defaults to 'null']
**public_key** | **String** | A PGP public key that Fastly will use to encrypt your log files before writing them to disk. | [optional]  [defaults to 'null']


[[Back to API list]](../../README.md#endpoints) [[Back to README]](../../README.md)
