// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Delete from an auditable item stream.
 */
export interface IAuditableItemStreamDeleteEntryRequest {
	/**
	 * The path parameters.
	 */
	pathParams: {
		/**
		 * The id of the stream to remove the entry from.
		 */
		id: string;

		/**
		 * The id of the entry to remove.
		 */
		entryId: string;
	};
}
