// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { MimeTypes } from "@twin.org/web";

/**
 * Get an entry object in the auditable item stream.
 */
export interface IAuditableItemStreamGetEntryObjectRequest {
	/**
	 * The headers which can be used to determine the response data type.
	 */
	headers?: {
		Accept: typeof MimeTypes.Json | typeof MimeTypes.JsonLd;
	};

	/**
	 * The path parameters.
	 */
	pathParams: {
		/**
		 * The id of the stream to update the get in.
		 */
		id: string;

		/**
		 * The id of the entry to update.
		 */
		entryId: string;
	};
}
