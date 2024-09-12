// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Configuration for the auditable item stream service.
 */
export interface IAuditableItemStreamServiceConfig {
	/**
	 * The key to use for the stream.
	 * @default auditable-item-stream
	 */
	vaultKeyId?: string;

	/**
	 * The assertion method id to use for the stream.
	 * @default auditable-item-stream
	 */
	assertionMethodId?: string;
}
