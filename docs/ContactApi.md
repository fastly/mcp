# Fastly.ContactApi

```javascript
const apiInstance = new Fastly.ContactApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createContacts**](ContactApi.md#createContacts) | **POST** /customer/{customer_id}/contacts | Add a new customer contact
[**deleteContact**](ContactApi.md#deleteContact) | **DELETE** /customer/{customer_id}/contacts/{contact_id} | Delete a contact
[**listContacts**](ContactApi.md#listContacts) | **GET** /customer/{customer_id}/contacts | List contacts


## `createContacts`

```javascript
createContacts({ customer_id, [user_id, ][contact_type, ][name, ][email, ][phone, ][customer_id2] })
```

Create a contact.

### Example

```javascript
const options = {
  customer_id: "customer_id_example", // required
  user_id: "user_id_example",
  contact_type: "primary",
  name: "name_example",
  email: "email_example",
  phone: "phone_example",
  customer_id2: "customer_id_example",
};

apiInstance.createContacts(options)
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
**user_id** | **String** | The alphanumeric string representing the user for this customer contact. | [optional]
**contact_type** | **String** | The type of contact. | [optional] [one of: "primary", "billing", "technical", "security", "emergency", "general compliance"]
**name** | **String** | The name of this contact, when user_id is not provided. | [optional]
**email** | **String** | The email of this contact, when a user_id is not provided. | [optional]
**phone** | **String** | The phone number for this contact. Required for primary, technical, and security contact types. | [optional]
**customer_id2** | **String** | The alphanumeric string representing the customer for this customer contact. | [optional]

### Return type

[**ContactResponse**](ContactResponse.md)


## `deleteContact`

```javascript
deleteContact({ customer_id, contact_id })
```

Delete a contact.

### Example

```javascript
const options = {
  customer_id: "customer_id_example", // required
  contact_id: "contact_id_example", // required
};

apiInstance.deleteContact(options)
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
**contact_id** | **String** | An alphanumeric string identifying the customer contact. |

### Return type

[**InlineResponse200**](InlineResponse200.md)


## `listContacts`

```javascript
listContacts({ customer_id })
```

List all contacts from a specified customer ID.

### Example

```javascript
const options = {
  customer_id: "customer_id_example", // required
};

apiInstance.listContacts(options)
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

[**[SchemasContactResponse]**](SchemasContactResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
