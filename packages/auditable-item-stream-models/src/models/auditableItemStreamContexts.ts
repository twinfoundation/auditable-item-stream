// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The contexts of auditable item stream data.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const AuditableItemStreamContexts = {
	/**
	 * The context root for the auditable item stream types.
	 */
	ContextRoot: "https://schema.twindev.org/ais/",

	/**
	 * The context root for the common types.
	 */
	ContextRootCommon: "https://schema.twindev.org/common/"
} as const;

/**
 * The types of auditable item stream data.
 */
export type AuditableItemStreamContexts =
	(typeof AuditableItemStreamContexts)[keyof typeof AuditableItemStreamContexts];
