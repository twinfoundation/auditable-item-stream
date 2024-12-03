// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Event bus payload for stream deleted.
 */
export interface IAuditableItemStreamEventBusStreamDeleted {
	/**
	 * The id of the stream deleted.
	 */
	id: string;
}
