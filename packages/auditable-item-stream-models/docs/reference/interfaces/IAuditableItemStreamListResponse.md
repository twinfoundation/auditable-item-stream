# Interface: IAuditableItemStreamListResponse

The response to getting the a list of the streams.

## Properties

### headers?

> `optional` **headers**: `object`

The headers which can be used to determine the response data type.

#### Content-Type

> **Content-Type**: `"application/json"` \| `"application/ld+json"`

***

### body

> **body**: `object`

The response payload.

#### entities

> **entities**: (`IJsonLdDocument` \| `Partial`\<`Omit`\<[`IAuditableItemStream`](IAuditableItemStream.md), `"entries"`\>\>)[]

The entities, which can be partial if a limited keys list was provided.

#### cursor?

> `optional` **cursor**: `string`

An optional cursor, when defined can be used to call find to get more entities.
