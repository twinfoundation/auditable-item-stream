// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Event bus payload for stream created.
 */
export interface IAuditableItemStreamEventBusStreamCreated {
	/**
	 * The id of the stream created.
	 */
	id: string;
}
