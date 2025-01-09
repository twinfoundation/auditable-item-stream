// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuditableItemStreamServiceConfig } from "./IAuditableItemStreamServiceConfig";

/**
 * Options for the auditable item stream service constructor.
 */
export interface IAuditableItemStreamServiceConstructorOptions {
	/**
	 * The immutable proof component type.
	 * @default immutable-proof
	 */
	immutableProofComponentType?: string;

	/**
	 * The entity storage for stream.
	 * @default auditable-item-stream
	 */
	streamEntityStorageType?: string;

	/**
	 * The entity storage for stream entries.
	 * @default auditable-item-stream-entry
	 */
	streamEntryEntityStorageType?: string;

	/**
	 * The event bus component type, defaults to no event bus.
	 */
	eventBusComponentType?: string;

	/**
	 * The configuration for the connector.
	 */
	config?: IAuditableItemStreamServiceConfig;
}
