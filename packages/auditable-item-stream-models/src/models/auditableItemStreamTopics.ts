// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The topics for auditable item stream event bus notifications.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const AuditableItemStreamTopics = {
	/**
	 * A stream was created.
	 */
	StreamCreated: "auditable-item-stream:stream-created",

	/**
	 * A stream was updated.
	 */
	StreamUpdated: "auditable-item-stream:stream-updated",

	/**
	 * A stream was deleted.
	 */
	StreamDeleted: "auditable-item-stream:stream-deleted",

	/**
	 * A stream entry was created.
	 */
	StreamEntryCreated: "auditable-item-stream:stream-entry-created",

	/**
	 * A stream entry was updated.
	 */
	StreamEntryUpdated: "auditable-item-stream:stream-entry-updated",

	/**
	 * A stream entry was deleted.
	 */
	StreamEntryDeleted: "auditable-item-stream:stream-entry-deleted"
} as const;

/**
 * The topics for auditable item stream event bus notifications.
 */
export type AuditableItemStreamTopics =
	(typeof AuditableItemStreamTopics)[keyof typeof AuditableItemStreamTopics];
