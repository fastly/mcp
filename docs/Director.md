# Fastly.Director

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**backends** | [**[Backend]**](Backend.md) | List of backends associated to a director. | [optional] 
**capacity** | **Number** | Unused. | [optional] 
**comment** | **String** | A freeform descriptive note. | [optional] 
**name** | **String** | Name for the Director. | [optional] 
**quorum** | **Number** | The percentage of capacity that needs to be up for a director to be considered up. `0` to `100`. | [optional]  [defaults to 75]
**shield** | **String** | Selected POP to serve as a shield for the backends. Defaults to `null` meaning no origin shielding if not set. Refer to the [POPs API endpoint](https://www.fastly.com/documentation/reference/api/utils/pops/) to get a list of available POPs used for shielding. | [optional]  [defaults to 'null']
**type** | **Number** | What type of load balance group to use. | [optional]  [one of: 1, 3, 4]
**retries** | **Number** | How many backends to search if it fails. | [optional]  [defaults to 5]


[[Back to API list]](../../README.md#endpoints) [[Back to README]](../../README.md)
