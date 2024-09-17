// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import {
	AuditableItemStreamTypes,
	AuditableItemStreamVerificationState,
	type IAuditableItemStreamVerification,
	type IAuditableItemStream,
	type IAuditableItemStreamComponent,
	type IAuditableItemStreamCredential,
	type IAuditableItemStreamEntry,
	type IAuditableItemStreamEntryCredential,
	type JsonReturnType
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
	LogicalOperator,
	SortDirection,
	type IComparator,
	type IComparatorGroup
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
	 * The immutable storage for the credentials.
	 * @internal
	 */
	private readonly _immutableStorage: IImmutableStorageConnector;

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
	 * @param options.immutableStorageType The immutable storage for audit trail, defaults to "auditable-item-stream".
	 * @param options.identityConnectorType The identity connector type, defaults to "identity".
	 */
	constructor(options?: {
		vaultConnectorType?: string;
		streamEntityStorageType?: string;
		streamEntryEntityStorageType?: string;
		immutableStorageType?: string;
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

		this._immutableStorage = ImmutableStorageConnectorFactory.get(
			options?.immutableStorageType ?? "auditable-item-stream"
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
	 * A value of 0 will disable integrity checks, 1 will be every item, or any other integer for an interval.
	 * @param userIdentity The identity to create the auditable item stream operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns The id of the new stream item.
	 */
	public async create(
		metadata?: IJsonLdNodeObject,
		entries?: {
			object: IJsonLdNodeObject;
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
			if (Is.object(metadata)) {
				const validationFailures: IValidationFailure[] = [];
				await JsonLdHelper.validate(metadata, validationFailures);
				Validation.asValidationError(this.CLASS_NAME, "metadata", validationFailures);
			}

			const id = Converter.bytesToHex(RandomHelper.generate(32), false);

			const context: IAuditableItemStreamServiceContext = {
				now: Date.now(),
				userIdentity,
				nodeIdentity,
				indexCounter: 0,
				immutableInterval: options?.immutableInterval ?? this._defaultImmutableInterval
			};

			const streamModel: IAuditableItemStream = {
				id,
				nodeIdentity,
				userIdentity,
				created: context.now,
				updated: context.now,
				metadata,
				immutableInterval: context.immutableInterval,
				hash: "",
				signature: ""
			};

			const entryHash = this.calculateStreamHash(streamModel);

			const signature = await this._vaultConnector.sign(
				`${context.nodeIdentity}/${this._vaultKeyId}`,
				entryHash
			);

			streamModel.hash = Converter.bytesToBase64(entryHash);
			streamModel.signature = Converter.bytesToBase64(signature);

			const credentialData: IAuditableItemStreamCredential = {
				created: streamModel.created,
				userIdentity: context.userIdentity,
				hash: streamModel.hash,
				signature: streamModel.signature
			};

			const fullId = new Urn(AuditableItemStreamService.NAMESPACE, id).toString();

			// Create the verifiable credential for the stream
			const verifiableCredential = await this._identityConnector.createVerifiableCredential(
				context.nodeIdentity,
				`${context.nodeIdentity}#${this._assertionMethodId}`,
				fullId,
				AuditableItemStreamTypes.StreamCredential,
				credentialData
			);

			streamModel.immutableStorageId = await this._immutableStorage.store(
				context.nodeIdentity,
				Converter.utf8ToBytes(verifiableCredential.jwt)
			);

			if (Is.arrayValue(entries)) {
				for (const entry of entries) {
					await this.setEntry(context, id, entry);
				}
			}

			await this._streamStorage.set(this.streamModelToEntity(streamModel, context.indexCounter));

			return fullId;
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
	 * @param responseType The response type to return, defaults to application/json.
	 * @returns The stream and entries if found.
	 * @throws NotFoundError if the stream is not found
	 */
	public async get<T extends "json" | "jsonld" = "json">(
		id: string,
		options?: {
			includeEntries?: boolean;
			includeDeleted?: boolean;
			verifyStream?: boolean;
			verifyEntries?: boolean;
		},
		responseType?: T
	): Promise<
		JsonReturnType<
			T,
			IAuditableItemStream & {
				cursor?: string;
				verification?: IAuditableItemStreamVerification;
				entriesVerification?: IAuditableItemStreamVerification[];
			},
			IJsonLdDocument
		>
	> {
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
			let verification: IAuditableItemStreamVerification | undefined;
			let entriesVerification: IAuditableItemStreamVerification[] | undefined;

			if (options?.includeEntries) {
				const result = await this.findEntries(
					streamEntity.nodeIdentity,
					streamModel.id,
					options?.includeDeleted,
					options?.verifyEntries
				);
				streamModel.entries = result.entries.map(e => this.streamEntryEntityToModel(e));
				cursor = result.cursor;
				entriesVerification = result.entriesVerification;
			}

			if (options?.verifyStream ?? false) {
				verification = await this.verifyStreamOrEntry(streamEntity.nodeIdentity, streamEntity);
			}

			if (responseType === "jsonld") {
				const vertexJsonLd = this.modelToJsonLd(streamModel);
				if (Is.objectValue(verification)) {
					vertexJsonLd.verification = this.modelVerificationToJsonLd(verification);
				}
				if (Is.arrayValue(entriesVerification)) {
					vertexJsonLd.entriesVerification = entriesVerification.map(v =>
						this.modelVerificationToJsonLd(v)
					);
				}

				const compacted = await JsonLdProcessor.compact(vertexJsonLd, {
					"@context": AuditableItemStreamTypes.ContextUri
				});

				return compacted as JsonReturnType<
					T,
					IAuditableItemStream & {
						cursor?: string;
						verification?: IAuditableItemStreamVerification;
						entriesVerification?: IAuditableItemStreamVerification[];
					},
					IJsonLdDocument
				>;
			}

			return {
				...streamModel,
				cursor,
				verification,
				entriesVerification
			} as JsonReturnType<
				T,
				IAuditableItemStream & {
					cursor?: string;
					verification?: IAuditableItemStreamVerification;
					entriesVerification?: IAuditableItemStreamVerification[];
				},
				IJsonLdDocument
			>;
		} catch (error) {
			throw new GeneralError(this.CLASS_NAME, "getFailed", undefined, error);
		}
	}

	/**
	 * Update a stream.
	 * @param id The id of the stream to update.
	 * @param metadata The metadata for the stream as JSON-LD.
	 * @param userIdentity The identity to create the auditable item stream operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns Nothing.
	 */
	public async update(
		id: string,
		metadata?: IJsonLdNodeObject,
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

			if (Is.object(metadata)) {
				const validationFailures: IValidationFailure[] = [];
				await JsonLdHelper.validate(metadata, validationFailures);
				Validation.asValidationError(this.CLASS_NAME, "metadata", validationFailures);
			}

			const context: IAuditableItemStreamServiceContext = {
				now: Date.now(),
				userIdentity,
				nodeIdentity,
				indexCounter: streamEntity.indexCounter,
				immutableInterval: streamEntity.immutableInterval
			};

			const streamModel = await this.streamEntityToModel(streamEntity);

			if (!ObjectHelper.equal(streamModel.metadata, metadata, false)) {
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
	public async query<T extends "json" | "jsonld" = "json">(
		conditions?: IComparator[],
		orderBy?: "created" | "updated",
		orderByDirection?: SortDirection,
		properties?: (keyof IAuditableItemStream)[],
		cursor?: string,
		pageSize?: number,
		responseType?: T
	): Promise<
		JsonReturnType<
			T,
			{
				entities: Partial<IAuditableItemStream>[];
				cursor?: string;
			},
			IJsonLdDocument
		>
	> {
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

			if (responseType === "jsonld") {
				const jsonLdEntities = models.map(m => this.modelToJsonLd(m));

				const jsonDocument: IJsonLdNodeObject = {
					"@context": AuditableItemStreamTypes.ContextUri,
					"@graph": jsonLdEntities,
					cursor: results.cursor
				};

				const compacted = await JsonLdProcessor.compact(jsonDocument, {
					"@context": AuditableItemStreamTypes.ContextUri
				});

				return compacted as JsonReturnType<
					T,
					{
						entities: Partial<AuditableItemStream>[];
						cursor?: string;
					},
					IJsonLdDocument
				>;
			}

			return {
				entities: models,
				cursor: results.cursor
			} as JsonReturnType<
				T,
				{
					entities: Partial<AuditableItemStream>[];
					cursor?: string;
				},
				IJsonLdDocument
			>;
		} catch (error) {
			throw new GeneralError(this.CLASS_NAME, "queryingFailed", undefined, error);
		}
	}

	/**
	 * Create an entry in the stream.
	 * @param id The id of the stream to update.
	 * @param object The object for the stream as JSON-LD.
	 * @param userIdentity The identity to create the auditable item stream operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns The id of the created entry, if not provided.
	 */
	public async createEntry(
		id: string,
		object: IJsonLdNodeObject,
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
				now: Date.now(),
				userIdentity,
				nodeIdentity,
				indexCounter: streamEntity.indexCounter,
				immutableInterval: streamEntity.immutableInterval
			};

			const createdId = await this.setEntry(context, streamEntity.id, {
				object
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
	 * @param options Additional options for the get operation.
	 * @param options.verifyEntry Should the entry be verified, defaults to false.
	 * @param responseType The response type to return, defaults to application/json.
	 * @returns The stream and entries if found.
	 * @throws NotFoundError if the stream is not found.
	 */
	public async getEntry<T extends "json" | "jsonld" = "json">(
		id: string,
		entryId: string,
		options?: {
			verifyEntry?: boolean;
		},
		responseType?: T
	): Promise<
		JsonReturnType<
			T,
			IAuditableItemStreamEntry & {
				verification?: IAuditableItemStreamVerification;
			},
			IJsonLdDocument
		>
	> {
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

			const modelEntry = this.streamEntryEntityToModel(result.entity);

			if (responseType === "jsonld") {
				const vertexJsonLd = this.modelEntryToJsonLd(modelEntry);

				if (Is.objectValue(result.verification)) {
					vertexJsonLd.verification = this.modelVerificationToJsonLd(result.verification);
				}

				const compacted = await JsonLdProcessor.compact(vertexJsonLd, {
					"@context": AuditableItemStreamTypes.ContextUri
				});

				return compacted as JsonReturnType<
					T,
					IAuditableItemStreamEntry & {
						verification?: IAuditableItemStreamVerification;
					},
					IJsonLdDocument
				>;
			}

			return {
				...modelEntry,
				verification: result.verification
			} as JsonReturnType<
				T,
				IAuditableItemStreamEntry & {
					verification?: IAuditableItemStreamVerification;
				},
				IJsonLdDocument
			>;
		} catch (error) {
			throw new GeneralError(this.CLASS_NAME, "gettingEntryFailed", undefined, error);
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
				now: Date.now(),
				userIdentity,
				nodeIdentity,
				indexCounter: streamEntity.indexCounter,
				immutableInterval: streamEntity.immutableInterval
			};

			await this.setEntry(context, streamEntity.id, {
				...existing,
				object: entryObject
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

			if (Is.empty(result.entity.deleted)) {
				const context: IAuditableItemStreamServiceContext = {
					now: Date.now(),
					userIdentity,
					nodeIdentity,
					indexCounter: streamEntity.indexCounter,
					immutableInterval: streamEntity.immutableInterval
				};

				await this.setEntry(context, streamEntity.id, {
					...result.entity,
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
	 * @param options.verifyEntries Should the entries be verified, defaults to false.
	 * @param options.pageSize How many entries to return.
	 * @param options.cursor Cursor to use for next chunk of data.
	 * @param options.order Retrieve the entries in ascending/descending time order, defaults to Ascending.
	 * @param responseType The response type to return, defaults to application/json.
	 * @returns The stream and entries if found.
	 * @throws NotFoundError if the stream is not found.
	 */
	public async getEntries<T extends "json" | "jsonld" = "json">(
		id: string,
		options?: {
			conditions?: IComparator[];
			includeDeleted?: boolean;
			verifyEntries?: boolean;
			pageSize?: number;
			cursor?: string;
			order?: SortDirection;
		},
		responseType?: T
	): Promise<
		JsonReturnType<
			T,
			{
				entries: IAuditableItemStreamEntry[];
				cursor?: string;
				entriesVerification?: IAuditableItemStreamVerification[];
			},
			IJsonLdDocument
		>
	> {
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
				streamEntity.nodeIdentity,
				streamNamespaceId,
				options?.includeDeleted,
				options?.verifyEntries,
				options?.conditions,
				options?.order,
				undefined,
				options?.pageSize,
				options?.cursor
			);

			const models = result.entries.map(e => this.streamEntryEntityToModel(e));

			if (responseType === "jsonld") {
				const vertexJsonLd: IJsonLdNodeObject = {
					"@context": AuditableItemStreamTypes.ContextUri,
					"@graph": models.map(m => this.modelEntryToJsonLd(m)),
					cursor: result.cursor
				};

				vertexJsonLd.entriesVerification = (result.entriesVerification ?? []).map(v =>
					this.modelVerificationToJsonLd(v)
				);

				const compacted = await JsonLdProcessor.compact(vertexJsonLd, {
					"@context": AuditableItemStreamTypes.ContextUri
				});

				return compacted as JsonReturnType<
					T,
					{
						entries: IAuditableItemStreamEntry[];
						cursor?: string;
						entriesVerification?: IAuditableItemStreamVerification[];
					},
					IJsonLdDocument
				>;
			}

			return {
				entries: models,
				entriesVerification: result.entriesVerification,
				cursor: result.cursor
			} as JsonReturnType<
				T,
				{
					entries: IAuditableItemStreamEntry[];
					cursor?: string;
					entriesVerification?: IAuditableItemStreamVerification[];
				},
				IJsonLdDocument
			>;
		} catch (error) {
			throw new GeneralError(this.CLASS_NAME, "gettingEntriesFailed", undefined, error);
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

			if (Is.stringValue(streamEntity.immutableStorageId)) {
				await this._immutableStorage.remove(nodeIdentity, streamEntity.immutableStorageId);
				delete streamEntity.immutableStorageId;
				await this._streamStorage.set(streamEntity);
			}

			let entriesResult;
			do {
				entriesResult = await this._streamEntryStorage.query(
					{
						property: "streamId",
						value: streamId,
						comparison: ComparisonOperator.Equals
					},
					[
						{
							property: "created",
							sortDirection: SortDirection.Ascending
						}
					],
					undefined,
					entriesResult?.cursor
				);

				for (const streamEntry of entriesResult.entities) {
					if (Is.stringValue(streamEntry.immutableStorageId)) {
						await this._immutableStorage.remove(nodeIdentity, streamEntry.immutableStorageId);
						delete streamEntry.immutableStorageId;
						await this._streamEntryStorage.set(streamEntry as AuditableItemStreamEntry);
					}
				}
			} while (Is.stringValue(entriesResult.cursor));
		} catch (error) {
			throw new GeneralError(this.CLASS_NAME, "removeImmutableFailed", undefined, error);
		}
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
			userIdentity: streamModel.userIdentity,
			metadata: streamModel.metadata,
			immutableInterval: streamModel.immutableInterval,
			indexCounter,
			hash: streamModel.hash,
			signature: streamModel.signature,
			immutableStorageId: streamModel.immutableStorageId
		};

		return entity;
	}

	/**
	 * Map the stream entry model to a entity.
	 * @param streamId The stream id to use during the mapping.
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
			object: streamEntryModel.object,
			userIdentity: streamEntryModel.userIdentity,
			index: streamEntryModel.index,
			hash: streamEntryModel.hash,
			signature: streamEntryModel.signature,
			immutableStorageId: streamEntryModel.immutableStorageId
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
			userIdentity: streamEntity.userIdentity,
			metadata: streamEntity.metadata,
			immutableInterval: streamEntity.immutableInterval,
			hash: streamEntity.hash,
			signature: streamEntity.signature,
			immutableStorageId: streamEntity.immutableStorageId
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
			id: `${AuditableItemStreamService.NAMESPACE}:${streamEntryEntity.streamId}:${streamEntryEntity.id}`,
			created: streamEntryEntity.created,
			updated: streamEntryEntity.updated,
			deleted: streamEntryEntity.deleted,
			object: streamEntryEntity.object,
			userIdentity: streamEntryEntity.userIdentity,
			index: streamEntryEntity.index,
			hash: streamEntryEntity.hash,
			signature: streamEntryEntity.signature,
			immutableStorageId: streamEntryEntity.immutableStorageId
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

		if (Is.object(entry.object)) {
			const validationFailures: IValidationFailure[] = [];
			await JsonLdHelper.validate(entry.object, validationFailures);
			Validation.asValidationError(this.CLASS_NAME, "entry.object", validationFailures);
		}

		const model: IAuditableItemStreamEntry = {
			id: entry.id ?? Converter.bytesToHex(RandomHelper.generate(32), false),
			created: entry.created ?? context.now,
			deleted: entry.deleted,
			object: entry.object ?? {},
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
				`${AuditableItemStreamService.NAMESPACE}:${streamId}:${model.id}`,
				AuditableItemStreamTypes.StreamEntryCredential,
				credentialData
			);

			model.immutableStorageId = await this._immutableStorage.store(
				context.nodeIdentity,
				Converter.utf8ToBytes(verifiableCredential.jwt)
			);
		}

		await this._streamEntryStorage.set(this.streamEntryModelToEntity(streamId, model));

		return model.id;
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
				verification?: IAuditableItemStreamVerification;
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
					property: "created",
					sortDirection: SortDirection.Descending
				}
			],
			undefined,
			undefined,
			1
		);

		let verification: IAuditableItemStreamVerification | undefined;
		if (verifyEntry ?? false) {
			verification = await this.verifyStreamOrEntry(
				nodeIdentity,
				result.entities[0] as AuditableItemStreamEntry
			);
		}

		if (result.entities.length > 0) {
			return {
				entity: result.entities[0] as AuditableItemStreamEntry,
				verification: verification as IAuditableItemStreamVerification
			};
		}
	}

	/**
	 * Find stream entries.
	 * @param nodeIdentity The node identity.
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
		nodeIdentity: string,
		streamId: string,
		includeDeleted?: boolean,
		verifyEntries?: boolean,
		conditions?: IComparator[],
		sortDirection?: SortDirection,
		propertiesToReturn?: (keyof AuditableItemStreamEntry)[],
		pageSize?: number,
		cursor?: string
	): Promise<{
		entries: AuditableItemStreamEntry[];
		cursor?: string;
		entriesVerification?: IAuditableItemStreamVerification[];
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

		let returnCursor: string | undefined;

		if (Is.stringValue(result.cursor)) {
			returnCursor = result.cursor;
		}
		if (includeDeleted) {
			returnCursor = `${returnCursor ?? ""}|true`;
		}

		let entriesVerification: IAuditableItemStreamVerification[] | undefined;
		if (verifyEntries ?? false) {
			entriesVerification ??= [];
			for (const entry of result.entities as AuditableItemStreamEntry[]) {
				const verification = await this.verifyStreamOrEntry(nodeIdentity, entry);
				entriesVerification.push(verification);
			}
		}

		return {
			entries: result.entities as AuditableItemStreamEntry[],
			cursor: returnCursor,
			entriesVerification
		};
	}

	/**
	 * Convert a model to a JSON-LD document.
	 * @param model The model to convert.
	 * @returns The JSON-LD document.
	 * @internal
	 */
	private modelToJsonLd(model: IAuditableItemStream): IJsonLdNodeObject {
		const nodeObject: IJsonLdNodeObject = {
			"@context": AuditableItemStreamTypes.ContextJsonld,
			"@type": AuditableItemStreamTypes.Stream,
			id: model.id,
			nodeIdentity: model.nodeIdentity,
			created: new Date(model.created).toISOString()
		};

		if (Is.integer(model.updated)) {
			nodeObject.updated = new Date(model.updated).toISOString();
		}
		if (Is.objectValue(model.metadata)) {
			nodeObject.metadata = model.metadata;
		}

		if (Is.arrayValue(model.entries)) {
			const entriesJsonld: IJsonLdNodeObject[] = [];
			for (const entry of model.entries) {
				entriesJsonld.push(this.modelEntryToJsonLd(entry));
			}
			nodeObject.entries = entriesJsonld;
		}

		return nodeObject;
	}

	/**
	 * Convert a model to a JSON-LD document.
	 * @param model The model to convert.
	 * @param entry
	 * @returns The JSON-LD document.
	 * @internal
	 */
	private modelEntryToJsonLd(entry: IAuditableItemStreamEntry): IJsonLdNodeObject {
		const entryJsonLd: IJsonLdNodeObject = {
			"@context": AuditableItemStreamTypes.ContextJsonld,
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
		if (Is.stringValue(entry.userIdentity)) {
			entryJsonLd.userIdentity = entry.userIdentity;
		}
		if (Is.objectValue(entry.object)) {
			entryJsonLd.object = entry.object;
		}
		if (Is.integer(entry.index)) {
			entryJsonLd.index = entry.index;
		}
		if (Is.stringValue(entry.hash)) {
			entryJsonLd.hash = entry.hash;
		}
		if (Is.stringValue(entry.signature)) {
			entryJsonLd.signature = entry.signature;
		}
		if (Is.stringValue(entry.immutableStorageId)) {
			entryJsonLd.immutableStorageId = entry.immutableStorageId;
		}
		return entryJsonLd;
	}

	/**
	 * Convert a model for verification to a JSON-LD document.
	 * @param model The model to convert.
	 * @returns The JSON-LD document.
	 * @internal
	 */
	private modelVerificationToJsonLd(model: IAuditableItemStreamVerification): IJsonLdNodeObject {
		const nodeObject: IJsonLdNodeObject = {
			"@context": AuditableItemStreamTypes.ContextJsonld,
			"@type": AuditableItemStreamTypes.Verification,
			...model
		};

		return nodeObject;
	}

	/**
	 * Calculate the stream hash.
	 * @param stream The stream to calculate the hash for.
	 * @returns The hash.
	 * @internal
	 */
	private calculateStreamHash(stream: IAuditableItemStream): Uint8Array {
		const b2b = new Blake2b(Blake2b.SIZE_256);

		b2b.update(Converter.utf8ToBytes(stream.id.toString()));
		b2b.update(Converter.utf8ToBytes(stream.created.toString()));
		b2b.update(ObjectHelper.toBytes(stream.nodeIdentity));
		b2b.update(ObjectHelper.toBytes(stream.userIdentity));

		return b2b.digest();
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
		if (Is.objectValue(entry.object)) {
			b2b.update(ObjectHelper.toBytes(entry.object));
		}

		return b2b.digest();
	}

	/**
	 * Verify the stream or the entry.
	 * @param nodeIdentity The node identity.
	 * @param streamOrEntry The item to verify.
	 * @returns The verification state.
	 * @internal
	 */
	private async verifyStreamOrEntry(
		nodeIdentity: string,
		streamOrEntry: AuditableItemStreamEntry | AuditableItemStream
	): Promise<IAuditableItemStreamVerification> {
		const verification: IAuditableItemStreamVerification = {
			state: AuditableItemStreamVerificationState.Ok
		};

		const isEntry = "streamId" in streamOrEntry;
		if (isEntry) {
			verification.id = streamOrEntry.id;
		}

		const calculatedHash = isEntry
			? this.calculateEntryHash(streamOrEntry)
			: this.calculateStreamHash(streamOrEntry);
		const storedHash = Converter.base64ToBytes(streamOrEntry.hash);

		if (Converter.bytesToBase64(calculatedHash) !== streamOrEntry.hash) {
			verification.state = AuditableItemStreamVerificationState.HashMismatch;
			verification.hash = calculatedHash;
			verification.storedHash = storedHash;
		} else {
			const verified = await this._vaultConnector.verify(
				`${nodeIdentity}/${this._vaultKeyId}`,
				calculatedHash,
				Converter.base64ToBytes(streamOrEntry.signature)
			);

			if (!verified) {
				verification.state = AuditableItemStreamVerificationState.SignatureNotVerified;
			} else if (Is.stringValue(streamOrEntry.immutableStorageId)) {
				const verifiableCredentialBytes = await this._immutableStorage.get(
					streamOrEntry.immutableStorageId
				);
				const verifiableCredentialJwt = Converter.bytesToUtf8(verifiableCredentialBytes);

				// Verify the credential
				const verificationResult = await this._identityConnector.checkVerifiableCredential<
					IAuditableItemStreamCredential | IAuditableItemStreamEntryCredential
				>(verifiableCredentialJwt);

				if (verificationResult.revoked) {
					verification.state = AuditableItemStreamVerificationState.CredentialRevoked;
				} else {
					// Credential is not revoked so check the signature
					const credentialData = Is.array(
						verificationResult.verifiableCredential?.credentialSubject
					)
						? verificationResult.verifiableCredential?.credentialSubject[0]
						: verificationResult.verifiableCredential?.credentialSubject ?? {
								created: 0,
								userIdentity: "",
								signature: "",
								hash: "",
								index: -1
							};

					if (credentialData.hash !== streamOrEntry.hash) {
						// Does the immutable hash match the local one we calculated
						verification.state = AuditableItemStreamVerificationState.ImmutableSignatureMismatch;
					} else if (credentialData.signature !== streamOrEntry.signature) {
						// Does the immutable signature match the local one we calculated
						verification.state = AuditableItemStreamVerificationState.ImmutableSignatureMismatch;
					} else if (
						isEntry &&
						Is.object<IAuditableItemStreamEntryCredential>(credentialData) &&
						credentialData.index !== streamOrEntry.index
					) {
						// Does the immutable index match the local one we calculated
						verification.state = AuditableItemStreamVerificationState.IndexMismatch;
					}
				}
			}
		}

		return verification;
	}
}
