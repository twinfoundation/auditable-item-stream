// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { AuditableItemStreamTypes } from "./auditableItemStreamTypes";
import type { IAuditableItemStreamEntry } from "./IAuditableItemStreamEntry";

/**
 * Interface describing an auditable item stream entries list.
 */
export interface IAuditableItemStreamEntryList {
	/**
	 * JSON-LD Context.
	 */
	"@context":
		| typeof AuditableItemStreamTypes.ContextRoot
		| [typeof AuditableItemStreamTypes.ContextRoot, ...string[]];

	/**
	 * JSON-LD Type.
	 */
	type: typeof AuditableItemStreamTypes.StreamEntryList;

	/**
	 * The entries in the stream.
	 */
	entries: IAuditableItemStreamEntry[];

	/**
	 * Cursor for the next chunk of entries.
	 */
	cursor?: string;
}
