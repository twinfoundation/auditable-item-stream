// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdContextDefinitionElement } from "@twin.org/data-json-ld";
import type { SchemaOrgContexts, SchemaOrgTypes } from "@twin.org/standards-schema-org";
import type { AuditableItemStreamContexts } from "./auditableItemStreamContexts";
import type { IAuditableItemStreamEntry } from "./IAuditableItemStreamEntry";

/**
 * Interface describing an auditable item stream entries list.
 */
export interface IAuditableItemStreamEntryList {
	/**
	 * JSON-LD Context.
	 */
	"@context": [
		typeof SchemaOrgContexts.ContextRoot,
		typeof AuditableItemStreamContexts.ContextRoot,
		typeof AuditableItemStreamContexts.ContextRootCommon,
		...IJsonLdContextDefinitionElement[]
	];

	/**
	 * JSON-LD Type.
	 */
	type: typeof SchemaOrgTypes.ItemList;

	/**
	 * The entries in the stream.
	 */
	[SchemaOrgTypes.ItemListElement]: IAuditableItemStreamEntry[];

	/**
	 * Cursor for the next chunk of entries.
	 */
	[SchemaOrgTypes.NextItem]?: string;
}
