// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { Converter, RandomHelper } from "@twin.org/core";
import { JsonLdProcessor } from "@twin.org/data-json-ld";
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

		// TODO: Remove this when the schema url is updated
		JsonLdProcessor.addRedirect(
			/https:\/\/schema.twindev.org\/ais\//,
			"https://schema.gtsc.io/ais/types.jsonld"
		);
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
				created: FIRST_TICK,
				updated: FIRST_TICK,
				nodeIdentity: TEST_NODE_IDENTITY,
				userIdentity: TEST_USER_IDENTITY,
				immutableInterval: 10,
				indexCounter: 0,
				hash: "I6vfL/avsvBsgKGQ5mM9pkNkHRKKolozbNJxS1bkrgc=",
				signature:
					"AsOHZTv0vNGOzxIskCrvwkFeRAPdVV+t+FjIZDwOPSmhTpJp9sDg5BDsZlai2X6ILN+3X2J3IA/2rpoMW7Z6Bw==",
				immutableStorageId:
					"immutable:entity-storage:0202020202020202020202020202020202020202020202020202020202020202"
			}
		]);

		const entryStore = streamEntryStorage.getStore();
		expect(entryStore.length).toEqual(0);

		const immutableStore = immutableStorage.getStore();
		expect(immutableStore).toHaveLength(1);
	});

	test("Can create a stream with a single metadata and multiple entries", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create(
			{
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			[
				{
					object: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 1"
					}
				},
				{
					object: {
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
				created: FIRST_TICK,
				updated: FIRST_TICK,
				nodeIdentity: TEST_NODE_IDENTITY,
				userIdentity: TEST_USER_IDENTITY,
				metadata: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is a simple note"
				},
				immutableInterval: 10,
				indexCounter: 2,
				hash: "I6vfL/avsvBsgKGQ5mM9pkNkHRKKolozbNJxS1bkrgc=",
				signature:
					"AsOHZTv0vNGOzxIskCrvwkFeRAPdVV+t+FjIZDwOPSmhTpJp9sDg5BDsZlai2X6ILN+3X2J3IA/2rpoMW7Z6Bw==",
				immutableStorageId:
					"immutable:entity-storage:0202020202020202020202020202020202020202020202020202020202020202"
			}
		]);

		const entryStore = streamEntryStorage.getStore();

		expect(entryStore).toEqual([
			{
				id: "0303030303030303030303030303030303030303030303030303030303030303",
				streamId: "0101010101010101010101010101010101010101010101010101010101010101",
				created: FIRST_TICK,
				object: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is an entry note 1"
				},
				userIdentity: TEST_USER_IDENTITY,
				index: 0,
				hash: "Ph4LuatqnF3qWth90hI7rRe2dRcDMOohbpUa3AIUBk4=",
				signature:
					"ocy/GF7mg/9fE8rk6QXRmfRyqHvIXF/dTJWte7ypPy5g/PVzZGo0lsQLb/sydWlFwKqiT3pROEqCkjMLWdAPCw==",
				immutableStorageId:
					"immutable:entity-storage:0404040404040404040404040404040404040404040404040404040404040404"
			},
			{
				id: "0505050505050505050505050505050505050505050505050505050505050505",
				streamId: "0101010101010101010101010101010101010101010101010101010101010101",
				created: FIRST_TICK,
				object: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is an entry note 2"
				},
				userIdentity: TEST_USER_IDENTITY,
				index: 1,
				hash: "GcVhCOiMb5SeBD35/vuzkDGuj1TxzG5FY5JhFpJ2xEs=",
				signature:
					"JtICZYUrpdkoZ/4HlMpbOQAl39vlVlU62YK5vgPwoI1G6UFCTqPfYYrJmO6Tq5T1bCENHLDQ6JLT5ZW3ciHmBQ=="
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
			created: FIRST_TICK,
			userIdentity: TEST_USER_IDENTITY,
			hash: "I6vfL/avsvBsgKGQ5mM9pkNkHRKKolozbNJxS1bkrgc=",
			signature:
				"AsOHZTv0vNGOzxIskCrvwkFeRAPdVV+t+FjIZDwOPSmhTpJp9sDg5BDsZlai2X6ILN+3X2J3IA/2rpoMW7Z6Bw==",
			index: undefined
		});

		const entryImmutableCredential = await decodeJwtToIntegrity(immutableStore[1].data);
		expect(entryImmutableCredential).toEqual({
			created: FIRST_TICK,
			userIdentity: TEST_USER_IDENTITY,
			hash: "Ph4LuatqnF3qWth90hI7rRe2dRcDMOohbpUa3AIUBk4=",
			signature:
				"ocy/GF7mg/9fE8rk6QXRmfRyqHvIXF/dTJWte7ypPy5g/PVzZGo0lsQLb/sydWlFwKqiT3pROEqCkjMLWdAPCw==",
			index: 0
		});
	});

	test("Can get a stream with a single metadata and multiple entries", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create(
			{
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			[
				{
					object: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 1"
					}
				},
				{
					object: {
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
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			updated: FIRST_TICK,
			nodeIdentity: TEST_NODE_IDENTITY,
			userIdentity: TEST_USER_IDENTITY,
			metadata: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			immutableInterval: 10,
			hash: "I6vfL/avsvBsgKGQ5mM9pkNkHRKKolozbNJxS1bkrgc=",
			signature:
				"AsOHZTv0vNGOzxIskCrvwkFeRAPdVV+t+FjIZDwOPSmhTpJp9sDg5BDsZlai2X6ILN+3X2J3IA/2rpoMW7Z6Bw==",
			immutableStorageId:
				"immutable:entity-storage:0202020202020202020202020202020202020202020202020202020202020202",
			entries: [
				{
					id: "ais:0101010101010101010101010101010101010101010101010101010101010101:0303030303030303030303030303030303030303030303030303030303030303",
					created: FIRST_TICK,
					object: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 1"
					},
					userIdentity: TEST_USER_IDENTITY,
					index: 0,
					hash: "Ph4LuatqnF3qWth90hI7rRe2dRcDMOohbpUa3AIUBk4=",
					signature:
						"ocy/GF7mg/9fE8rk6QXRmfRyqHvIXF/dTJWte7ypPy5g/PVzZGo0lsQLb/sydWlFwKqiT3pROEqCkjMLWdAPCw==",
					immutableStorageId:
						"immutable:entity-storage:0404040404040404040404040404040404040404040404040404040404040404"
				},
				{
					id: "ais:0101010101010101010101010101010101010101010101010101010101010101:0505050505050505050505050505050505050505050505050505050505050505",
					created: FIRST_TICK,
					object: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 2"
					},
					userIdentity: TEST_USER_IDENTITY,
					index: 1,
					hash: "GcVhCOiMb5SeBD35/vuzkDGuj1TxzG5FY5JhFpJ2xEs=",
					signature:
						"JtICZYUrpdkoZ/4HlMpbOQAl39vlVlU62YK5vgPwoI1G6UFCTqPfYYrJmO6Tq5T1bCENHLDQ6JLT5ZW3ciHmBQ=="
				}
			],
			verification: { state: "ok" },
			entriesVerification: [
				{ state: "ok", id: "0303030303030303030303030303030303030303030303030303030303030303" },
				{ state: "ok", id: "0505050505050505050505050505050505050505050505050505050505050505" }
			]
		});
	});

	test("Can get a stream with a single metadata and multiple entries, including entries", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create(
			{
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			[
				{
					object: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 1"
					}
				},
				{
					object: {
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
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			updated: FIRST_TICK,
			nodeIdentity: TEST_NODE_IDENTITY,
			userIdentity: TEST_USER_IDENTITY,
			metadata: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			immutableInterval: 10,
			hash: "I6vfL/avsvBsgKGQ5mM9pkNkHRKKolozbNJxS1bkrgc=",
			signature:
				"AsOHZTv0vNGOzxIskCrvwkFeRAPdVV+t+FjIZDwOPSmhTpJp9sDg5BDsZlai2X6ILN+3X2J3IA/2rpoMW7Z6Bw==",
			immutableStorageId:
				"immutable:entity-storage:0202020202020202020202020202020202020202020202020202020202020202",
			entries: [
				{
					id: "ais:0101010101010101010101010101010101010101010101010101010101010101:0303030303030303030303030303030303030303030303030303030303030303",
					created: FIRST_TICK,
					object: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 1"
					},
					userIdentity: TEST_USER_IDENTITY,
					index: 0,
					hash: "Ph4LuatqnF3qWth90hI7rRe2dRcDMOohbpUa3AIUBk4=",
					signature:
						"ocy/GF7mg/9fE8rk6QXRmfRyqHvIXF/dTJWte7ypPy5g/PVzZGo0lsQLb/sydWlFwKqiT3pROEqCkjMLWdAPCw==",
					immutableStorageId:
						"immutable:entity-storage:0404040404040404040404040404040404040404040404040404040404040404"
				},
				{
					id: "ais:0101010101010101010101010101010101010101010101010101010101010101:0505050505050505050505050505050505050505050505050505050505050505",
					created: FIRST_TICK,
					object: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 2"
					},
					userIdentity: TEST_USER_IDENTITY,
					index: 1,
					hash: "GcVhCOiMb5SeBD35/vuzkDGuj1TxzG5FY5JhFpJ2xEs=",
					signature:
						"JtICZYUrpdkoZ/4HlMpbOQAl39vlVlU62YK5vgPwoI1G6UFCTqPfYYrJmO6Tq5T1bCENHLDQ6JLT5ZW3ciHmBQ=="
				}
			],
			verification: { state: "ok" },
			entriesVerification: [
				{ state: "ok", id: "0303030303030303030303030303030303030303030303030303030303030303" },
				{ state: "ok", id: "0505050505050505050505050505050505050505050505050505050505050505" }
			]
		});
	});

	test("Can get a stream with a single metadata and multiple entries, including entries as JSON-LD", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create(
			{
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			[
				{
					object: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 1"
					}
				},
				{
					object: {
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

		const result = await service.get(
			streamId,
			{ includeEntries: true, verifyStream: true, verifyEntries: true },
			"jsonld"
		);

		expect(result).toEqual({
			"@context": "https://schema.twindev.org/ais/",
			"@type": "stream",
			entries: [
				{
					"@type": "entry",
					created: "2024-08-22T11:55:16.271Z",
					hash: "Ph4LuatqnF3qWth90hI7rRe2dRcDMOohbpUa3AIUBk4=",
					id: "ais:0101010101010101010101010101010101010101010101010101010101010101:0303030303030303030303030303030303030303030303030303030303030303",
					immutableStorageId:
						"immutable:entity-storage:0404040404040404040404040404040404040404040404040404040404040404",
					object: {
						"@type": "https://www.w3.org/ns/activitystreams#Note",
						"https://www.w3.org/ns/activitystreams#content": "This is an entry note 1"
					},
					index: 0,
					signature:
						"ocy/GF7mg/9fE8rk6QXRmfRyqHvIXF/dTJWte7ypPy5g/PVzZGo0lsQLb/sydWlFwKqiT3pROEqCkjMLWdAPCw==",
					userIdentity: TEST_USER_IDENTITY
				},
				{
					"@type": "entry",
					created: "2024-08-22T11:55:16.271Z",
					hash: "GcVhCOiMb5SeBD35/vuzkDGuj1TxzG5FY5JhFpJ2xEs=",
					id: "ais:0101010101010101010101010101010101010101010101010101010101010101:0505050505050505050505050505050505050505050505050505050505050505",
					object: {
						"@type": "https://www.w3.org/ns/activitystreams#Note",
						"https://www.w3.org/ns/activitystreams#content": "This is an entry note 2"
					},
					index: 1,
					signature:
						"JtICZYUrpdkoZ/4HlMpbOQAl39vlVlU62YK5vgPwoI1G6UFCTqPfYYrJmO6Tq5T1bCENHLDQ6JLT5ZW3ciHmBQ==",
					userIdentity: TEST_USER_IDENTITY
				}
			],
			created: "2024-08-22T11:55:16.271Z",
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			metadata: {
				"@type": "https://www.w3.org/ns/activitystreams#Note",
				"https://www.w3.org/ns/activitystreams#content": "This is a simple note"
			},
			nodeIdentity: TEST_NODE_IDENTITY,
			updated: "2024-08-22T11:55:16.271Z",
			verification: { "@type": "verification", state: "ok" },
			entriesVerification: [
				{
					"@type": "verification",
					state: "ok",
					id: "0303030303030303030303030303030303030303030303030303030303030303"
				},
				{
					"@type": "verification",
					state: "ok",
					id: "0505050505050505050505050505050505050505050505050505050505050505"
				}
			]
		});
	});

	test("Can update a stream with a single metadata and multiple entries", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create(
			{
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			[
				{
					object: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 1"
					}
				},
				{
					object: {
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
				created: FIRST_TICK,
				updated: SECOND_TICK,
				nodeIdentity: TEST_NODE_IDENTITY,
				userIdentity: TEST_USER_IDENTITY,
				metadata: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is a simple note xxx"
				},
				immutableInterval: 10,
				indexCounter: 2,
				hash: "I6vfL/avsvBsgKGQ5mM9pkNkHRKKolozbNJxS1bkrgc=",
				signature:
					"AsOHZTv0vNGOzxIskCrvwkFeRAPdVV+t+FjIZDwOPSmhTpJp9sDg5BDsZlai2X6ILN+3X2J3IA/2rpoMW7Z6Bw==",
				immutableStorageId:
					"immutable:entity-storage:0202020202020202020202020202020202020202020202020202020202020202"
			}
		]);

		const entryStore = streamEntryStorage.getStore();
		expect(entryStore).toEqual([
			{
				id: "0303030303030303030303030303030303030303030303030303030303030303",
				streamId: "0101010101010101010101010101010101010101010101010101010101010101",
				created: FIRST_TICK,
				object: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is an entry note 1"
				},
				userIdentity: TEST_USER_IDENTITY,
				index: 0,
				hash: "Ph4LuatqnF3qWth90hI7rRe2dRcDMOohbpUa3AIUBk4=",
				signature:
					"ocy/GF7mg/9fE8rk6QXRmfRyqHvIXF/dTJWte7ypPy5g/PVzZGo0lsQLb/sydWlFwKqiT3pROEqCkjMLWdAPCw==",
				immutableStorageId:
					"immutable:entity-storage:0404040404040404040404040404040404040404040404040404040404040404"
			},
			{
				id: "0505050505050505050505050505050505050505050505050505050505050505",
				streamId: "0101010101010101010101010101010101010101010101010101010101010101",
				created: FIRST_TICK,
				object: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is an entry note 2"
				},
				userIdentity: TEST_USER_IDENTITY,
				index: 1,
				hash: "GcVhCOiMb5SeBD35/vuzkDGuj1TxzG5FY5JhFpJ2xEs=",
				signature:
					"JtICZYUrpdkoZ/4HlMpbOQAl39vlVlU62YK5vgPwoI1G6UFCTqPfYYrJmO6Tq5T1bCENHLDQ6JLT5ZW3ciHmBQ=="
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
					object: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 1"
					}
				},
				{
					object: {
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
				created: FIRST_TICK,
				updated: SECOND_TICK,
				nodeIdentity: TEST_NODE_IDENTITY,
				userIdentity: TEST_USER_IDENTITY,
				metadata: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is a simple note"
				},
				immutableInterval: 10,
				indexCounter: 3,
				hash: "I6vfL/avsvBsgKGQ5mM9pkNkHRKKolozbNJxS1bkrgc=",
				signature:
					"AsOHZTv0vNGOzxIskCrvwkFeRAPdVV+t+FjIZDwOPSmhTpJp9sDg5BDsZlai2X6ILN+3X2J3IA/2rpoMW7Z6Bw==",
				immutableStorageId:
					"immutable:entity-storage:0202020202020202020202020202020202020202020202020202020202020202"
			}
		]);

		const entryStore = streamEntryStorage.getStore();
		expect(entryStore).toEqual([
			{
				id: "0303030303030303030303030303030303030303030303030303030303030303",
				streamId: "0101010101010101010101010101010101010101010101010101010101010101",
				created: FIRST_TICK,
				object: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is an entry note 1"
				},
				userIdentity: TEST_USER_IDENTITY,
				index: 0,
				hash: "Ph4LuatqnF3qWth90hI7rRe2dRcDMOohbpUa3AIUBk4=",
				signature:
					"ocy/GF7mg/9fE8rk6QXRmfRyqHvIXF/dTJWte7ypPy5g/PVzZGo0lsQLb/sydWlFwKqiT3pROEqCkjMLWdAPCw==",
				immutableStorageId:
					"immutable:entity-storage:0404040404040404040404040404040404040404040404040404040404040404"
			},
			{
				id: "0505050505050505050505050505050505050505050505050505050505050505",
				streamId: "0101010101010101010101010101010101010101010101010101010101010101",
				created: FIRST_TICK,
				object: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is an entry note 2"
				},
				userIdentity: TEST_USER_IDENTITY,
				index: 1,
				hash: "GcVhCOiMb5SeBD35/vuzkDGuj1TxzG5FY5JhFpJ2xEs=",
				signature:
					"JtICZYUrpdkoZ/4HlMpbOQAl39vlVlU62YK5vgPwoI1G6UFCTqPfYYrJmO6Tq5T1bCENHLDQ6JLT5ZW3ciHmBQ=="
			},
			{
				id: "0606060606060606060606060606060606060606060606060606060606060606",
				streamId: "0101010101010101010101010101010101010101010101010101010101010101",
				created: SECOND_TICK,
				object: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is an entry note 3"
				},
				userIdentity: TEST_USER_IDENTITY,
				index: 2,
				hash: "DAkLPIZczgr9csyCtf5B6KJ8oWVFZJx+KQFAY9x7mq8=",
				signature:
					"ml5xbTLHUCCjpk4A4i/v17FBGupRzpN4JyS5c7uXipE8dAOLHvL+mGlJN9smJOEKQ/K1CxGl7zn2eWII9X1IDg=="
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
					object: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 1"
					}
				},
				{
					object: {
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
				created: FIRST_TICK,
				updated: SECOND_TICK,
				nodeIdentity: TEST_NODE_IDENTITY,
				userIdentity: TEST_USER_IDENTITY,
				metadata: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is a simple note"
				},
				immutableInterval: 10,
				indexCounter: 12,
				hash: "I6vfL/avsvBsgKGQ5mM9pkNkHRKKolozbNJxS1bkrgc=",
				signature:
					"AsOHZTv0vNGOzxIskCrvwkFeRAPdVV+t+FjIZDwOPSmhTpJp9sDg5BDsZlai2X6ILN+3X2J3IA/2rpoMW7Z6Bw==",
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
					object: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 1"
					}
				},
				{
					object: {
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
			id: "ais:0101010101010101010101010101010101010101010101010101010101010101:0303030303030303030303030303030303030303030303030303030303030303",
			created: FIRST_TICK,
			object: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is an entry note 1"
			},
			userIdentity: TEST_USER_IDENTITY,
			index: 0,
			hash: "Ph4LuatqnF3qWth90hI7rRe2dRcDMOohbpUa3AIUBk4=",
			signature:
				"ocy/GF7mg/9fE8rk6QXRmfRyqHvIXF/dTJWte7ypPy5g/PVzZGo0lsQLb/sydWlFwKqiT3pROEqCkjMLWdAPCw==",
			immutableStorageId:
				"immutable:entity-storage:0404040404040404040404040404040404040404040404040404040404040404",
			verification: {
				state: "ok",
				id: "0303030303030303030303030303030303030303030303030303030303030303"
			}
		});

		const streamStore = streamStorage.getStore();

		expect(streamStore).toEqual([
			{
				id: "0101010101010101010101010101010101010101010101010101010101010101",
				created: FIRST_TICK,
				updated: FIRST_TICK,
				nodeIdentity: TEST_NODE_IDENTITY,
				userIdentity: TEST_USER_IDENTITY,
				metadata: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is a simple note"
				},
				immutableInterval: 10,
				indexCounter: 2,
				hash: "I6vfL/avsvBsgKGQ5mM9pkNkHRKKolozbNJxS1bkrgc=",
				signature:
					"AsOHZTv0vNGOzxIskCrvwkFeRAPdVV+t+FjIZDwOPSmhTpJp9sDg5BDsZlai2X6ILN+3X2J3IA/2rpoMW7Z6Bw==",
				immutableStorageId:
					"immutable:entity-storage:0202020202020202020202020202020202020202020202020202020202020202"
			}
		]);
	});

	test("Can get an entry from the stream as JSON-LD", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create(
			{
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			[
				{
					object: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 1"
					}
				},
				{
					object: {
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

		const entry = await service.getEntry(
			streamId,
			stream.entries?.[0].id ?? "",
			{ verifyEntry: true },
			"jsonld"
		);

		expect(entry).toEqual({
			"@context": "https://schema.twindev.org/ais/",
			"@type": "entry",
			id: "ais:0101010101010101010101010101010101010101010101010101010101010101:0303030303030303030303030303030303030303030303030303030303030303",
			created: "2024-08-22T11:55:16.271Z",
			userIdentity: TEST_USER_IDENTITY,
			object: {
				"@type": "https://www.w3.org/ns/activitystreams#Note",
				"https://www.w3.org/ns/activitystreams#content": "This is an entry note 1"
			},
			index: 0,
			hash: "Ph4LuatqnF3qWth90hI7rRe2dRcDMOohbpUa3AIUBk4=",
			signature:
				"ocy/GF7mg/9fE8rk6QXRmfRyqHvIXF/dTJWte7ypPy5g/PVzZGo0lsQLb/sydWlFwKqiT3pROEqCkjMLWdAPCw==",
			immutableStorageId:
				"immutable:entity-storage:0404040404040404040404040404040404040404040404040404040404040404",
			verification: {
				"@type": "verification",
				state: "ok",
				id: "0303030303030303030303030303030303030303030303030303030303030303"
			}
		});

		const streamStore = streamStorage.getStore();

		expect(streamStore).toEqual([
			{
				id: "0101010101010101010101010101010101010101010101010101010101010101",
				created: FIRST_TICK,
				updated: FIRST_TICK,
				nodeIdentity: TEST_NODE_IDENTITY,
				userIdentity: TEST_USER_IDENTITY,
				metadata: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is a simple note"
				},
				immutableInterval: 10,
				indexCounter: 2,
				hash: "I6vfL/avsvBsgKGQ5mM9pkNkHRKKolozbNJxS1bkrgc=",
				signature:
					"AsOHZTv0vNGOzxIskCrvwkFeRAPdVV+t+FjIZDwOPSmhTpJp9sDg5BDsZlai2X6ILN+3X2J3IA/2rpoMW7Z6Bw==",
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
					object: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 1"
					}
				},
				{
					object: {
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
				created: FIRST_TICK,
				updated: SECOND_TICK,
				nodeIdentity: TEST_NODE_IDENTITY,
				userIdentity: TEST_USER_IDENTITY,
				metadata: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is a simple note"
				},
				immutableInterval: 10,
				indexCounter: 2,
				hash: "I6vfL/avsvBsgKGQ5mM9pkNkHRKKolozbNJxS1bkrgc=",
				signature:
					"AsOHZTv0vNGOzxIskCrvwkFeRAPdVV+t+FjIZDwOPSmhTpJp9sDg5BDsZlai2X6ILN+3X2J3IA/2rpoMW7Z6Bw==",
				immutableStorageId:
					"immutable:entity-storage:0202020202020202020202020202020202020202020202020202020202020202"
			}
		]);

		const entryStore = streamEntryStorage.getStore();

		expect(entryStore).toHaveLength(2);
		expect(entryStore[0].deleted).toEqual(SECOND_TICK);

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
					object: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 1"
					}
				},
				{
					object: {
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

		const entries = await service.getEntries(streamId, { verifyEntries: true }, "json");

		expect(entries).toEqual({
			entries: [
				{
					id: "ais:0101010101010101010101010101010101010101010101010101010101010101:0303030303030303030303030303030303030303030303030303030303030303",
					created: FIRST_TICK,
					object: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 1"
					},
					userIdentity: TEST_USER_IDENTITY,
					index: 0,
					hash: "Ph4LuatqnF3qWth90hI7rRe2dRcDMOohbpUa3AIUBk4=",
					signature:
						"ocy/GF7mg/9fE8rk6QXRmfRyqHvIXF/dTJWte7ypPy5g/PVzZGo0lsQLb/sydWlFwKqiT3pROEqCkjMLWdAPCw==",
					immutableStorageId:
						"immutable:entity-storage:0404040404040404040404040404040404040404040404040404040404040404"
				},
				{
					id: "ais:0101010101010101010101010101010101010101010101010101010101010101:0505050505050505050505050505050505050505050505050505050505050505",
					created: FIRST_TICK,
					object: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 2"
					},
					userIdentity: TEST_USER_IDENTITY,
					index: 1,
					hash: "GcVhCOiMb5SeBD35/vuzkDGuj1TxzG5FY5JhFpJ2xEs=",
					signature:
						"JtICZYUrpdkoZ/4HlMpbOQAl39vlVlU62YK5vgPwoI1G6UFCTqPfYYrJmO6Tq5T1bCENHLDQ6JLT5ZW3ciHmBQ=="
				}
			],
			entriesVerification: [
				{ state: "ok", id: "0303030303030303030303030303030303030303030303030303030303030303" },
				{ state: "ok", id: "0505050505050505050505050505050505050505050505050505050505050505" }
			]
		});
	});

	test("Can get entries from a stream as JSON-LD", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create(
			{
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			[
				{
					object: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 1"
					}
				},
				{
					object: {
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

		const entries = await service.getEntries(streamId, { verifyEntries: true }, "jsonld");

		expect(entries).toEqual({
			"@context": "https://schema.twindev.org/ais/",
			"@graph": [
				{
					"@type": "entry",
					id: "ais:0101010101010101010101010101010101010101010101010101010101010101:0303030303030303030303030303030303030303030303030303030303030303",
					created: "2024-08-22T11:55:16.271Z",
					userIdentity: TEST_USER_IDENTITY,
					object: {
						"@type": "https://www.w3.org/ns/activitystreams#Note",
						"https://www.w3.org/ns/activitystreams#content": "This is an entry note 1"
					},
					index: 0,
					hash: "Ph4LuatqnF3qWth90hI7rRe2dRcDMOohbpUa3AIUBk4=",
					signature:
						"ocy/GF7mg/9fE8rk6QXRmfRyqHvIXF/dTJWte7ypPy5g/PVzZGo0lsQLb/sydWlFwKqiT3pROEqCkjMLWdAPCw==",
					immutableStorageId:
						"immutable:entity-storage:0404040404040404040404040404040404040404040404040404040404040404"
				},
				{
					"@type": "entry",
					id: "ais:0101010101010101010101010101010101010101010101010101010101010101:0505050505050505050505050505050505050505050505050505050505050505",
					created: "2024-08-22T11:55:16.271Z",
					userIdentity: TEST_USER_IDENTITY,
					object: {
						"@type": "https://www.w3.org/ns/activitystreams#Note",
						"https://www.w3.org/ns/activitystreams#content": "This is an entry note 2"
					},
					index: 1,
					hash: "GcVhCOiMb5SeBD35/vuzkDGuj1TxzG5FY5JhFpJ2xEs=",
					signature:
						"JtICZYUrpdkoZ/4HlMpbOQAl39vlVlU62YK5vgPwoI1G6UFCTqPfYYrJmO6Tq5T1bCENHLDQ6JLT5ZW3ciHmBQ=="
				}
			],
			entriesVerification: [
				{
					"@type": "verification",
					state: "ok",
					id: "0303030303030303030303030303030303030303030303030303030303030303"
				},
				{
					"@type": "verification",
					state: "ok",
					id: "0505050505050505050505050505050505050505050505050505050505050505"
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
					object: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 1"
					}
				},
				{
					object: {
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

		const entries = await service.getEntries(
			streamId,
			{
				verifyEntries: true,
				conditions: [
					{
						property: "object.@type",
						comparison: ComparisonOperator.Equals,
						value: "Note"
					},
					{
						property: "object.content",
						comparison: ComparisonOperator.Equals,
						value: "This is an entry note 2"
					}
				]
			},
			"json"
		);

		expect(entries).toEqual({
			entries: [
				{
					id: "ais:0101010101010101010101010101010101010101010101010101010101010101:0505050505050505050505050505050505050505050505050505050505050505",
					created: FIRST_TICK,
					object: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 2"
					},
					userIdentity: TEST_USER_IDENTITY,
					index: 1,
					hash: "GcVhCOiMb5SeBD35/vuzkDGuj1TxzG5FY5JhFpJ2xEs=",
					signature:
						"JtICZYUrpdkoZ/4HlMpbOQAl39vlVlU62YK5vgPwoI1G6UFCTqPfYYrJmO6Tq5T1bCENHLDQ6JLT5ZW3ciHmBQ=="
				}
			],
			entriesVerification: [
				{
					id: "0505050505050505050505050505050505050505050505050505050505050505",
					state: "ok"
				}
			]
		});
	});
});
