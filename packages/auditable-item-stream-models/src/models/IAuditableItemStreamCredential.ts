// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { AuditableItemStreamTypes } from "./auditableItemStreamTypes";

/**
 * Interface describing the immutable credential for a stream.
 */
export interface IAuditableItemStreamCredential {
	/**
	 * JSON-LD Context.
	 */
	"@context":
		| typeof AuditableItemStreamTypes.ContextRoot
		| [typeof AuditableItemStreamTypes.ContextRoot, ...string[]];

	/**
	 * JSON-LD Type.
	 */
	type: typeof AuditableItemStreamTypes.StreamCredential;

	/**
	 * The date/time of when the stream was created.
	 */
	dateCreated: string;

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
