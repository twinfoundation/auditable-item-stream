// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { HeaderTypes, MimeTypes } from "@twin.org/web";

/**
 * Get an entry in the auditable item stream.
 */
export interface IAuditableItemStreamGetEntryRequest {
	/**
	 * The headers which can be used to determine the response data type.
	 */
	headers?: {
		[HeaderTypes.Accept]: typeof MimeTypes.Json | typeof MimeTypes.JsonLd;
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

	/**
	 * The query parameters.
	 */
	query?: {
		/**
		 * Verify the entry, defaults to false.
		 */
		verifyEntry?: boolean;
	};
}
