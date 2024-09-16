// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { DataTypeHandlerFactory } from "@gtsc/data-core";
import type { JSONSchema7 } from "json-schema";
import { AuditableItemStreamTypes } from "../models/auditableItemStreamTypes";
import AuditableItemStreamSchema from "../schemas/AuditableItemStream.json";
import AuditableItemStreamCredentialSchema from "../schemas/AuditableItemStreamCredential.json";
import AuditableItemStreamEntrySchema from "../schemas/AuditableItemStreamEntry.json";
import AuditableItemStreamEntryCredentialSchema from "../schemas/AuditableItemStreamEntryCredential.json";

/**
 * Handle all the data types for auditable item stream.
 */
export class AuditableItemStreamDataTypes {
	/**
	 * Register all the data types.
	 */
	public static registerTypes(): void {
		DataTypeHandlerFactory.register(AuditableItemStreamTypes.Stream, () => ({
			type: AuditableItemStreamTypes.Stream,
			defaultValue: {},
			jsonSchema: async () => AuditableItemStreamSchema as JSONSchema7
		}));
		DataTypeHandlerFactory.register(AuditableItemStreamTypes.StreamCredential, () => ({
			type: AuditableItemStreamTypes.StreamCredential,
			defaultValue: {},
			jsonSchema: async () => AuditableItemStreamCredentialSchema as JSONSchema7
		}));
		DataTypeHandlerFactory.register(AuditableItemStreamTypes.StreamEntry, () => ({
			type: AuditableItemStreamTypes.StreamEntry,
			defaultValue: {},
			jsonSchema: async () => AuditableItemStreamEntrySchema as JSONSchema7
		}));
		DataTypeHandlerFactory.register(AuditableItemStreamTypes.StreamEntryCredential, () => ({
			type: AuditableItemStreamTypes.StreamEntryCredential,
			defaultValue: {},
			jsonSchema: async () => AuditableItemStreamEntryCredentialSchema as JSONSchema7
		}));
	}
}
