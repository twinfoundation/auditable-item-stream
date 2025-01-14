// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdNodeObject } from "@twin.org/data-json-ld";
import type { IImmutableProofVerification } from "@twin.org/immutable-proof-models";
import type { AuditableItemStreamTypes } from "./auditableItemStreamTypes";

/**
 * Interface describing an entry for the stream.
 */
export interface IAuditableItemStreamEntry {
	/**
	 * JSON-LD Context.
	 */
	"@context":
		| typeof AuditableItemStreamTypes.ContextRoot
		| [typeof AuditableItemStreamTypes.ContextRoot, ...string[]];

	/**
	 * JSON-LD Type.
	 */
	type: typeof AuditableItemStreamTypes.StreamEntry;

	/**
	 * The id of the entry.
	 */
	id: string;

	/**
	 * The date/time of when the entry was created.
	 */
	dateCreated: string;

	/**
	 * The date/time of when the entry was modified.
	 */
	dateModified?: string;

	/**
	 * The date/time of when the entry was deleted, as we never actually remove items.
	 */
	dateDeleted?: string;

	/**
	 * The identity of the user which added the entry to the stream.
	 */
	userIdentity?: string;

	/**
	 * The object to associate with the entry as JSON-LD.
	 */
	entryObject: IJsonLdNodeObject;

	/**
	 * The index of the entry in the stream.
	 */
	index: number;

	/**
	 * The id of the immutable proof.
	 */
	proofId?: string;

	/**
	 * The verification of the entry.
	 */
	verification?: IImmutableProofVerification;
}
