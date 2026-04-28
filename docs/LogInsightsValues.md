# Fastly.LogInsightsValues

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**cache_hit_ratio** | **Number** | The cache hit ratio for the URL specified in the dimension. | [optional] 
**region** | **String** | The client&#39;s country subdivision code as defined by ISO 3166-2. | [optional] 
**region_chr** | **Number** | The cache hit ratio for the region. | [optional] 
**region_error_rate** | **Number** | The error rate for the region. | [optional] 
**url** | **String** | The HTTP request path. | [optional] 
**rate_per_status** | **Number** | The URL accounts for this percentage of the status code in this dimension. | [optional] 
**rate_per_url** | **Number** | The rate at which the reason in this dimension occurs among responses to this URL with a 503 status code. | [optional] 
**_503_rate_per_url** | **Number** | The rate at which 503 status codes are returned for this URL. | [optional] 
**browser_version** | **String** | The version of the client&#39;s browser. | [optional] 
**rate** | **Number** | The percentage of requests matching the value in the current dimension. | [optional] 
**average_bandwidth_bytes** | **Number** | The average bandwidth in bytes for responses to requests to the URL in the current dimension. | [optional] 
**bandwidth_percentage** | **Number** | The total bandwidth percentage for all responses to requests to the URL in the current dimension. | [optional] 
**average_response_time** | **Number** | The average time in seconds to respond to requests to the URL in the current dimension. | [optional] 
**p95_response_time** | **Number** | The P95 time in seconds to respond to requests to the URL in the current dimension. | [optional] 
**response_time_percentage** | **Number** | The total percentage of time to respond to all requests to the URL in the current dimension. | [optional] 
**miss_rate** | **Number** | The miss rate for requests to the URL in the current dimension. | [optional] 
**request_percentage** | **Number** | The percentage of all requests made to the URL in the current dimension. | [optional] 


[[Back to API list]](../../README.md#endpoints) [[Back to README]](../../README.md)
