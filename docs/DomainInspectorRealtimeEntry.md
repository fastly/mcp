# Fastly.DomainInspectorRealtimeEntry

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**recorded** | **Number** | The Unix timestamp at which this record&#39;s data was generated. | [optional] 
**aggregated** | [**{String: DomainInspectorMeasurements}**](DomainInspectorMeasurements.md) | Groups [measurements](#measurements-data-model) by backend name and then by IP address. | [optional] 
**datacenter** | **{String: {String: DomainInspectorMeasurements}}** | Groups [measurements](#measurements-data-model) by POP, then backend name, and then IP address. See the [POPs API](https://www.fastly.com/documentation/reference/api/utils/pops/) for details about POP identifiers. | [optional] 


[[Back to API list]](../../README.md#endpoints) [[Back to README]](../../README.md)
