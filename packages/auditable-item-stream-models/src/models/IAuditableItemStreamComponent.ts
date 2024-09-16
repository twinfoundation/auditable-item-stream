// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@gtsc/core";
import type { IJsonLdDocument, IJsonLdNodeObject } from "@gtsc/data-json-ld";
import type { IComparator, SortDirection } from "@gtsc/entity";
import type { IAuditableItemStream } from "./IAuditableItemStream";
import type { IAuditableItemStreamEntry } from "./IAuditableItemStreamEntry";

/**
 * The return type based on the response type.
 */
export type JsonReturnType<T, U, V> = T extends "json" ? U : V;

/**
 * Interface describing an auditable item stream contract.
 */
export interface IAuditableItemStreamComponent extends IComponent {
	/**
	 * Create a new stream.
	 * @param metadata The metadata for the stream as JSON-LD.
	 * @param entries Entries to store in the stream.
	 * @param options Options for creating the stream.
	 * @param options.immutableInterval After how many entries do we add immutable checks, defaults to service configured value.
	 * A value of 0 will disable immutable checks, 1 will be every item, or <n> for an interval.
	 * @param userIdentity The identity to create the auditable item stream operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns The id of the new stream item.
	 */
	create(
		metadata?: IJsonLdNodeObject,
		entries?: {
			metadata?: IJsonLdNodeObject;
		}[],
		options?: {
			immutableInterval?: number;
		},
		userIdentity?: string,
		nodeIdentity?: string
	): Promise<string>;

	/**
	 * Update a stream.
	 * @param id The id of the stream to update.
	 * @param metadata The metadata for the stream as JSON-LD.
	 * @param userIdentity The identity to create the auditable item stream operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns Nothing.
	 */
	update(
		id: string,
		metadata?: IJsonLdNodeObject,
		userIdentity?: string,
		nodeIdentity?: string
	): Promise<void>;

	/**
	 * Get a stream header without the entries.
	 * @param id The id of the stream to get.
	 * @param options Additional options for the get operation.
	 * @param options.includeEntries Whether to include the entries, defaults to false.
	 * @param options.includeDeleted Whether to include deleted entries, defaults to false.
	 * @param responseType Should the response be JSON-LD.
	 * @returns The stream and entries if found.
	 * @throws NotFoundError if the stream is not found.
	 */
	get<T extends "json" | "jsonld" = "json">(
		id: string,
		options?: {
			includeEntries?: boolean;
			includeDeleted?: boolean;
		},
		responseType?: T
	): Promise<
		JsonReturnType<T, IAuditableItemStream, IJsonLdDocument> & {
			cursor?: string;
		}
	>;

	/**
	 * Query all the streams, will not return entries.
	 * @param conditions Conditions to use in the query.
	 * @param orderBy The order for the results, defaults to created.
	 * @param orderByDirection The direction for the order, defaults to descending.
	 * @param properties The properties to return, if not provided defaults to id, created and metadata.
	 * @param cursor The cursor to request the next page of entities.
	 * @param pageSize The maximum number of entities in a page.
	 * @param responseType The response type to return, defaults to application/json.
	 * @returns The entities, which can be partial if a limited keys list was provided.
	 */
	query<T extends "json" | "jsonld" = "json">(
		conditions?: IComparator[],
		orderBy?: "created" | "updated",
		orderByDirection?: SortDirection,
		properties?: (keyof IAuditableItemStream)[],
		cursor?: string,
		pageSize?: number,
		responseType?: T
	): Promise<{
		/**
		 * The entities, which can be partial if a limited keys list was provided.
		 */
		entities: JsonReturnType<
			T,
			Partial<Omit<IAuditableItemStream, "entries">>[],
			IJsonLdDocument[]
		>;

		/**
		 * An optional cursor, when defined can be used to call find to get more entities.
		 */
		cursor?: string;
	}>;

	/**
	 * Create an entry in the stream.
	 * @param id The id of the stream to update.
	 * @param entryMetadata The metadata for the stream as JSON-LD.
	 * @param userIdentity The identity to create the auditable item stream operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns The id of the created entry, if not provided.
	 */
	createEntry(
		id: string,
		entryMetadata?: IJsonLdNodeObject,
		userIdentity?: string,
		nodeIdentity?: string
	): Promise<string>;

	/**
	 * Get the entry from the stream.
	 * @param id The id of the stream to get.
	 * @param entryId The id of the stream entry to get.
	 * @param responseType The response type to return, defaults to application/json.
	 * @returns The stream and entries if found.
	 * @throws NotFoundError if the stream is not found.
	 */
	getEntry<T extends "json" | "jsonld" = "json">(
		id: string,
		entryId: string,
		responseType?: T
	): Promise<JsonReturnType<T, IAuditableItemStreamEntry, IJsonLdDocument>>;

	/**
	 * Update an entry in the stream.
	 * @param id The id of the stream to update.
	 * @param entryId The id of the entry to update.
	 * @param entryMetadata The metadata for the entry as JSON-LD.
	 * @param userIdentity The identity to create the auditable item stream operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns Nothing.
	 */
	updateEntry(
		id: string,
		entryId: string,
		entryMetadata?: IJsonLdNodeObject,
		userIdentity?: string,
		nodeIdentity?: string
	): Promise<void>;

	/**
	 * Delete from the stream.
	 * @param id The id of the stream to update.
	 * @param entryId The id of the entry to delete.
	 * @param identity The identity to create the auditable item stream operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns Nothing.
	 */
	removeEntry(id: string, entryId: string, identity?: string, nodeIdentity?: string): Promise<void>;

	/**
	 * Get the entries for the stream.
	 * @param id The id of the stream to get.
	 * @param options Additional options for the get operation.
	 * @param options.conditions The conditions to filter the stream.
	 * @param options.includeDeleted Whether to include deleted entries, defaults to false.
	 * @param options.pageSize How many entries to return.
	 * @param options.cursor Cursor to use for next chunk of data.
	 * @param options.order Retrieve the entries in ascending/descending time order, defaults to Ascending.
	 * @param responseType The response type to return, defaults to application/json.
	 * @returns The stream and entries if found.
	 * @throws NotFoundError if the stream is not found.
	 */
	getEntries<T extends "json" | "jsonld" = "json">(
		id: string,
		options?: {
			conditions?: IComparator[];
			includeDeleted?: boolean;
			pageSize?: number;
			cursor?: string;
			order?: SortDirection;
		},
		responseType?: T
	): Promise<{
		entries: JsonReturnType<T, IAuditableItemStreamEntry[], IJsonLdDocument[]>;
		cursor?: string;
	}>;
}
