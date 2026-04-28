# Fastly.DefaultSettings

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**resize_filter** | **String** | The type of filter to use while resizing an image. | [optional]  [one of: "lanczos3", "lanczos2", "bicubic", "bilinear", "nearest"]
**webp** | **Boolean** | Controls whether or not to default to WebP output when the client supports it. This is equivalent to adding \&quot;auto&#x3D;webp\&quot; to all image optimizer requests.  | [optional]  [defaults to false]
**webp_quality** | **Number** | The default quality to use with WebP output. This can be overridden with the second option in the \&quot;quality\&quot; URL parameter on specific image optimizer requests.  | [optional]  [defaults to 85]
**jpeg_type** | **String** | The default type of JPEG output to use. This can be overridden with \&quot;format&#x3D;bjpeg\&quot; and \&quot;format&#x3D;pjpeg\&quot; on specific image optimizer requests.  | [optional]  [one of: "auto", "baseline", "progressive"]
**jpeg_quality** | **Number** | The default quality to use with JPEG output. This can be overridden with the \&quot;quality\&quot; parameter on specific image optimizer requests.  | [optional]  [defaults to 85]
**upscale** | **Boolean** | Whether or not we should allow output images to render at sizes larger than input.  | [optional]  [defaults to false]
**allow_video** | **Boolean** | Enables GIF to MP4 transformations on this service. | [optional]  [defaults to false]


[[Back to API list]](../../README.md#endpoints) [[Back to README]](../../README.md)
