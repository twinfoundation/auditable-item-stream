# Class: AuditableItemStreamService

Class for performing auditable item stream operations.

## Implements

- `IAuditableItemStreamComponent`

## Constructors

### new AuditableItemStreamService()

> **new AuditableItemStreamService**(`options`?): [`AuditableItemStreamService`](AuditableItemStreamService.md)

Create a new instance of AuditableItemStreamService.

#### Parameters

• **options?**

The dependencies for the auditable item stream connector.

• **options.vaultConnectorType?**: `string`

The vault connector type, defaults to "vault".

• **options.streamEntityStorageType?**: `string`

The entity storage for stream, defaults to "auditable-item-stream".

• **options.streamEntryEntityStorageType?**: `string`

The entity storage for stream entries, defaults to "auditable-item-stream-entry".

• **options.integrityImmutableStorageType?**: `string`

The immutable storage for audit trail, defaults to "auditable-item-stream".

• **options.identityConnectorType?**: `string`

The identity connector type, defaults to "identity".

• **options.config?**: [`IAuditableItemStreamServiceConfig`](../interfaces/IAuditableItemStreamServiceConfig.md)

The configuration for the connector.

#### Returns

[`AuditableItemStreamService`](AuditableItemStreamService.md)

## Properties

### NAMESPACE

> `static` `readonly` **NAMESPACE**: `string` = `"ais"`

The namespace for the service.

***

### CLASS\_NAME

> `readonly` **CLASS\_NAME**: `string`

Runtime name for the class.

#### Implementation of

`IAuditableItemStreamComponent.CLASS_NAME`

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
A value of 0 will disable integrity checks, 1 will be every item, or <n> for an interval.

• **identity?**: `string`

The identity to create the auditable item stream operation with.

• **nodeIdentity?**: `string`

The node identity to use for vault operations.

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

#### Implementation of

`IAuditableItemStreamComponent.updateEntry`

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
