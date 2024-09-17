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

	/**
	 * After how many entries do we add immutable checks, defaults to service configured value.
	 * A value of 0 will disable integrity checks, 1 will be every item, or any other integer for an interval.
	 * You can override this value on stream creation.
	 * @default 10
	 */
	defaultImmutableInterval?: number;
}
