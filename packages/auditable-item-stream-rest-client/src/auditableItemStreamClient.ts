// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { BaseRestClient } from "@twin.org/api-core";
import {
	HttpParameterHelper,
	type IBaseRestClientConfig,
	type ICreatedResponse,
	type INoContentResponse
} from "@twin.org/api-models";
import type {
	IAuditableItemStream,
	IAuditableItemStreamComponent,
	IAuditableItemStreamCreateEntryRequest,
	IAuditableItemStreamCreateRequest,
	IAuditableItemStreamDeleteEntryRequest,
	IAuditableItemStreamEntry,
	IAuditableItemStreamEntryList,
	IAuditableItemStreamEntryObjectList,
	IAuditableItemStreamGetEntryObjectRequest,
	IAuditableItemStreamGetEntryObjectResponse,
	IAuditableItemStreamGetEntryRequest,
	IAuditableItemStreamGetEntryResponse,
	IAuditableItemStreamGetRequest,
	IAuditableItemStreamGetResponse,
	IAuditableItemStreamList,
	IAuditableItemStreamListEntriesRequest,
	IAuditableItemStreamListEntriesResponse,
	IAuditableItemStreamListEntryObjectsRequest,
	IAuditableItemStreamListEntryObjectsResponse,
	IAuditableItemStreamListRequest,
	IAuditableItemStreamListResponse,
	IAuditableItemStreamUpdateEntryRequest,
	IAuditableItemStreamUpdateRequest
} from "@twin.org/auditable-item-stream-models";
import { Guards, NotSupportedError } from "@twin.org/core";
import type { IJsonLdNodeObject } from "@twin.org/data-json-ld";
import type { IComparator, SortDirection } from "@twin.org/entity";
import { nameof } from "@twin.org/nameof";
import { HeaderTypes, MimeTypes } from "@twin.org/web";

/**
 * Client for performing auditable item stream through to REST endpoints.
 */
export class AuditableItemStreamClient
	extends BaseRestClient
	implements IAuditableItemStreamComponent
{
	/**
	 * Runtime name for the class.
	 */
	public readonly CLASS_NAME: string = nameof<AuditableItemStreamClient>();

	/**
	 * Create a new instance of AuditableItemStreamClient.
	 * @param config The configuration for the client.
	 */
	constructor(config: IBaseRestClientConfig) {
		super(nameof<AuditableItemStreamClient>(), config, "auditable-item-stream");
	}

	/**
	 * Create a new stream.
	 * @param streamObject The object for the stream as JSON-LD.
	 * @param entries Entries to store in the stream.
	 * @param options Options for creating the stream.
	 * @param options.immutableInterval After how many entries do we add immutable checks, defaults to service configured value.
	 * A value of 0 will disable immutable checks, 1 will be every item, or any other integer for an interval.
	 * @returns The id of the new stream item.
	 */
	public async create(
		streamObject?: IJsonLdNodeObject,
		entries?: {
			entryObject: IJsonLdNodeObject;
		}[],
		options?: {
			immutableInterval?: number;
		}
	): Promise<string> {
		const response = await this.fetch<IAuditableItemStreamCreateRequest, ICreatedResponse>(
			"/",
			"POST",
			{
				body: {
					streamObject,
					entries,
					immutableInterval: options?.immutableInterval
				}
			}
		);

		return response.headers[HeaderTypes.Location];
	}

	/**
	 * Get a stream header without the entries.
	 * @param id The id of the stream to get.
	 * @param options Additional options for the get operation.
	 * @param options.includeEntries Whether to include the entries, defaults to false.
	 * @param options.includeDeleted Whether to include deleted entries, defaults to false.
	 * @param options.verifyStream Should the stream be verified, defaults to false.
	 * @param options.verifyEntries Should the entries be verified, defaults to false.
	 * @returns The stream and entries if found.
	 * @throws NotFoundError if the stream is not found
	 */
	public async get(
		id: string,
		options?: {
			includeEntries?: boolean;
			includeDeleted?: boolean;
			verifyStream?: boolean;
			verifyEntries?: boolean;
		}
	): Promise<IAuditableItemStream> {
		Guards.stringValue(this.CLASS_NAME, nameof(id), id);

		const response = await this.fetch<
			IAuditableItemStreamGetRequest,
			IAuditableItemStreamGetResponse
		>("/:id", "GET", {
			headers: {
				[HeaderTypes.Accept]: MimeTypes.JsonLd
			},
			pathParams: {
				id
			},
			query: {
				includeEntries: options?.includeEntries,
				includeDeleted: options?.includeDeleted,
				verifyStream: options?.verifyStream,
				verifyEntries: options?.verifyEntries
			}
		});

		return response.body;
	}

	/**
	 * Update a stream.
	 * @param id The id of the stream to update.
	 * @param streamObject The object for the stream as JSON-LD.
	 * @returns Nothing.
	 */
	public async update(id: string, streamObject?: IJsonLdNodeObject): Promise<void> {
		Guards.stringValue(this.CLASS_NAME, nameof(id), id);

		await this.fetch<IAuditableItemStreamUpdateRequest, INoContentResponse>("/:id", "PUT", {
			pathParams: {
				id
			},
			body: {
				streamObject
			}
		});
	}

	/**
	 * Query all the streams, will not return entries.
	 * @param conditions Conditions to use in the query.
	 * @param orderBy The order for the results, defaults to created.
	 * @param orderByDirection The direction for the order, defaults to descending.
	 * @param properties The properties to return, if not provided defaults to id, created and object.
	 * @param cursor The cursor to request the next page of entities.
	 * @param pageSize The maximum number of entities in a page.
	 * @returns The entities, which can be partial if a limited keys list was provided.
	 */
	public async query(
		conditions?: IComparator[],
		orderBy?: keyof Pick<IAuditableItemStream, "dateCreated" | "dateModified">,
		orderByDirection?: SortDirection,
		properties?: (keyof IAuditableItemStream)[],
		cursor?: string,
		pageSize?: number
	): Promise<IAuditableItemStreamList> {
		const response = await this.fetch<
			IAuditableItemStreamListRequest,
			IAuditableItemStreamListResponse
		>("/", "GET", {
			headers: {
				[HeaderTypes.Accept]: MimeTypes.JsonLd
			},
			query: {
				conditions: HttpParameterHelper.conditionsToString(conditions),
				orderBy,
				orderByDirection,
				properties: HttpParameterHelper.arrayToString(properties),
				cursor,
				pageSize
			}
		});

		return response.body;
	}

	/**
	 * Create an entry in the stream.
	 * @param id The id of the stream to update.
	 * @param entryObject The object for the stream as JSON-LD.
	 * @returns The id of the created entry, if not provided.
	 */
	public async createEntry(id: string, entryObject: IJsonLdNodeObject): Promise<string> {
		Guards.stringValue(this.CLASS_NAME, nameof(id), id);

		const response = await this.fetch<IAuditableItemStreamCreateEntryRequest, ICreatedResponse>(
			"/:id",
			"POST",
			{
				pathParams: {
					id
				},
				body: {
					entryObject
				}
			}
		);

		return response.headers[HeaderTypes.Location];
	}

	/**
	 * Get the entry from the stream.
	 * @param id The id of the stream to get.
	 * @param entryId The id of the stream entry to get.
	 * @param options Additional options for the get operation.
	 * @param options.verifyEntry Should the entry be verified, defaults to false.
	 * @returns The stream and entries if found.
	 * @throws NotFoundError if the stream is not found.
	 */
	public async getEntry(
		id: string,
		entryId: string,
		options?: {
			verifyEntry?: boolean;
		}
	): Promise<IAuditableItemStreamEntry> {
		Guards.stringValue(this.CLASS_NAME, nameof(id), id);
		Guards.stringValue(this.CLASS_NAME, nameof(entryId), entryId);

		const response = await this.fetch<
			IAuditableItemStreamGetEntryRequest,
			IAuditableItemStreamGetEntryResponse
		>("/:id/:entryId", "GET", {
			headers: {
				[HeaderTypes.Accept]: MimeTypes.JsonLd
			},
			query: {
				verifyEntry: options?.verifyEntry
			},
			pathParams: {
				id,
				entryId
			}
		});

		return response.body;
	}

	/**
	 * Get the entry object from the stream.
	 * @param id The id of the stream to get.
	 * @param entryId The id of the stream entry to get.
	 * @returns The stream and entries if found.
	 * @throws NotFoundError if the stream is not found.
	 */
	public async getEntryObject(id: string, entryId: string): Promise<IJsonLdNodeObject> {
		Guards.stringValue(this.CLASS_NAME, nameof(id), id);
		Guards.stringValue(this.CLASS_NAME, nameof(entryId), entryId);

		const response = await this.fetch<
			IAuditableItemStreamGetEntryObjectRequest,
			IAuditableItemStreamGetEntryObjectResponse
		>("/:id/:entryId/object", "GET", {
			headers: {
				[HeaderTypes.Accept]: MimeTypes.JsonLd
			},
			pathParams: {
				id,
				entryId
			}
		});

		return response.body;
	}

	/**
	 * Update an entry in the stream.
	 * @param id The id of the stream to update.
	 * @param entryId The id of the entry to update.
	 * @param entryObject The object for the entry as JSON-LD.
	 * @returns Nothing.
	 */
	public async updateEntry(
		id: string,
		entryId: string,
		entryObject: IJsonLdNodeObject
	): Promise<void> {
		Guards.stringValue(this.CLASS_NAME, nameof(id), id);
		Guards.stringValue(this.CLASS_NAME, nameof(entryId), entryId);

		await this.fetch<IAuditableItemStreamUpdateEntryRequest, INoContentResponse>(
			"/:id/:entryId",
			"PUT",
			{
				pathParams: {
					id,
					entryId
				},
				body: {
					entryObject
				}
			}
		);
	}

	/**
	 * Delete from the stream.
	 * @param id The id of the stream to update.
	 * @param entryId The id of the entry to delete.
	 * @returns Nothing.
	 */
	public async removeEntry(id: string, entryId: string): Promise<void> {
		Guards.stringValue(this.CLASS_NAME, nameof(id), id);
		Guards.stringValue(this.CLASS_NAME, nameof(entryId), entryId);

		await this.fetch<IAuditableItemStreamDeleteEntryRequest, INoContentResponse>(
			"/:id/:entryId",
			"DELETE",
			{
				pathParams: {
					id,
					entryId
				}
			}
		);
	}

	/**
	 * Get the entries for the stream.
	 * @param id The id of the stream to get.
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
	public async getEntries(
		id: string,
		options?: {
			conditions?: IComparator[];
			includeDeleted?: boolean;
			verifyEntries?: boolean;
			pageSize?: number;
			cursor?: string;
			order?: SortDirection;
		}
	): Promise<IAuditableItemStreamEntryList> {
		Guards.stringValue(this.CLASS_NAME, nameof(id), id);

		const response = await this.fetch<
			IAuditableItemStreamListEntriesRequest,
			IAuditableItemStreamListEntriesResponse
		>("/:id/entries", "GET", {
			headers: {
				[HeaderTypes.Accept]: MimeTypes.JsonLd
			},
			pathParams: {
				id
			},
			query: {
				conditions: HttpParameterHelper.conditionsToString(options?.conditions),
				includeDeleted: options?.includeDeleted,
				verifyEntries: options?.verifyEntries,
				pageSize: options?.pageSize,
				cursor: options?.cursor,
				order: options?.order
			}
		});

		return response.body;
	}

	/**
	 * Get the entry objects for the stream.
	 * @param id The id of the stream to get.
	 * @param options Additional options for the get operation.
	 * @param options.conditions The conditions to filter the stream.
	 * @param options.includeDeleted Whether to include deleted entries, defaults to false.
	 * @param options.pageSize How many entries to return.
	 * @param options.cursor Cursor to use for next chunk of data.
	 * @param options.order Retrieve the entries in ascending/descending time order, defaults to Ascending.
	 * @returns The stream and entries if found.
	 * @throws NotFoundError if the stream is not found.
	 */
	public async getEntryObjects(
		id: string,
		options?: {
			conditions?: IComparator[];
			includeDeleted?: boolean;
			pageSize?: number;
			cursor?: string;
			order?: SortDirection;
		}
	): Promise<IAuditableItemStreamEntryObjectList> {
		Guards.stringValue(this.CLASS_NAME, nameof(id), id);

		const response = await this.fetch<
			IAuditableItemStreamListEntryObjectsRequest,
			IAuditableItemStreamListEntryObjectsResponse
		>("/:id/entries/objects", "GET", {
			headers: {
				[HeaderTypes.Accept]: MimeTypes.JsonLd
			},
			pathParams: {
				id
			},
			query: {
				conditions: HttpParameterHelper.conditionsToString(options?.conditions),
				includeDeleted: options?.includeDeleted,
				pageSize: options?.pageSize,
				cursor: options?.cursor,
				order: options?.order
			}
		});

		return response.body;
	}

	/**
	 * Remove the immutable storage for the stream and entries.
	 * @param id The id of the stream to remove the storage from.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns Nothing.
	 * @throws NotFoundError if the vertex is not found.
	 * @internal
	 */
	public async removeImmutable(id: string, nodeIdentity?: string): Promise<void> {
		throw new NotSupportedError(this.CLASS_NAME, "removeImmutable");
	}
}
