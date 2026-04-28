# Fastly.CustomerApi

```javascript
const apiInstance = new Fastly.CustomerApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**deleteCustomer**](CustomerApi.md#deleteCustomer) | **DELETE** /customer/{customer_id} | Delete a customer
[**getCustomer**](CustomerApi.md#getCustomer) | **GET** /customer/{customer_id} | Get a customer
[**getLoggedInCustomer**](CustomerApi.md#getLoggedInCustomer) | **GET** /current_customer | Get the logged in customer
[**listUsers**](CustomerApi.md#listUsers) | **GET** /customer/{customer_id}/users | List users
[**updateCustomer**](CustomerApi.md#updateCustomer) | **PUT** /customer/{customer_id} | Update a customer


## `deleteCustomer`

```javascript
deleteCustomer({ customer_id })
```

Delete a customer.

### Example

```javascript
const options = {
  customer_id: "customer_id_example", // required
};

apiInstance.deleteCustomer(options)
  .then((data) => {
    console.log(data, "API called successfully.");
  })
  .catch((error) => {
    console.error(error);
  });
```

### Options

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**customer_id** | **String** | Alphanumeric string identifying the customer. |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `getCustomer`

```javascript
getCustomer({ customer_id })
```

Get a specific customer.

### Example

```javascript
const options = {
  customer_id: "customer_id_example", // required
};

apiInstance.getCustomer(options)
  .then((data) => {
    console.log(data, "API called successfully.");
  })
  .catch((error) => {
    console.error(error);
  });
```

### Options

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**customer_id** | **String** | Alphanumeric string identifying the customer. |

### Return type

[**CustomerResponse**](CustomerResponse.md)


## `getLoggedInCustomer`

```javascript
getLoggedInCustomer()
```

Get the logged in customer.

### Example

```javascript
apiInstance.getLoggedInCustomer()
  .then((data) => {
    console.log(data, "API called successfully.");
  })
  .catch((error) => {
    console.error(error);
  });
```

### Options

This endpoint does not need any parameters.

### Return type

[**CustomerResponse**](CustomerResponse.md)


## `listUsers`

```javascript
listUsers({ customer_id })
```

List all users from a specified customer id.

### Example

```javascript
const options = {
  customer_id: "customer_id_example", // required
};

apiInstance.listUsers(options)
  .then((data) => {
    console.log(data, "API called successfully.");
  })
  .catch((error) => {
    console.error(error);
  });
```

### Options

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**customer_id** | **String** | Alphanumeric string identifying the customer. |

### Return type

[**[SchemasUserResponse]**](SchemasUserResponse.md)


## `updateCustomer`

```javascript
updateCustomer({ customer_id, [billing_contact_id, ][billing_network_type, ][billing_ref, ][can_configure_wordpress, ][can_reset_passwords, ][can_upload_vcl, ][force_2fa, ][force_sso, ][has_account_panel, ][has_improved_events, ][has_improved_ssl_config, ][has_openstack_logging, ][has_pci, ][has_pci_passwords, ][ip_whitelist, ][legal_contact_id, ][name, ][owner_id, ][phone_number, ][postal_address, ][pricing_plan, ][pricing_plan_id, ][security_contact_id, ][technical_contact_id] })
```

Update a customer.

### Example

```javascript
const options = {
  customer_id: "customer_id_example", // required
  billing_contact_id: "billing_contact_id_example",
  billing_network_type: "public",
  billing_ref: "billing_ref_example",
  can_configure_wordpress: true,
  can_reset_passwords: true,
  can_upload_vcl: true,
  force_2fa: true,
  force_sso: true,
  has_account_panel: true,
  has_improved_events: true,
  has_improved_ssl_config: true,
  has_openstack_logging: true,
  has_pci: true,
  has_pci_passwords: true,
  ip_whitelist: "ip_whitelist_example",
  legal_contact_id: "legal_contact_id_example",
  name: "name_example",
  owner_id: "owner_id_example",
  phone_number: "phone_number_example",
  postal_address: "postal_address_example",
  pricing_plan: "pricing_plan_example",
  pricing_plan_id: "pricing_plan_id_example",
  security_contact_id: "security_contact_id_example",
  technical_contact_id: "technical_contact_id_example",
};

apiInstance.updateCustomer(options)
  .then((data) => {
    console.log(data, "API called successfully.");
  })
  .catch((error) => {
    console.error(error);
  });
```

### Options

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**customer_id** | **String** | Alphanumeric string identifying the customer. |
**billing_contact_id** | **String** | The alphanumeric string representing the primary billing contact. | [optional]
**billing_network_type** | **String** | Customer&#39;s current network revenue type. | [optional] [one of: "public", "private"]
**billing_ref** | **String** | Used for adding purchased orders to customer&#39;s account. | [optional]
**can_configure_wordpress** | **Boolean** | Whether this customer can view or edit wordpress. | [optional]
**can_reset_passwords** | **Boolean** | Whether this customer can reset passwords. | [optional]
**can_upload_vcl** | **Boolean** | Whether this customer can upload VCL. | [optional]
**force_2fa** | **Boolean** | Specifies whether 2FA is forced or not forced on the customer account. Logs out non-2FA users once 2FA is force enabled. | [optional]
**force_sso** | **Boolean** | Specifies whether SSO is forced or not forced on the customer account. | [optional]
**has_account_panel** | **Boolean** | Specifies whether the account has access or does not have access to the account panel. | [optional]
**has_improved_events** | **Boolean** | Specifies whether the account has access or does not have access to the improved events. | [optional]
**has_improved_ssl_config** | **Boolean** | Whether this customer can view or edit the SSL config. | [optional]
**has_openstack_logging** | **Boolean** | Specifies whether the account has enabled or not enabled openstack logging. | [optional]
**has_pci** | **Boolean** | Specifies whether the account can edit PCI for a service. | [optional]
**has_pci_passwords** | **Boolean** | Specifies whether PCI passwords are required for the account. | [optional]
**ip_whitelist** | **String** | The range of IP addresses authorized to access the customer account. | [optional]
**legal_contact_id** | **String** | The alphanumeric string identifying the account&#39;s legal contact. | [optional]
**name** | **String** | The name of the customer, generally the company name. | [optional]
**owner_id** | **String** | The alphanumeric string identifying the account owner. | [optional]
**phone_number** | **String** | The phone number associated with the account. | [optional]
**postal_address** | **String** | The postal address associated with the account. | [optional]
**pricing_plan** | **String** | The pricing plan this customer is under. | [optional]
**pricing_plan_id** | **String** | The alphanumeric string identifying the pricing plan. | [optional]
**security_contact_id** | **String** | The alphanumeric string identifying the account&#39;s security contact. | [optional]
**technical_contact_id** | **String** | The alphanumeric string identifying the account&#39;s technical contact. | [optional]

### Return type

[**CustomerResponse**](CustomerResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
