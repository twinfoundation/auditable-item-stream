// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdContextDefinitionElement, IJsonLdNodeObject } from "@twin.org/data-json-ld";
import type { SchemaOrgContexts, SchemaOrgTypes } from "@twin.org/standards-schema-org";
import type { AuditableItemStreamContexts } from "./auditableItemStreamContexts";

/**
 * Interface describing an auditable item stream entries object list.
 */
export interface IAuditableItemStreamEntryObjectList {
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
	 * The entry objects in the stream.
	 */
	[SchemaOrgTypes.ItemListElement]: IJsonLdNodeObject[];

	/**
	 * Cursor for the next chunk of entry objects.
	 */
	[SchemaOrgTypes.NextItem]?: string;
}
