# Fastly.CustomerAddressesApi

```javascript
const apiInstance = new Fastly.CustomerAddressesApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createCustomerAddress**](CustomerAddressesApi.md#createCustomerAddress) | **POST** /billing/v3/customer-addresses | Creates an address associated with a customer account.
[**listCustomerAddresses**](CustomerAddressesApi.md#listCustomerAddresses) | **GET** /billing/v3/customer-addresses | Return the list of addresses associated with a customer account.
[**updateCustomerAddress**](CustomerAddressesApi.md#updateCustomerAddress) | **PUT** /billing/v3/customer-addresses/{type} | Updates an address associated with a customer account.


## `createCustomerAddress`

```javascript
createCustomerAddress({ customer_address })
```

Creates an address associated with a customer account.

### Example

```javascript
const options = {
  customer_address: new Fastly.CustomerAddress(), // required
};

apiInstance.createCustomerAddress(options)
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
**customer_address** | [**CustomerAddress**](CustomerAddress.md) |  |

### Return type

[**InlineResponse201**](InlineResponse201.md)


## `listCustomerAddresses`

```javascript
listCustomerAddresses()
```

Return the list of addresses associated with a customer account.

### Example

```javascript
apiInstance.listCustomerAddresses()
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

[**ListCustomerAddressesResponse**](ListCustomerAddressesResponse.md)


## `updateCustomerAddress`

```javascript
updateCustomerAddress({ type, customer_address })
```

Updates an address associated with a customer account.

### Example

```javascript
const options = {
  type: "type_example", // required
  customer_address: new Fastly.CustomerAddress(), // required
};

apiInstance.updateCustomerAddress(options)
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
**type** | **String** | Alphanumeric type of the address being modified. |
**customer_address** | [**CustomerAddress**](CustomerAddress.md) |  |

### Return type

null (empty response body)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
