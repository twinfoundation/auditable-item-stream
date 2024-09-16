// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { JsonLdTypes, type IJsonLdNodeObject } from "@gtsc/data-json-ld";
import { entity, property, SortDirection } from "@gtsc/entity";

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
	 * The timestamp of when the stream was created.
	 */
	@property({ type: "number", sortDirection: SortDirection.Descending })
	public created!: number;

	/**
	 * The timestamp of when the stream was last updated.
	 */
	@property({ type: "number", sortDirection: SortDirection.Descending })
	public updated?: number;

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
	 * Metadata to associate with the stream as JSON-LD.
	 */
	@property({ type: "object", itemTypeRef: JsonLdTypes.NodeObject })
	public metadata?: IJsonLdNodeObject;

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
	 * The hash of the entry.
	 */
	@property({ type: "string" })
	public hash!: string;

	/**
	 * The signature of the entry.
	 */
	@property({ type: "string" })
	public signature!: string;

	/**
	 * The immutable storage id.
	 */
	@property({ type: "string" })
	public immutableStorageId?: string;
}
