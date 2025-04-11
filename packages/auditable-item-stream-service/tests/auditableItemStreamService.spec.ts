// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import {
	type BackgroundTask,
	EntityStorageBackgroundTaskConnector,
	initSchema as initSchemaBackgroundTask
} from "@twin.org/background-task-connector-entity-storage";
import { BackgroundTaskConnectorFactory } from "@twin.org/background-task-models";
import { ComponentFactory, Converter, ObjectHelper, RandomHelper } from "@twin.org/core";
import { ComparisonOperator } from "@twin.org/entity";
import { MemoryEntityStorageConnector } from "@twin.org/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@twin.org/entity-storage-models";
import type { IImmutableProof } from "@twin.org/immutable-proof-models";
import {
	type ImmutableProof,
	ImmutableProofService,
	initSchema as initSchemaImmutableProof
} from "@twin.org/immutable-proof-service";
import { ModuleHelper } from "@twin.org/modules";
import { nameof } from "@twin.org/nameof";
import {
	EntityStorageVerifiableStorageConnector,
	initSchema as initSchemaVerifiableStorage,
	type VerifiableItem
} from "@twin.org/verifiable-storage-connector-entity-storage";
import { VerifiableStorageConnectorFactory } from "@twin.org/verifiable-storage-models";
import {
	cleanupTestEnv,
	setupTestEnv,
	TEST_NODE_IDENTITY,
	TEST_USER_IDENTITY
} from "./setupTestEnv";
import { AuditableItemStreamService } from "../src/auditableItemStreamService";
import type { AuditableItemStream } from "../src/entities/auditableItemStream";
import type { AuditableItemStreamEntry } from "../src/entities/auditableItemStreamEntry";
import { initSchema } from "../src/schema";

let streamStorage: MemoryEntityStorageConnector<AuditableItemStream>;
let streamEntryStorage: MemoryEntityStorageConnector<AuditableItemStreamEntry>;
let immutableProofStorage: MemoryEntityStorageConnector<ImmutableProof>;
let verifiableStorage: MemoryEntityStorageConnector<VerifiableItem>;
let backgroundTaskStorage: MemoryEntityStorageConnector<BackgroundTask>;

const FIRST_TICK = 1724327716271;
const SECOND_TICK = 1724327816272;

/**
 * Wait for the proof to be generated.
 * @param proofCount The number of proofs to wait for.
 */
async function waitForProofGeneration(proofCount: number = 1): Promise<void> {
	let count = 0;
	do {
		await new Promise(resolve => setTimeout(resolve, 200));
	} while (verifiableStorage.getStore().length < proofCount && count++ < proofCount * 40);
}

describe("AuditableItemStreamService", () => {
	beforeAll(async () => {
		await setupTestEnv();

		initSchema();
		initSchemaVerifiableStorage();
		initSchemaImmutableProof();
		initSchemaBackgroundTask();

		// Mock the module helper to execute the method in the same thread, so we don't have to create an engine
		ModuleHelper.execModuleMethodThread = vi
			.fn()
			.mockImplementation(async (module, method, args) =>
				ModuleHelper.execModuleMethod(module, method, args)
			);
	});

	afterAll(async () => {
		await cleanupTestEnv();
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

		verifiableStorage = new MemoryEntityStorageConnector<VerifiableItem>({
			entitySchema: nameof<VerifiableItem>()
		});
		EntityStorageConnectorFactory.register("verifiable-item", () => verifiableStorage);

		VerifiableStorageConnectorFactory.register(
			"verifiable-storage",
			() => new EntityStorageVerifiableStorageConnector()
		);

		immutableProofStorage = new MemoryEntityStorageConnector<ImmutableProof>({
			entitySchema: nameof<ImmutableProof>()
		});

		EntityStorageConnectorFactory.register("immutable-proof", () => immutableProofStorage);

		backgroundTaskStorage = new MemoryEntityStorageConnector<BackgroundTask>({
			entitySchema: nameof<BackgroundTask>()
		});
		EntityStorageConnectorFactory.register("background-task", () => backgroundTaskStorage);

		const backgroundTask = new EntityStorageBackgroundTaskConnector();
		BackgroundTaskConnectorFactory.register("background-task", () => backgroundTask);
		await backgroundTask.start(TEST_NODE_IDENTITY);

		const immutableProofService = new ImmutableProofService();
		ComponentFactory.register("immutable-proof", () => immutableProofService);

		Date.now = vi
			.fn()
			.mockImplementationOnce(() => FIRST_TICK)
			.mockImplementationOnce(() => FIRST_TICK)
			.mockImplementation(() => SECOND_TICK);

		let idCounter = 1;
		RandomHelper.generate = vi
			.fn()
			.mockImplementation(length => new Uint8Array(length).fill(idCounter++));
	});

	test("Can create an instance of the service", async () => {
		const service = new AuditableItemStreamService();
		expect(service).toBeDefined();
	});

	test("Can create a stream with no data", async () => {
		const service = new AuditableItemStreamService();

		const streamId = await service.create({}, undefined, TEST_USER_IDENTITY, TEST_NODE_IDENTITY);

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
				proofId: "immutable-proof:0202020202020202020202020202020202020202020202020202020202020202"
			}
		]);

		const entryStore = streamEntryStorage.getStore();
		expect(entryStore.length).toEqual(0);

		await waitForProofGeneration();

		const verifiableStore = verifiableStorage.getStore();
		expect(verifiableStore).toEqual([
			{
				id: "0404040404040404040404040404040404040404040404040404040404040404",
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEudHdpbmRldi5vcmcvY29tbW9uLyIsImh0dHBzOi8vd3d3LnczLm9yZy9ucy9jcmVkZW50aWFscy92MiJdLCJpZCI6IjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIiLCJ0eXBlIjoiSW1tdXRhYmxlUHJvb2YiLCJub2RlSWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzIiwidXNlcklkZW50aXR5IjoiZGlkOmVudGl0eS1zdG9yYWdlOjB4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1OCIsInByb29mIjp7InR5cGUiOiJEYXRhSW50ZWdyaXR5UHJvb2YiLCJjcmVhdGVkIjoiMjAyNC0wOC0yMlQxMTo1Njo1Ni4yNzJaIiwiY3J5cHRvc3VpdGUiOiJlZGRzYS1qY3MtMjAyMiIsInByb29mUHVycG9zZSI6ImFzc2VydGlvbk1ldGhvZCIsInByb29mVmFsdWUiOiJ6NWZkeWRZZjNtNXJEcnN1cEtZU29tZE05MnBtYkpYZjduTW1qSjlMQnVuZHhBNHNqM21GWlhScWo1Z1dLUVVuUGE4eGRxYVY0ejV4REREZ3d4UUhvY3dweCIsInZlcmlmaWNhdGlvbk1ldGhvZCI6ImRpZDplbnRpdHktc3RvcmFnZToweDYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjMjaW1tdXRhYmxlLXByb29mLWFzc2VydGlvbiJ9LCJwcm9vZk9iamVjdEhhc2giOiJzaGEyNTY6QzlqaGh1dDhpUDJJMkIwUUFzam1TazgxNmpXL1RDM1l0Q3E2cWN6R0VVQT0iLCJwcm9vZk9iamVjdElkIjoiYWlzOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEifQ==",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
			}
		]);

		const immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(verifiableStore[0].data)
		);
		expect(immutableProof).toEqual({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.twindev.org/common/",
				"https://www.w3.org/ns/credentials/v2"
			],
			id: "0202020202020202020202020202020202020202020202020202020202020202",
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			type: "ImmutableProof",
			proofObjectHash: "sha256:C9jhhut8iP2I2B0QAsjmSk816jW/TC3YtCq6qczGEUA=",
			proofObjectId: "ais:0101010101010101010101010101010101010101010101010101010101010101",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z5fdydYf3m5rDrsupKYSomdM92pmbJXf7nMmjJ9LBundxA4sj3mFZXRqj5gWKQUnPa8xdqaV4z5xDDDgwxQHocwpx",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
			}
		});
	});

	test("Can create a stream with a single object and multiple entries", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create(
			{
				annotationObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is a simple note"
				},
				entries: [
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
				]
			},
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
				annotationObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is a simple note"
				},
				immutableInterval: 10,
				indexCounter: 2,
				proofId: "immutable-proof:0202020202020202020202020202020202020202020202020202020202020202"
			}
		]);

		const entryStore = streamEntryStorage.getStore();

		expect(entryStore).toEqual([
			{
				streamId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: "2024-08-22T11:55:16.271Z",
				id: "0505050505050505050505050505050505050505050505050505050505050505",
				entryObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is an entry note 1"
				},
				proofId: "immutable-proof:0606060606060606060606060606060606060606060606060606060606060606",
				userIdentity: TEST_USER_IDENTITY,
				index: 0
			},
			{
				streamId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: "2024-08-22T11:55:16.271Z",
				id: "0909090909090909090909090909090909090909090909090909090909090909",
				entryObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is an entry note 2"
				},
				userIdentity: TEST_USER_IDENTITY,
				index: 1
			}
		]);

		await waitForProofGeneration(2);

		const verifiableStore = verifiableStorage.getStore();
		expect(verifiableStore).toEqual([
			{
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEudHdpbmRldi5vcmcvY29tbW9uLyIsImh0dHBzOi8vd3d3LnczLm9yZy9ucy9jcmVkZW50aWFscy92MiJdLCJpZCI6IjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIiLCJ0eXBlIjoiSW1tdXRhYmxlUHJvb2YiLCJub2RlSWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzIiwidXNlcklkZW50aXR5IjoiZGlkOmVudGl0eS1zdG9yYWdlOjB4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1OCIsInByb29mIjp7InR5cGUiOiJEYXRhSW50ZWdyaXR5UHJvb2YiLCJjcmVhdGVkIjoiMjAyNC0wOC0yMlQxMTo1Njo1Ni4yNzJaIiwiY3J5cHRvc3VpdGUiOiJlZGRzYS1qY3MtMjAyMiIsInByb29mUHVycG9zZSI6ImFzc2VydGlvbk1ldGhvZCIsInByb29mVmFsdWUiOiJ6NWZkeWRZZjNtNXJEcnN1cEtZU29tZE05MnBtYkpYZjduTW1qSjlMQnVuZHhBNHNqM21GWlhScWo1Z1dLUVVuUGE4eGRxYVY0ejV4REREZ3d4UUhvY3dweCIsInZlcmlmaWNhdGlvbk1ldGhvZCI6ImRpZDplbnRpdHktc3RvcmFnZToweDYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjMjaW1tdXRhYmxlLXByb29mLWFzc2VydGlvbiJ9LCJwcm9vZk9iamVjdEhhc2giOiJzaGEyNTY6QzlqaGh1dDhpUDJJMkIwUUFzam1TazgxNmpXL1RDM1l0Q3E2cWN6R0VVQT0iLCJwcm9vZk9iamVjdElkIjoiYWlzOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEifQ==",
				id: "0404040404040404040404040404040404040404040404040404040404040404",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
			},
			{
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEudHdpbmRldi5vcmcvY29tbW9uLyIsImh0dHBzOi8vd3d3LnczLm9yZy9ucy9jcmVkZW50aWFscy92MiJdLCJpZCI6IjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYiLCJ0eXBlIjoiSW1tdXRhYmxlUHJvb2YiLCJub2RlSWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzIiwidXNlcklkZW50aXR5IjoiZGlkOmVudGl0eS1zdG9yYWdlOjB4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1OCIsInByb29mIjp7InR5cGUiOiJEYXRhSW50ZWdyaXR5UHJvb2YiLCJjcmVhdGVkIjoiMjAyNC0wOC0yMlQxMTo1Njo1Ni4yNzJaIiwiY3J5cHRvc3VpdGUiOiJlZGRzYS1qY3MtMjAyMiIsInByb29mUHVycG9zZSI6ImFzc2VydGlvbk1ldGhvZCIsInByb29mVmFsdWUiOiJ6Mnpqc0ZwYzdWTTRVaFZRaXpoajRRS1JVU0Q3SGhyRWlGRzRDYnZnS2ZzWXE2WTN4RkNxSnhLYjVaMVQ1dzVqaE1QTGQ0RDVxYWR4S3dydlBCTGN6NEc2ZyIsInZlcmlmaWNhdGlvbk1ldGhvZCI6ImRpZDplbnRpdHktc3RvcmFnZToweDYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjMjaW1tdXRhYmxlLXByb29mLWFzc2VydGlvbiJ9LCJwcm9vZk9iamVjdEhhc2giOiJzaGEyNTY6UE5VRVBQUTBJOFpCTXFJVVZuQlNrcXlOSGovMitMSkJ2S1I3ZEQ1UUpFMD0iLCJwcm9vZk9iamVjdElkIjoiYWlzOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDE6MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNSJ9",
				id: "0808080808080808080808080808080808080808080808080808080808080808",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
			}
		]);

		const immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(verifiableStore[0].data)
		);
		expect(immutableProof).toEqual({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.twindev.org/common/",
				"https://www.w3.org/ns/credentials/v2"
			],
			id: "0202020202020202020202020202020202020202020202020202020202020202",
			type: "ImmutableProof",
			proofObjectHash: "sha256:C9jhhut8iP2I2B0QAsjmSk816jW/TC3YtCq6qczGEUA=",
			proofObjectId: "ais:0101010101010101010101010101010101010101010101010101010101010101",
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z5fdydYf3m5rDrsupKYSomdM92pmbJXf7nMmjJ9LBundxA4sj3mFZXRqj5gWKQUnPa8xdqaV4z5xDDDgwxQHocwpx",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
			}
		});

		const immutableProofEntry = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(verifiableStore[1].data)
		);
		expect(immutableProofEntry).toEqual({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.twindev.org/common/",
				"https://www.w3.org/ns/credentials/v2"
			],
			type: "ImmutableProof",
			proofObjectHash: "sha256:PNUEPPQ0I8ZBMqIUVnBSkqyNHj/2+LJBvKR7dD5QJE0=",
			proofObjectId:
				"ais:0101010101010101010101010101010101010101010101010101010101010101:0505050505050505050505050505050505050505050505050505050505050505",
			id: "0606060606060606060606060606060606060606060606060606060606060606",
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z2zjsFpc7VM4UhVQizhj4QKRUSD7HhrEiFG4CbvgKfsYq6Y3xFCqJxKb5Z1T5w5jhMPLd4D5qadxKwrvPBLcz4G6g",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
			}
		});
	});

	test("Can get a stream with a single object and multiple entries", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create(
			{
				annotationObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is a simple note"
				},
				entries: [
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
				]
			},
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await waitForProofGeneration(2);

		const result = await service.get(streamId, {
			includeEntries: true,
			verifyStream: true,
			verifyEntries: true
		});

		expect(result).toEqual({
			"@context": [
				"https://schema.twindev.org/ais/",
				"https://schema.twindev.org/common/",
				"https://schema.org",
				"https://schema.twindev.org/immutable-proof/"
			],
			id: "ais:0101010101010101010101010101010101010101010101010101010101010101",
			type: "AuditableItemStream",
			dateCreated: "2024-08-22T11:55:16.271Z",
			dateModified: "2024-08-22T11:55:16.271Z",
			entries: [
				{
					type: "AuditableItemStreamEntry",
					id: "ais:0101010101010101010101010101010101010101010101010101010101010101:0505050505050505050505050505050505050505050505050505050505050505",
					dateCreated: "2024-08-22T11:55:16.271Z",
					proofId:
						"immutable-proof:0606060606060606060606060606060606060606060606060606060606060606",
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 1"
					},
					verification: {
						type: "ImmutableProofVerification",
						verified: true
					},
					index: 0,
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				},
				{
					type: "AuditableItemStreamEntry",
					id: "ais:0101010101010101010101010101010101010101010101010101010101010101:0909090909090909090909090909090909090909090909090909090909090909",
					dateCreated: "2024-08-22T11:55:16.271Z",
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 2"
					},
					index: 1,
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				}
			],
			immutableInterval: 10,
			proofId: "immutable-proof:0202020202020202020202020202020202020202020202020202020202020202",
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			verification: {
				type: "ImmutableProofVerification",
				verified: true
			},
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
		});

		const verifiableStore = verifiableStorage.getStore();
		expect(verifiableStore).toEqual([
			{
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEudHdpbmRldi5vcmcvY29tbW9uLyIsImh0dHBzOi8vd3d3LnczLm9yZy9ucy9jcmVkZW50aWFscy92MiJdLCJpZCI6IjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIiLCJ0eXBlIjoiSW1tdXRhYmxlUHJvb2YiLCJub2RlSWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzIiwidXNlcklkZW50aXR5IjoiZGlkOmVudGl0eS1zdG9yYWdlOjB4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1OCIsInByb29mIjp7InR5cGUiOiJEYXRhSW50ZWdyaXR5UHJvb2YiLCJjcmVhdGVkIjoiMjAyNC0wOC0yMlQxMTo1Njo1Ni4yNzJaIiwiY3J5cHRvc3VpdGUiOiJlZGRzYS1qY3MtMjAyMiIsInByb29mUHVycG9zZSI6ImFzc2VydGlvbk1ldGhvZCIsInByb29mVmFsdWUiOiJ6NWZkeWRZZjNtNXJEcnN1cEtZU29tZE05MnBtYkpYZjduTW1qSjlMQnVuZHhBNHNqM21GWlhScWo1Z1dLUVVuUGE4eGRxYVY0ejV4REREZ3d4UUhvY3dweCIsInZlcmlmaWNhdGlvbk1ldGhvZCI6ImRpZDplbnRpdHktc3RvcmFnZToweDYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjMjaW1tdXRhYmxlLXByb29mLWFzc2VydGlvbiJ9LCJwcm9vZk9iamVjdEhhc2giOiJzaGEyNTY6QzlqaGh1dDhpUDJJMkIwUUFzam1TazgxNmpXL1RDM1l0Q3E2cWN6R0VVQT0iLCJwcm9vZk9iamVjdElkIjoiYWlzOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEifQ==",
				id: "0404040404040404040404040404040404040404040404040404040404040404",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
			},
			{
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEudHdpbmRldi5vcmcvY29tbW9uLyIsImh0dHBzOi8vd3d3LnczLm9yZy9ucy9jcmVkZW50aWFscy92MiJdLCJpZCI6IjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYiLCJ0eXBlIjoiSW1tdXRhYmxlUHJvb2YiLCJub2RlSWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzIiwidXNlcklkZW50aXR5IjoiZGlkOmVudGl0eS1zdG9yYWdlOjB4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1OCIsInByb29mIjp7InR5cGUiOiJEYXRhSW50ZWdyaXR5UHJvb2YiLCJjcmVhdGVkIjoiMjAyNC0wOC0yMlQxMTo1Njo1Ni4yNzJaIiwiY3J5cHRvc3VpdGUiOiJlZGRzYS1qY3MtMjAyMiIsInByb29mUHVycG9zZSI6ImFzc2VydGlvbk1ldGhvZCIsInByb29mVmFsdWUiOiJ6Mnpqc0ZwYzdWTTRVaFZRaXpoajRRS1JVU0Q3SGhyRWlGRzRDYnZnS2ZzWXE2WTN4RkNxSnhLYjVaMVQ1dzVqaE1QTGQ0RDVxYWR4S3dydlBCTGN6NEc2ZyIsInZlcmlmaWNhdGlvbk1ldGhvZCI6ImRpZDplbnRpdHktc3RvcmFnZToweDYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjMjaW1tdXRhYmxlLXByb29mLWFzc2VydGlvbiJ9LCJwcm9vZk9iamVjdEhhc2giOiJzaGEyNTY6UE5VRVBQUTBJOFpCTXFJVVZuQlNrcXlOSGovMitMSkJ2S1I3ZEQ1UUpFMD0iLCJwcm9vZk9iamVjdElkIjoiYWlzOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDE6MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNSJ9",
				id: "0808080808080808080808080808080808080808080808080808080808080808",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
			}
		]);

		const immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(verifiableStore[0].data)
		);
		expect(immutableProof).toEqual({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.twindev.org/common/",
				"https://www.w3.org/ns/credentials/v2"
			],
			id: "0202020202020202020202020202020202020202020202020202020202020202",
			type: "ImmutableProof",
			proofObjectHash: "sha256:C9jhhut8iP2I2B0QAsjmSk816jW/TC3YtCq6qczGEUA=",
			proofObjectId: "ais:0101010101010101010101010101010101010101010101010101010101010101",
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z5fdydYf3m5rDrsupKYSomdM92pmbJXf7nMmjJ9LBundxA4sj3mFZXRqj5gWKQUnPa8xdqaV4z5xDDDgwxQHocwpx",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
			}
		});

		const immutableProofEntry = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(verifiableStore[1].data)
		);
		expect(immutableProofEntry).toEqual({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.twindev.org/common/",
				"https://www.w3.org/ns/credentials/v2"
			],
			type: "ImmutableProof",
			proofObjectHash: "sha256:PNUEPPQ0I8ZBMqIUVnBSkqyNHj/2+LJBvKR7dD5QJE0=",
			proofObjectId:
				"ais:0101010101010101010101010101010101010101010101010101010101010101:0505050505050505050505050505050505050505050505050505050505050505",
			id: "0606060606060606060606060606060606060606060606060606060606060606",
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z2zjsFpc7VM4UhVQizhj4QKRUSD7HhrEiFG4CbvgKfsYq6Y3xFCqJxKb5Z1T5w5jhMPLd4D5qadxKwrvPBLcz4G6g",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
			}
		});
	});

	test("Can get a stream with a single object and multiple entries, including entries", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create(
			{
				annotationObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is a simple note"
				},
				entries: [
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
				]
			},
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await waitForProofGeneration(2);

		const result = await service.get(streamId, {
			includeEntries: true,
			verifyStream: true,
			verifyEntries: true
		});

		expect(result).toEqual({
			"@context": [
				"https://schema.twindev.org/ais/",
				"https://schema.twindev.org/common/",
				"https://schema.org",
				"https://schema.twindev.org/immutable-proof/"
			],
			id: "ais:0101010101010101010101010101010101010101010101010101010101010101",
			type: "AuditableItemStream",
			dateCreated: "2024-08-22T11:55:16.271Z",
			dateModified: "2024-08-22T11:55:16.271Z",
			entries: [
				{
					id: "ais:0101010101010101010101010101010101010101010101010101010101010101:0505050505050505050505050505050505050505050505050505050505050505",
					type: "AuditableItemStreamEntry",
					dateCreated: "2024-08-22T11:55:16.271Z",
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 1"
					},
					index: 0,
					verification: {
						type: "ImmutableProofVerification",
						verified: true
					},
					proofId:
						"immutable-proof:0606060606060606060606060606060606060606060606060606060606060606",
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				},
				{
					type: "AuditableItemStreamEntry",
					id: "ais:0101010101010101010101010101010101010101010101010101010101010101:0909090909090909090909090909090909090909090909090909090909090909",
					dateCreated: "2024-08-22T11:55:16.271Z",
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 2"
					},
					index: 1,
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				}
			],
			immutableInterval: 10,
			proofId: "immutable-proof:0202020202020202020202020202020202020202020202020202020202020202",
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			verification: {
				type: "ImmutableProofVerification",
				verified: true
			},
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
		});
	});

	test("Can update a stream with a single object and multiple entries", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create(
			{
				annotationObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is a simple note"
				},
				entries: [
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
				]
			},
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await service.update(
			{
				id: streamId,
				annotationObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is a simple note xxx"
				}
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await waitForProofGeneration(2);

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
				annotationObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is a simple note xxx"
				},
				immutableInterval: 10,
				indexCounter: 2,
				proofId: "immutable-proof:0202020202020202020202020202020202020202020202020202020202020202"
			}
		]);

		const entryStore = streamEntryStorage.getStore();
		expect(entryStore).toEqual([
			{
				streamId: "0101010101010101010101010101010101010101010101010101010101010101",
				id: "0505050505050505050505050505050505050505050505050505050505050505",
				dateCreated: "2024-08-22T11:55:16.271Z",
				entryObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is an entry note 1"
				},
				proofId: "immutable-proof:0606060606060606060606060606060606060606060606060606060606060606",
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
				index: 0
			},
			{
				streamId: "0101010101010101010101010101010101010101010101010101010101010101",
				id: "0909090909090909090909090909090909090909090909090909090909090909",
				dateCreated: "2024-08-22T11:55:16.271Z",
				entryObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is an entry note 2"
				},
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
				index: 1
			}
		]);

		const verifiableStore = verifiableStorage.getStore();
		expect(verifiableStore).toEqual([
			{
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEudHdpbmRldi5vcmcvY29tbW9uLyIsImh0dHBzOi8vd3d3LnczLm9yZy9ucy9jcmVkZW50aWFscy92MiJdLCJpZCI6IjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIiLCJ0eXBlIjoiSW1tdXRhYmxlUHJvb2YiLCJub2RlSWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzIiwidXNlcklkZW50aXR5IjoiZGlkOmVudGl0eS1zdG9yYWdlOjB4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1OCIsInByb29mIjp7InR5cGUiOiJEYXRhSW50ZWdyaXR5UHJvb2YiLCJjcmVhdGVkIjoiMjAyNC0wOC0yMlQxMTo1Njo1Ni4yNzJaIiwiY3J5cHRvc3VpdGUiOiJlZGRzYS1qY3MtMjAyMiIsInByb29mUHVycG9zZSI6ImFzc2VydGlvbk1ldGhvZCIsInByb29mVmFsdWUiOiJ6NWZkeWRZZjNtNXJEcnN1cEtZU29tZE05MnBtYkpYZjduTW1qSjlMQnVuZHhBNHNqM21GWlhScWo1Z1dLUVVuUGE4eGRxYVY0ejV4REREZ3d4UUhvY3dweCIsInZlcmlmaWNhdGlvbk1ldGhvZCI6ImRpZDplbnRpdHktc3RvcmFnZToweDYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjMjaW1tdXRhYmxlLXByb29mLWFzc2VydGlvbiJ9LCJwcm9vZk9iamVjdEhhc2giOiJzaGEyNTY6QzlqaGh1dDhpUDJJMkIwUUFzam1TazgxNmpXL1RDM1l0Q3E2cWN6R0VVQT0iLCJwcm9vZk9iamVjdElkIjoiYWlzOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEifQ==",
				id: "0404040404040404040404040404040404040404040404040404040404040404",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
			},
			{
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEudHdpbmRldi5vcmcvY29tbW9uLyIsImh0dHBzOi8vd3d3LnczLm9yZy9ucy9jcmVkZW50aWFscy92MiJdLCJpZCI6IjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYiLCJ0eXBlIjoiSW1tdXRhYmxlUHJvb2YiLCJub2RlSWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzIiwidXNlcklkZW50aXR5IjoiZGlkOmVudGl0eS1zdG9yYWdlOjB4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1OCIsInByb29mIjp7InR5cGUiOiJEYXRhSW50ZWdyaXR5UHJvb2YiLCJjcmVhdGVkIjoiMjAyNC0wOC0yMlQxMTo1Njo1Ni4yNzJaIiwiY3J5cHRvc3VpdGUiOiJlZGRzYS1qY3MtMjAyMiIsInByb29mUHVycG9zZSI6ImFzc2VydGlvbk1ldGhvZCIsInByb29mVmFsdWUiOiJ6Mnpqc0ZwYzdWTTRVaFZRaXpoajRRS1JVU0Q3SGhyRWlGRzRDYnZnS2ZzWXE2WTN4RkNxSnhLYjVaMVQ1dzVqaE1QTGQ0RDVxYWR4S3dydlBCTGN6NEc2ZyIsInZlcmlmaWNhdGlvbk1ldGhvZCI6ImRpZDplbnRpdHktc3RvcmFnZToweDYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjMjaW1tdXRhYmxlLXByb29mLWFzc2VydGlvbiJ9LCJwcm9vZk9iamVjdEhhc2giOiJzaGEyNTY6UE5VRVBQUTBJOFpCTXFJVVZuQlNrcXlOSGovMitMSkJ2S1I3ZEQ1UUpFMD0iLCJwcm9vZk9iamVjdElkIjoiYWlzOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDE6MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNSJ9",
				id: "0808080808080808080808080808080808080808080808080808080808080808",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
			}
		]);
	});

	test("Can add a stream entry to an existing stream", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create(
			{
				annotationObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is a simple note"
				},
				entries: [
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
				]
			},
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

		await waitForProofGeneration();

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
				annotationObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is a simple note"
				},
				immutableInterval: 10,
				indexCounter: 3,
				proofId: "immutable-proof:0202020202020202020202020202020202020202020202020202020202020202"
			}
		]);

		await waitForProofGeneration(2);

		const entryStore = streamEntryStorage.getStore();

		expect(entryStore).toEqual([
			{
				streamId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: "2024-08-22T11:55:16.271Z",
				id: "0505050505050505050505050505050505050505050505050505050505050505",
				entryObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is an entry note 1"
				},
				proofId: "immutable-proof:0606060606060606060606060606060606060606060606060606060606060606",
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
				index: 0
			},
			{
				streamId: "0101010101010101010101010101010101010101010101010101010101010101",
				id: "0909090909090909090909090909090909090909090909090909090909090909",
				dateCreated: "2024-08-22T11:55:16.271Z",
				entryObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is an entry note 2"
				},
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
				index: 1
			},
			{
				streamId: "0101010101010101010101010101010101010101010101010101010101010101",
				id: "0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a",
				dateCreated: "2024-08-22T11:56:56.272Z",
				entryObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is an entry note 3"
				},
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
				index: 2
			}
		]);

		const verifiableStore = verifiableStorage.getStore();
		expect(verifiableStore).toEqual([
			{
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEudHdpbmRldi5vcmcvY29tbW9uLyIsImh0dHBzOi8vd3d3LnczLm9yZy9ucy9jcmVkZW50aWFscy92MiJdLCJpZCI6IjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIiLCJ0eXBlIjoiSW1tdXRhYmxlUHJvb2YiLCJub2RlSWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzIiwidXNlcklkZW50aXR5IjoiZGlkOmVudGl0eS1zdG9yYWdlOjB4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1OCIsInByb29mIjp7InR5cGUiOiJEYXRhSW50ZWdyaXR5UHJvb2YiLCJjcmVhdGVkIjoiMjAyNC0wOC0yMlQxMTo1Njo1Ni4yNzJaIiwiY3J5cHRvc3VpdGUiOiJlZGRzYS1qY3MtMjAyMiIsInByb29mUHVycG9zZSI6ImFzc2VydGlvbk1ldGhvZCIsInByb29mVmFsdWUiOiJ6NWZkeWRZZjNtNXJEcnN1cEtZU29tZE05MnBtYkpYZjduTW1qSjlMQnVuZHhBNHNqM21GWlhScWo1Z1dLUVVuUGE4eGRxYVY0ejV4REREZ3d4UUhvY3dweCIsInZlcmlmaWNhdGlvbk1ldGhvZCI6ImRpZDplbnRpdHktc3RvcmFnZToweDYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjMjaW1tdXRhYmxlLXByb29mLWFzc2VydGlvbiJ9LCJwcm9vZk9iamVjdEhhc2giOiJzaGEyNTY6QzlqaGh1dDhpUDJJMkIwUUFzam1TazgxNmpXL1RDM1l0Q3E2cWN6R0VVQT0iLCJwcm9vZk9iamVjdElkIjoiYWlzOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEifQ==",
				id: "0404040404040404040404040404040404040404040404040404040404040404",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
			},
			{
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEudHdpbmRldi5vcmcvY29tbW9uLyIsImh0dHBzOi8vd3d3LnczLm9yZy9ucy9jcmVkZW50aWFscy92MiJdLCJpZCI6IjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYiLCJ0eXBlIjoiSW1tdXRhYmxlUHJvb2YiLCJub2RlSWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzIiwidXNlcklkZW50aXR5IjoiZGlkOmVudGl0eS1zdG9yYWdlOjB4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1OCIsInByb29mIjp7InR5cGUiOiJEYXRhSW50ZWdyaXR5UHJvb2YiLCJjcmVhdGVkIjoiMjAyNC0wOC0yMlQxMTo1Njo1Ni4yNzJaIiwiY3J5cHRvc3VpdGUiOiJlZGRzYS1qY3MtMjAyMiIsInByb29mUHVycG9zZSI6ImFzc2VydGlvbk1ldGhvZCIsInByb29mVmFsdWUiOiJ6Mnpqc0ZwYzdWTTRVaFZRaXpoajRRS1JVU0Q3SGhyRWlGRzRDYnZnS2ZzWXE2WTN4RkNxSnhLYjVaMVQ1dzVqaE1QTGQ0RDVxYWR4S3dydlBCTGN6NEc2ZyIsInZlcmlmaWNhdGlvbk1ldGhvZCI6ImRpZDplbnRpdHktc3RvcmFnZToweDYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjMjaW1tdXRhYmxlLXByb29mLWFzc2VydGlvbiJ9LCJwcm9vZk9iamVjdEhhc2giOiJzaGEyNTY6UE5VRVBQUTBJOFpCTXFJVVZuQlNrcXlOSGovMitMSkJ2S1I3ZEQ1UUpFMD0iLCJwcm9vZk9iamVjdElkIjoiYWlzOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDE6MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNSJ9",
				id: "0808080808080808080808080808080808080808080808080808080808080808",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
			}
		]);
	});

	test("Can add multiple stream entries and expect more immutable checks", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create(
			{
				annotationObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is a simple note"
				},
				entries: [
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
				]
			},
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

		await waitForProofGeneration(3);

		expect(streamId.startsWith("ais:")).toEqual(true);

		const streamStore = streamStorage.getStore();

		expect(streamStore).toEqual([
			{
				id: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: "2024-08-22T11:55:16.271Z",
				dateModified: "2024-08-22T11:56:56.272Z",
				nodeIdentity: TEST_NODE_IDENTITY,
				userIdentity: TEST_USER_IDENTITY,
				annotationObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is a simple note"
				},
				immutableInterval: 10,
				indexCounter: 12,
				proofId: "immutable-proof:0202020202020202020202020202020202020202020202020202020202020202"
			}
		]);

		const entryStore = streamEntryStorage.getStore();
		expect(entryStore).toHaveLength(12);

		const verifiableStore = verifiableStorage.getStore();
		expect(verifiableStore).toHaveLength(3);
	});

	test("Can get an entry from the stream", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create(
			{
				annotationObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is a simple note"
				},
				entries: [
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
				]
			},
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
			"@context": [
				"https://schema.twindev.org/ais/",
				"https://schema.twindev.org/common/",
				"https://schema.org",
				"https://schema.twindev.org/immutable-proof/"
			],
			type: "AuditableItemStreamEntry",
			id: "ais:0101010101010101010101010101010101010101010101010101010101010101:0505050505050505050505050505050505050505050505050505050505050505",
			dateCreated: "2024-08-22T11:55:16.271Z",
			entryObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is an entry note 1"
			},
			proofId: "immutable-proof:0606060606060606060606060606060606060606060606060606060606060606",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			index: 0,
			verification: {
				type: "ImmutableProofVerification",
				verified: true
			}
		});

		const streamStore = streamStorage.getStore();

		expect(streamStore).toEqual([
			{
				id: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: "2024-08-22T11:55:16.271Z",
				dateModified: "2024-08-22T11:55:16.271Z",
				nodeIdentity: TEST_NODE_IDENTITY,
				userIdentity: TEST_USER_IDENTITY,
				annotationObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is a simple note"
				},
				immutableInterval: 10,
				indexCounter: 2,
				proofId: "immutable-proof:0202020202020202020202020202020202020202020202020202020202020202"
			}
		]);
	});

	test("Can get an entry object from the stream", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create(
			{
				annotationObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is a simple note"
				},
				entries: [
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
				]
			},
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
				annotationObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is a simple note"
				},
				immutableInterval: 10,
				indexCounter: 2,
				proofId: "immutable-proof:0202020202020202020202020202020202020202020202020202020202020202"
			}
		]);
	});

	test("Can delete an entry from the stream", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create(
			{
				annotationObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is a simple note"
				},
				entries: [
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
				]
			},
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
				annotationObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is a simple note"
				},
				immutableInterval: 10,
				indexCounter: 2,
				proofId: "immutable-proof:0202020202020202020202020202020202020202020202020202020202020202"
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
				annotationObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is a simple note"
				},
				entries: [
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
				]
			},
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await waitForProofGeneration(2);

		await service.get(streamId, { includeEntries: true });

		const entries = await service.getEntries(streamId, { verifyEntries: true });

		expect(entries).toEqual({
			"@context": [
				"https://schema.twindev.org/ais/",
				"https://schema.twindev.org/common/",
				"https://schema.org",
				"https://schema.twindev.org/immutable-proof/"
			],
			type: "AuditableItemStreamEntryList",
			entries: [
				{
					type: "AuditableItemStreamEntry",
					id: "ais:0101010101010101010101010101010101010101010101010101010101010101:0505050505050505050505050505050505050505050505050505050505050505",
					dateCreated: "2024-08-22T11:55:16.271Z",
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 1"
					},
					proofId:
						"immutable-proof:0606060606060606060606060606060606060606060606060606060606060606",
					verification: {
						type: "ImmutableProofVerification",
						verified: true
					},
					index: 0,
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				},
				{
					type: "AuditableItemStreamEntry",
					dateCreated: "2024-08-22T11:55:16.271Z",
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 2"
					},
					id: "ais:0101010101010101010101010101010101010101010101010101010101010101:0909090909090909090909090909090909090909090909090909090909090909",
					index: 1,
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
				annotationObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is a simple note"
				},
				entries: [
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
				]
			},
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
			"@context": [
				"https://schema.twindev.org/ais/",
				"https://schema.twindev.org/common/",
				"https://schema.org",
				"https://schema.twindev.org/immutable-proof/"
			],
			type: "AuditableItemStreamEntryList",
			entries: [
				{
					type: "AuditableItemStreamEntry",
					id: "ais:0101010101010101010101010101010101010101010101010101010101010101:0909090909090909090909090909090909090909090909090909090909090909",
					dateCreated: "2024-08-22T11:55:16.271Z",
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 2"
					},
					index: 1,
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				}
			]
		});
	});

	test("Can query a list of streams", async () => {
		const service = new AuditableItemStreamService();

		for (let i = 0; i < 5; i++) {
			await service.create(
				{
					annotationObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: `This is a simple note ${i + 1}`
					},
					entries: [
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
					]
				},
				undefined,
				TEST_USER_IDENTITY,
				TEST_NODE_IDENTITY
			);
		}

		const result = await service.query();
		expect(result).toEqual({
			"@context": [
				"https://schema.twindev.org/ais/",
				"https://schema.twindev.org/common/",
				"https://schema.org"
			],
			type: "AuditableItemStreamList",
			itemStreams: [
				{
					type: "AuditableItemStream",
					id: "ais:0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a",
					dateCreated: "2024-08-22T11:56:56.272Z",
					dateModified: "2024-08-22T11:56:56.272Z",
					annotationObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is a simple note 2"
					}
				},
				{
					type: "AuditableItemStream",
					id: "ais:1313131313131313131313131313131313131313131313131313131313131313",
					dateCreated: "2024-08-22T11:56:56.272Z",
					dateModified: "2024-08-22T11:56:56.272Z",
					annotationObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is a simple note 3"
					}
				},
				{
					type: "AuditableItemStream",
					id: "ais:1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c",
					dateCreated: "2024-08-22T11:56:56.272Z",
					dateModified: "2024-08-22T11:56:56.272Z",
					annotationObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is a simple note 4"
					}
				},
				{
					type: "AuditableItemStream",
					id: "ais:2525252525252525252525252525252525252525252525252525252525252525",
					dateCreated: "2024-08-22T11:56:56.272Z",
					dateModified: "2024-08-22T11:56:56.272Z",
					annotationObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is a simple note 5"
					}
				},
				{
					type: "AuditableItemStream",
					id: "ais:0101010101010101010101010101010101010101010101010101010101010101",
					dateCreated: "2024-08-22T11:55:16.271Z",
					dateModified: "2024-08-22T11:55:16.271Z",
					annotationObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is a simple note 1"
					}
				}
			]
		});
	});
});
