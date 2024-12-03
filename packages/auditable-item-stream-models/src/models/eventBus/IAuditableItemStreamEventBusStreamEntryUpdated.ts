// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Event bus payload for stream entry updated.
 */
export interface IAuditableItemStreamEventBusStreamEntryUpdated {
	/**
	 * The id of the stream containing the entry.
	 */
	id: string;

	/**
	 * The id of the stream entry updated.
	 */
	entryId: string;
}
