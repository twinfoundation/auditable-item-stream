// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Context for the auditable item stream service.
 */
export interface IAuditableItemStreamServiceContext {
	/**
	 * The current timestamp.
	 */
	now: number;

	/**
	 * The identity of the user.
	 */
	userIdentity: string;

	/**
	 * The identity of the node.
	 */
	nodeIdentity: string;

	/**
	 * The index counter.
	 */
	indexCounter: number;

	/**
	 * The immutable check interval.
	 */
	immutableInterval: number;
}
