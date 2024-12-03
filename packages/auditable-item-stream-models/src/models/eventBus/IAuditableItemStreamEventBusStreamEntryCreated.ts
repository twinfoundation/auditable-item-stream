// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Event bus payload for stream entry created.
 */
export interface IAuditableItemStreamEventBusStreamEntryCreated {
	/**
	 * The id of the stream containing the entry.
	 */
	id: string;

	/**
	 * The id of the stream entry created.
	 */
	entryId: string;
}
