# Fastly.ArcProviderConnectionRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **String** | The provider name. Must be `bedrock` for `aws-iam` connections. |  [one of: "bedrock"]
**models** | **[String]** | The Bedrock model identifiers this connection is allowed to use. |
**base_url** | **String** | The base URL of the provider&#39;s API. Must be an absolute `http` or `https` URL and must not end in `/v1`. |
**api_key** | **String** | The provider&#39;s secret API key. |
**auth_type** | **String** | The authentication type for this connection. |  [one of: "aws-iam"]
**customer_role_arn** | **String** | The ARN of the IAM role in your AWS account that AI Runtime Control assumes to access Bedrock. See [get Bedrock setup information](https://www.fastly.com/documentation/reference/api/ai-runtime-control/providers#arc-get-bedrock-setup) for the role ARN and external ID your trust policy must reference. |
**region** | **String** | The AWS region for Bedrock API requests. |


[[Back to API list]](../../README.md#endpoints) [[Back to README]](../../README.md)
