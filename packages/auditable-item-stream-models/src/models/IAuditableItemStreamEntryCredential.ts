// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Interface describing the immutable credential for an entry in the stream.
 */
export interface IAuditableItemStreamEntryCredential {
	/**
	 * The timestamp of when the entry was created.
	 */
	created: number;

	/**
	 * The identity of the node which controls the stream.
	 */
	nodeIdentity: string;

	/**
	 * The identity of the user which added the entry to the stream.
	 */
	userIdentity: string;

	/**
	 * The hash of the entry.
	 */
	hash: string;

	/**
	 * The signature of the entry.
	 */
	signature: string;

	/**
	 * The index of the entry in the stream.
	 */
	index: number;
}
