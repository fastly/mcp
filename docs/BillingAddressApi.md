# Fastly.BillingAddressApi

```javascript
const apiInstance = new Fastly.BillingAddressApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**addBillingAddr**](BillingAddressApi.md#addBillingAddr) | **POST** /customer/{customer_id}/billing_address | Add a billing address to a customer
[**deleteBillingAddr**](BillingAddressApi.md#deleteBillingAddr) | **DELETE** /customer/{customer_id}/billing_address | Delete a billing address
[**getBillingAddr**](BillingAddressApi.md#getBillingAddr) | **GET** /customer/{customer_id}/billing_address | Get a billing address
[**updateBillingAddr**](BillingAddressApi.md#updateBillingAddr) | **PATCH** /customer/{customer_id}/billing_address | Update a billing address


## `addBillingAddr`

```javascript
addBillingAddr({ customer_id, [billing_address_request] })
```

Add a billing address to a customer.

### Example

```javascript
const options = {
  customer_id: "customer_id_example", // required
  billing_address_request: {"skip_verification":false,"data":{"type":"billing_address","attributes":{"address_1":"80719 Dorothea Mountain","address_2":"Apt. 652","city":"New Rasheedville","state":"DE","country":"US","postal_code":"53538-5902"}}},
};

apiInstance.addBillingAddr(options)
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
**billing_address_request** | [**BillingAddressRequest**](BillingAddressRequest.md) | Billing address | [optional]

### Return type

[**BillingAddressResponse**](BillingAddressResponse.md)


## `deleteBillingAddr`

```javascript
deleteBillingAddr({ customer_id })
```

Delete a customer's billing address.

### Example

```javascript
const options = {
  customer_id: "customer_id_example", // required
};

apiInstance.deleteBillingAddr(options)
  .then(() => {
    console.log('API called successfully.');
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

null (empty response body)


## `getBillingAddr`

```javascript
getBillingAddr({ customer_id })
```

Get a customer's billing address.

### Example

```javascript
const options = {
  customer_id: "customer_id_example", // required
};

apiInstance.getBillingAddr(options)
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

[**BillingAddressResponse**](BillingAddressResponse.md)


## `updateBillingAddr`

```javascript
updateBillingAddr({ customer_id, [update_billing_address_request] })
```

Update a customer's billing address. You may update only part of the customer's billing address.

### Example

```javascript
const options = {
  customer_id: "customer_id_example", // required
  update_billing_address_request: {"skip_verification":false,"data":{"type":"billing_address","id":"3DTWpamEUGISvrUiDWkesQ","attributes":{"state":"DE"}}},
};

apiInstance.updateBillingAddr(options)
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
**update_billing_address_request** | [**UpdateBillingAddressRequest**](UpdateBillingAddressRequest.md) | One or more billing address attributes | [optional]

### Return type

[**BillingAddressResponse**](BillingAddressResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
