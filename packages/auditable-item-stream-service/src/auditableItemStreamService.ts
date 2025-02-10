// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import {
	AuditableItemStreamTopics,
	AuditableItemStreamTypes,
	type IAuditableItemStream,
	type IAuditableItemStreamComponent,
	type IAuditableItemStreamEntry,
	type IAuditableItemStreamEntryList,
	type IAuditableItemStreamEntryObjectList,
	type IAuditableItemStreamEventBusStreamCreated,
	type IAuditableItemStreamEventBusStreamDeleted,
	type IAuditableItemStreamEventBusStreamEntryCreated,
	type IAuditableItemStreamEventBusStreamEntryDeleted,
	type IAuditableItemStreamEventBusStreamEntryUpdated,
	type IAuditableItemStreamEventBusStreamUpdated,
	type IAuditableItemStreamList
} from "@twin.org/auditable-item-stream-models";
import {
	Coerce,
	ComponentFactory,
	Converter,
	GeneralError,
	Guards,
	Is,
	NotFoundError,
	ObjectHelper,
	RandomHelper,
	StringHelper,
	Urn,
	Validation,
	type IValidationFailure
} from "@twin.org/core";
import { JsonLdHelper, JsonLdProcessor, type IJsonLdNodeObject } from "@twin.org/data-json-ld";
import {
	ComparisonOperator,
	LogicalOperator,
	SortDirection,
	type IComparator,
	type IComparatorGroup
} from "@twin.org/entity";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@twin.org/entity-storage-models";
import type { IEventBusComponent } from "@twin.org/event-bus-models";
import {
	ImmutableProofTypes,
	type IImmutableProofComponent,
	type IImmutableProofVerification
} from "@twin.org/immutable-proof-models";
import { nameof } from "@twin.org/nameof";
import { SchemaOrgDataTypes, SchemaOrgTypes } from "@twin.org/standards-schema-org";
import type { AuditableItemStream } from "./entities/auditableItemStream";
import type { AuditableItemStreamEntry } from "./entities/auditableItemStreamEntry";
import type { IAuditableItemStreamServiceConfig } from "./models/IAuditableItemStreamServiceConfig";
import type { IAuditableItemStreamServiceConstructorOptions } from "./models/IAuditableItemStreamServiceConstructorOptions";
import type { IAuditableItemStreamServiceContext } from "./models/IAuditableItemStreamServiceContext";

/**
 * Class for performing auditable item stream operations.
 */
export class AuditableItemStreamService implements IAuditableItemStreamComponent {
	/**
	 * The namespace for the service.
	 */
	public static readonly NAMESPACE: string = "ais";

	/**
	 * The keys to pick when creating the proof for the stream.
	 */
	private static readonly _PROOF_KEYS_STREAM: (keyof AuditableItemStream)[] = [
		"id",
		"nodeIdentity",
		"userIdentity",
		"dateCreated"
	];

	/**
	 * The keys to pick when creating the proof for the stream entry.
	 */
	private static readonly _PROOF_KEYS_STREAM_ENTRY: (keyof AuditableItemStreamEntry)[] = [
		"id",
		"streamId",
		"userIdentity",
		"dateCreated",
		"entryObject",
		"index"
	];

	/**
	 * Runtime name for the class.
	 */
	public readonly CLASS_NAME: string = nameof<AuditableItemStreamService>();

	/**
	 * The configuration for the connector.
	 * @internal
	 */
	private readonly _config: IAuditableItemStreamServiceConfig;

	/**
	 * The immutable proof component.
	 * @internal
	 */
	private readonly _immutableProofComponent: IImmutableProofComponent;

	/**
	 * The entity storage for streams.
	 * @internal
	 */
	private readonly _streamStorage: IEntityStorageConnector<AuditableItemStream>;

	/**
	 * The entity storage for stream entries.
	 * @internal
	 */
	private readonly _streamEntryStorage: IEntityStorageConnector<AuditableItemStreamEntry>;

	/**
	 * The event bus component.
	 * @internal
	 */
	private readonly _eventBusComponent?: IEventBusComponent;

	/**
	 * The default interval for the integrity checks.
	 * @internal
	 */
	private readonly _defaultImmutableInterval: number;

	/**
	 * Create a new instance of AuditableItemStreamService.
	 * @param options The dependencies for the auditable item stream connector.
	 */
	constructor(options?: IAuditableItemStreamServiceConstructorOptions) {
		this._immutableProofComponent = ComponentFactory.get(
			options?.immutableProofComponentType ?? "immutable-proof"
		);

		this._streamStorage = EntityStorageConnectorFactory.get(
			options?.streamEntityStorageType ?? StringHelper.kebabCase(nameof<AuditableItemStream>())
		);

		this._streamEntryStorage = EntityStorageConnectorFactory.get(
			options?.streamEntryEntityStorageType ??
				StringHelper.kebabCase(nameof<AuditableItemStreamEntry>())
		);

		if (Is.stringValue(options?.eventBusComponentType)) {
			this._eventBusComponent = ComponentFactory.get(options.eventBusComponentType);
		}

		this._config = options?.config ?? {};
		this._defaultImmutableInterval = this._config.defaultImmutableInterval ?? 10;

		SchemaOrgDataTypes.registerRedirects();
	}

	/**
	 * Create a new stream.
	 * @param streamObject The object for the stream as JSON-LD.
	 * @param entries Entries to store in the stream.
	 * @param options Options for creating the stream.
	 * @param options.immutableInterval After how many entries do we add immutable checks, defaults to service configured value.
	 * A value of 0 will disable integrity checks, 1 will be every item, or any other integer for an interval.
	 * @param userIdentity The identity to create the auditable item stream operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns The id of the new stream item.
	 */
	public async create(
		streamObject?: IJsonLdNodeObject,
		entries?: {
			entryObject: IJsonLdNodeObject;
		}[],
		options?: {
			immutableInterval?: number;
		},
		userIdentity?: string,
		nodeIdentity?: string
	): Promise<string> {
		Guards.stringValue(this.CLASS_NAME, nameof(userIdentity), userIdentity);
		Guards.stringValue(this.CLASS_NAME, nameof(nodeIdentity), nodeIdentity);

		try {
			if (Is.object(streamObject)) {
				const validationFailures: IValidationFailure[] = [];
				await JsonLdHelper.validate(streamObject, validationFailures);
				Validation.asValidationError(this.CLASS_NAME, nameof(streamObject), validationFailures);
			}

			const id = Converter.bytesToHex(RandomHelper.generate(32), false);

			const context: IAuditableItemStreamServiceContext = {
				now: new Date(Date.now()).toISOString(),
				userIdentity,
				nodeIdentity,
				indexCounter: 0,
				immutableInterval: options?.immutableInterval ?? this._defaultImmutableInterval
			};

			const streamEntity: AuditableItemStream = {
				id,
				nodeIdentity,
				userIdentity,
				dateCreated: context.now,
				immutableInterval: context.immutableInterval,
				indexCounter: 0,
				proofId: ""
			};

			// Create the JSON-LD object we want to use for the proof
			// this is a subset of fixed properties from the stream object.
			const streamModel = await this.streamEntityToJsonLd(
				ObjectHelper.pick(
					streamEntity,
					AuditableItemStreamService._PROOF_KEYS_STREAM
				) as AuditableItemStream
			);

			// Create the proof for the stream object
			streamEntity.proofId = await this._immutableProofComponent.create(
				streamModel,
				userIdentity,
				nodeIdentity
			);

			if (Is.arrayValue(entries)) {
				for (const entry of entries) {
					await this.setEntry(context, id, entry);
				}
			}

			// Add these dynamic properties to the stream object after the proof has been created.
			streamEntity.dateModified = context.now;
			streamEntity.streamObject = streamObject;
			streamEntity.indexCounter = context.indexCounter;

			await this._streamStorage.set(streamEntity);

			await this._eventBusComponent?.publish<IAuditableItemStreamEventBusStreamCreated>(
				AuditableItemStreamTopics.StreamCreated,
				{ id: streamModel.id }
			);

			return streamModel.id;
		} catch (error) {
			throw new GeneralError(this.CLASS_NAME, "createFailed", undefined, error);
		}
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

		const urnParsed = Urn.fromValidString(id);

		if (urnParsed.namespaceIdentifier() !== AuditableItemStreamService.NAMESPACE) {
			throw new GeneralError(this.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemStreamService.NAMESPACE,
				id
			});
		}

		try {
			const streamId = urnParsed.namespaceSpecific(0);
			const streamEntity = await this._streamStorage.get(streamId);

			if (Is.empty(streamEntity)) {
				throw new NotFoundError(this.CLASS_NAME, "streamNotFound", id);
			}

			const streamModel = await this.streamEntityToJsonLd(streamEntity);

			if (options?.includeEntries) {
				const result = await this.findEntries(
					streamId,
					options?.includeDeleted,
					options?.verifyEntries
				);
				streamModel.entries = result.entries;
				streamModel.cursor = result.cursor;
			}

			if ((options?.verifyStream ?? false) && Is.stringValue(streamEntity.proofId)) {
				streamModel.verification = await this._immutableProofComponent.verify(streamEntity.proofId);
			}

			const compacted = await JsonLdProcessor.compact(streamModel, streamModel["@context"]);

			return compacted as IAuditableItemStream;
		} catch (error) {
			throw new GeneralError(this.CLASS_NAME, "getFailed", undefined, error);
		}
	}

	/**
	 * Update a stream.
	 * @param id The id of the stream to update.
	 * @param streamObject The object for the stream as JSON-LD.
	 * @param userIdentity The identity to create the auditable item stream operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns Nothing.
	 */
	public async update(
		id: string,
		streamObject?: IJsonLdNodeObject,
		userIdentity?: string,
		nodeIdentity?: string
	): Promise<void> {
		Guards.stringValue(this.CLASS_NAME, nameof(id), id);
		Guards.stringValue(this.CLASS_NAME, nameof(userIdentity), userIdentity);
		Guards.stringValue(this.CLASS_NAME, nameof(nodeIdentity), nodeIdentity);

		const urnParsed = Urn.fromValidString(id);

		if (urnParsed.namespaceIdentifier() !== AuditableItemStreamService.NAMESPACE) {
			throw new GeneralError(this.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemStreamService.NAMESPACE,
				id
			});
		}

		try {
			const streamId = urnParsed.namespaceSpecific(0);
			const streamEntity = await this._streamStorage.get(streamId);

			if (Is.empty(streamEntity)) {
				throw new NotFoundError(this.CLASS_NAME, "streamNotFound", id);
			}

			if (Is.object(streamObject)) {
				const validationFailures: IValidationFailure[] = [];
				await JsonLdHelper.validate(streamObject, validationFailures);
				Validation.asValidationError(this.CLASS_NAME, nameof(streamObject), validationFailures);
			}

			if (!ObjectHelper.equal(streamEntity.streamObject, streamObject, false)) {
				streamEntity.streamObject = streamObject;
				streamEntity.dateModified = new Date(Date.now()).toISOString();

				await this._streamStorage.set(streamEntity);

				await this._eventBusComponent?.publish<IAuditableItemStreamEventBusStreamUpdated>(
					AuditableItemStreamTopics.StreamUpdated,
					{ id }
				);
			}
		} catch (error) {
			throw new GeneralError(this.CLASS_NAME, "updateFailed", undefined, error);
		}
	}

	/**
	 * Delete the stream.
	 * @param id The id of the stream to remove.
	 * @param userIdentity The identity to create the auditable item stream operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns Nothing.
	 */
	public async remove(id: string, userIdentity?: string, nodeIdentity?: string): Promise<void> {
		Guards.stringValue(this.CLASS_NAME, nameof(id), id);
		Guards.stringValue(this.CLASS_NAME, nameof(userIdentity), userIdentity);
		Guards.stringValue(this.CLASS_NAME, nameof(nodeIdentity), nodeIdentity);

		const urnParsed = Urn.fromValidString(id);

		if (urnParsed.namespaceIdentifier() !== AuditableItemStreamService.NAMESPACE) {
			throw new GeneralError(this.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemStreamService.NAMESPACE,
				id
			});
		}

		try {
			const streamId = urnParsed.namespaceSpecific(0);
			const streamEntity = await this._streamStorage.get(streamId);

			if (Is.empty(streamEntity)) {
				throw new NotFoundError(this.CLASS_NAME, "streamNotFound", id);
			}

			await this.internalRemoveImmutable(streamEntity, nodeIdentity);

			await this._streamStorage.remove(streamEntity.id);

			await this._eventBusComponent?.publish<IAuditableItemStreamEventBusStreamDeleted>(
				AuditableItemStreamTopics.StreamDeleted,
				{ id }
			);
		} catch (error) {
			throw new GeneralError(this.CLASS_NAME, "removingFailed", undefined, error);
		}
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
		try {
			let propertiesToReturn: (keyof IAuditableItemStream)[] = properties ?? [
				"id",
				"dateCreated",
				"dateModified",
				"streamObject"
			];
			const orderProperty: keyof IAuditableItemStream = orderBy ?? "dateCreated";
			const orderDirection = orderByDirection ?? SortDirection.Descending;

			// We never return entries from this method as this would involve a lot of lookups
			// and we want to keep this method fast.
			if (propertiesToReturn.includes("entries")) {
				propertiesToReturn = propertiesToReturn.filter(p => p !== "entries");
			}

			conditions ??= [];

			const results = await this._streamStorage.query(
				conditions.length > 0
					? {
							conditions,
							logicalOperator: LogicalOperator.And
						}
					: undefined,
				[
					{
						property: orderProperty,
						sortDirection: orderDirection
					}
				],
				propertiesToReturn as (keyof AuditableItemStream)[],
				cursor,
				pageSize
			);

			const list: IAuditableItemStreamList = {
				"@context": [AuditableItemStreamTypes.ContextRoot, SchemaOrgTypes.ContextRoot],
				type: AuditableItemStreamTypes.StreamList,
				streams: (results.entities as AuditableItemStream[]).map(e => this.streamEntityToJsonLd(e)),
				cursor: results.cursor
			};

			const compacted = await JsonLdProcessor.compact(list, list["@context"]);

			return compacted as IAuditableItemStreamList;
		} catch (error) {
			throw new GeneralError(this.CLASS_NAME, "queryingFailed", undefined, error);
		}
	}

	/**
	 * Create an entry in the stream.
	 * @param id The id of the stream to update.
	 * @param entryObject The object for the stream as JSON-LD.
	 * @param userIdentity The identity to create the auditable item stream operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns The id of the created entry, if not provided.
	 */
	public async createEntry(
		id: string,
		entryObject: IJsonLdNodeObject,
		userIdentity?: string,
		nodeIdentity?: string
	): Promise<string> {
		Guards.stringValue(this.CLASS_NAME, nameof(id), id);
		Guards.stringValue(this.CLASS_NAME, nameof(userIdentity), userIdentity);
		Guards.stringValue(this.CLASS_NAME, nameof(nodeIdentity), nodeIdentity);

		const urnParsed = Urn.fromValidString(id);

		if (urnParsed.namespaceIdentifier() !== AuditableItemStreamService.NAMESPACE) {
			throw new GeneralError(this.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemStreamService.NAMESPACE,
				id
			});
		}

		try {
			const streamId = urnParsed.namespaceSpecific(0);
			const streamEntity = await this._streamStorage.get(streamId);

			if (Is.empty(streamEntity)) {
				throw new NotFoundError(this.CLASS_NAME, "streamNotFound", id);
			}

			const context: IAuditableItemStreamServiceContext = {
				now: new Date(Date.now()).toISOString(),
				userIdentity,
				nodeIdentity,
				indexCounter: streamEntity.indexCounter,
				immutableInterval: streamEntity.immutableInterval
			};

			const createdId = await this.setEntry(context, streamEntity.id, {
				entryObject
			});

			streamEntity.dateModified = context.now;
			streamEntity.indexCounter = context.indexCounter;

			await this._streamStorage.set(streamEntity);

			const fullId = new Urn(AuditableItemStreamService.NAMESPACE, [
				streamEntity.id,
				createdId
			]).toString();

			await this._eventBusComponent?.publish<IAuditableItemStreamEventBusStreamEntryCreated>(
				AuditableItemStreamTopics.StreamEntryCreated,
				{ id, entryId: fullId }
			);

			return fullId;
		} catch (error) {
			throw new GeneralError(this.CLASS_NAME, "creatingEntryFailed", undefined, error);
		}
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

		const urnParsed = Urn.fromValidString(id);
		if (urnParsed.namespaceIdentifier() !== AuditableItemStreamService.NAMESPACE) {
			throw new GeneralError(this.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemStreamService.NAMESPACE,
				id
			});
		}

		const urnParsedEntry = Urn.fromValidString(entryId);
		if (urnParsedEntry.namespaceIdentifier() !== AuditableItemStreamService.NAMESPACE) {
			throw new GeneralError(this.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemStreamService.NAMESPACE,
				id: entryId
			});
		}

		try {
			const streamNamespaceId = urnParsed.namespaceSpecific(0);
			const streamEntity = await this._streamStorage.get(streamNamespaceId);

			if (Is.empty(streamEntity)) {
				throw new NotFoundError(this.CLASS_NAME, "streamNotFound", id);
			}

			const entryNamespaceId = urnParsedEntry.namespaceSpecific(1);
			const result = await this.findEntry(
				streamEntity.nodeIdentity,
				streamEntity.id,
				entryNamespaceId,
				options?.verifyEntry
			);
			if (Is.empty(result)) {
				throw new NotFoundError(this.CLASS_NAME, "streamEntryNotFound", entryId);
			}

			const entry = this.streamEntryEntityToJsonLd(result.entity);

			const compacted = await JsonLdProcessor.compact(entry, entry["@context"]);

			return compacted as IAuditableItemStreamEntry;
		} catch (error) {
			throw new GeneralError(this.CLASS_NAME, "gettingEntryFailed", undefined, error);
		}
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

		const urnParsed = Urn.fromValidString(id);

		if (urnParsed.namespaceIdentifier() !== AuditableItemStreamService.NAMESPACE) {
			throw new GeneralError(this.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemStreamService.NAMESPACE,
				id
			});
		}

		const urnParsedEntry = Urn.fromValidString(entryId);

		if (urnParsedEntry.namespaceIdentifier() !== AuditableItemStreamService.NAMESPACE) {
			throw new GeneralError(this.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemStreamService.NAMESPACE,
				id: entryId
			});
		}

		try {
			const streamNamespaceId = urnParsed.namespaceSpecific(0);
			const streamEntity = await this._streamStorage.get(streamNamespaceId);

			if (Is.empty(streamEntity)) {
				throw new NotFoundError(this.CLASS_NAME, "streamNotFound", id);
			}

			const entryNamespaceId = urnParsedEntry.namespaceSpecific(1);
			const result = await this.findEntry(
				streamEntity.nodeIdentity,
				streamEntity.id,
				entryNamespaceId
			);
			if (Is.empty(result)) {
				throw new NotFoundError(this.CLASS_NAME, "streamEntryNotFound", entryId);
			}

			return result.entity.entryObject;
		} catch (error) {
			throw new GeneralError(this.CLASS_NAME, "gettingEntryObjectFailed", undefined, error);
		}
	}

	/**
	 * Update an entry in the stream.
	 * @param id The id of the stream to update.
	 * @param entryId The id of the entry to update.
	 * @param entryObject The object for the entry as JSON-LD.
	 * @param userIdentity The identity to create the auditable item stream operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns Nothing.
	 */
	public async updateEntry(
		id: string,
		entryId: string,
		entryObject: IJsonLdNodeObject,
		userIdentity?: string,
		nodeIdentity?: string
	): Promise<void> {
		Guards.stringValue(this.CLASS_NAME, nameof(id), id);
		Guards.stringValue(this.CLASS_NAME, nameof(entryId), entryId);
		Guards.stringValue(this.CLASS_NAME, nameof(userIdentity), userIdentity);
		Guards.stringValue(this.CLASS_NAME, nameof(nodeIdentity), nodeIdentity);

		const urnParsed = Urn.fromValidString(id);

		if (urnParsed.namespaceIdentifier() !== AuditableItemStreamService.NAMESPACE) {
			throw new GeneralError(this.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemStreamService.NAMESPACE,
				id
			});
		}

		const urnParsedEntry = Urn.fromValidString(entryId);

		if (urnParsedEntry.namespaceIdentifier() !== AuditableItemStreamService.NAMESPACE) {
			throw new GeneralError(this.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemStreamService.NAMESPACE,
				id: entryId
			});
		}

		try {
			const streamNamespaceId = urnParsed.namespaceSpecific(0);
			const streamEntity = await this._streamStorage.get(streamNamespaceId);

			if (Is.empty(streamEntity)) {
				throw new NotFoundError(this.CLASS_NAME, "streamNotFound", id);
			}

			const entryNamespaceId = urnParsedEntry.namespaceSpecific(1);
			const existing = await this.findEntry(nodeIdentity, streamEntity.id, entryNamespaceId);
			if (Is.empty(existing)) {
				throw new NotFoundError(this.CLASS_NAME, "streamEntryNotFound", entryId);
			}

			const context: IAuditableItemStreamServiceContext = {
				now: new Date(Date.now()).toISOString(),
				userIdentity,
				nodeIdentity,
				indexCounter: streamEntity.indexCounter,
				immutableInterval: streamEntity.immutableInterval
			};

			await this.setEntry(context, streamEntity.id, {
				...existing,
				entryObject
			});

			streamEntity.dateModified = context.now;
			streamEntity.indexCounter = context.indexCounter;

			await this._streamStorage.set(streamEntity);

			await this._eventBusComponent?.publish<IAuditableItemStreamEventBusStreamEntryUpdated>(
				AuditableItemStreamTopics.StreamEntryUpdated,
				{ id, entryId }
			);
		} catch (error) {
			throw new GeneralError(this.CLASS_NAME, "updatingEntryFailed", undefined, error);
		}
	}

	/**
	 * Delete from the stream.
	 * @param id The id of the stream to remove from.
	 * @param entryId The id of the entry to remove.
	 * @param userIdentity The identity to create the auditable item stream operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns Nothing.
	 */
	public async removeEntry(
		id: string,
		entryId: string,
		userIdentity?: string,
		nodeIdentity?: string
	): Promise<void> {
		Guards.stringValue(this.CLASS_NAME, nameof(id), id);
		Guards.stringValue(this.CLASS_NAME, nameof(entryId), entryId);
		Guards.stringValue(this.CLASS_NAME, nameof(userIdentity), userIdentity);
		Guards.stringValue(this.CLASS_NAME, nameof(nodeIdentity), nodeIdentity);

		const urnParsed = Urn.fromValidString(id);

		if (urnParsed.namespaceIdentifier() !== AuditableItemStreamService.NAMESPACE) {
			throw new GeneralError(this.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemStreamService.NAMESPACE,
				id
			});
		}

		const urnParsedEntry = Urn.fromValidString(entryId);
		if (urnParsedEntry.namespaceIdentifier() !== AuditableItemStreamService.NAMESPACE) {
			throw new GeneralError(this.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemStreamService.NAMESPACE,
				id: entryId
			});
		}

		try {
			const streamNamespaceId = urnParsed.namespaceSpecific(0);
			const streamEntity = await this._streamStorage.get(streamNamespaceId);

			if (Is.empty(streamEntity)) {
				throw new NotFoundError(this.CLASS_NAME, "streamNotFound", id);
			}

			const entryNamespaceId = urnParsedEntry.namespaceSpecific(1);
			const result = await this.findEntry(
				streamEntity.nodeIdentity,
				streamNamespaceId,
				entryNamespaceId
			);
			if (Is.empty(result)) {
				throw new NotFoundError(this.CLASS_NAME, "streamEntryNotFound", entryId);
			}

			if (Is.empty(result.entity.dateDeleted)) {
				const context: IAuditableItemStreamServiceContext = {
					now: new Date(Date.now()).toISOString(),
					userIdentity,
					nodeIdentity,
					indexCounter: streamEntity.indexCounter,
					immutableInterval: streamEntity.immutableInterval
				};

				await this.setEntry(context, streamEntity.id, {
					...result.entity,
					dateDeleted: context.now
				});

				streamEntity.dateModified = context.now;
				streamEntity.indexCounter = context.indexCounter;
				await this._streamStorage.set(streamEntity);

				await this._eventBusComponent?.publish<IAuditableItemStreamEventBusStreamEntryDeleted>(
					AuditableItemStreamTopics.StreamEntryDeleted,
					{ id, entryId }
				);
			}
		} catch (error) {
			throw new GeneralError(this.CLASS_NAME, "removingEntryFailed", undefined, error);
		}
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

		const urnParsed = Urn.fromValidString(id);

		if (urnParsed.namespaceIdentifier() !== AuditableItemStreamService.NAMESPACE) {
			throw new GeneralError(this.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemStreamService.NAMESPACE,
				id
			});
		}

		try {
			const streamNamespaceId = urnParsed.namespaceSpecific(0);
			const streamEntity = await this._streamStorage.get(streamNamespaceId);

			if (Is.empty(streamEntity)) {
				throw new NotFoundError(this.CLASS_NAME, "streamNotFound", id);
			}

			const result = await this.findEntries(
				streamNamespaceId,
				options?.includeDeleted,
				options?.verifyEntries,
				options?.conditions,
				options?.order,
				undefined,
				options?.pageSize,
				options?.cursor
			);

			const list: IAuditableItemStreamEntryList = {
				"@context": [
					AuditableItemStreamTypes.ContextRoot,
					ImmutableProofTypes.ContextRoot,
					SchemaOrgTypes.ContextRoot
				],
				type: AuditableItemStreamTypes.StreamEntryList,
				entries: result.entries,
				cursor: result.cursor
			};

			const compacted = await JsonLdProcessor.compact(list, list["@context"]);

			return compacted as IAuditableItemStreamEntryList;
		} catch (error) {
			throw new GeneralError(this.CLASS_NAME, "gettingEntriesFailed", undefined, error);
		}
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

		const urnParsed = Urn.fromValidString(id);

		if (urnParsed.namespaceIdentifier() !== AuditableItemStreamService.NAMESPACE) {
			throw new GeneralError(this.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemStreamService.NAMESPACE,
				id
			});
		}

		try {
			const streamNamespaceId = urnParsed.namespaceSpecific(0);
			const streamEntity = await this._streamStorage.get(streamNamespaceId);

			if (Is.empty(streamEntity)) {
				throw new NotFoundError(this.CLASS_NAME, "streamNotFound", id);
			}

			const result = await this.findEntries(
				streamNamespaceId,
				options?.includeDeleted,
				false,
				options?.conditions,
				options?.order,
				undefined,
				options?.pageSize,
				options?.cursor
			);

			const list: IAuditableItemStreamEntryObjectList = {
				"@context": AuditableItemStreamTypes.ContextRoot,
				type: AuditableItemStreamTypes.StreamEntryObjectList,
				entryObjects: result.entries.map(m => m.entryObject),
				cursor: result.cursor
			};

			const compacted = await JsonLdProcessor.compact(list, list["@context"]);

			return compacted as IAuditableItemStreamEntryObjectList;
		} catch (error) {
			throw new GeneralError(this.CLASS_NAME, "gettingEntryObjectsFailed", undefined, error);
		}
	}

	/**
	 * Remove the immutable storage for the stream and entries.
	 * @param id The id of the stream to remove the storage from.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns Nothing.
	 * @throws NotFoundError if the vertex is not found.
	 */
	public async removeImmutable(id: string, nodeIdentity?: string): Promise<void> {
		Guards.stringValue(this.CLASS_NAME, nameof(id), id);
		Guards.stringValue(this.CLASS_NAME, nameof(nodeIdentity), nodeIdentity);

		const urnParsed = Urn.fromValidString(id);

		if (urnParsed.namespaceIdentifier() !== AuditableItemStreamService.NAMESPACE) {
			throw new GeneralError(this.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemStreamService.NAMESPACE,
				id
			});
		}

		try {
			const streamId = urnParsed.namespaceSpecific(0);
			const streamEntity = await this._streamStorage.get(streamId);

			if (Is.empty(streamEntity)) {
				throw new NotFoundError(this.CLASS_NAME, "streamNotFound", id);
			}

			await this.internalRemoveImmutable(streamEntity, nodeIdentity);
		} catch (error) {
			throw new GeneralError(this.CLASS_NAME, "removeImmutableFailed", undefined, error);
		}
	}

	/**
	 * Map the stream entity to a JSON-LD model.
	 * @param streamEntity The stream entity.
	 * @returns The model.
	 * @internal
	 */
	private streamEntityToJsonLd(
		streamEntity: AuditableItemStream
	): IAuditableItemStream & IJsonLdNodeObject {
		const model: IAuditableItemStream & IJsonLdNodeObject = {
			"@context": [
				AuditableItemStreamTypes.ContextRoot,
				ImmutableProofTypes.ContextRoot,
				SchemaOrgTypes.ContextRoot
			],
			type: AuditableItemStreamTypes.Stream,
			id: `${AuditableItemStreamService.NAMESPACE}:${streamEntity.id}`,
			dateCreated: streamEntity.dateCreated,
			dateModified: streamEntity.dateModified,
			nodeIdentity: streamEntity.nodeIdentity,
			userIdentity: streamEntity.userIdentity,
			streamObject: streamEntity.streamObject,
			immutableInterval: streamEntity.immutableInterval,
			proofId: streamEntity.proofId
		};

		return model;
	}

	/**
	 * Map the stream entry entity to a JSON-LD model.
	 * @param streamEntryEntity The stream entry entity.
	 * @returns The model
	 * @internal
	 */
	private streamEntryEntityToJsonLd(
		streamEntryEntity: AuditableItemStreamEntry
	): IAuditableItemStreamEntry & IJsonLdNodeObject {
		const streamEntryModel: IAuditableItemStreamEntry & IJsonLdNodeObject = {
			"@context": [
				AuditableItemStreamTypes.ContextRoot,
				ImmutableProofTypes.ContextRoot,
				SchemaOrgTypes.ContextRoot
			],
			type: AuditableItemStreamTypes.StreamEntry,
			id: `${AuditableItemStreamService.NAMESPACE}:${streamEntryEntity.streamId}:${streamEntryEntity.id}`,
			dateCreated: streamEntryEntity.dateCreated,
			dateModified: streamEntryEntity.dateModified,
			dateDeleted: streamEntryEntity.dateDeleted,
			entryObject: streamEntryEntity.entryObject,
			userIdentity: streamEntryEntity.userIdentity,
			index: streamEntryEntity.index,
			proofId: streamEntryEntity.proofId
		};
		return streamEntryModel;
	}

	/**
	 * Set a stream entry.
	 * @param context The context for the operation.
	 * @param streamId The stream id.
	 * @param entry The entry.
	 * @returns The id of the entry.
	 * @internal
	 */
	private async setEntry(
		context: IAuditableItemStreamServiceContext,
		streamId: string,
		entry: Partial<AuditableItemStreamEntry>
	): Promise<string> {
		Guards.object(this.CLASS_NAME, nameof(entry), entry);

		if (Is.object(entry.entryObject)) {
			const validationFailures: IValidationFailure[] = [];
			await JsonLdHelper.validate(entry.entryObject, validationFailures);
			Validation.asValidationError(this.CLASS_NAME, "entry.entryObject", validationFailures);
		}

		const entity: AuditableItemStreamEntry = {
			id: entry.id ?? Converter.bytesToHex(RandomHelper.generate(32), false),
			streamId,
			dateCreated: entry.dateCreated ?? context.now,
			dateDeleted: entry.dateDeleted,
			entryObject: entry.entryObject ?? {},
			userIdentity: context.userIdentity,
			index: entry.index ?? context.indexCounter++
		};

		// If the created date is not the same as the context now, then we are modifying the entry.
		if (entity.dateCreated !== context.now) {
			entity.dateModified = context.now;
		}

		if (context.immutableInterval > 0 && entity.index % context.immutableInterval === 0) {
			// Create the JSON-LD object we want to use for the proof
			// this is a subset of fixed properties from the stream entry object.
			const streamEntryModel = await this.streamEntryEntityToJsonLd(
				ObjectHelper.pick(
					entity,
					AuditableItemStreamService._PROOF_KEYS_STREAM_ENTRY
				) as AuditableItemStreamEntry
			);

			// Create the proof for the stream object
			entity.proofId = await this._immutableProofComponent.create(
				streamEntryModel,
				context.userIdentity,
				context.nodeIdentity
			);
		}

		await this._streamEntryStorage.set(entity);

		return entity.id;
	}

	/**
	 * Find a stream entry.
	 * @param nodeIdentity The node identity.
	 * @param streamId The stream id.
	 * @param entryId The entry id.
	 * @param verifyEntry Should the entry be verified.
	 * @internal
	 */
	private async findEntry(
		nodeIdentity: string,
		streamId: string,
		entryId: string,
		verifyEntry?: boolean
	): Promise<
		| {
				entity: AuditableItemStreamEntry;
				verification?: IImmutableProofVerification;
		  }
		| undefined
	> {
		const conditions: IComparatorGroup<AuditableItemStreamEntry> = {
			conditions: [
				{
					property: "streamId",
					comparison: ComparisonOperator.Equals,
					value: streamId
				},
				{
					property: "id",
					comparison: ComparisonOperator.Equals,
					value: entryId
				}
			],
			logicalOperator: LogicalOperator.And
		};

		const result = await this._streamEntryStorage.query(
			conditions,
			[
				{
					property: "dateCreated",
					sortDirection: SortDirection.Descending
				}
			],
			undefined,
			undefined,
			1
		);

		if (result.entities.length > 0) {
			const entity = result.entities[0] as AuditableItemStreamEntry;

			let verification: IImmutableProofVerification | undefined;
			if ((verifyEntry ?? false) && Is.stringValue(entity.proofId)) {
				verification = await this._immutableProofComponent.verify(entity.proofId);
			}

			return {
				entity,
				verification
			};
		}
	}

	/**
	 * Find stream entries.
	 * @param streamId The stream id.
	 * @param includeDeleted Should deleted entries be included.
	 * @param verifyEntries Should the entries be verified.
	 * @param conditions The conditions to filter the entries.
	 * @param sortDirection The sort direction.
	 * @param propertiesToReturn The properties to return.
	 * @param pageSize The page size.
	 * @param cursor The cursor.
	 * @internal
	 */
	private async findEntries(
		streamId: string,
		includeDeleted?: boolean,
		verifyEntries?: boolean,
		conditions?: IComparator[],
		sortDirection?: SortDirection,
		propertiesToReturn?: (keyof AuditableItemStreamEntry)[],
		pageSize?: number,
		cursor?: string
	): Promise<{
		entries: IAuditableItemStreamEntry[];
		cursor?: string;
	}> {
		const needToVerify = verifyEntries ?? false;

		const combinedConditions: IComparator[] = [
			{
				property: "streamId",
				comparison: ComparisonOperator.Equals,
				value: streamId
			}
		];

		if (Is.stringValue(cursor)) {
			const parts = cursor.split("|");
			if (parts.length > 1) {
				includeDeleted = Coerce.boolean(parts[1]);
			}
		}

		if (!(includeDeleted ?? false)) {
			combinedConditions.push({
				property: "dateDeleted",
				comparison: ComparisonOperator.Equals,
				value: undefined
			});
		}

		// If we need to verify the entries, we need to make sure we have
		// specific properties in the data, if the properties to return are not
		// an array then all will be retrieved anyway.
		if (needToVerify && Is.array(propertiesToReturn)) {
			propertiesToReturn ??= [];

			for (const property of AuditableItemStreamService._PROOF_KEYS_STREAM_ENTRY) {
				if (!propertiesToReturn.includes(property)) {
					propertiesToReturn.push(property);
				}
			}
		}

		if (Is.arrayValue(conditions)) {
			combinedConditions.push(...conditions);
		}

		const result = await this._streamEntryStorage.query(
			{
				conditions: combinedConditions,
				logicalOperator: LogicalOperator.And
			},
			[
				{
					property: "dateCreated",
					sortDirection: sortDirection ?? SortDirection.Descending
				}
			],
			propertiesToReturn,
			cursor,
			pageSize
		);

		let returnCursor: string | undefined;

		if (Is.stringValue(result.cursor)) {
			returnCursor = result.cursor;
		}
		if (includeDeleted) {
			returnCursor = `${returnCursor ?? ""}|true`;
		}

		const entryModels: IAuditableItemStreamEntry[] = [];

		for (const entry of result.entities) {
			const entryModel = this.streamEntryEntityToJsonLd(entry as AuditableItemStreamEntry);

			if (needToVerify && Is.stringValue(entry.proofId)) {
				entryModel.verification = await this._immutableProofComponent.verify(entry.proofId);
			}
			entryModels.push(entryModel);
		}

		return {
			entries: entryModels,
			cursor: returnCursor
		};
	}

	/**
	 * Remove the immutable storage for the stream and entries.
	 * @param streamEntity The stream entity.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns Nothing.
	 * @internal
	 */
	private async internalRemoveImmutable(
		streamEntity: AuditableItemStream,
		nodeIdentity: string
	): Promise<void> {
		if (Is.stringValue(streamEntity.proofId)) {
			await this._immutableProofComponent.removeImmutable(streamEntity.proofId, nodeIdentity);
			delete streamEntity.proofId;
			await this._streamStorage.set(streamEntity);
		}

		let entriesResult;
		do {
			entriesResult = await this._streamEntryStorage.query(
				{
					property: "streamId",
					value: streamEntity.id,
					comparison: ComparisonOperator.Equals
				},
				[
					{
						property: "dateCreated",
						sortDirection: SortDirection.Ascending
					}
				],
				undefined,
				entriesResult?.cursor
			);

			for (const streamEntry of entriesResult.entities) {
				if (Is.stringValue(streamEntry.proofId)) {
					await this._immutableProofComponent.removeImmutable(nodeIdentity, streamEntry.proofId);
					delete streamEntry.proofId;
					await this._streamEntryStorage.set(streamEntry as AuditableItemStreamEntry);
				}
			}
		} while (Is.stringValue(entriesResult.cursor));
	}
}
