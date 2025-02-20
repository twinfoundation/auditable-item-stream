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
	 * The context root for the common types.
	 */
	ContextRootCommon: "https://schema.twindev.org/common/",

	/**
	 * Represents auditable item stream.
	 */
	Stream: "AuditableItemStream",

	/**
	 * Represents auditable item stream list.
	 */
	StreamList: "AuditableItemStreamList",

	/**
	 * Represents auditable item stream credential.
	 */
	StreamCredential: "AuditableItemStreamCredential",

	/**
	 * Represents auditable item stream entry.
	 */
	StreamEntry: "AuditableItemStreamEntry",

	/**
	 * Represents auditable item stream entry list.
	 */
	StreamEntryList: "AuditableItemStreamEntryList",

	/**
	 * Represents auditable item stream entry credential.
	 */
	StreamEntryCredential: "AuditableItemStreamEntryCredential",

	/**
	 * Represents auditable item stream entry object list.
	 */
	StreamEntryObjectList: "AuditableItemStreamEntryObjectList",

	/**
	 * Represents auditable item stream verification.
	 */
	Verification: "AuditableItemStreamVerification",

	/**
	 * Represents auditable item stream verification state.
	 */
	VerificationState: "AuditableItemStreamVerificationState"
} as const;

/**
 * The types of auditable item stream data.
 */
export type AuditableItemStreamTypes =
	(typeof AuditableItemStreamTypes)[keyof typeof AuditableItemStreamTypes];
