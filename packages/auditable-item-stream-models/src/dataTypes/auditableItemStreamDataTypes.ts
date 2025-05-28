// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { DataTypeHandlerFactory } from "@twin.org/data-core";
import type { JSONSchema7 } from "json-schema";
import { AuditableItemStreamContexts } from "../models/auditableItemStreamContexts";
import { AuditableItemStreamTypes } from "../models/auditableItemStreamTypes";
import AuditableItemStreamSchema from "../schemas/AuditableItemStream.json";
import AuditableItemStreamEntrySchema from "../schemas/AuditableItemStreamEntry.json";

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
				jsonSchema: async () => AuditableItemStreamSchema as JSONSchema7
			})
		);
		DataTypeHandlerFactory.register(
			`${AuditableItemStreamContexts.ContextRoot}${AuditableItemStreamTypes.StreamEntry}`,
			() => ({
				context: AuditableItemStreamContexts.ContextRoot,
				type: AuditableItemStreamTypes.StreamEntry,
				defaultValue: {},
				jsonSchema: async () => AuditableItemStreamEntrySchema as JSONSchema7
			})
		);
	}
}
