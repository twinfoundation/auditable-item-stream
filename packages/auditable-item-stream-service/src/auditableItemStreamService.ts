// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import {
	AuditableItemStreamTypes,
	type IAuditableItemStreamEntryCredential,
	type IAuditableItemStream,
	type IAuditableItemStreamComponent,
	type IAuditableItemStreamEntry
} from "@gtsc/auditable-item-stream-models";
import {
	Coerce,
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
} from "@gtsc/core";
import { Blake2b } from "@gtsc/crypto";
import {
	JsonLdHelper,
	JsonLdProcessor,
	type IJsonLdDocument,
	type IJsonLdNodeObject
} from "@gtsc/data-json-ld";
import {
	ComparisonOperator,
	type IComparatorGroup,
	LogicalOperator,
	SortDirection,
	type IComparator
} from "@gtsc/entity";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@gtsc/entity-storage-models";
import { IdentityConnectorFactory, type IIdentityConnector } from "@gtsc/identity-models";
import {
	ImmutableStorageConnectorFactory,
	type IImmutableStorageConnector
} from "@gtsc/immutable-storage-models";
import { nameof } from "@gtsc/nameof";
import { VaultConnectorFactory, type IVaultConnector } from "@gtsc/vault-models";
import { MimeTypes } from "@gtsc/web";
import type { AuditableItemStream } from "./entities/auditableItemStream";
import type { AuditableItemStreamEntry } from "./entities/auditableItemStreamEntry";
import type { IAuditableItemStreamServiceConfig } from "./models/IAuditableItemStreamServiceConfig";
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
	 * Runtime name for the class.
	 */
	public readonly CLASS_NAME: string = nameof<AuditableItemStreamService>();

	/**
	 * The configuration for the connector.
	 * @internal
	 */
	private readonly _config: IAuditableItemStreamServiceConfig;

	/**
	 * The vault connector.
	 * @internal
	 */
	private readonly _vaultConnector: IVaultConnector;

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
	 * The immutable storage for the integrity data.
	 * @internal
	 */
	private readonly _integrityImmutableStorage: IImmutableStorageConnector;

	/**
	 * The identity connector for generating verifiable credentials.
	 * @internal
	 */
	private readonly _identityConnector: IIdentityConnector;

	/**
	 * The vault key for signing or encrypting the data.
	 * @internal
	 */
	private readonly _vaultKeyId: string;

	/**
	 * The assertion method id to use for the stream.
	 * @internal
	 */
	private readonly _assertionMethodId: string;

	/**
	 * The default interval for the integrity checks.
	 * @internal
	 */
	private readonly _defaultImmutableInterval: number;

	/**
	 * Create a new instance of AuditableItemStreamService.
	 * @param options The dependencies for the auditable item stream connector.
	 * @param options.config The configuration for the connector.
	 * @param options.vaultConnectorType The vault connector type, defaults to "vault".
	 * @param options.streamEntityStorageType The entity storage for stream, defaults to "auditable-item-stream".
	 * @param options.streamEntryEntityStorageType The entity storage for stream entries, defaults to "auditable-item-stream-entry".
	 * @param options.integrityImmutableStorageType The immutable storage for audit trail, defaults to "auditable-item-stream".
	 * @param options.identityConnectorType The identity connector type, defaults to "identity".
	 */
	constructor(options?: {
		vaultConnectorType?: string;
		streamEntityStorageType?: string;
		streamEntryEntityStorageType?: string;
		integrityImmutableStorageType?: string;
		identityConnectorType?: string;
		config?: IAuditableItemStreamServiceConfig;
	}) {
		this._vaultConnector = VaultConnectorFactory.get(options?.vaultConnectorType ?? "vault");

		this._streamStorage = EntityStorageConnectorFactory.get(
			options?.streamEntityStorageType ?? StringHelper.kebabCase(nameof<AuditableItemStream>())
		);

		this._streamEntryStorage = EntityStorageConnectorFactory.get(
			options?.streamEntryEntityStorageType ??
				StringHelper.kebabCase(nameof<AuditableItemStreamEntry>())
		);

		this._integrityImmutableStorage = ImmutableStorageConnectorFactory.get(
			options?.integrityImmutableStorageType ?? "auditable-item-stream"
		);

		this._identityConnector = IdentityConnectorFactory.get(
			options?.identityConnectorType ?? "identity"
		);

		this._config = options?.config ?? {};
		this._vaultKeyId = this._config.vaultKeyId ?? "auditable-item-stream";
		this._assertionMethodId = this._config.assertionMethodId ?? "auditable-item-stream";
		this._defaultImmutableInterval = this._config.defaultImmutableInterval ?? 10;
	}

	/**
	 * Create a new stream.
	 * @param metadata The metadata for the stream as JSON-LD.
	 * @param entries Entries to store in the stream.
	 * @param options Options for creating the stream.
	 * @param options.immutableInterval After how many entries do we add immutable checks, defaults to service configured value.
	 * A value of 0 will disable integrity checks, 1 will be every item, or <n> for an interval.
	 * @param identity The identity to create the auditable item stream operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns The id of the new stream item.
	 */
	public async create(
		metadata?: IJsonLdNodeObject,
		entries?: {
			metadata?: IJsonLdNodeObject;
		}[],
		options?: {
			immutableInterval?: number;
		},
		identity?: string,
		nodeIdentity?: string
	): Promise<string> {
		Guards.stringValue(this.CLASS_NAME, nameof(identity), identity);
		Guards.stringValue(this.CLASS_NAME, nameof(nodeIdentity), nodeIdentity);

		try {
			if (Is.object(metadata)) {
				const validationFailures: IValidationFailure[] = [];
				await JsonLdHelper.validate(metadata, validationFailures);
				Validation.asValidationError(this.CLASS_NAME, "metadata", validationFailures);
			}

			const id = Converter.bytesToHex(RandomHelper.generate(32), false);

			const context: IAuditableItemStreamServiceContext = {
				now: Date.now(),
				userIdentity: identity,
				nodeIdentity,
				indexCounter: 0,
				immutableInterval: options?.immutableInterval ?? this._defaultImmutableInterval
			};

			const streamModel: IAuditableItemStream = {
				id,
				nodeIdentity,
				created: context.now,
				updated: context.now,
				metadata,
				immutableInterval: context.immutableInterval
			};

			if (Is.arrayValue(entries)) {
				for (const entry of entries) {
					await this.setEntry(context, id, entry);
				}
			}

			await this._streamStorage.set(this.streamModelToEntity(streamModel, context.indexCounter));

			return new Urn(AuditableItemStreamService.NAMESPACE, id).toString();
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
	 * @param responseType The response type to return, defaults to application/json.
	 * @returns The stream and entries if found.
	 * @throws NotFoundError if the stream is not found
	 */
	public async get(
		id: string,
		options?: {
			includeEntries?: boolean;
			includeDeleted?: boolean;
		},
		// eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents
		responseType?: typeof MimeTypes.Json | typeof MimeTypes.JsonLd
	): Promise<(IAuditableItemStream | IJsonLdDocument) & { cursor?: string }> {
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

			const streamModel = await this.streamEntityToModel(streamEntity);
			let cursor: string | undefined;

			if (options?.includeEntries) {
				const entries = await this.findEntries(streamModel.id, options?.includeDeleted);
				streamModel.entries = entries.entries.map(e => this.streamEntryEntityToModel(e));
				cursor = entries.cursor;
			}

			if (responseType === MimeTypes.JsonLd) {
				const jsonld = await JsonLdProcessor.compact(this.modelToJsonLd(streamModel), {
					"@context": AuditableItemStreamTypes.ContextUri
				});
				return {
					...jsonld,
					cursor
				};
			}
			return {
				...streamModel,
				cursor
			};
		} catch (error) {
			throw new GeneralError(this.CLASS_NAME, "getFailed", undefined, error);
		}
	}

	/**
	 * Update a stream.
	 * @param id The id of the stream to update.
	 * @param metadata The metadata for the stream as JSON-LD.
	 * @param identity The identity to create the auditable item stream operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns Nothing.
	 */
	public async update(
		id: string,
		metadata?: IJsonLdNodeObject,
		identity?: string,
		nodeIdentity?: string
	): Promise<void> {
		Guards.stringValue(this.CLASS_NAME, nameof(id), id);
		Guards.stringValue(this.CLASS_NAME, nameof(identity), identity);
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

			if (Is.object(metadata)) {
				const validationFailures: IValidationFailure[] = [];
				await JsonLdHelper.validate(metadata, validationFailures);
				Validation.asValidationError(this.CLASS_NAME, "metadata", validationFailures);
			}

			const context: IAuditableItemStreamServiceContext = {
				now: Date.now(),
				userIdentity: identity,
				nodeIdentity,
				indexCounter: streamEntity.indexCounter,
				immutableInterval: streamEntity.immutableInterval
			};

			const streamModel = await this.streamEntityToModel(streamEntity);

			if (ObjectHelper.equal(streamModel.metadata, metadata, false)) {
				streamModel.metadata = metadata;
				streamModel.updated = context.now;

				await this._streamStorage.set(this.streamModelToEntity(streamModel, context.indexCounter));
			}
		} catch (error) {
			throw new GeneralError(this.CLASS_NAME, "updateFailed", undefined, error);
		}
	}

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
	public async query(
		conditions?: IComparator[],
		orderBy?: "created" | "updated",
		orderByDirection?: SortDirection,
		properties?: (keyof IAuditableItemStream)[],
		cursor?: string,
		pageSize?: number,
		// eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents
		responseType?: typeof MimeTypes.Json | typeof MimeTypes.JsonLd
	): Promise<{
		/**
		 * The entities, which can be partial if a limited keys list was provided.
		 */
		entities: (Partial<Omit<IAuditableItemStream, "entries">> | IJsonLdDocument)[];
		/**
		 * An optional cursor, when defined can be used to call find to get more entities.
		 */
		cursor?: string;
	}> {
		try {
			let propertiesToReturn = properties ?? ["id", "created", "updated", "metadata"];
			const orderProperty = orderBy ?? "created";
			const orderDirection = orderByDirection ?? SortDirection.Descending;

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

			const models = (results.entities as AuditableItemStream[]).map(e =>
				this.streamEntityToModel(e)
			);

			if (responseType === MimeTypes.JsonLd) {
				return {
					entities: models.map(e => this.modelToJsonLd(e)),
					cursor: results.cursor
				};
			}

			return {
				entities: (results.entities as AuditableItemStream[]).map(e => this.streamEntityToModel(e)),
				cursor: results.cursor
			};
		} catch (error) {
			throw new GeneralError(this.CLASS_NAME, "queryingFailed", undefined, error);
		}
	}

	/**
	 * Create an entry in the stream.
	 * @param id The id of the stream to update.
	 * @param entryMetadata The metadata for the stream as JSON-LD.
	 * @param identity The identity to create the auditable item stream operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns The id of the created entry, if not provided.
	 */
	public async createEntry(
		id: string,
		entryMetadata?: IJsonLdNodeObject,
		identity?: string,
		nodeIdentity?: string
	): Promise<string> {
		Guards.stringValue(this.CLASS_NAME, nameof(id), id);
		Guards.stringValue(this.CLASS_NAME, nameof(identity), identity);
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
				now: Date.now(),
				userIdentity: identity,
				nodeIdentity,
				indexCounter: streamEntity.indexCounter,
				immutableInterval: streamEntity.immutableInterval
			};

			const createdId = await this.setEntry(context, streamEntity.id, {
				metadata: entryMetadata
			});

			const streamModel = await this.streamEntityToModel(streamEntity);
			streamModel.updated = context.now;
			await this._streamStorage.set(this.streamModelToEntity(streamModel, context.indexCounter));

			return new Urn(AuditableItemStreamService.NAMESPACE, [streamModel.id, createdId]).toString();
		} catch (error) {
			throw new GeneralError(this.CLASS_NAME, "creatingEntryFailed", undefined, error);
		}
	}

	/**
	 * Get the entry from the stream.
	 * @param id The id of the stream to get.
	 * @param entryId The id of the stream entry to get.
	 * @param responseType The response type to return, defaults to application/json.
	 * @returns The stream and entries if found.
	 * @throws NotFoundError if the stream is not found.
	 */
	public async getEntry(
		id: string,
		entryId: string,
		// eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents
		responseType?: typeof MimeTypes.Json | typeof MimeTypes.JsonLd
	): Promise<IAuditableItemStreamEntry | IJsonLdDocument> {
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
				throw new NotFoundError(this.CLASS_NAME, "streamNotFound", entryId);
			}

			const entryNamespaceId = urnParsedEntry.namespaceSpecific(1);
			const existing = await this.findEntry(streamEntity.id, entryNamespaceId);
			if (Is.empty(existing)) {
				throw new NotFoundError(this.CLASS_NAME, "streamEntryNotFound", entryId);
			}

			const modelEntry = this.streamEntryEntityToModel(existing);
			if (responseType === MimeTypes.JsonLd) {
				return this.modelEntryToJsonLd(modelEntry);
			}
			return modelEntry;
		} catch (error) {
			throw new GeneralError(this.CLASS_NAME, "gettingEntryFailed", undefined, error);
		}
	}

	/**
	 * Update an entry in the stream.
	 * @param id The id of the stream to update.
	 * @param entryId The id of the entry to update.
	 * @param entryMetadata The metadata for the entry as JSON-LD.
	 * @param identity The identity to create the auditable item stream operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns Nothing.
	 */
	public async updateEntry(
		id: string,
		entryId: string,
		entryMetadata?: IJsonLdNodeObject,
		identity?: string,
		nodeIdentity?: string
	): Promise<void> {
		Guards.stringValue(this.CLASS_NAME, nameof(id), id);
		Guards.stringValue(this.CLASS_NAME, nameof(entryId), entryId);
		Guards.stringValue(this.CLASS_NAME, nameof(identity), identity);
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
				throw new NotFoundError(this.CLASS_NAME, "streamNotFound", entryId);
			}

			const entryNamespaceId = urnParsedEntry.namespaceSpecific(1);
			const existing = await this.findEntry(streamEntity.id, entryNamespaceId);
			if (Is.empty(existing)) {
				throw new NotFoundError(this.CLASS_NAME, "streamEntryNotFound", entryId);
			}

			const context: IAuditableItemStreamServiceContext = {
				now: Date.now(),
				userIdentity: identity,
				nodeIdentity,
				indexCounter: streamEntity.indexCounter,
				immutableInterval: streamEntity.immutableInterval
			};

			await this.setEntry(context, streamEntity.id, {
				...existing,
				metadata: entryMetadata
			});

			const streamModel = await this.streamEntityToModel(streamEntity);
			streamModel.updated = context.now;
			await this._streamStorage.set(this.streamModelToEntity(streamModel, context.indexCounter));
		} catch (error) {
			throw new GeneralError(this.CLASS_NAME, "updatingEntryFailed", undefined, error);
		}
	}

	/**
	 * Delete from the stream.
	 * @param id The id of the stream to update.
	 * @param entryId The id of the entry to delete.
	 * @param identity The identity to create the auditable item stream operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns Nothing.
	 */
	public async removeEntry(
		id: string,
		entryId: string,
		identity?: string,
		nodeIdentity?: string
	): Promise<void> {
		Guards.stringValue(this.CLASS_NAME, nameof(id), id);
		Guards.stringValue(this.CLASS_NAME, nameof(entryId), entryId);
		Guards.stringValue(this.CLASS_NAME, nameof(identity), identity);
		Guards.stringValue(this.CLASS_NAME, nameof(nodeIdentity), nodeIdentity);

		const urnParsed = Urn.fromValidString(entryId);

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
				throw new NotFoundError(this.CLASS_NAME, "streamNotFound", entryId);
			}

			const entryNamespaceId = urnParsedEntry.namespaceSpecific(1);
			const existing = await this.findEntry(streamNamespaceId, entryNamespaceId);
			if (Is.empty(existing)) {
				throw new NotFoundError(this.CLASS_NAME, "streamEntryNotFound", entryId);
			}

			if (Is.empty(existing.deleted)) {
				const context: IAuditableItemStreamServiceContext = {
					now: Date.now(),
					userIdentity: identity,
					nodeIdentity,
					indexCounter: streamEntity.indexCounter,
					immutableInterval: streamEntity.immutableInterval
				};

				await this.setEntry(context, streamEntity.id, {
					...existing,
					deleted: context.now
				});

				const streamModel = await this.streamEntityToModel(streamEntity);
				streamModel.updated = context.now;
				await this._streamStorage.set(this.streamModelToEntity(streamModel, context.indexCounter));
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
	 * @param options.pageSize How many entries to return.
	 * @param options.cursor Cursor to use for next chunk of data.
	 * @param options.order Retrieve the entries in ascending/descending time order, defaults to Ascending.
	 * @param responseType The response type to return, defaults to application/json.
	 * @returns The stream and entries if found.
	 * @throws NotFoundError if the stream is not found.
	 */
	public async getEntries(
		id: string,
		options?: {
			conditions?: IComparator[];
			includeDeleted?: boolean;
			pageSize?: number;
			cursor?: string;
			order?: SortDirection;
		},
		// eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents
		responseType?: typeof MimeTypes.Json | typeof MimeTypes.JsonLd
	): Promise<{
		entries: IAuditableItemStreamEntry[] | IJsonLdDocument[];
		cursor?: string;
	}> {
		Guards.stringValue(this.CLASS_NAME, nameof(id), id);

		const result = await this.findEntries(
			id,
			options?.includeDeleted,
			options?.conditions,
			options?.order,
			undefined,
			options?.pageSize,
			options?.cursor
		);

		const models = result.entries.map(e => this.streamEntryEntityToModel(e));

		if (responseType === MimeTypes.JsonLd) {
			return {
				entries: models.map(m => this.modelEntryToJsonLd(m)),
				cursor: result.cursor
			};
		}

		return {
			entries: models,
			cursor: result.cursor
		};
	}

	/**
	 * Map the stream model to an entity.
	 * @param streamModel The stream model.
	 * @param indexCounter The index counter.
	 * @returns The entity.
	 * @internal
	 */
	private streamModelToEntity(
		streamModel: IAuditableItemStream,
		indexCounter: number
	): AuditableItemStream {
		const entity: AuditableItemStream = {
			id: streamModel.id,
			created: streamModel.created,
			updated: streamModel.updated,
			nodeIdentity: streamModel.nodeIdentity,
			metadata: streamModel.metadata,
			immutableInterval: streamModel.immutableInterval,
			indexCounter
		};

		return entity;
	}

	/**
	 * Map the stream entry model to a entity.
	 * @param streamEntryModel The stream entry model.
	 * @returns The entity.
	 * @internal
	 */
	private streamEntryModelToEntity(
		streamId: string,
		streamEntryModel: IAuditableItemStreamEntry
	): AuditableItemStreamEntry {
		const streamEntryEntity: AuditableItemStreamEntry = {
			id: streamEntryModel.id,
			streamId,
			created: streamEntryModel.created,
			updated: streamEntryModel.updated,
			deleted: streamEntryModel.deleted,
			metadata: streamEntryModel.metadata,
			userIdentity: streamEntryModel.userIdentity,
			index: streamEntryModel.index,
			hash: streamEntryModel.hash,
			signature: streamEntryModel.signature
		};
		return streamEntryEntity;
	}

	/**
	 * Map the stream entity to a model.
	 * @param streamEntity The stream entity.
	 * @returns The model.
	 * @internal
	 */
	private streamEntityToModel(streamEntity: AuditableItemStream): IAuditableItemStream {
		const model: IAuditableItemStream = {
			id: streamEntity.id,
			created: streamEntity.created,
			updated: streamEntity.updated,
			nodeIdentity: streamEntity.nodeIdentity,
			metadata: streamEntity.metadata,
			immutableInterval: streamEntity.immutableInterval
		};

		return model;
	}

	/**
	 * Map the stream entry entity to a model.
	 * @param streamEntryEntity The stream entry entity.
	 * @returns The model
	 * @internal
	 */
	private streamEntryEntityToModel(
		streamEntryEntity: AuditableItemStreamEntry
	): IAuditableItemStreamEntry {
		const streamEntryModel: IAuditableItemStreamEntry = {
			id: streamEntryEntity.id,
			created: streamEntryEntity.created,
			updated: streamEntryEntity.updated,
			deleted: streamEntryEntity.deleted,
			metadata: streamEntryEntity.metadata,
			userIdentity: streamEntryEntity.userIdentity,
			index: streamEntryEntity.index,
			hash: streamEntryEntity.hash,
			signature: streamEntryEntity.signature
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
		entry: Partial<IAuditableItemStreamEntry>
	): Promise<string> {
		Guards.object(this.CLASS_NAME, nameof(entry), entry);

		if (Is.object(entry.metadata)) {
			const validationFailures: IValidationFailure[] = [];
			await JsonLdHelper.validate(entry.metadata, validationFailures);
			Validation.asValidationError(this.CLASS_NAME, "entry.metadata", validationFailures);
		}

		const model: IAuditableItemStreamEntry = {
			id: entry.id ?? Converter.bytesToHex(RandomHelper.generate(32), false),
			created: entry.created ?? context.now,
			deleted: entry.deleted,
			metadata: entry.metadata,
			userIdentity: context.userIdentity,
			hash: entry.hash ?? "",
			signature: entry.signature ?? "",
			index: entry.index ?? context.indexCounter++
		};

		// If the created date is not the same as the context now, then we are updating the entry.
		if (model.created !== context.now) {
			model.updated = context.now;
		}

		const entryHash = this.calculateEntryHash(model);

		const signature = await this._vaultConnector.sign(
			`${context.nodeIdentity}/${this._vaultKeyId}`,
			entryHash
		);

		model.hash = Converter.bytesToBase64(entryHash);
		model.signature = Converter.bytesToBase64(signature);

		if (context.immutableInterval > 0 && model.index % context.immutableInterval === 0) {
			const credentialData: IAuditableItemStreamEntryCredential = {
				created: model.created,
				userIdentity: context.userIdentity,
				hash: model.hash,
				signature: model.signature,
				index: model.index
			};

			// Create the verifiable credential
			const verifiableCredential = await this._identityConnector.createVerifiableCredential(
				context.nodeIdentity,
				`${context.nodeIdentity}#${this._assertionMethodId}`,
				undefined,
				AuditableItemStreamTypes.StreamEntryCredential,
				credentialData
			);

			model.immutableStorageId = await this._integrityImmutableStorage.store(
				context.nodeIdentity,
				Converter.utf8ToBytes(verifiableCredential.jwt)
			);
		}

		await this._streamEntryStorage.set(this.streamEntryModelToEntity(streamId, model));

		return model.id;
	}

	/**
	 * Find a stream entry.
	 * @param streamId The stream id.
	 * @param entryId The entry id.
	 * @internal
	 */
	private async findEntry(
		streamId: string,
		entryId: string
	): Promise<AuditableItemStreamEntry | undefined> {
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
					property: "created",
					sortDirection: SortDirection.Descending
				}
			],
			undefined,
			undefined,
			1
		);

		if (result.entities.length > 0) {
			return result.entities[0] as AuditableItemStreamEntry;
		}
	}

	/**
	 * Find stream entries.
	 * @param streamId The stream id.
	 * @param pageSize The page size.
	 * @param cursor The cursor.
	 * @internal
	 */
	private async findEntries(
		streamId: string,
		includeDeleted?: boolean,
		conditions?: IComparator[],
		sortDirection?: SortDirection,
		propertiesToReturn?: (keyof AuditableItemStreamEntry)[],
		pageSize?: number,
		cursor?: string
	): Promise<{
		entries: AuditableItemStreamEntry[];
		cursor?: string;
	}> {
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
				property: "deleted",
				comparison: ComparisonOperator.Equals,
				value: undefined
			});
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
					property: "created",
					sortDirection: sortDirection ?? SortDirection.Descending
				}
			],
			propertiesToReturn,
			cursor,
			pageSize
		);

		return {
			entries: result.entities as AuditableItemStreamEntry[],
			cursor: `${result.cursor}${includeDeleted ? "|true" : ""}`
		};
	}

	/**
	 * Convert a model to a JSON-LD document.
	 * @param model The model to convert.
	 * @returns The JSON-LD document.
	 * @internal
	 */
	private modelToJsonLd(model: IAuditableItemStream): IJsonLdDocument {
		const doc: IJsonLdNodeObject = {
			"@context": AuditableItemStreamTypes.ContextJsonld,
			"@type": AuditableItemStreamTypes.Stream,
			id: model.id,
			nodeIdentity: model.nodeIdentity,
			created: new Date(model.created).toISOString()
		};

		if (Is.integer(model.updated)) {
			doc.updated = new Date(model.updated).toISOString();
		}
		if (Is.objectValue(model.metadata)) {
			doc.metadata = model.metadata;
		}

		if (Is.arrayValue(model.entries)) {
			const entriesJsonld: IJsonLdNodeObject[] = [];
			for (const entry of model.entries) {
				entriesJsonld.push(this.modelEntryToJsonLd(entry));
			}
			doc.entries = entriesJsonld;
		}

		return doc;
	}

	/**
	 * Convert a model to a JSON-LD document.
	 * @param model The model to convert.
	 * @returns The JSON-LD document.
	 * @internal
	 */
	private modelEntryToJsonLd(entry: IAuditableItemStreamEntry): IJsonLdNodeObject {
		const entryJsonLd: IJsonLdNodeObject = {
			"@type": AuditableItemStreamTypes.StreamEntry,
			id: entry.id,
			created: new Date(entry.created).toISOString()
		};
		if (Is.integer(entry.updated)) {
			entryJsonLd.updated = new Date(entry.updated).toISOString();
		}
		if (Is.integer(entry.deleted)) {
			entryJsonLd.deleted = new Date(entry.deleted).toISOString();
		}
		if (Is.objectValue(entry.metadata)) {
			entryJsonLd.metadata = entry.metadata;
		}
		return entryJsonLd;
	}

	/**
	 * Calculate the entry hash.
	 * @param entry The entry to calculate the hash for.
	 * @returns The hash.
	 * @internal
	 */
	private calculateEntryHash(entry: IAuditableItemStreamEntry): Uint8Array {
		const b2b = new Blake2b(Blake2b.SIZE_256);

		b2b.update(Converter.utf8ToBytes(entry.id.toString()));
		b2b.update(Converter.utf8ToBytes(entry.created.toString()));
		if (Is.integer(entry.updated)) {
			b2b.update(Converter.utf8ToBytes(entry.updated.toString()));
		}
		if (Is.integer(entry.deleted)) {
			b2b.update(Converter.utf8ToBytes(entry.deleted.toString()));
		}
		if (Is.integer(entry.index)) {
			b2b.update(Converter.utf8ToBytes(entry.index.toString()));
		}
		if (Is.stringValue(entry.userIdentity)) {
			b2b.update(ObjectHelper.toBytes(entry.userIdentity));
		}
		if (Is.objectValue(entry.metadata)) {
			b2b.update(ObjectHelper.toBytes(entry.metadata));
		}

		return b2b.digest();
	}
}
