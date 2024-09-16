# Interface: IAuditableItemStreamCredential

Interface describing the immutable credential for a stream.

## Properties

### created

> **created**: `number`

The timestamp of when the stream was created.

***

### nodeIdentity

> **nodeIdentity**: `string`

The identity of the node which controls the stream.

***

### userIdentity

> **userIdentity**: `string`

The identity of the user which added the stream.

***

### hash

> **hash**: `string`

The hash of the stream.

***

### signature

> **signature**: `string`

The signature of the stream.
