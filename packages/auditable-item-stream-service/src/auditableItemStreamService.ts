// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import {
	AuditableItemStreamTypes,
	AuditableItemStreamVerificationState,
	type IAuditableItemStreamList,
	type IAuditableItemStream,
	type IAuditableItemStreamComponent,
	type IAuditableItemStreamCredential,
	type IAuditableItemStreamEntry,
	type IAuditableItemStreamEntryCredential,
	type IAuditableItemStreamVerification,
	type IAuditableItemStreamEntryList,
	type IAuditableItemStreamEntryObjectList
} from "@twin.org/auditable-item-stream-models";
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
} from "@twin.org/core";
import { Blake2b } from "@twin.org/crypto";
import { JsonLdHelper, JsonLdProcessor, type IJsonLdNodeObject } from "@twin.org/data-json-ld";
import { SchemaOrgDataTypes, SchemaOrgTypes } from "@twin.org/data-schema-org";
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
import { IdentityConnectorFactory, type IIdentityConnector } from "@twin.org/identity-models";
import {
	ImmutableStorageConnectorFactory,
	type IImmutableStorageConnector
} from "@twin.org/immutable-storage-models";
import { nameof } from "@twin.org/nameof";
import { VaultConnectorFactory, type IVaultConnector } from "@twin.org/vault-models";
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
				dateModified: context.now,
				streamObject,
				immutableInterval: context.immutableInterval,
				hash: "",
				signature: "",
				indexCounter: 0
			};

			const entryHash = this.calculateHash(streamEntity);

			const signature = await this._vaultConnector.sign(
				`${context.nodeIdentity}/${this._vaultKeyId}`,
				entryHash
			);

			streamEntity.hash = Converter.bytesToBase64(entryHash);
			streamEntity.signature = Converter.bytesToBase64(signature);

			const credentialData: IAuditableItemStreamCredential = {
				"@context": AuditableItemStreamTypes.ContextRoot,
				type: AuditableItemStreamTypes.StreamCredential,
				dateCreated: streamEntity.dateCreated,
				userIdentity: context.userIdentity,
				hash: streamEntity.hash,
				signature: streamEntity.signature
			};

			const fullId = new Urn(AuditableItemStreamService.NAMESPACE, id).toString();

			// Create the verifiable credential for the stream
			const verifiableCredential = await this._identityConnector.createVerifiableCredential(
				context.nodeIdentity,
				`${context.nodeIdentity}#${this._assertionMethodId}`,
				fullId,
				credentialData
			);

			streamEntity.immutableStorageId = await this._immutableStorage.store(
				context.nodeIdentity,
				Converter.utf8ToBytes(verifiableCredential.jwt)
			);

			if (Is.arrayValue(entries)) {
				for (const entry of entries) {
					await this.setEntry(context, id, entry);
				}
			}

			streamEntity.indexCounter = context.indexCounter;

			await this._streamStorage.set(streamEntity);

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

			const streamModel = await this.streamEntityToModel(streamEntity);

			if (options?.includeEntries) {
				const result = await this.findEntries(
					streamEntity.nodeIdentity,
					streamModel.id,
					options?.includeDeleted,
					options?.verifyEntries
				);
				streamModel.entries = result.entries;
				streamModel.cursor = result.cursor;
			}

			if (options?.verifyStream ?? false) {
				streamModel.streamVerification = await this.verifyStreamOrEntry(
					streamEntity.nodeIdentity,
					streamEntity
				);
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
				"@context": AuditableItemStreamTypes.ContextRoot,
				type: AuditableItemStreamTypes.StreamList,
				streams: (results.entities as AuditableItemStream[]).map(e => this.streamEntityToModel(e)),
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

			return new Urn(AuditableItemStreamService.NAMESPACE, [streamEntity.id, createdId]).toString();
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

			const entry = this.streamEntryEntityToModel(result.entity);

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

			const list: IAuditableItemStreamEntryList = {
				"@context": [AuditableItemStreamTypes.ContextRoot, SchemaOrgTypes.ContextRoot],
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
				streamEntity.nodeIdentity,
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
							property: "dateCreated",
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
	 * Map the stream entity to a model.
	 * @param streamEntity The stream entity.
	 * @returns The model.
	 * @internal
	 */
	private streamEntityToModel(streamEntity: AuditableItemStream): IAuditableItemStream {
		const model: IAuditableItemStream = {
			"@context": [AuditableItemStreamTypes.ContextRoot, SchemaOrgTypes.ContextRoot],
			type: AuditableItemStreamTypes.Stream,
			id: streamEntity.id,
			dateCreated: streamEntity.dateCreated,
			dateModified: streamEntity.dateModified,
			nodeIdentity: streamEntity.nodeIdentity,
			userIdentity: streamEntity.userIdentity,
			streamObject: streamEntity.streamObject,
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
			"@context": [AuditableItemStreamTypes.ContextRoot, SchemaOrgTypes.ContextRoot],
			type: AuditableItemStreamTypes.StreamEntry,
			id: `${AuditableItemStreamService.NAMESPACE}:${streamEntryEntity.streamId}:${streamEntryEntity.id}`,
			dateCreated: streamEntryEntity.dateCreated,
			dateModified: streamEntryEntity.dateModified,
			dateDeleted: streamEntryEntity.dateDeleted,
			entryObject: streamEntryEntity.entryObject,
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
			hash: entry.hash ?? "",
			signature: entry.signature ?? "",
			index: entry.index ?? context.indexCounter++
		};

		// If the created date is not the same as the context now, then we are modifying the entry.
		if (entity.dateCreated !== context.now) {
			entity.dateModified = context.now;
		}

		const entryHash = this.calculateHash({
			...entity,
			nodeIdentity: context.nodeIdentity
		});

		const signature = await this._vaultConnector.sign(
			`${context.nodeIdentity}/${this._vaultKeyId}`,
			entryHash
		);

		entity.hash = Converter.bytesToBase64(entryHash);
		entity.signature = Converter.bytesToBase64(signature);

		if (context.immutableInterval > 0 && entity.index % context.immutableInterval === 0) {
			const credentialData: IAuditableItemStreamEntryCredential = {
				"@context": AuditableItemStreamTypes.ContextRoot,
				type: AuditableItemStreamTypes.StreamEntryCredential,
				dateCreated: entity.dateCreated,
				userIdentity: context.userIdentity,
				hash: entity.hash,
				signature: entity.signature,
				index: entity.index
			};

			// Create the verifiable credential
			const verifiableCredential = await this._identityConnector.createVerifiableCredential(
				context.nodeIdentity,
				`${context.nodeIdentity}#${this._assertionMethodId}`,
				`${AuditableItemStreamService.NAMESPACE}:${streamId}:${entity.id}`,
				credentialData
			);

			entity.immutableStorageId = await this._immutableStorage.store(
				context.nodeIdentity,
				Converter.utf8ToBytes(verifiableCredential.jwt)
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
				entryVerification?: IAuditableItemStreamVerification;
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

		let entryVerification: IAuditableItemStreamVerification | undefined;
		if (verifyEntry ?? false) {
			entryVerification = await this.verifyStreamOrEntry(nodeIdentity, {
				...(result.entities[0] as AuditableItemStreamEntry),
				nodeIdentity
			});
		}

		if (result.entities.length > 0) {
			return {
				entity: result.entities[0] as AuditableItemStreamEntry,
				entryVerification: entryVerification as IAuditableItemStreamVerification
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
			if (propertiesToReturn.includes("hash")) {
				propertiesToReturn.push("hash");
			}
			if (propertiesToReturn.includes("signature")) {
				propertiesToReturn.push("signature");
			}
			if (propertiesToReturn.includes("immutableStorageId")) {
				propertiesToReturn.push("immutableStorageId");
			}
			if (propertiesToReturn.includes("index")) {
				propertiesToReturn.push("index");
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
			const entryModel = this.streamEntryEntityToModel(entry as AuditableItemStreamEntry);
			if (needToVerify) {
				entryModel.entryVerification = await this.verifyStreamOrEntry(nodeIdentity, {
					...(entry as AuditableItemStreamEntry),
					nodeIdentity
				});
			}
			entryModels.push(entryModel);
		}

		return {
			entries: entryModels,
			cursor: returnCursor
		};
	}

	/**
	 * Calculate the object hash.
	 * @param object The entry to calculate the hash for.
	 * @returns The hash.
	 * @internal
	 */
	private calculateHash(object: {
		id: string;
		dateCreated: string;
		userIdentity: string;
		nodeIdentity: string;
		streamObject?: IJsonLdNodeObject;
		entryObject?: IJsonLdNodeObject;
		index?: number;
	}): Uint8Array {
		const b2b = new Blake2b(Blake2b.SIZE_256);

		b2b.update(Converter.utf8ToBytes(object.id.toString()));
		b2b.update(Converter.utf8ToBytes(object.dateCreated));
		b2b.update(ObjectHelper.toBytes(object.nodeIdentity));
		b2b.update(ObjectHelper.toBytes(object.userIdentity));
		if (Is.objectValue(object.streamObject)) {
			b2b.update(ObjectHelper.toBytes(object.streamObject));
		}
		if (Is.objectValue(object.entryObject)) {
			b2b.update(ObjectHelper.toBytes(object.entryObject));
		}
		if (Is.integer(object.index)) {
			b2b.update(Converter.utf8ToBytes(object.index.toString()));
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
		streamOrEntry: {
			id: string;
			dateCreated: string;
			userIdentity: string;
			nodeIdentity: string;
			hash: string;
			signature: string;
			immutableStorageId?: string;
			index?: number;
			streamObject?: IJsonLdNodeObject;
			entryObject?: IJsonLdNodeObject;
		}
	): Promise<IAuditableItemStreamVerification> {
		const verification: IAuditableItemStreamVerification = {
			"@context": AuditableItemStreamTypes.ContextRoot,
			state: AuditableItemStreamVerificationState.Ok,
			type: AuditableItemStreamTypes.Verification
		};

		const isEntry = "streamId" in streamOrEntry;
		if (isEntry) {
			verification.id = streamOrEntry.id;
		}

		const calculatedHash = this.calculateHash(streamOrEntry);
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
						: (verificationResult.verifiableCredential?.credentialSubject ?? {
								dateCreated: "",
								userIdentity: "",
								signature: "",
								hash: "",
								index: -1
							});

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
