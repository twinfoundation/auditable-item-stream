// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { MimeTypes } from "@gtsc/web";

/**
 * Get an entry in the auditable item stream.
 */
export interface IAuditableItemStreamGetEntryRequest {
	/**
	 * The headers which can be used to determine the response data type.
	 */
	headers?: {
		// False positive
		// eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents
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
