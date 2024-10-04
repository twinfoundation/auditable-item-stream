// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { DataTypeHandlerFactory } from "@twin.org/data-core";
import type { JSONSchema7 } from "json-schema";
import { AuditableItemStreamTypes } from "../models/auditableItemStreamTypes";
import AuditableItemStreamSchema from "../schemas/AuditableItemStream.json";
import AuditableItemStreamEntrySchema from "../schemas/AuditableItemStreamEntry.json";
import AuditableItemStreamEntryListSchema from "../schemas/AuditableItemStreamEntryList.json";
import AuditableItemStreamEntryObjectListSchema from "../schemas/AuditableItemStreamEntryObjectList.json";
import AuditableItemStreamListSchema from "../schemas/AuditableItemStreamList.json";

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
		DataTypeHandlerFactory.register(AuditableItemStreamTypes.StreamList, () => ({
			type: AuditableItemStreamTypes.StreamList,
			defaultValue: {},
			jsonSchema: async () => AuditableItemStreamListSchema as JSONSchema7
		}));
		DataTypeHandlerFactory.register(AuditableItemStreamTypes.StreamEntry, () => ({
			type: AuditableItemStreamTypes.StreamEntry,
			defaultValue: {},
			jsonSchema: async () => AuditableItemStreamEntrySchema as JSONSchema7
		}));
		DataTypeHandlerFactory.register(AuditableItemStreamTypes.StreamEntryList, () => ({
			type: AuditableItemStreamTypes.StreamEntryList,
			defaultValue: {},
			jsonSchema: async () => AuditableItemStreamEntryListSchema as JSONSchema7
		}));
		DataTypeHandlerFactory.register(AuditableItemStreamTypes.StreamEntryObjectList, () => ({
			type: AuditableItemStreamTypes.StreamEntryObjectList,
			defaultValue: {},
			jsonSchema: async () => AuditableItemStreamEntryObjectListSchema as JSONSchema7
		}));
	}
}
