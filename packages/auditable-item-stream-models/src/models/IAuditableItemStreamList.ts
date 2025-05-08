// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdContextDefinitionElement } from "@twin.org/data-json-ld";
import type { SchemaOrgContexts, SchemaOrgTypes } from "@twin.org/standards-schema-org";
import type { AuditableItemStreamContexts } from "./auditableItemStreamContexts";
import type { IAuditableItemStream } from "./IAuditableItemStream";

/**
 * Interface describing an auditable item stream list.
 */
export interface IAuditableItemStreamList {
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
	 * The item streams.
	 */
	[SchemaOrgTypes.ItemListElement]: IAuditableItemStream[];

	/**
	 * Cursor for the next chunk of streams.
	 */
	[SchemaOrgTypes.NextItem]?: string;
}
