// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdNodeObject } from "@twin.org/data-json-ld";
import type { AuditableItemStreamTypes } from "./auditableItemStreamTypes";
import type { IAuditableItemStreamEntry } from "./IAuditableItemStreamEntry";
import type { IAuditableItemStreamVerification } from "./IAuditableItemStreamVerification";

/**
 * Interface describing an auditable item stream.
 */
export interface IAuditableItemStream {
	/**
	 * JSON-LD Context.
	 */
	"@context":
		| typeof AuditableItemStreamTypes.ContextRoot
		| [typeof AuditableItemStreamTypes.ContextRoot, ...string[]];

	/**
	 * JSON-LD Type.
	 */
	type: typeof AuditableItemStreamTypes.Stream;

	/**
	 * The id of the stream.
	 */
	id: string;

	/**
	 * The date/time of when the stream was created.
	 */
	dateCreated: string;

	/**
	 * The date/time of when the stream was modified.
	 */
	dateModified?: string;

	/**
	 * The identity of the node which controls the stream.
	 */
	nodeIdentity: string;

	/**
	 * The identity of the user who created the stream.
	 */
	userIdentity: string;

	/**
	 * The object to associate with the entry as JSON-LD.
	 */
	streamObject?: IJsonLdNodeObject;

	/**
	 * The hash of the stream.
	 */
	hash: string;

	/**
	 * The signature of the stream.
	 */
	signature: string;

	/**
	 * The immutable storage id.
	 */
	immutableStorageId?: string;

	/**
	 * After how many entries do we add immutable checks.
	 */
	immutableInterval: number;

	/**
	 * Entries in the stream.
	 */
	entries?: IAuditableItemStreamEntry[];

	/**
	 * The cursor for the stream entries.
	 */
	cursor?: string;

	/**
	 * The verification of the stream.
	 */
	streamVerification?: IAuditableItemStreamVerification;
}
