# Fastly.Pop

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**code** | **String** | the three-letter code for the [POP](https://www.fastly.com/documentation/learning/concepts/pop/) | 
**name** | **String** | the name of the POP | 
**group** | **String** |  | 
**region** | **String** |  |  [one of: "APAC", "Asia", "AF-West", "EU-Central", "EU-East", "EU-West", "MX-North", "MX-Central", "MX-South", "Middle-East", "North-America", "SA-South", "SA-East", "SA-West", "SA-North", "South-Africa", "South-America", "US-Central", "US-East", "US-West", "Asia-South"]
**stats_region** | **String** | the region used for stats reporting |  [one of: "southamerica_std", "africa_std", "anzac", "asia", "europe", "usa", "asia_india", "asia_southkorea", "mexico"]
**billing_region** | **String** | the region used for billing |  [one of: "Africa", "Australia", "Asia", "Europe", "India", "Mexico", "North America", "South Korea", "South America"]
**coordinates** | [**PopCoordinates**](PopCoordinates.md) |  | [optional] 
**shield** | **String** | the name of the [shield code](https://www.fastly.com/documentation/learning/concepts/shielding/#choosing-a-shield-location) if this POP is suitable for shielding | [optional] 


[[Back to API list]](../../README.md#endpoints) [[Back to README]](../../README.md)
