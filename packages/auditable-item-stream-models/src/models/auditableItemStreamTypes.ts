// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The types of auditable item stream data.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const AuditableItemStreamTypes = {
	/**
	 * The context root for the auditable item stream types.
	 */
	ContextRoot: "https://schema.twindev.org/ais/",

	/**
	 * Represents auditable item stream.
	 */
	Stream: "https://schema.twindev.org/ais/AuditableItemStream",

	/**
	 * Represents auditable item stream credential.
	 */
	StreamCredential: "https://schema.twindev.org/ais/AuditableItemStreamCredential",

	/**
	 * Represents auditable item stream entry.
	 */
	StreamEntry: "https://schema.twindev.org/ais/AuditableItemStreamEntry",

	/**
	 * Represents auditable item stream entry credential.
	 */
	StreamEntryCredential: "https://schema.twindev.org/ais/AuditableItemStreamEntryCredential",

	/**
	 * Represents auditable item stream verification.
	 */
	Verification: "https://schema.twindev.org/ais/AuditableItemStreamVerification",

	/**
	 * Represents auditable item stream verification state.
	 */
	VerificationState: "https://schema.twindev.org/ais/AuditableItemStreamVerificationState"
} as const;

/**
 * The types of auditable item stream data.
 */
export type AuditableItemStreamTypes =
	(typeof AuditableItemStreamTypes)[keyof typeof AuditableItemStreamTypes];
