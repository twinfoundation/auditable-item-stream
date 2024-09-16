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

• **options.immutableStorageType?**: `string`

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

> **create**(`metadata`?, `entries`?, `options`?, `userIdentity`?, `nodeIdentity`?): `Promise`\<`string`\>

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

• **userIdentity?**: `string`

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

> **get**\<`T`\>(`id`, `options`?, `responseType`?): `Promise`\<`JsonReturnType`\<`T`, `IAuditableItemStream`, `IJsonLdDocument`\> & `object`\>

Get a stream header without the entries.

#### Type parameters

• **T** *extends* `"json"` \| `"jsonld"` = `"json"`

#### Parameters

• **id**: `string`

The id of the stream to get.

• **options?**

Additional options for the get operation.

• **options.includeEntries?**: `boolean`

Whether to include the entries, defaults to false.

• **options.includeDeleted?**: `boolean`

Whether to include deleted entries, defaults to false.

• **responseType?**: `T`

The response type to return, defaults to application/json.

#### Returns

`Promise`\<`JsonReturnType`\<`T`, `IAuditableItemStream`, `IJsonLdDocument`\> & `object`\>

The stream and entries if found.

#### Implementation of

`IAuditableItemStreamComponent.get`

#### Throws

NotFoundError if the stream is not found

***

### update()

> **update**(`id`, `metadata`?, `userIdentity`?, `nodeIdentity`?): `Promise`\<`void`\>

Update a stream.

#### Parameters

• **id**: `string`

The id of the stream to update.

• **metadata?**: `IJsonLdNodeObject`

The metadata for the stream as JSON-LD.

• **userIdentity?**: `string`

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

> **query**\<`T`\>(`conditions`?, `orderBy`?, `orderByDirection`?, `properties`?, `cursor`?, `pageSize`?, `responseType`?): `Promise`\<`object`\>

Query all the streams, will not return entries.

#### Type parameters

• **T** *extends* `"json"` \| `"jsonld"` = `"json"`

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

• **responseType?**: `T`

The response type to return, defaults to application/json.

#### Returns

`Promise`\<`object`\>

The entities, which can be partial if a limited keys list was provided.

##### entities

> **entities**: `JsonReturnType`\<`T`, `Partial`\<`Omit`\<`IAuditableItemStream`, `"entries"`\>\>[], `IJsonLdDocument`[]\>

The entities, which can be partial if a limited keys list was provided.

##### cursor?

> `optional` **cursor**: `string`

An optional cursor, when defined can be used to call find to get more entities.

#### Implementation of

`IAuditableItemStreamComponent.query`

***

### createEntry()

> **createEntry**(`id`, `entryMetadata`?, `userIdentity`?, `nodeIdentity`?): `Promise`\<`string`\>

Create an entry in the stream.

#### Parameters

• **id**: `string`

The id of the stream to update.

• **entryMetadata?**: `IJsonLdNodeObject`

The metadata for the stream as JSON-LD.

• **userIdentity?**: `string`

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

> **getEntry**\<`T`\>(`id`, `entryId`, `responseType`?): `Promise`\<`JsonReturnType`\<`T`, `IAuditableItemStreamEntry`, `IJsonLdDocument`\>\>

Get the entry from the stream.

#### Type parameters

• **T** *extends* `"json"` \| `"jsonld"` = `"json"`

#### Parameters

• **id**: `string`

The id of the stream to get.

• **entryId**: `string`

The id of the stream entry to get.

• **responseType?**: `T`

The response type to return, defaults to application/json.

#### Returns

`Promise`\<`JsonReturnType`\<`T`, `IAuditableItemStreamEntry`, `IJsonLdDocument`\>\>

The stream and entries if found.

#### Implementation of

`IAuditableItemStreamComponent.getEntry`

#### Throws

NotFoundError if the stream is not found.

***

### updateEntry()

> **updateEntry**(`id`, `entryId`, `entryMetadata`?, `userIdentity`?, `nodeIdentity`?): `Promise`\<`void`\>

Update an entry in the stream.

#### Parameters

• **id**: `string`

The id of the stream to update.

• **entryId**: `string`

The id of the entry to update.

• **entryMetadata?**: `IJsonLdNodeObject`

The metadata for the entry as JSON-LD.

• **userIdentity?**: `string`

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

> **removeEntry**(`id`, `entryId`, `userIdentity`?, `nodeIdentity`?): `Promise`\<`void`\>

Delete from the stream.

#### Parameters

• **id**: `string`

The id of the stream to update.

• **entryId**: `string`

The id of the entry to delete.

• **userIdentity?**: `string`

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

> **getEntries**\<`T`\>(`id`, `options`?, `responseType`?): `Promise`\<`object`\>

Get the entries for the stream.

#### Type parameters

• **T** *extends* `"json"` \| `"jsonld"` = `"json"`

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

• **responseType?**: `T`

The response type to return, defaults to application/json.

#### Returns

`Promise`\<`object`\>

The stream and entries if found.

##### entries

> **entries**: `JsonReturnType`\<`T`, `IAuditableItemStreamEntry`[], `IJsonLdDocument`[]\>

##### cursor?

> `optional` **cursor**: `string`

#### Implementation of

`IAuditableItemStreamComponent.getEntries`

#### Throws

NotFoundError if the stream is not found.
