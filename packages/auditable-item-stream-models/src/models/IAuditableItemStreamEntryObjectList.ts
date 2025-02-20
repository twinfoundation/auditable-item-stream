// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdContextDefinitionElement, IJsonLdNodeObject } from "@twin.org/data-json-ld";
import type { AuditableItemStreamTypes } from "./auditableItemStreamTypes";

/**
 * Interface describing an auditable item stream entries object list.
 */
export interface IAuditableItemStreamEntryObjectList {
	/**
	 * JSON-LD Context.
	 */
	"@context": [
		typeof AuditableItemStreamTypes.ContextRoot,
		typeof AuditableItemStreamTypes.ContextRootCommon,
		...IJsonLdContextDefinitionElement[]
	];

	/**
	 * JSON-LD Type.
	 */
	type: typeof AuditableItemStreamTypes.StreamEntryObjectList;

	/**
	 * The entry objects in the stream.
	 */
	entryObjects: IJsonLdNodeObject[];

	/**
	 * Cursor for the next chunk of entry objects.
	 */
	cursor?: string;
}
