// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Interface describing the immutable credential for a stream.
 */
export interface IAuditableItemStreamCredential {
	/**
	 * The timestamp of when the stream was created.
	 */
	created: number;

	/**
	 * The identity of the node which controls the stream.
	 */
	nodeIdentity: string;

	/**
	 * The identity of the user which added the stream.
	 */
	userIdentity: string;

	/**
	 * The hash of the stream.
	 */
	hash: string;

	/**
	 * The signature of the stream.
	 */
	signature: string;
}
