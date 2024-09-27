// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { Converter, RandomHelper } from "@twin.org/core";
import { ComparisonOperator } from "@twin.org/entity";
import { MemoryEntityStorageConnector } from "@twin.org/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@twin.org/entity-storage-models";
import {
	EntityStorageImmutableStorageConnector,
	type ImmutableItem,
	initSchema as initSchemaImmutableStorage
} from "@twin.org/immutable-storage-connector-entity-storage";
import { ImmutableStorageConnectorFactory } from "@twin.org/immutable-storage-models";
import { nameof } from "@twin.org/nameof";
import {
	decodeJwtToIntegrity,
	setupTestEnv,
	TEST_NODE_IDENTITY,
	TEST_USER_IDENTITY,
	TEST_VAULT_CONNECTOR,
	TEST_VAULT_KEY
} from "./setupTestEnv";
import { AuditableItemStreamService } from "../src/auditableItemStreamService";
import type { AuditableItemStream } from "../src/entities/auditableItemStream";
import type { AuditableItemStreamEntry } from "../src/entities/auditableItemStreamEntry";
import { initSchema } from "../src/schema";

let streamStorage: MemoryEntityStorageConnector<AuditableItemStream>;
let streamEntryStorage: MemoryEntityStorageConnector<AuditableItemStreamEntry>;
let immutableStorage: MemoryEntityStorageConnector<ImmutableItem>;

const FIRST_TICK = 1724327716271;
const SECOND_TICK = 1724327816272;

describe("AuditableItemStreamService", () => {
	beforeAll(async () => {
		await setupTestEnv();

		initSchema();
		initSchemaImmutableStorage();
	});

	beforeEach(async () => {
		streamStorage = new MemoryEntityStorageConnector<AuditableItemStream>({
			entitySchema: nameof<AuditableItemStream>()
		});

		streamEntryStorage = new MemoryEntityStorageConnector<AuditableItemStreamEntry>({
			entitySchema: nameof<AuditableItemStreamEntry>()
		});

		EntityStorageConnectorFactory.register("auditable-item-stream", () => streamStorage);
		EntityStorageConnectorFactory.register("auditable-item-stream-entry", () => streamEntryStorage);

		immutableStorage = new MemoryEntityStorageConnector<ImmutableItem>({
			entitySchema: nameof<ImmutableItem>()
		});
		EntityStorageConnectorFactory.register("immutable-item", () => immutableStorage);

		ImmutableStorageConnectorFactory.register(
			"auditable-item-stream",
			() => new EntityStorageImmutableStorageConnector()
		);

		Date.now = vi
			.fn()
			.mockImplementationOnce(() => FIRST_TICK)
			.mockImplementationOnce(() => FIRST_TICK)
			.mockImplementation(() => SECOND_TICK);
		RandomHelper.generate = vi
			.fn()
			.mockImplementationOnce(length => new Uint8Array(length).fill(1))
			.mockImplementationOnce(length => new Uint8Array(length).fill(2))
			.mockImplementationOnce(length => new Uint8Array(length).fill(3))
			.mockImplementationOnce(length => new Uint8Array(length).fill(4))
			.mockImplementationOnce(length => new Uint8Array(length).fill(5))
			.mockImplementationOnce(length => new Uint8Array(length).fill(6))
			.mockImplementationOnce(length => new Uint8Array(length).fill(7))
			.mockImplementationOnce(length => new Uint8Array(length).fill(8))
			.mockImplementationOnce(length => new Uint8Array(length).fill(9))
			.mockImplementationOnce(length => new Uint8Array(length).fill(10))
			.mockImplementationOnce(length => new Uint8Array(length).fill(11))
			.mockImplementationOnce(length => new Uint8Array(length).fill(12))
			.mockImplementationOnce(length => new Uint8Array(length).fill(13))
			.mockImplementationOnce(length => new Uint8Array(length).fill(14))
			.mockImplementation(length => new Uint8Array(length).fill(15));
	});

	test("Can create an instance of the service", async () => {
		const service = new AuditableItemStreamService();
		expect(service).toBeDefined();
	});

	test("Can create a stream with no data", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create(
			undefined,
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		expect(streamId.startsWith("ais:")).toEqual(true);

		const streamStore = streamStorage.getStore();

		expect(streamStore).toEqual([
			{
				id: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: "2024-08-22T11:55:16.271Z",
				dateModified: "2024-08-22T11:55:16.271Z",
				nodeIdentity: TEST_NODE_IDENTITY,
				userIdentity: TEST_USER_IDENTITY,
				immutableInterval: 10,
				indexCounter: 0,
				hash: "kE4miSfO6wrvo8Wo9BOxD4d1UzBhJZJNusoKn/IOwdk=",
				signature:
					"beh2i6Q50FPKHhPjo7SeG0val2acNNrBPLcM2Ucob4RS8xx9KSAdlOOB1Wx6kRxvzN6bBuCrYyq/VsqmWsl7AA==",
				immutableStorageId:
					"immutable:entity-storage:0202020202020202020202020202020202020202020202020202020202020202"
			}
		]);

		const entryStore = streamEntryStorage.getStore();
		expect(entryStore.length).toEqual(0);

		const immutableStore = immutableStorage.getStore();
		expect(immutableStore).toHaveLength(1);
	});

	test("Can create a stream with a single object and multiple entries", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create(
			{
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			[
				{
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 1"
					}
				},
				{
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 2"
					}
				}
			],
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		expect(streamId.startsWith("ais:")).toEqual(true);

		const streamStore = streamStorage.getStore();

		expect(streamStore).toEqual([
			{
				id: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: "2024-08-22T11:55:16.271Z",
				dateModified: "2024-08-22T11:55:16.271Z",
				nodeIdentity: TEST_NODE_IDENTITY,
				userIdentity: TEST_USER_IDENTITY,
				streamObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is a simple note"
				},
				immutableInterval: 10,
				indexCounter: 2,
				hash: "xWEOkKLD95vIc9iPIn4lpF0djFuf+czQ3tBAMTlZNBo=",
				signature:
					"MFMPI9H8hB777qRbgatcjmOCebM3dcXaMgLneiDIYOgTWmFxukApKho8ddvqLjqMelImJocmBiMR4TaCGDONCA==",
				immutableStorageId:
					"immutable:entity-storage:0202020202020202020202020202020202020202020202020202020202020202"
			}
		]);

		const entryStore = streamEntryStorage.getStore();

		expect(entryStore).toEqual([
			{
				id: "0303030303030303030303030303030303030303030303030303030303030303",
				streamId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: "2024-08-22T11:55:16.271Z",
				entryObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is an entry note 1"
				},
				userIdentity: TEST_USER_IDENTITY,
				index: 0,
				hash: "5trXzlskOgceq5xm2q418VjeFy4OzJvkYfy5RMYoSsg=",
				signature:
					"YutSHSBuRQ1J+kUr619k3gIaIsbFklaBCuWpHL/dq3Vk1ZSrHiA2JWYrPEVg25/Xlaq7imShptA6tUKjn57lBw==",
				immutableStorageId:
					"immutable:entity-storage:0404040404040404040404040404040404040404040404040404040404040404"
			},
			{
				id: "0505050505050505050505050505050505050505050505050505050505050505",
				streamId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: "2024-08-22T11:55:16.271Z",
				entryObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is an entry note 2"
				},
				userIdentity: TEST_USER_IDENTITY,
				index: 1,
				hash: "loVMOqZdWxL+0AtHb9bSpQlbcZSCIgfxiAgOL6HfY2k=",
				signature:
					"EEAcNP7AR8FsBWmR+MsCMT7yHo9oOHsj9M6mv7KSGAZ0ty5OgVWzTg2xWvjyf/5RlYSy8R+BGLak81hYw5L2CQ=="
			}
		]);

		const verified = await TEST_VAULT_CONNECTOR.verify(
			TEST_VAULT_KEY,
			Converter.base64ToBytes(entryStore[0].hash),
			Converter.base64ToBytes(entryStore[0].signature)
		);
		expect(verified).toEqual(true);

		const immutableStore = immutableStorage.getStore();
		expect(immutableStore).toHaveLength(2);

		const streamImmutableCredential = await decodeJwtToIntegrity(immutableStore[0].data);
		expect(streamImmutableCredential).toEqual({
			dateCreated: "2024-08-22T11:55:16.271Z",
			userIdentity: TEST_USER_IDENTITY,
			hash: "xWEOkKLD95vIc9iPIn4lpF0djFuf+czQ3tBAMTlZNBo=",
			signature:
				"MFMPI9H8hB777qRbgatcjmOCebM3dcXaMgLneiDIYOgTWmFxukApKho8ddvqLjqMelImJocmBiMR4TaCGDONCA==",
			index: undefined
		});

		const entryImmutableCredential = await decodeJwtToIntegrity(immutableStore[1].data);
		expect(entryImmutableCredential).toEqual({
			dateCreated: "2024-08-22T11:55:16.271Z",
			userIdentity: TEST_USER_IDENTITY,
			hash: "5trXzlskOgceq5xm2q418VjeFy4OzJvkYfy5RMYoSsg=",
			signature:
				"YutSHSBuRQ1J+kUr619k3gIaIsbFklaBCuWpHL/dq3Vk1ZSrHiA2JWYrPEVg25/Xlaq7imShptA6tUKjn57lBw==",
			index: 0
		});
	});

	test("Can get a stream with a single object and multiple entries", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create(
			{
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			[
				{
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 1"
					}
				},
				{
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 2"
					}
				}
			],
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const result = await service.get(streamId, {
			includeEntries: true,
			verifyStream: true,
			verifyEntries: true
		});

		expect(result).toEqual({
			"@context": ["https://schema.twindev.org/ais/", "https://schema.org/"],
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			type: "AuditableItemStream",
			dateCreated: "2024-08-22T11:55:16.271Z",
			dateModified: "2024-08-22T11:55:16.271Z",
			entries: [
				{
					id: "ais:0101010101010101010101010101010101010101010101010101010101010101:0303030303030303030303030303030303030303030303030303030303030303",
					type: "AuditableItemStreamEntry",
					dateCreated: "2024-08-22T11:55:16.271Z",
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 1"
					},
					entryVerification: {
						id: "0303030303030303030303030303030303030303030303030303030303030303",
						type: "AuditableItemStreamVerification",
						state: "ok"
					},
					hash: "5trXzlskOgceq5xm2q418VjeFy4OzJvkYfy5RMYoSsg=",
					immutableStorageId:
						"immutable:entity-storage:0404040404040404040404040404040404040404040404040404040404040404",
					index: 0,
					signature:
						"YutSHSBuRQ1J+kUr619k3gIaIsbFklaBCuWpHL/dq3Vk1ZSrHiA2JWYrPEVg25/Xlaq7imShptA6tUKjn57lBw==",
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				},
				{
					id: "ais:0101010101010101010101010101010101010101010101010101010101010101:0505050505050505050505050505050505050505050505050505050505050505",
					type: "AuditableItemStreamEntry",
					dateCreated: "2024-08-22T11:55:16.271Z",
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 2"
					},
					entryVerification: {
						id: "0505050505050505050505050505050505050505050505050505050505050505",
						type: "AuditableItemStreamVerification",
						state: "ok"
					},
					hash: "loVMOqZdWxL+0AtHb9bSpQlbcZSCIgfxiAgOL6HfY2k=",
					index: 1,
					signature:
						"EEAcNP7AR8FsBWmR+MsCMT7yHo9oOHsj9M6mv7KSGAZ0ty5OgVWzTg2xWvjyf/5RlYSy8R+BGLak81hYw5L2CQ==",
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				}
			],
			hash: "xWEOkKLD95vIc9iPIn4lpF0djFuf+czQ3tBAMTlZNBo=",
			immutableInterval: 10,
			immutableStorageId:
				"immutable:entity-storage:0202020202020202020202020202020202020202020202020202020202020202",
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			signature:
				"MFMPI9H8hB777qRbgatcjmOCebM3dcXaMgLneiDIYOgTWmFxukApKho8ddvqLjqMelImJocmBiMR4TaCGDONCA==",
			streamObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			streamVerification: { type: "AuditableItemStreamVerification", state: "ok" },
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
		});
	});

	test("Can get a stream with a single object and multiple entries, including entries", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create(
			{
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			[
				{
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 1"
					}
				},
				{
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 2"
					}
				}
			],
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const result = await service.get(streamId, {
			includeEntries: true,
			verifyStream: true,
			verifyEntries: true
		});

		expect(result).toEqual({
			"@context": ["https://schema.twindev.org/ais/", "https://schema.org/"],
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			type: "AuditableItemStream",
			dateCreated: "2024-08-22T11:55:16.271Z",
			dateModified: "2024-08-22T11:55:16.271Z",
			entries: [
				{
					id: "ais:0101010101010101010101010101010101010101010101010101010101010101:0303030303030303030303030303030303030303030303030303030303030303",
					type: "AuditableItemStreamEntry",
					dateCreated: "2024-08-22T11:55:16.271Z",
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 1"
					},
					entryVerification: {
						id: "0303030303030303030303030303030303030303030303030303030303030303",
						type: "AuditableItemStreamVerification",
						state: "ok"
					},
					hash: "5trXzlskOgceq5xm2q418VjeFy4OzJvkYfy5RMYoSsg=",
					immutableStorageId:
						"immutable:entity-storage:0404040404040404040404040404040404040404040404040404040404040404",
					index: 0,
					signature:
						"YutSHSBuRQ1J+kUr619k3gIaIsbFklaBCuWpHL/dq3Vk1ZSrHiA2JWYrPEVg25/Xlaq7imShptA6tUKjn57lBw==",
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				},
				{
					id: "ais:0101010101010101010101010101010101010101010101010101010101010101:0505050505050505050505050505050505050505050505050505050505050505",
					type: "AuditableItemStreamEntry",
					dateCreated: "2024-08-22T11:55:16.271Z",
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 2"
					},
					entryVerification: {
						id: "0505050505050505050505050505050505050505050505050505050505050505",
						type: "AuditableItemStreamVerification",
						state: "ok"
					},
					hash: "loVMOqZdWxL+0AtHb9bSpQlbcZSCIgfxiAgOL6HfY2k=",
					index: 1,
					signature:
						"EEAcNP7AR8FsBWmR+MsCMT7yHo9oOHsj9M6mv7KSGAZ0ty5OgVWzTg2xWvjyf/5RlYSy8R+BGLak81hYw5L2CQ==",
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				}
			],
			hash: "xWEOkKLD95vIc9iPIn4lpF0djFuf+czQ3tBAMTlZNBo=",
			immutableInterval: 10,
			immutableStorageId:
				"immutable:entity-storage:0202020202020202020202020202020202020202020202020202020202020202",
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			signature:
				"MFMPI9H8hB777qRbgatcjmOCebM3dcXaMgLneiDIYOgTWmFxukApKho8ddvqLjqMelImJocmBiMR4TaCGDONCA==",
			streamObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			streamVerification: { type: "AuditableItemStreamVerification", state: "ok" },
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
		});
	});

	test("Can update a stream with a single object and multiple entries", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create(
			{
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			[
				{
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 1"
					}
				},
				{
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 2"
					}
				}
			],
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await service.update(
			streamId,
			{
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note xxx"
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		expect(streamId.startsWith("ais:")).toEqual(true);

		const streamStore = streamStorage.getStore();

		expect(streamStore).toEqual([
			{
				id: "0101010101010101010101010101010101010101010101010101010101010101",
				nodeIdentity:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
				dateCreated: "2024-08-22T11:55:16.271Z",
				dateModified: "2024-08-22T11:56:56.272Z",
				streamObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is a simple note xxx"
				},
				immutableInterval: 10,
				hash: "xWEOkKLD95vIc9iPIn4lpF0djFuf+czQ3tBAMTlZNBo=",
				signature:
					"MFMPI9H8hB777qRbgatcjmOCebM3dcXaMgLneiDIYOgTWmFxukApKho8ddvqLjqMelImJocmBiMR4TaCGDONCA==",
				indexCounter: 2,
				immutableStorageId:
					"immutable:entity-storage:0202020202020202020202020202020202020202020202020202020202020202"
			}
		]);

		const entryStore = streamEntryStorage.getStore();

		expect(entryStore).toEqual([
			{
				id: "0303030303030303030303030303030303030303030303030303030303030303",
				streamId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: "2024-08-22T11:55:16.271Z",
				entryObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is an entry note 1"
				},
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
				hash: "5trXzlskOgceq5xm2q418VjeFy4OzJvkYfy5RMYoSsg=",
				signature:
					"YutSHSBuRQ1J+kUr619k3gIaIsbFklaBCuWpHL/dq3Vk1ZSrHiA2JWYrPEVg25/Xlaq7imShptA6tUKjn57lBw==",
				index: 0,
				immutableStorageId:
					"immutable:entity-storage:0404040404040404040404040404040404040404040404040404040404040404"
			},
			{
				id: "0505050505050505050505050505050505050505050505050505050505050505",
				streamId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: "2024-08-22T11:55:16.271Z",
				entryObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is an entry note 2"
				},
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
				hash: "loVMOqZdWxL+0AtHb9bSpQlbcZSCIgfxiAgOL6HfY2k=",
				signature:
					"EEAcNP7AR8FsBWmR+MsCMT7yHo9oOHsj9M6mv7KSGAZ0ty5OgVWzTg2xWvjyf/5RlYSy8R+BGLak81hYw5L2CQ==",
				index: 1
			}
		]);

		const verified = await TEST_VAULT_CONNECTOR.verify(
			TEST_VAULT_KEY,
			Converter.base64ToBytes(entryStore[0].hash),
			Converter.base64ToBytes(entryStore[0].signature)
		);
		expect(verified).toEqual(true);
	});

	test("Can add a stream entry to an existing stream", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create(
			{
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			[
				{
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 1"
					}
				},
				{
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 2"
					}
				}
			],
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await service.createEntry(
			streamId,
			{
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is an entry note 3"
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		expect(streamId.startsWith("ais:")).toEqual(true);

		const streamStore = streamStorage.getStore();

		expect(streamStore).toEqual([
			{
				id: "0101010101010101010101010101010101010101010101010101010101010101",
				nodeIdentity:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
				dateCreated: "2024-08-22T11:55:16.271Z",
				dateModified: "2024-08-22T11:56:56.272Z",
				streamObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is a simple note"
				},
				immutableInterval: 10,
				hash: "xWEOkKLD95vIc9iPIn4lpF0djFuf+czQ3tBAMTlZNBo=",
				signature:
					"MFMPI9H8hB777qRbgatcjmOCebM3dcXaMgLneiDIYOgTWmFxukApKho8ddvqLjqMelImJocmBiMR4TaCGDONCA==",
				indexCounter: 3,
				immutableStorageId:
					"immutable:entity-storage:0202020202020202020202020202020202020202020202020202020202020202"
			}
		]);

		const entryStore = streamEntryStorage.getStore();

		expect(entryStore).toEqual([
			{
				id: "0303030303030303030303030303030303030303030303030303030303030303",
				streamId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: "2024-08-22T11:55:16.271Z",
				entryObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is an entry note 1"
				},
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
				hash: "5trXzlskOgceq5xm2q418VjeFy4OzJvkYfy5RMYoSsg=",
				signature:
					"YutSHSBuRQ1J+kUr619k3gIaIsbFklaBCuWpHL/dq3Vk1ZSrHiA2JWYrPEVg25/Xlaq7imShptA6tUKjn57lBw==",
				index: 0,
				immutableStorageId:
					"immutable:entity-storage:0404040404040404040404040404040404040404040404040404040404040404"
			},
			{
				id: "0505050505050505050505050505050505050505050505050505050505050505",
				streamId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: "2024-08-22T11:55:16.271Z",
				entryObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is an entry note 2"
				},
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
				hash: "loVMOqZdWxL+0AtHb9bSpQlbcZSCIgfxiAgOL6HfY2k=",
				signature:
					"EEAcNP7AR8FsBWmR+MsCMT7yHo9oOHsj9M6mv7KSGAZ0ty5OgVWzTg2xWvjyf/5RlYSy8R+BGLak81hYw5L2CQ==",
				index: 1
			},
			{
				id: "0606060606060606060606060606060606060606060606060606060606060606",
				streamId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: "2024-08-22T11:56:56.272Z",
				entryObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is an entry note 3"
				},
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
				hash: "MR0D5vXFtoIxidC2xXcHP49eslTnDIA+h55vJIFu3eo=",
				signature:
					"vjtYqdwjqrjwe73+LaMIGbXoSVuXP80ehpG6xsf/rJkJKD4ut7U6z695ZhVmZUbZnJM0q+phjr4AA3bSz/n0Cg==",
				index: 2
			}
		]);

		const verified = await TEST_VAULT_CONNECTOR.verify(
			TEST_VAULT_KEY,
			Converter.base64ToBytes(entryStore[0].hash),
			Converter.base64ToBytes(entryStore[0].signature)
		);
		expect(verified).toEqual(true);
	});

	test("Can add multiple stream entries and expect more immutable checks", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create(
			{
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			[
				{
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 1"
					}
				},
				{
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 2"
					}
				}
			],
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		for (let i = 0; i < 10; i++) {
			await service.createEntry(
				streamId,
				{
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: `This is an entry note ${i + 3}`
				},
				TEST_USER_IDENTITY,
				TEST_NODE_IDENTITY
			);
		}

		expect(streamId.startsWith("ais:")).toEqual(true);

		const streamStore = streamStorage.getStore();

		expect(streamStore).toEqual([
			{
				id: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: "2024-08-22T11:55:16.271Z",
				dateModified: "2024-08-22T11:56:56.272Z",
				nodeIdentity: TEST_NODE_IDENTITY,
				userIdentity: TEST_USER_IDENTITY,
				streamObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is a simple note"
				},
				immutableInterval: 10,
				indexCounter: 12,
				hash: "xWEOkKLD95vIc9iPIn4lpF0djFuf+czQ3tBAMTlZNBo=",
				signature:
					"MFMPI9H8hB777qRbgatcjmOCebM3dcXaMgLneiDIYOgTWmFxukApKho8ddvqLjqMelImJocmBiMR4TaCGDONCA==",
				immutableStorageId:
					"immutable:entity-storage:0202020202020202020202020202020202020202020202020202020202020202"
			}
		]);

		const entryStore = streamEntryStorage.getStore();
		expect(entryStore).toHaveLength(12);

		const immutableStore = immutableStorage.getStore();
		expect(immutableStore).toHaveLength(3);
	});

	test("Can get an entry from the stream", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create(
			{
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			[
				{
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 1"
					}
				},
				{
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 2"
					}
				}
			],
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const stream = await service.get(streamId, {
			includeEntries: true,
			verifyStream: true,
			verifyEntries: true
		});

		const entry = await service.getEntry(streamId, stream.entries?.[0].id ?? "", {
			verifyEntry: true
		});

		expect(entry).toEqual({
			"@context": ["https://schema.twindev.org/ais/", "https://schema.org/"],
			id: "ais:0101010101010101010101010101010101010101010101010101010101010101:0303030303030303030303030303030303030303030303030303030303030303",
			type: "AuditableItemStreamEntry",
			dateCreated: "2024-08-22T11:55:16.271Z",
			entryObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is an entry note 1"
			},
			hash: "5trXzlskOgceq5xm2q418VjeFy4OzJvkYfy5RMYoSsg=",
			immutableStorageId:
				"immutable:entity-storage:0404040404040404040404040404040404040404040404040404040404040404",
			index: 0,
			signature:
				"YutSHSBuRQ1J+kUr619k3gIaIsbFklaBCuWpHL/dq3Vk1ZSrHiA2JWYrPEVg25/Xlaq7imShptA6tUKjn57lBw==",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
		});

		const streamStore = streamStorage.getStore();

		expect(streamStore).toEqual([
			{
				id: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: "2024-08-22T11:55:16.271Z",
				dateModified: "2024-08-22T11:55:16.271Z",
				nodeIdentity: TEST_NODE_IDENTITY,
				userIdentity: TEST_USER_IDENTITY,
				streamObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is a simple note"
				},
				immutableInterval: 10,
				indexCounter: 2,
				hash: "xWEOkKLD95vIc9iPIn4lpF0djFuf+czQ3tBAMTlZNBo=",
				signature:
					"MFMPI9H8hB777qRbgatcjmOCebM3dcXaMgLneiDIYOgTWmFxukApKho8ddvqLjqMelImJocmBiMR4TaCGDONCA==",
				immutableStorageId:
					"immutable:entity-storage:0202020202020202020202020202020202020202020202020202020202020202"
			}
		]);
	});

	test("Can get an entry object from the stream", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create(
			{
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			[
				{
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 1"
					}
				},
				{
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 2"
					}
				}
			],
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const stream = await service.get(streamId, {
			includeEntries: true,
			verifyStream: true,
			verifyEntries: true
		});

		const entry = await service.getEntryObject(streamId, stream.entries?.[0].id ?? "");

		expect(entry).toEqual({
			"@context": "https://www.w3.org/ns/activitystreams",
			"@type": "Note",
			content: "This is an entry note 1"
		});

		const streamStore = streamStorage.getStore();

		expect(streamStore).toEqual([
			{
				id: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: "2024-08-22T11:55:16.271Z",
				dateModified: "2024-08-22T11:55:16.271Z",
				nodeIdentity: TEST_NODE_IDENTITY,
				userIdentity: TEST_USER_IDENTITY,
				streamObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is a simple note"
				},
				immutableInterval: 10,
				indexCounter: 2,
				hash: "xWEOkKLD95vIc9iPIn4lpF0djFuf+czQ3tBAMTlZNBo=",
				signature:
					"MFMPI9H8hB777qRbgatcjmOCebM3dcXaMgLneiDIYOgTWmFxukApKho8ddvqLjqMelImJocmBiMR4TaCGDONCA==",
				immutableStorageId:
					"immutable:entity-storage:0202020202020202020202020202020202020202020202020202020202020202"
			}
		]);
	});

	test("Can delete an entry from the stream", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create(
			{
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			[
				{
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 1"
					}
				},
				{
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 2"
					}
				}
			],
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const stream = await service.get(streamId, { includeEntries: true });

		await service.removeEntry(
			streamId,
			stream.entries?.[0].id ?? "",
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		expect(streamId.startsWith("ais:")).toEqual(true);

		const streamStore = streamStorage.getStore();

		expect(streamStore).toEqual([
			{
				id: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: "2024-08-22T11:55:16.271Z",
				dateModified: "2024-08-22T11:56:56.272Z",
				nodeIdentity: TEST_NODE_IDENTITY,
				userIdentity: TEST_USER_IDENTITY,
				streamObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is a simple note"
				},
				immutableInterval: 10,
				indexCounter: 2,
				hash: "xWEOkKLD95vIc9iPIn4lpF0djFuf+czQ3tBAMTlZNBo=",
				signature:
					"MFMPI9H8hB777qRbgatcjmOCebM3dcXaMgLneiDIYOgTWmFxukApKho8ddvqLjqMelImJocmBiMR4TaCGDONCA==",
				immutableStorageId:
					"immutable:entity-storage:0202020202020202020202020202020202020202020202020202020202020202"
			}
		]);

		const entryStore = streamEntryStorage.getStore();

		expect(entryStore).toHaveLength(2);
		expect(entryStore[0].dateDeleted).toEqual("2024-08-22T11:56:56.272Z");

		const streamWithoutDeleted = await service.get(streamId, { includeEntries: true });
		expect(streamWithoutDeleted.entries).toHaveLength(1);

		const streamWithDeleted = await service.get(streamId, {
			includeEntries: true,
			includeDeleted: true
		});
		expect(streamWithDeleted.entries).toHaveLength(2);
	});

	test("Can get entries from a stream", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create(
			{
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			[
				{
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 1"
					}
				},
				{
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 2"
					}
				}
			],
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await service.get(streamId, { includeEntries: true });

		const entries = await service.getEntries(streamId, { verifyEntries: true });

		expect(entries).toEqual({
			"@context": ["https://schema.twindev.org/ais/", "https://schema.org/"],
			type: "AuditableItemStreamEntryList",
			entries: [
				{
					id: "ais:0101010101010101010101010101010101010101010101010101010101010101:0303030303030303030303030303030303030303030303030303030303030303",
					type: "AuditableItemStreamEntry",
					dateCreated: "2024-08-22T11:55:16.271Z",
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 1"
					},
					entryVerification: {
						id: "0303030303030303030303030303030303030303030303030303030303030303",
						type: "AuditableItemStreamVerification",
						state: "ok"
					},
					hash: "5trXzlskOgceq5xm2q418VjeFy4OzJvkYfy5RMYoSsg=",
					immutableStorageId:
						"immutable:entity-storage:0404040404040404040404040404040404040404040404040404040404040404",
					index: 0,
					signature:
						"YutSHSBuRQ1J+kUr619k3gIaIsbFklaBCuWpHL/dq3Vk1ZSrHiA2JWYrPEVg25/Xlaq7imShptA6tUKjn57lBw==",
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				},
				{
					id: "ais:0101010101010101010101010101010101010101010101010101010101010101:0505050505050505050505050505050505050505050505050505050505050505",
					type: "AuditableItemStreamEntry",
					dateCreated: "2024-08-22T11:55:16.271Z",
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 2"
					},
					entryVerification: {
						id: "0505050505050505050505050505050505050505050505050505050505050505",
						type: "AuditableItemStreamVerification",
						state: "ok"
					},
					hash: "loVMOqZdWxL+0AtHb9bSpQlbcZSCIgfxiAgOL6HfY2k=",
					index: 1,
					signature:
						"EEAcNP7AR8FsBWmR+MsCMT7yHo9oOHsj9M6mv7KSGAZ0ty5OgVWzTg2xWvjyf/5RlYSy8R+BGLak81hYw5L2CQ==",
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				}
			]
		});
	});

	test("Can get entries from a stream using sub object", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create(
			{
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			[
				{
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 1"
					}
				},
				{
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 2"
					}
				}
			],
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await service.get(streamId, { includeEntries: true });

		const entries = await service.getEntries(streamId, {
			verifyEntries: true,
			conditions: [
				{
					property: "entryObject.@type",
					comparison: ComparisonOperator.Equals,
					value: "Note"
				},
				{
					property: "entryObject.content",
					comparison: ComparisonOperator.Equals,
					value: "This is an entry note 2"
				}
			]
		});

		expect(entries).toEqual({
			"@context": ["https://schema.twindev.org/ais/", "https://schema.org/"],
			type: "AuditableItemStreamEntryList",
			entries: [
				{
					id: "ais:0101010101010101010101010101010101010101010101010101010101010101:0505050505050505050505050505050505050505050505050505050505050505",
					type: "AuditableItemStreamEntry",
					dateCreated: "2024-08-22T11:55:16.271Z",
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 2"
					},
					entryVerification: {
						id: "0505050505050505050505050505050505050505050505050505050505050505",
						type: "AuditableItemStreamVerification",
						state: "ok"
					},
					hash: "loVMOqZdWxL+0AtHb9bSpQlbcZSCIgfxiAgOL6HfY2k=",
					index: 1,
					signature:
						"EEAcNP7AR8FsBWmR+MsCMT7yHo9oOHsj9M6mv7KSGAZ0ty5OgVWzTg2xWvjyf/5RlYSy8R+BGLak81hYw5L2CQ==",
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				}
			]
		});
	});
});
