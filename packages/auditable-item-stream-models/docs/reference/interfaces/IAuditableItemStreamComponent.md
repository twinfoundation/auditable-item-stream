# Interface: IAuditableItemStreamComponent

Interface describing an auditable item stream contract.

## Extends

- `IComponent`

## Methods

### create()

> **create**(`metadata`?, `entries`?, `options`?, `identity`?, `nodeIdentity`?): `Promise`\<`string`\>

Create a new stream.

#### Parameters

• **metadata?**: `IJsonLdNodeObject`

The metadata for the stream as JSON-LD.

• **entries?**: `object`[]

Entries to store in the stream.

• **options?**

Options for creating the stream.

• **options.immutableInterval?**: `number`

After how many entries do we add immutable checks, defaults to service configured value.
A value of 0 will disable immutable checks, 1 will be every item, or <n> for an interval.

• **identity?**: `string`

The identity to create the auditable item stream operation with.

• **nodeIdentity?**: `string`

The node identity to use for vault operations.

#### Returns

`Promise`\<`string`\>

The id of the new stream item.

***

### update()

> **update**(`id`, `metadata`?, `identity`?, `nodeIdentity`?): `Promise`\<`void`\>

Update a stream.

#### Parameters

• **id**: `string`

The id of the stream to update.

• **metadata?**: `IJsonLdNodeObject`

The metadata for the stream as JSON-LD.

• **identity?**: `string`

The identity to create the auditable item stream operation with.

• **nodeIdentity?**: `string`

The node identity to use for vault operations.

#### Returns

`Promise`\<`void`\>

Nothing.

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

#### Throws

NotFoundError if the stream is not found.

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

• **properties?**: keyof [`IAuditableItemStream`](IAuditableItemStream.md)[]

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

> **entities**: (`IJsonLdDocument` \| `Partial`\<`Omit`\<[`IAuditableItemStream`](IAuditableItemStream.md), `"entries"`\>\>)[]

The entities, which can be partial if a limited keys list was provided.

##### cursor?

> `optional` **cursor**: `string`

An optional cursor, when defined can be used to call find to get more entities.

***

### createEntry()

> **createEntry**(`id`, `entryMetadata`?, `identity`?, `nodeIdentity`?): `Promise`\<`string`\>

Create an entry in the stream.

#### Parameters

• **id**: `string`

The id of the stream to update.

• **entryMetadata?**: `IJsonLdNodeObject`

The metadata for the stream as JSON-LD.

• **identity?**: `string`

The identity to create the auditable item stream operation with.

• **nodeIdentity?**: `string`

The node identity to use for vault operations.

#### Returns

`Promise`\<`string`\>

The id of the created entry, if not provided.

***

### getEntry()

> **getEntry**(`id`, `entryId`, `responseType`?): `Promise`\<`IJsonLdDocument` \| [`IAuditableItemStreamEntry`](IAuditableItemStreamEntry.md)\>

Get the entry from the stream.

#### Parameters

• **id**: `string`

The id of the stream to get.

• **entryId**: `string`

The id of the stream entry to get.

• **responseType?**: `"application/json"` \| `"application/ld+json"`

The response type to return, defaults to application/json.

#### Returns

`Promise`\<`IJsonLdDocument` \| [`IAuditableItemStreamEntry`](IAuditableItemStreamEntry.md)\>

The stream and entries if found.

#### Throws

NotFoundError if the stream is not found.

***

### updateEntry()

> **updateEntry**(`id`, `entryId`, `entryMetadata`?, `identity`?, `nodeIdentity`?): `Promise`\<`void`\>

Update an entry in the stream.

#### Parameters

• **id**: `string`

The id of the stream to update.

• **entryId**: `string`

The id of the entry to update.

• **entryMetadata?**: `IJsonLdNodeObject`

The metadata for the entry as JSON-LD.

• **identity?**: `string`

The identity to create the auditable item stream operation with.

• **nodeIdentity?**: `string`

The node identity to use for vault operations.

#### Returns

`Promise`\<`void`\>

Nothing.

***

### removeEntry()

> **removeEntry**(`id`, `entryId`, `identity`?, `nodeIdentity`?): `Promise`\<`void`\>

Delete from the stream.

#### Parameters

• **id**: `string`

The id of the stream to update.

• **entryId**: `string`

The id of the entry to delete.

• **identity?**: `string`

The identity to create the auditable item stream operation with.

• **nodeIdentity?**: `string`

The node identity to use for vault operations.

#### Returns

`Promise`\<`void`\>

Nothing.

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

> **entries**: [`IAuditableItemStreamEntry`](IAuditableItemStreamEntry.md)[] \| `IJsonLdDocument`[]

##### cursor?

> `optional` **cursor**: `string`

#### Throws

NotFoundError if the stream is not found.
