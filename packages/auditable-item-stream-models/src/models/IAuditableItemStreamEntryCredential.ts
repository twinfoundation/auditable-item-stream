// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { AuditableItemStreamTypes } from "./auditableItemStreamTypes";

/**
 * Interface describing the immutable credential for an entry in the stream.
 */
export interface IAuditableItemStreamEntryCredential {
	/**
	 * JSON-LD Context.
	 */
	"@context":
		| typeof AuditableItemStreamTypes.ContextRoot
		| [typeof AuditableItemStreamTypes.ContextRoot, ...string[]];

	/**
	 * JSON-LD Type.
	 */
	type: typeof AuditableItemStreamTypes.StreamEntryCredential;

	/**
	 * The date/time of when the stream was created.
	 */
	dateCreated: string;

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
