// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@twin.org/core";
import type { IJsonLdNodeObject } from "@twin.org/data-json-ld";
import type { IComparator, SortDirection } from "@twin.org/entity";
import type { IAuditableItemStream } from "./IAuditableItemStream";
import type { IAuditableItemStreamEntry } from "./IAuditableItemStreamEntry";
import type { IAuditableItemStreamEntryList } from "./IAuditableItemStreamEntryList";
import type { IAuditableItemStreamEntryObjectList } from "./IAuditableItemStreamEntryObjectList";
import type { IAuditableItemStreamList } from "./IAuditableItemStreamList";

/**
 * Interface describing an auditable item stream component.
 */
export interface IAuditableItemStreamComponent extends IComponent {
	/**
	 * Create a new stream.
	 * @param stream The stream to create.
	 * @param stream.annotationObject The object for the stream as JSON-LD.
	 * @param stream.entries Entries to store in the stream.
	 * @param options Options for creating the stream.
	 * @param options.immutableInterval After how many entries do we add immutable checks, defaults to service configured value.
	 * A value of 0 will disable immutable checks, 1 will be every item, or any other integer for an interval.
	 * @param userIdentity The identity to create the auditable item stream operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns The id of the new stream item.
	 */
	create(
		stream: {
			annotationObject?: IJsonLdNodeObject;
			entries?: {
				entryObject: IJsonLdNodeObject;
			}[];
		},
		options?: {
			immutableInterval?: number;
		},
		userIdentity?: string,
		nodeIdentity?: string
	): Promise<string>;

	/**
	 * Update a stream.
	 * @param stream The stream to update.
	 * @param stream.id The id of the stream to update.
	 * @param stream.annotationObject The object for the stream as JSON-LD.
	 * @param userIdentity The identity to create the auditable item stream operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns Nothing.
	 */
	update(
		stream: {
			id: string;
			annotationObject?: IJsonLdNodeObject;
		},
		userIdentity?: string,
		nodeIdentity?: string
	): Promise<void>;

	/**
	 * Get a stream header without the entries.
	 * @param id The id of the stream to get.
	 * @param options Additional options for the get operation.
	 * @param options.includeEntries Whether to include the entries, defaults to false.
	 * @param options.includeDeleted Whether to include deleted entries, defaults to false.
	 * @param options.verifyStream Should the stream be verified, defaults to false.
	 * @param options.verifyEntries Should the entries be verified, defaults to false.
	 * @returns The stream and entries if found.
	 * @throws NotFoundError if the stream is not found.
	 */
	get(
		id: string,
		options?: {
			includeEntries?: boolean;
			includeDeleted?: boolean;
			verifyStream?: boolean;
			verifyEntries?: boolean;
		}
	): Promise<IAuditableItemStream>;

	/**
	 * Delete the stream.
	 * @param id The id of the stream to remove.
	 * @param userIdentity The identity to create the auditable item stream operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns Nothing.
	 */
	remove(id: string, userIdentity?: string, nodeIdentity?: string): Promise<void>;

	/**
	 * Query all the streams, will not return entries.
	 * @param conditions Conditions to use in the query.
	 * @param orderBy The order for the results, defaults to created.
	 * @param orderByDirection The direction for the order, defaults to descending.
	 * @param properties The properties to return, if not provided defaults to id, dateCreated, dateModified and annotationObject.
	 * @param cursor The cursor to request the next page of entities.
	 * @param pageSize The maximum number of entities in a page.
	 * @returns The entities, which can be partial if a limited keys list was provided.
	 */
	query(
		conditions?: IComparator[],
		orderBy?: keyof Pick<IAuditableItemStream, "dateCreated" | "dateModified">,
		orderByDirection?: SortDirection,
		properties?: (keyof IAuditableItemStream)[],
		cursor?: string,
		pageSize?: number
	): Promise<IAuditableItemStreamList>;

	/**
	 * Create an entry in the stream.
	 * @param streamId The id of the stream to create the entry in.
	 * @param entryObject The object for the stream as JSON-LD.
	 * @param userIdentity The identity to create the auditable item stream operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns The id of the created entry, if not provided.
	 */
	createEntry(
		streamId: string,
		entryObject: IJsonLdNodeObject,
		userIdentity?: string,
		nodeIdentity?: string
	): Promise<string>;

	/**
	 * Get the entry from the stream.
	 * @param streamId The id of the stream to get.
	 * @param entryId The id of the stream entry to get.
	 * @param options Additional options for the get operation.
	 * @param options.verifyEntry Should the entry be verified, defaults to false.
	 * @returns The stream and entries if found.
	 * @throws NotFoundError if the stream is not found.
	 */
	getEntry(
		streamId: string,
		entryId: string,
		options?: {
			verifyEntry?: boolean;
		}
	): Promise<IAuditableItemStreamEntry>;

	/**
	 * Get the entry object from the stream.
	 * @param id The id of the stream to get.
	 * @param entryId The id of the stream entry to get.
	 * @returns The stream and entries if found.
	 * @throws NotFoundError if the stream is not found.
	 */
	getEntryObject(id: string, entryId: string): Promise<IJsonLdNodeObject>;

	/**
	 * Update an entry in the stream.
	 * @param streamId The id of the stream to update.
	 * @param entryId The id of the entry to update.
	 * @param entryObject The object for the entry as JSON-LD.
	 * @param userIdentity The identity to create the auditable item stream operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns Nothing.
	 */
	updateEntry(
		streamId: string,
		entryId: string,
		entryObject: IJsonLdNodeObject,
		userIdentity?: string,
		nodeIdentity?: string
	): Promise<void>;

	/**
	 * Remove from the stream.
	 * @param streamId The id of the stream to remove from.
	 * @param entryId The id of the entry to delete.
	 * @param userIdentity The identity to create the auditable item stream operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns Nothing.
	 */
	removeEntry(
		streamId: string,
		entryId: string,
		userIdentity?: string,
		nodeIdentity?: string
	): Promise<void>;

	/**
	 * Get the entries for the stream.
	 * @param streamId The id of the stream to get.
	 * @param options Additional options for the get operation.
	 * @param options.conditions The conditions to filter the stream.
	 * @param options.includeDeleted Whether to include deleted entries, defaults to false.
	 * @param options.verifyEntries Should the entries be verified, defaults to false.
	 * @param options.pageSize How many entries to return.
	 * @param options.cursor Cursor to use for next chunk of data.
	 * @param options.order Retrieve the entries in ascending/descending time order, defaults to Ascending.
	 * @returns The stream and entries if found.
	 * @throws NotFoundError if the stream is not found.
	 */
	getEntries(
		streamId: string,
		options?: {
			conditions?: IComparator[];
			includeDeleted?: boolean;
			verifyEntries?: boolean;
			pageSize?: number;
			cursor?: string;
			order?: SortDirection;
		}
	): Promise<IAuditableItemStreamEntryList>;

	/**
	 * Get the entry objects for the stream.
	 * @param streamId The id of the stream to get.
	 * @param options Additional options for the get operation.
	 * @param options.conditions The conditions to filter the stream.
	 * @param options.includeDeleted Whether to include deleted entries, defaults to false.
	 * @param options.pageSize How many entries to return.
	 * @param options.cursor Cursor to use for next chunk of data.
	 * @param options.order Retrieve the entries in ascending/descending time order, defaults to Ascending.
	 * @returns The stream and entries if found.
	 * @throws NotFoundError if the stream is not found.
	 */
	getEntryObjects(
		streamId: string,
		options?: {
			conditions?: IComparator[];
			includeDeleted?: boolean;
			pageSize?: number;
			cursor?: string;
			order?: SortDirection;
		}
	): Promise<IAuditableItemStreamEntryObjectList>;

	/**
	 * Remove the verifiable storage for the stream and entries.
	 * @param streamId The id of the stream to remove the storage from.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns Nothing.
	 * @throws NotFoundError if the vertex is not found.
	 */
	removeVerifiable(streamId: string, nodeIdentity?: string): Promise<void>;
}
