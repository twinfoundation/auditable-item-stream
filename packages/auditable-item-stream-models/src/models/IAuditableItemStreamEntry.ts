// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdNodeObject } from "@gtsc/data-json-ld";

/**
 * Interface describing an entry for the stream.
 */
export interface IAuditableItemStreamEntry {
	/**
	 * The id of the entry.
	 */
	id: string;

	/**
	 * The timestamp of when the entry was created.
	 */
	created: number;

	/**
	 * The timestamp of when the entry was updated.
	 */
	updated?: number;

	/**
	 * The timestamp of when the entry was deleted, as we never actually remove items.
	 */
	deleted?: number;

	/**
	 * The identity of the user which added the entry to the stream.
	 */
	userIdentity?: string;

	/**
	 * The metadata to associate with the entry as JSON-LD.
	 */
	metadata?: IJsonLdNodeObject;
}
