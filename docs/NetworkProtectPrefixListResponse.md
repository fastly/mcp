# Fastly.NetworkProtectPrefixListResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **String** | A human-readable name, unique within the customer. |
**family** | [**NetworkProtectPrefixListFamily**](NetworkProtectPrefixListFamily.md) |  |
**addresses** | **[String]** | Complete canonical list contents. Bare addresses are canonicalized, CIDRs are masked, equivalent entries are deduplicated, and overlaps are retained. |
**id** | **String** | A read-only unique identifier for a Network Protect resource. | [readonly]
**created_at** | **Date** | An ISO 8601 timestamp in UTC. | [readonly]
**updated_at** | **Date** | An ISO 8601 timestamp in UTC. | [readonly]


[[Back to API list]](../../README.md#endpoints) [[Back to README]](../../README.md)
