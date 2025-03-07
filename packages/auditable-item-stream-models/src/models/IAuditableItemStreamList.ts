// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdContextDefinitionElement } from "@twin.org/data-json-ld";
import type { AuditableItemStreamContexts } from "./auditableItemStreamContexts";
import type { AuditableItemStreamTypes } from "./auditableItemStreamTypes";
import type { IAuditableItemStream } from "./IAuditableItemStream";

/**
 * Interface describing an auditable item stream list.
 */
export interface IAuditableItemStreamList {
	/**
	 * JSON-LD Context.
	 */
	"@context": [
		typeof AuditableItemStreamContexts.ContextRoot,
		typeof AuditableItemStreamContexts.ContextRootCommon,
		...IJsonLdContextDefinitionElement[]
	];

	/**
	 * JSON-LD Type.
	 */
	type: typeof AuditableItemStreamTypes.StreamList;

	/**
	 * The item streams.
	 */
	itemStreams: IAuditableItemStream[];

	/**
	 * Cursor for the next chunk of streams.
	 */
	cursor?: string;
}
