// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { JsonLdTypes, type IJsonLdNodeObject } from "@gtsc/data-json-ld";
import { entity, property } from "@gtsc/entity";

/**
 * Class describing the auditable item stream entry.
 */
@entity()
export class AuditableItemStreamEntry {
	/**
	 * The id of the entry.
	 */
	@property({ type: "string", isPrimary: true })
	public id!: string;

	/**
	 * The stream that the entry belongs to.
	 */
	@property({ type: "string" })
	public streamId!: string;

	/**
	 * The timestamp of when the entry was created.
	 */
	@property({ type: "number" })
	public created!: number;

	/**
	 * The timestamp of when the entry was updated.
	 */
	@property({ type: "number" })
	public updated?: number;

	/**
	 * The timestamp of when the entry was deleted, as we never actually remove items.
	 */
	@property({ type: "number" })
	public deleted?: number;

	/**
	 * The identity of the user that added the entry.
	 */
	@property({ type: "string" })
	public userIdentity?: string;

	/**
	 * Object to associate with the entry as JSON-LD.
	 */
	@property({ type: "object", itemTypeRef: JsonLdTypes.NodeObject })
	public object!: IJsonLdNodeObject;

	/**
	 * The index of the entry in the stream.
	 */
	@property({ type: "integer" })
	public index!: number;

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
