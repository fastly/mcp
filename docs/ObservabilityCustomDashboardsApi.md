# Fastly.ObservabilityCustomDashboardsApi

```javascript
const apiInstance = new Fastly.ObservabilityCustomDashboardsApi();
```
## Methods

> [!NOTE]
> All URIs are relative to `https://api.fastly.com`

Method | HTTP request | Description
------ | ------------ | -----------
[**createDashboard**](ObservabilityCustomDashboardsApi.md#createDashboard) | **POST** /observability/dashboards | Create a new dashboard
[**deleteDashboard**](ObservabilityCustomDashboardsApi.md#deleteDashboard) | **DELETE** /observability/dashboards/{dashboard_id} | Delete an existing dashboard
[**getDashboard**](ObservabilityCustomDashboardsApi.md#getDashboard) | **GET** /observability/dashboards/{dashboard_id} | Retrieve a dashboard by ID
[**listDashboards**](ObservabilityCustomDashboardsApi.md#listDashboards) | **GET** /observability/dashboards | List all custom dashboards
[**updateDashboard**](ObservabilityCustomDashboardsApi.md#updateDashboard) | **PATCH** /observability/dashboards/{dashboard_id} | Update an existing dashboard


## `createDashboard`

```javascript
createDashboard({ , [create_dashboard_request] })
```

Create a new dashboard

### Example

```javascript
const options = {
  create_dashboard_request: new Fastly.CreateDashboardRequest(),
};

apiInstance.createDashboard(options)
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
**create_dashboard_request** | [**CreateDashboardRequest**](CreateDashboardRequest.md) |  | [optional]

### Return type

[**Dashboard**](Dashboard.md)


## `deleteDashboard`

```javascript
deleteDashboard({ dashboard_id })
```

Delete an existing dashboard

### Example

```javascript
const options = {
  dashboard_id: 2eGFXF4F4kTxd4gU39Bg3e, // required
};

apiInstance.deleteDashboard(options)
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
**dashboard_id** | **String** |  |

### Return type

null (empty response body)


## `getDashboard`

```javascript
getDashboard({ dashboard_id })
```

Retrieve a dashboard by ID

### Example

```javascript
const options = {
  dashboard_id: 2eGFXF4F4kTxd4gU39Bg3e, // required
};

apiInstance.getDashboard(options)
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
**dashboard_id** | **String** |  |

### Return type

[**Dashboard**](Dashboard.md)


## `listDashboards`

```javascript
listDashboards()
```

List all custom dashboards

### Example

```javascript
apiInstance.listDashboards()
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

[**ListDashboardsResponse**](ListDashboardsResponse.md)


## `updateDashboard`

```javascript
updateDashboard({ dashboard_id, [update_dashboard_request] })
```

Update an existing dashboard

### Example

```javascript
const options = {
  dashboard_id: 2eGFXF4F4kTxd4gU39Bg3e, // required
  update_dashboard_request: new Fastly.UpdateDashboardRequest(),
};

apiInstance.updateDashboard(options)
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
**dashboard_id** | **String** |  |
**update_dashboard_request** | [**UpdateDashboardRequest**](UpdateDashboardRequest.md) |  | [optional]

### Return type

[**Dashboard**](Dashboard.md)


[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to README]](../../README.md)
