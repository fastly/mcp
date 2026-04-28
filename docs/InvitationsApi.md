# Fastly.InvitationsApi

```javascript
const apiInstance = new Fastly.InvitationsApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createInvitation**](InvitationsApi.md#createInvitation) | **POST** /invitations | Create an invitation
[**deleteInvitation**](InvitationsApi.md#deleteInvitation) | **DELETE** /invitations/{invitation_id} | Delete an invitation
[**listInvitations**](InvitationsApi.md#listInvitations) | **GET** /invitations | List invitations


## `createInvitation`

```javascript
createInvitation({ , [invitation] })
```

Create an invitation.

### Example

```javascript
const options = {
  invitation: {"data":{"type":"invitation","attributes":{"email":"thelma@example.com","limit_services":true,"roles":["Q4rXe9vN1szK8a2fUjYtWp"]},"relationships":{"customer":{"data":{"id":"44tb1D3asjhhuh2SH8e8YD","type":"customer"}},"service_invitations":{"data":[{"type":"service_invitation","attributes":{"permission":"purge_all"},"relationships":{"service":{"data":{"type":"service","id":"6yrrdleXQ9QDtum9rMB0nr"}}}}]}}}},
};

apiInstance.createInvitation(options)
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
**invitation** | [**Invitation**](Invitation.md) |  | [optional]

### Return type

[**InvitationCreateResponse**](InvitationCreateResponse.md)


## `deleteInvitation`

```javascript
deleteInvitation({ invitation_id })
```

Delete an invitation.

### Example

```javascript
const options = {
  invitation_id: "invitation_id_example", // required
};

apiInstance.deleteInvitation(options)
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
**invitation_id** | **String** | Alphanumeric string identifying an invitation. |

### Return type

null (empty response body)


## `listInvitations`

```javascript
listInvitations({ , [page_number, ][page_size] })
```

List all invitations.

### Example

```javascript
const options = {
  page_number: 1,
  page_size: 20,
};

apiInstance.listInvitations(options)
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
**page_number** | **Number** | Current page. | [optional]
**page_size** | **Number** | Number of records per page. | [optional] [defaults to 20]

### Return type

[**InvitationsResponse**](InvitationsResponse.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
