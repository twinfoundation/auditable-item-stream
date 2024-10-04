// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
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
import {
	EntityStorageImmutableStorageConnector,
	type ImmutableItem,
	initSchema as initSchemaImmutableStorage
} from "@twin.org/immutable-storage-connector-entity-storage";
import { ImmutableStorageConnectorFactory } from "@twin.org/immutable-storage-models";
import { nameof } from "@twin.org/nameof";
import { setupTestEnv, TEST_NODE_IDENTITY, TEST_USER_IDENTITY } from "./setupTestEnv";
import { AuditableItemStreamService } from "../src/auditableItemStreamService";
import type { AuditableItemStream } from "../src/entities/auditableItemStream";
import type { AuditableItemStreamEntry } from "../src/entities/auditableItemStreamEntry";
import { initSchema } from "../src/schema";

let streamStorage: MemoryEntityStorageConnector<AuditableItemStream>;
let streamEntryStorage: MemoryEntityStorageConnector<AuditableItemStreamEntry>;
let immutableProofStorage: MemoryEntityStorageConnector<ImmutableProof>;
let immutableStorage: MemoryEntityStorageConnector<ImmutableItem>;

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
	} while (immutableStorage.getStore().length < proofCount && count++ < proofCount * 40);
}

describe("AuditableItemStreamService", () => {
	beforeAll(async () => {
		await setupTestEnv();

		initSchema();
		initSchemaImmutableStorage();
		initSchemaImmutableProof();
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
			"immutable-storage",
			() => new EntityStorageImmutableStorageConnector()
		);

		immutableProofStorage = new MemoryEntityStorageConnector<ImmutableProof>({
			entitySchema: nameof<ImmutableProof>()
		});

		EntityStorageConnectorFactory.register("immutable-proof", () => immutableProofStorage);

		const immutableProofService = new ImmutableProofService();
		ComponentFactory.register("immutable-proof", () => immutableProofService);

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
			.mockImplementationOnce(length => new Uint8Array(length).fill(15))
			.mockImplementationOnce(length => new Uint8Array(length).fill(16))
			.mockImplementationOnce(length => new Uint8Array(length).fill(17))
			.mockImplementationOnce(length => new Uint8Array(length).fill(18))
			.mockImplementationOnce(length => new Uint8Array(length).fill(19))
			.mockImplementationOnce(length => new Uint8Array(length).fill(20))
			.mockImplementation(length => new Uint8Array(length).fill(21));
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
				proofId: "immutable-proof:0202020202020202020202020202020202020202020202020202020202020202"
			}
		]);

		const entryStore = streamEntryStorage.getStore();
		expect(entryStore.length).toEqual(0);

		await waitForProofGeneration();

		const immutableStore = immutableStorage.getStore();
		expect(immutableStore).toEqual([
			{
				id: "0303030303030303030303030303030303030303030303030303030303030303",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEub3JnLyIsImh0dHBzOi8vdzNpZC5vcmcvc2VjdXJpdHkvZGF0YS1pbnRlZ3JpdHkvdjIiXSwiaWQiOiIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyIiwidHlwZSI6IkltbXV0YWJsZVByb29mIiwicHJvb2ZPYmplY3RIYXNoIjoibDBtOFQxTktLVUFNRTU5QnR2dCtvQ3VJampUMFhjMjlLd3JzQUtNRzZlTT0iLCJwcm9vZk9iamVjdElkIjoiYWlzOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEiLCJ1c2VySWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4IiwicHJvb2YiOnsidHlwZSI6IkRhdGFJbnRlZ3JpdHlQcm9vZiIsImNyZWF0ZWQiOiIyMDI0LTA4LTIyVDExOjU2OjU2LjI3MloiLCJjcnlwdG9zdWl0ZSI6ImVkZHNhLWpjcy0yMDIyIiwicHJvb2ZQdXJwb3NlIjoiYXNzZXJ0aW9uTWV0aG9kIiwicHJvb2ZWYWx1ZSI6Im1UTjdtTFlHQkNwVkJqTnNjRnZ1YWhOc3lXNzVTWFpobUpORXNjdG50aWdBaWVYN1BSWWFjdXVORUdqZ0ZaYUdhNkJGVXJQZW9jZGJKSFN1c1dBVDRuaiIsInZlcmlmaWNhdGlvbk1ldGhvZCI6ImRpZDplbnRpdHktc3RvcmFnZToweDYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjMjaW1tdXRhYmxlLXByb29mIn19"
			}
		]);

		const immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toEqual({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.org/",
				"https://w3id.org/security/data-integrity/v2"
			],
			id: "0202020202020202020202020202020202020202020202020202020202020202",
			type: "ImmutableProof",
			proofObjectHash: "l0m8T1NKKUAME59Btvt+oCuIjjT0Xc29KwrsAKMG6eM=",
			proofObjectId: "ais:0101010101010101010101010101010101010101010101010101010101010101",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"mTN7mLYGBCpVBjNscFvuahNsyW75SXZhmJNEsctntigAieX7PRYacuuNEGjgFZaGa6BFUrPeocdbJHSusWAT4nj",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof"
			}
		});
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
				proofId: "immutable-proof:0202020202020202020202020202020202020202020202020202020202020202"
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
				proofId: "immutable-proof:0404040404040404040404040404040404040404040404040404040404040404"
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
				index: 1
			}
		]);

		await waitForProofGeneration(2);

		const immutableStore = immutableStorage.getStore();
		expect(immutableStore).toEqual([
			{
				id: "0606060606060606060606060606060606060606060606060606060606060606",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEub3JnLyIsImh0dHBzOi8vdzNpZC5vcmcvc2VjdXJpdHkvZGF0YS1pbnRlZ3JpdHkvdjIiXSwiaWQiOiIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyIiwidHlwZSI6IkltbXV0YWJsZVByb29mIiwicHJvb2ZPYmplY3RIYXNoIjoibDBtOFQxTktLVUFNRTU5QnR2dCtvQ3VJampUMFhjMjlLd3JzQUtNRzZlTT0iLCJwcm9vZk9iamVjdElkIjoiYWlzOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEiLCJ1c2VySWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4IiwicHJvb2YiOnsidHlwZSI6IkRhdGFJbnRlZ3JpdHlQcm9vZiIsImNyZWF0ZWQiOiIyMDI0LTA4LTIyVDExOjU2OjU2LjI3MloiLCJjcnlwdG9zdWl0ZSI6ImVkZHNhLWpjcy0yMDIyIiwicHJvb2ZQdXJwb3NlIjoiYXNzZXJ0aW9uTWV0aG9kIiwicHJvb2ZWYWx1ZSI6Im1UTjdtTFlHQkNwVkJqTnNjRnZ1YWhOc3lXNzVTWFpobUpORXNjdG50aWdBaWVYN1BSWWFjdXVORUdqZ0ZaYUdhNkJGVXJQZW9jZGJKSFN1c1dBVDRuaiIsInZlcmlmaWNhdGlvbk1ldGhvZCI6ImRpZDplbnRpdHktc3RvcmFnZToweDYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjMjaW1tdXRhYmxlLXByb29mIn19"
			},
			{
				id: "0707070707070707070707070707070707070707070707070707070707070707",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEub3JnLyIsImh0dHBzOi8vdzNpZC5vcmcvc2VjdXJpdHkvZGF0YS1pbnRlZ3JpdHkvdjIiXSwiaWQiOiIwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0IiwidHlwZSI6IkltbXV0YWJsZVByb29mIiwicHJvb2ZPYmplY3RIYXNoIjoianBtUnJrclZ1Ri9OZldIc2p5bFZNQ1NteXZ1SFFGMEZvdTBxMWhTRFI1MD0iLCJwcm9vZk9iamVjdElkIjoiYWlzOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDE6MDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMyIsInVzZXJJZGVudGl0eSI6ImRpZDplbnRpdHktc3RvcmFnZToweDU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTgiLCJwcm9vZiI6eyJ0eXBlIjoiRGF0YUludGVncml0eVByb29mIiwiY3JlYXRlZCI6IjIwMjQtMDgtMjJUMTE6NTY6NTYuMjcyWiIsImNyeXB0b3N1aXRlIjoiZWRkc2EtamNzLTIwMjIiLCJwcm9vZlB1cnBvc2UiOiJhc3NlcnRpb25NZXRob2QiLCJwcm9vZlZhbHVlIjoiNjNFdWdaQ0U0WW5LNHp1TWVrVzEybXJidzRnY2ZteURGZDZSWDY3a01nclU4M0h3U1NOYjV0bVRqSmpoMmpRNHlpUFFIUEN6eWdoWWlmeDhxNmtzWlc4ZCIsInZlcmlmaWNhdGlvbk1ldGhvZCI6ImRpZDplbnRpdHktc3RvcmFnZToweDYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjMjaW1tdXRhYmxlLXByb29mIn19"
			}
		]);

		const immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toEqual({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.org/",
				"https://w3id.org/security/data-integrity/v2"
			],
			id: "0202020202020202020202020202020202020202020202020202020202020202",
			type: "ImmutableProof",
			proofObjectHash: "l0m8T1NKKUAME59Btvt+oCuIjjT0Xc29KwrsAKMG6eM=",
			proofObjectId: "ais:0101010101010101010101010101010101010101010101010101010101010101",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"mTN7mLYGBCpVBjNscFvuahNsyW75SXZhmJNEsctntigAieX7PRYacuuNEGjgFZaGa6BFUrPeocdbJHSusWAT4nj",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof"
			}
		});

		const immutableProofEntry = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[1].data)
		);
		expect(immutableProofEntry).toEqual({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.org/",
				"https://w3id.org/security/data-integrity/v2"
			],
			id: "0404040404040404040404040404040404040404040404040404040404040404",
			type: "ImmutableProof",
			proofObjectHash: "jpmRrkrVuF/NfWHsjylVMCSmyvuHQF0Fou0q1hSDR50=",
			proofObjectId:
				"ais:0101010101010101010101010101010101010101010101010101010101010101:0303030303030303030303030303030303030303030303030303030303030303",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"63EugZCE4YnK4zuMekW12mrbw4gcfmyDFd6RX67kMgrU83HwSSNb5tmTjJjh2jQ4yiPQHPCzyghYifx8q6ksZW8d",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof"
			}
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

		await waitForProofGeneration();

		const result = await service.get(streamId, {
			includeEntries: true,
			verifyStream: true,
			verifyEntries: true
		});

		expect(result).toEqual({
			"@context": [
				"https://schema.twindev.org/ais/",
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.org/"
			],
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
					verification: {
						type: "ImmutableProofVerification",
						verified: true
					},
					index: 0,
					proofId:
						"immutable-proof:0404040404040404040404040404040404040404040404040404040404040404",
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
					index: 1,
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				}
			],
			immutableInterval: 10,
			proofId: "immutable-proof:0202020202020202020202020202020202020202020202020202020202020202",
			streamObject: {
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

		const immutableStore = immutableStorage.getStore();
		expect(immutableStore).toEqual([
			{
				id: "0606060606060606060606060606060606060606060606060606060606060606",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEub3JnLyIsImh0dHBzOi8vdzNpZC5vcmcvc2VjdXJpdHkvZGF0YS1pbnRlZ3JpdHkvdjIiXSwiaWQiOiIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyIiwidHlwZSI6IkltbXV0YWJsZVByb29mIiwicHJvb2ZPYmplY3RIYXNoIjoibDBtOFQxTktLVUFNRTU5QnR2dCtvQ3VJampUMFhjMjlLd3JzQUtNRzZlTT0iLCJwcm9vZk9iamVjdElkIjoiYWlzOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEiLCJ1c2VySWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4IiwicHJvb2YiOnsidHlwZSI6IkRhdGFJbnRlZ3JpdHlQcm9vZiIsImNyZWF0ZWQiOiIyMDI0LTA4LTIyVDExOjU2OjU2LjI3MloiLCJjcnlwdG9zdWl0ZSI6ImVkZHNhLWpjcy0yMDIyIiwicHJvb2ZQdXJwb3NlIjoiYXNzZXJ0aW9uTWV0aG9kIiwicHJvb2ZWYWx1ZSI6Im1UTjdtTFlHQkNwVkJqTnNjRnZ1YWhOc3lXNzVTWFpobUpORXNjdG50aWdBaWVYN1BSWWFjdXVORUdqZ0ZaYUdhNkJGVXJQZW9jZGJKSFN1c1dBVDRuaiIsInZlcmlmaWNhdGlvbk1ldGhvZCI6ImRpZDplbnRpdHktc3RvcmFnZToweDYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjMjaW1tdXRhYmxlLXByb29mIn19"
			},
			{
				id: "0707070707070707070707070707070707070707070707070707070707070707",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEub3JnLyIsImh0dHBzOi8vdzNpZC5vcmcvc2VjdXJpdHkvZGF0YS1pbnRlZ3JpdHkvdjIiXSwiaWQiOiIwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0IiwidHlwZSI6IkltbXV0YWJsZVByb29mIiwicHJvb2ZPYmplY3RIYXNoIjoianBtUnJrclZ1Ri9OZldIc2p5bFZNQ1NteXZ1SFFGMEZvdTBxMWhTRFI1MD0iLCJwcm9vZk9iamVjdElkIjoiYWlzOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDE6MDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMyIsInVzZXJJZGVudGl0eSI6ImRpZDplbnRpdHktc3RvcmFnZToweDU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTgiLCJwcm9vZiI6eyJ0eXBlIjoiRGF0YUludGVncml0eVByb29mIiwiY3JlYXRlZCI6IjIwMjQtMDgtMjJUMTE6NTY6NTYuMjcyWiIsImNyeXB0b3N1aXRlIjoiZWRkc2EtamNzLTIwMjIiLCJwcm9vZlB1cnBvc2UiOiJhc3NlcnRpb25NZXRob2QiLCJwcm9vZlZhbHVlIjoiNjNFdWdaQ0U0WW5LNHp1TWVrVzEybXJidzRnY2ZteURGZDZSWDY3a01nclU4M0h3U1NOYjV0bVRqSmpoMmpRNHlpUFFIUEN6eWdoWWlmeDhxNmtzWlc4ZCIsInZlcmlmaWNhdGlvbk1ldGhvZCI6ImRpZDplbnRpdHktc3RvcmFnZToweDYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjMjaW1tdXRhYmxlLXByb29mIn19"
			}
		]);

		const immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toEqual({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.org/",
				"https://w3id.org/security/data-integrity/v2"
			],
			id: "0202020202020202020202020202020202020202020202020202020202020202",
			type: "ImmutableProof",
			proofObjectHash: "l0m8T1NKKUAME59Btvt+oCuIjjT0Xc29KwrsAKMG6eM=",
			proofObjectId: "ais:0101010101010101010101010101010101010101010101010101010101010101",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"mTN7mLYGBCpVBjNscFvuahNsyW75SXZhmJNEsctntigAieX7PRYacuuNEGjgFZaGa6BFUrPeocdbJHSusWAT4nj",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof"
			}
		});

		const immutableProofEntry = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[1].data)
		);
		expect(immutableProofEntry).toEqual({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.org/",
				"https://w3id.org/security/data-integrity/v2"
			],
			id: "0404040404040404040404040404040404040404040404040404040404040404",
			type: "ImmutableProof",
			proofObjectHash: "jpmRrkrVuF/NfWHsjylVMCSmyvuHQF0Fou0q1hSDR50=",
			proofObjectId:
				"ais:0101010101010101010101010101010101010101010101010101010101010101:0303030303030303030303030303030303030303030303030303030303030303",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"63EugZCE4YnK4zuMekW12mrbw4gcfmyDFd6RX67kMgrU83HwSSNb5tmTjJjh2jQ4yiPQHPCzyghYifx8q6ksZW8d",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof"
			}
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
			"@context": [
				"https://schema.twindev.org/ais/",
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.org/"
			],
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
					index: 0,
					proofId:
						"immutable-proof:0404040404040404040404040404040404040404040404040404040404040404",
					verification: {
						type: "ImmutableProofVerification",
						failure: "notIssued",
						verified: false
					},
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
					index: 1,
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				}
			],
			immutableInterval: 10,
			proofId: "immutable-proof:0202020202020202020202020202020202020202020202020202020202020202",
			streamObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			verification: {
				type: "ImmutableProofVerification",
				failure: "notIssued",
				verified: false
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
				streamObject: {
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
				index: 0,
				proofId: "immutable-proof:0404040404040404040404040404040404040404040404040404040404040404"
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
				index: 1
			}
		]);

		const immutableStore = immutableStorage.getStore();
		expect(immutableStore).toEqual([
			{
				id: "0707070707070707070707070707070707070707070707070707070707070707",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEub3JnLyIsImh0dHBzOi8vdzNpZC5vcmcvc2VjdXJpdHkvZGF0YS1pbnRlZ3JpdHkvdjIiXSwiaWQiOiIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyIiwidHlwZSI6IkltbXV0YWJsZVByb29mIiwicHJvb2ZPYmplY3RIYXNoIjoibDBtOFQxTktLVUFNRTU5QnR2dCtvQ3VJampUMFhjMjlLd3JzQUtNRzZlTT0iLCJwcm9vZk9iamVjdElkIjoiYWlzOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEiLCJ1c2VySWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4IiwicHJvb2YiOnsidHlwZSI6IkRhdGFJbnRlZ3JpdHlQcm9vZiIsImNyZWF0ZWQiOiIyMDI0LTA4LTIyVDExOjU2OjU2LjI3MloiLCJjcnlwdG9zdWl0ZSI6ImVkZHNhLWpjcy0yMDIyIiwicHJvb2ZQdXJwb3NlIjoiYXNzZXJ0aW9uTWV0aG9kIiwicHJvb2ZWYWx1ZSI6Im1UTjdtTFlHQkNwVkJqTnNjRnZ1YWhOc3lXNzVTWFpobUpORXNjdG50aWdBaWVYN1BSWWFjdXVORUdqZ0ZaYUdhNkJGVXJQZW9jZGJKSFN1c1dBVDRuaiIsInZlcmlmaWNhdGlvbk1ldGhvZCI6ImRpZDplbnRpdHktc3RvcmFnZToweDYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjMjaW1tdXRhYmxlLXByb29mIn19"
			},
			{
				id: "0909090909090909090909090909090909090909090909090909090909090909",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEub3JnLyIsImh0dHBzOi8vdzNpZC5vcmcvc2VjdXJpdHkvZGF0YS1pbnRlZ3JpdHkvdjIiXSwiaWQiOiIwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0IiwidHlwZSI6IkltbXV0YWJsZVByb29mIiwicHJvb2ZPYmplY3RIYXNoIjoianBtUnJrclZ1Ri9OZldIc2p5bFZNQ1NteXZ1SFFGMEZvdTBxMWhTRFI1MD0iLCJwcm9vZk9iamVjdElkIjoiYWlzOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDE6MDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMyIsInVzZXJJZGVudGl0eSI6ImRpZDplbnRpdHktc3RvcmFnZToweDU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTgiLCJwcm9vZiI6eyJ0eXBlIjoiRGF0YUludGVncml0eVByb29mIiwiY3JlYXRlZCI6IjIwMjQtMDgtMjJUMTE6NTY6NTYuMjcyWiIsImNyeXB0b3N1aXRlIjoiZWRkc2EtamNzLTIwMjIiLCJwcm9vZlB1cnBvc2UiOiJhc3NlcnRpb25NZXRob2QiLCJwcm9vZlZhbHVlIjoiNjNFdWdaQ0U0WW5LNHp1TWVrVzEybXJidzRnY2ZteURGZDZSWDY3a01nclU4M0h3U1NOYjV0bVRqSmpoMmpRNHlpUFFIUEN6eWdoWWlmeDhxNmtzWlc4ZCIsInZlcmlmaWNhdGlvbk1ldGhvZCI6ImRpZDplbnRpdHktc3RvcmFnZToweDYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjMjaW1tdXRhYmxlLXByb29mIn19"
			}
		]);
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
				streamObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "This is a simple note"
				},
				immutableInterval: 10,
				indexCounter: 3,
				proofId: "immutable-proof:0202020202020202020202020202020202020202020202020202020202020202"
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
				index: 0,
				proofId: "immutable-proof:0404040404040404040404040404040404040404040404040404040404040404"
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
				index: 2
			}
		]);

		const immutableStore = immutableStorage.getStore();
		expect(immutableStore).toEqual([
			{
				id: "0707070707070707070707070707070707070707070707070707070707070707",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEub3JnLyIsImh0dHBzOi8vdzNpZC5vcmcvc2VjdXJpdHkvZGF0YS1pbnRlZ3JpdHkvdjIiXSwiaWQiOiIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyIiwidHlwZSI6IkltbXV0YWJsZVByb29mIiwicHJvb2ZPYmplY3RIYXNoIjoibDBtOFQxTktLVUFNRTU5QnR2dCtvQ3VJampUMFhjMjlLd3JzQUtNRzZlTT0iLCJwcm9vZk9iamVjdElkIjoiYWlzOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEiLCJ1c2VySWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4IiwicHJvb2YiOnsidHlwZSI6IkRhdGFJbnRlZ3JpdHlQcm9vZiIsImNyZWF0ZWQiOiIyMDI0LTA4LTIyVDExOjU2OjU2LjI3MloiLCJjcnlwdG9zdWl0ZSI6ImVkZHNhLWpjcy0yMDIyIiwicHJvb2ZQdXJwb3NlIjoiYXNzZXJ0aW9uTWV0aG9kIiwicHJvb2ZWYWx1ZSI6Im1UTjdtTFlHQkNwVkJqTnNjRnZ1YWhOc3lXNzVTWFpobUpORXNjdG50aWdBaWVYN1BSWWFjdXVORUdqZ0ZaYUdhNkJGVXJQZW9jZGJKSFN1c1dBVDRuaiIsInZlcmlmaWNhdGlvbk1ldGhvZCI6ImRpZDplbnRpdHktc3RvcmFnZToweDYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjMjaW1tdXRhYmxlLXByb29mIn19"
			},
			{
				id: "0808080808080808080808080808080808080808080808080808080808080808",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEub3JnLyIsImh0dHBzOi8vdzNpZC5vcmcvc2VjdXJpdHkvZGF0YS1pbnRlZ3JpdHkvdjIiXSwiaWQiOiIwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0IiwidHlwZSI6IkltbXV0YWJsZVByb29mIiwicHJvb2ZPYmplY3RIYXNoIjoianBtUnJrclZ1Ri9OZldIc2p5bFZNQ1NteXZ1SFFGMEZvdTBxMWhTRFI1MD0iLCJwcm9vZk9iamVjdElkIjoiYWlzOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDE6MDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMyIsInVzZXJJZGVudGl0eSI6ImRpZDplbnRpdHktc3RvcmFnZToweDU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTgiLCJwcm9vZiI6eyJ0eXBlIjoiRGF0YUludGVncml0eVByb29mIiwiY3JlYXRlZCI6IjIwMjQtMDgtMjJUMTE6NTY6NTYuMjcyWiIsImNyeXB0b3N1aXRlIjoiZWRkc2EtamNzLTIwMjIiLCJwcm9vZlB1cnBvc2UiOiJhc3NlcnRpb25NZXRob2QiLCJwcm9vZlZhbHVlIjoiNjNFdWdaQ0U0WW5LNHp1TWVrVzEybXJidzRnY2ZteURGZDZSWDY3a01nclU4M0h3U1NOYjV0bVRqSmpoMmpRNHlpUFFIUEN6eWdoWWlmeDhxNmtzWlc4ZCIsInZlcmlmaWNhdGlvbk1ldGhvZCI6ImRpZDplbnRpdHktc3RvcmFnZToweDYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjMjaW1tdXRhYmxlLXByb29mIn19"
			}
		]);
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
				streamObject: {
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
			"@context": [
				"https://schema.twindev.org/ais/",
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.org/"
			],
			id: "ais:0101010101010101010101010101010101010101010101010101010101010101:0303030303030303030303030303030303030303030303030303030303030303",
			type: "AuditableItemStreamEntry",
			dateCreated: "2024-08-22T11:55:16.271Z",
			entryObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is an entry note 1"
			},
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			index: 0,
			proofId: "immutable-proof:0404040404040404040404040404040404040404040404040404040404040404"
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
				proofId: "immutable-proof:0202020202020202020202020202020202020202020202020202020202020202"
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
				proofId: "immutable-proof:0202020202020202020202020202020202020202020202020202020202020202"
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

		await waitForProofGeneration(2);

		await service.get(streamId, { includeEntries: true });

		const entries = await service.getEntries(streamId, { verifyEntries: true });

		expect(entries).toEqual({
			"@context": [
				"https://schema.twindev.org/ais/",
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.org/"
			],
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
					proofId:
						"immutable-proof:0404040404040404040404040404040404040404040404040404040404040404",
					verification: {
						type: "ImmutableProofVerification",
						verified: true
					},
					index: 0,
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
			"@context": [
				"https://schema.twindev.org/ais/",
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.org/"
			],
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
					index: 1,
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				}
			]
		});
	});
});
