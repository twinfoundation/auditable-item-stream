// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdNodeObject } from "@twin.org/data-json-ld";
import type { AuditableItemStreamTypes } from "./auditableItemStreamTypes";
import type { IAuditableItemStreamVerification } from "./IAuditableItemStreamVerification";

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
	 * The hash of the entry.
	 */
	hash: string;

	/**
	 * The signature of the entry.
	 */
	signature: string;

	/**
	 * The immutable storage id containing the signature for the entry.
	 */
	immutableStorageId?: string;

	/**
	 * The verification of the entry.
	 */
	entryVerification?: IAuditableItemStreamVerification;
}
