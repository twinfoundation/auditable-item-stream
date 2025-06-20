// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { HeaderTypes, MimeTypes } from "@twin.org/web";

/**
 * Get an auditable item stream.
 */
export interface IAuditableItemStreamGetRequest {
	/**
	 * The headers which can be used to determine the response data type.
	 */
	headers?: {
		[HeaderTypes.Accept]: typeof MimeTypes.Json | typeof MimeTypes.JsonLd;
	};

	/**
	 * The parameters from the path.
	 */
	pathParams: {
		/**
		 * The id of the stream to get.
		 */
		id: string;
	};

	/**
	 * The parameters from the query.
	 */
	query?: {
		/**
		 * Whether to include the entries, defaults to false.
		 * The entries will be limited to the first page of entries in date descending order.
		 * If you want to get more entries you can use the returned cursor with the get entries method.
		 */
		includeEntries?: boolean | string;

		/**
		 * Whether to include deleted entries, defaults to false.
		 */
		includeDeleted?: boolean | string;

		/**
		 * Should the stream be verified, defaults to false.
		 */
		verifyStream?: boolean | string;

		/**
		 * Should the entries be verified, defaults to false.
		 */
		verifyEntries?: boolean | string;
	};
}
