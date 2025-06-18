// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { DataTypeHandlerFactory, type IJsonSchema } from "@twin.org/data-core";
import { AuditableItemStreamContexts } from "../models/auditableItemStreamContexts";
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
		DataTypeHandlerFactory.register(
			`${AuditableItemStreamContexts.ContextRoot}${AuditableItemStreamTypes.Stream}`,
			() => ({
				context: AuditableItemStreamContexts.ContextRoot,
				type: AuditableItemStreamTypes.Stream,
				defaultValue: {},
				jsonSchema: async () => AuditableItemStreamSchema as IJsonSchema
			})
		);
		DataTypeHandlerFactory.register(
			`${AuditableItemStreamContexts.ContextRoot}${AuditableItemStreamTypes.StreamList}`,
			() => ({
				context: AuditableItemStreamContexts.ContextRoot,
				type: AuditableItemStreamTypes.StreamList,
				defaultValue: {},
				jsonSchema: async () => AuditableItemStreamListSchema as IJsonSchema
			})
		);
		DataTypeHandlerFactory.register(
			`${AuditableItemStreamContexts.ContextRoot}${AuditableItemStreamTypes.StreamEntry}`,
			() => ({
				context: AuditableItemStreamContexts.ContextRoot,
				type: AuditableItemStreamTypes.StreamEntry,
				defaultValue: {},
				jsonSchema: async () => AuditableItemStreamEntrySchema as IJsonSchema
			})
		);
		DataTypeHandlerFactory.register(
			`${AuditableItemStreamContexts.ContextRoot}${AuditableItemStreamTypes.StreamEntryList}`,
			() => ({
				context: AuditableItemStreamContexts.ContextRoot,
				type: AuditableItemStreamTypes.StreamEntryList,
				defaultValue: {},
				jsonSchema: async () => AuditableItemStreamEntryListSchema as IJsonSchema
			})
		);

		DataTypeHandlerFactory.register(
			`${AuditableItemStreamContexts.ContextRoot}${AuditableItemStreamTypes.StreamEntryObjectList}`,
			() => ({
				context: AuditableItemStreamContexts.ContextRoot,
				type: AuditableItemStreamTypes.StreamEntryObjectList,
				defaultValue: {},
				jsonSchema: async () => AuditableItemStreamEntryObjectListSchema as IJsonSchema
			})
		);
	}
}
