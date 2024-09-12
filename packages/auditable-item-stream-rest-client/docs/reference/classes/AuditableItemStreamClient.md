# Class: AuditableItemStreamClient

Client for performing auditable item stream through to REST endpoints.

## Extends

- `BaseRestClient`

## Implements

- `IAuditableItemStreamComponent`

## Constructors

### new AuditableItemStreamClient()

> **new AuditableItemStreamClient**(`config`): [`AuditableItemStreamClient`](AuditableItemStreamClient.md)

Create a new instance of AuditableItemStreamClient.

#### Parameters

• **config**: `IBaseRestClientConfig`

The configuration for the client.

#### Returns

[`AuditableItemStreamClient`](AuditableItemStreamClient.md)

#### Overrides

`BaseRestClient.constructor`

## Properties

### CLASS\_NAME

> `readonly` **CLASS\_NAME**: `string`

Runtime name for the class.

#### Implementation of

`IAuditableItemStreamComponent.CLASS_NAME`

## Methods

### create()

> **create**(`metadata`?, `entries`?): `Promise`\<`string`\>

Create a new stream.

#### Parameters

• **metadata?**: `IJsonLdNodeObject`

The metadata for the stream as JSON-LD.

• **entries?**: `object`[]

Entries to store in the stream.

#### Returns

`Promise`\<`string`\>

The id of the new stream item.

#### Implementation of

`IAuditableItemStreamComponent.create`

***

### get()

> **get**(`id`, `options`?, `responseType`?): `Promise`\<IJsonLdDocument \| IAuditableItemStream & `object`\>

Get a stream header without the entries.

#### Parameters

• **id**: `string`

The id of the stream to get.

• **options?**

Additional options for the get operation.

• **options.includeEntries?**: `boolean`

Whether to include the entries, defaults to false.

• **options.includeDeleted?**: `boolean`

Whether to include deleted entries, defaults to false.

• **responseType?**: `"application/json"` \| `"application/ld+json"`

The response type to return, defaults to application/json.

#### Returns

`Promise`\<IJsonLdDocument \| IAuditableItemStream & `object`\>

The stream and entries if found.

#### Implementation of

`IAuditableItemStreamComponent.get`

#### Throws

NotFoundError if the stream is not found

***

### update()

> **update**(`id`, `metadata`?): `Promise`\<`void`\>

Update a stream.

#### Parameters

• **id**: `string`

The id of the stream to update.

• **metadata?**: `IJsonLdNodeObject`

The metadata for the stream as JSON-LD.

#### Returns

`Promise`\<`void`\>

Nothing.

#### Implementation of

`IAuditableItemStreamComponent.update`

***

### query()

> **query**(`conditions`?, `orderBy`?, `orderByDirection`?, `properties`?, `cursor`?, `pageSize`?, `responseType`?): `Promise`\<`object`\>

Query all the streams, will not return entries.

#### Parameters

• **conditions?**: `IComparator`[]

Conditions to use in the query.

• **orderBy?**: `"created"` \| `"updated"`

The order for the results, defaults to created.

• **orderByDirection?**: `SortDirection`

The direction for the order, defaults to descending.

• **properties?**: keyof `IAuditableItemStream`[]

The properties to return, if not provided defaults to id, created and metadata.

• **cursor?**: `string`

The cursor to request the next page of entities.

• **pageSize?**: `number`

The maximum number of entities in a page.

• **responseType?**: `"application/json"` \| `"application/ld+json"`

The response type to return, defaults to application/json.

#### Returns

`Promise`\<`object`\>

The entities, which can be partial if a limited keys list was provided.

##### entities

> **entities**: (`IJsonLdDocument` \| `Partial`\<`Omit`\<`IAuditableItemStream`, `"entries"`\>\>)[]

The entities, which can be partial if a limited keys list was provided.

##### cursor?

> `optional` **cursor**: `string`

An optional cursor, when defined can be used to call find to get more entities.

#### Implementation of

`IAuditableItemStreamComponent.query`

***

### createEntry()

> **createEntry**(`id`, `entryMetadata`?): `Promise`\<`string`\>

Create an entry in the stream.

#### Parameters

• **id**: `string`

The id of the stream to update.

• **entryMetadata?**: `IJsonLdNodeObject`

The metadata for the stream as JSON-LD.

#### Returns

`Promise`\<`string`\>

The id of the created entry, if not provided.

#### Implementation of

`IAuditableItemStreamComponent.createEntry`

***

### getEntry()

> **getEntry**(`id`, `entryId`, `responseType`?): `Promise`\<`IJsonLdDocument` \| `IAuditableItemStreamEntry`\>

Get the entry from the stream.

#### Parameters

• **id**: `string`

The id of the stream to get.

• **entryId**: `string`

The id of the stream entry to get.

• **responseType?**: `"application/json"` \| `"application/ld+json"`

The response type to return, defaults to application/json.

#### Returns

`Promise`\<`IJsonLdDocument` \| `IAuditableItemStreamEntry`\>

The stream and entries if found.

#### Implementation of

`IAuditableItemStreamComponent.getEntry`

#### Throws

NotFoundError if the stream is not found.

***

### updateEntry()

> **updateEntry**(`id`, `entryId`, `entryMetadata`?): `Promise`\<`void`\>

Update an entry in the stream.

#### Parameters

• **id**: `string`

The id of the stream to update.

• **entryId**: `string`

The id of the entry to update.

• **entryMetadata?**: `IJsonLdNodeObject`

The metadata for the entry as JSON-LD.

#### Returns

`Promise`\<`void`\>

Nothing.

#### Implementation of

`IAuditableItemStreamComponent.updateEntry`

***

### removeEntry()

> **removeEntry**(`id`, `entryId`): `Promise`\<`void`\>

Delete from the stream.

#### Parameters

• **id**: `string`

The id of the stream to update.

• **entryId**: `string`

The id of the entry to delete.

#### Returns

`Promise`\<`void`\>

Nothing.

#### Implementation of

`IAuditableItemStreamComponent.removeEntry`

***

### getEntries()

> **getEntries**(`id`, `options`?, `responseType`?): `Promise`\<`object`\>

Get the entries for the stream.

#### Parameters

• **id**: `string`

The id of the stream to get.

• **options?**

Additional options for the get operation.

• **options.conditions?**: `IComparator`[]

The conditions to filter the stream.

• **options.includeDeleted?**: `boolean`

Whether to include deleted entries, defaults to false.

• **options.pageSize?**: `number`

How many entries to return.

• **options.cursor?**: `string`

Cursor to use for next chunk of data.

• **options.order?**: `SortDirection`

Retrieve the entries in ascending/descending time order, defaults to Ascending.

• **responseType?**: `"application/json"` \| `"application/ld+json"`

The response type to return, defaults to application/json.

#### Returns

`Promise`\<`object`\>

The stream and entries if found.

##### entries

> **entries**: `IAuditableItemStreamEntry`[] \| `IJsonLdDocument`[]

##### cursor?

> `optional` **cursor**: `string`

#### Implementation of

`IAuditableItemStreamComponent.getEntries`

#### Throws

NotFoundError if the stream is not found.
