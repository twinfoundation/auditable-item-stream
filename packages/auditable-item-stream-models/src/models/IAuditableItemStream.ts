// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdNodeObject } from "@gtsc/data-json-ld";
import type { IAuditableItemStreamEntry } from "./IAuditableItemStreamEntry";

/**
 * Interface describing an auditable item stream.
 */
export interface IAuditableItemStream {
	/**
	 * The id of the stream.
	 */
	id: string;

	/**
	 * The timestamp of when the stream was created.
	 */
	created: number;

	/**
	 * The timestamp of when the stream was updated.
	 */
	updated?: number;

	/**
	 * The identity of the node which controls the stream.
	 */
	nodeIdentity?: string;

	/**
	 * The metadata to associate with the entry as JSON-LD.
	 */
	metadata?: IJsonLdNodeObject;

	/**
	 * Entries in the stream.
	 */
	entries?: IAuditableItemStreamEntry[];
}
