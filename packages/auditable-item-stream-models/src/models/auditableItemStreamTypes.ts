// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The types of auditable item stream data.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const AuditableItemStreamTypes = {
	/**
	 * The context uri for the auditable item stream types.
	 */
	ContextUri: "https://schema.gtsc.io/ais/",

	/**
	 * The context root for the auditable item stream types.
	 */
	ContextJsonld: "https://schema.gtsc.io/ais/types.jsonld",

	/**
	 * Represents auditable item stream.
	 */
	Stream: "https://schema.gtsc.io/aig/AuditableItemStream",

	/**
	 * Represents auditable item stream credential.
	 */
	StreamCredential: "https://schema.gtsc.io/aig/AuditableItemStreamCredential",

	/**
	 * Represents auditable item stream entry.
	 */
	StreamEntry: "https://schema.gtsc.io/aig/AuditableItemStreamEntry",

	/**
	 * Represents auditable item stream entry credential.
	 */
	StreamEntryCredential: "https://schema.gtsc.io/aig/AuditableItemStreamEntryCredential"
} as const;

/**
 * The types of auditable item stream data.
 */
export type AuditableItemStreamTypes =
	(typeof AuditableItemStreamTypes)[keyof typeof AuditableItemStreamTypes];
