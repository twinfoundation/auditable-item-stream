// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { RandomHelper } from "@gtsc/core";
import { MemoryEntityStorageConnector } from "@gtsc/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@gtsc/entity-storage-models";
import {
	EntityStorageImmutableStorageConnector,
	type ImmutableItem,
	initSchema as initSchemaImmutableStorage
} from "@gtsc/immutable-storage-connector-entity-storage";
import { ImmutableStorageConnectorFactory } from "@gtsc/immutable-storage-models";
import { nameof } from "@gtsc/nameof";
import { setupTestEnv } from "./setupTestEnv";
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
			.mockImplementation(length => new Uint8Array(length).fill(5));
	});

	test("Can create an instance", async () => {
		const service = new AuditableItemStreamService();
		expect(service).toBeDefined();
	});
});
