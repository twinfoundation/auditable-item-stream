# Interface: IAuditableItemStreamGetResponse

Response to getting an auditable item stream.

## Properties

### headers?

> `optional` **headers**: `object`

The headers which can be used to determine the response data type.

#### Content-Type

> **Content-Type**: `"application/json"` \| `"application/ld+json"`

***

### body

> **body**: IJsonLdDocument \| IAuditableItemStream & `object`

The response body, if accept header is set to application/ld+json the return object is JSON-LD document.

#### Type declaration

##### cursor?

> `optional` **cursor**: `string`

Cursor to retrieve the next chunk of data, can be used with the get entries method.
