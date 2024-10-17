// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Delete an auditable item stream.
 */
export interface IAuditableItemStreamDeleteRequest {
	/**
	 * The path parameters.
	 */
	pathParams: {
		/**
		 * The id of the stream to remove.
		 */
		id: string;
	};
}
