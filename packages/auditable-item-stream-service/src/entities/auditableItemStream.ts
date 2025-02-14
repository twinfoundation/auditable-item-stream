// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { type IJsonLdNodeObject, JsonLdTypes } from "@twin.org/data-json-ld";
import { entity, property, SortDirection } from "@twin.org/entity";

/**
 * Class describing the auditable item stream.
 */
@entity()
export class AuditableItemStream {
	/**
	 * The id of the stream.
	 */
	@property({ type: "string", isPrimary: true })
	public id!: string;

	/**
	 * The date/time of when the stream was created.
	 */
	@property({ type: "string", format: "date-time", sortDirection: SortDirection.Descending })
	public dateCreated!: string;

	/**
	 * The date/time of when the stream was modified.
	 */
	@property({ type: "string", format: "date-time", sortDirection: SortDirection.Descending })
	public dateModified?: string;

	/**
	 * The identity of the node which controls the stream.
	 */
	@property({ type: "string" })
	public nodeIdentity!: string;

	/**
	 * The identity of the user which created the stream.
	 */
	@property({ type: "string" })
	public userIdentity!: string;

	/**
	 * Object to associate with the stream as JSON-LD.
	 */
	@property({ type: "object", itemTypeRef: JsonLdTypes.Object })
	public annotationObject?: IJsonLdNodeObject;

	/**
	 * The counter for the entry index.
	 */
	@property({ type: "integer" })
	public indexCounter!: number;

	/**
	 * After how many entries do we add immutable checks.
	 */
	@property({ type: "integer" })
	public immutableInterval!: number;

	/**
	 * The immutable proof id.
	 */
	@property({ type: "string" })
	public proofId?: string;
}
