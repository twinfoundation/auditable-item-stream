// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { SortDirection } from "@twin.org/entity";
import type { HeaderTypes, MimeTypes } from "@twin.org/web";

/**
 * Get an auditable item stream entries.
 */
export interface IAuditableItemStreamListEntriesRequest {
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
	 * The query parameters.
	 */
	query?: {
		/**
		 * The conditions to filter the stream, JSON stringified IComparator[].
		 */
		conditions?: string;

		/**
		 * Whether to include deleted entries, defaults to false.
		 */
		includeDeleted?: boolean | string;

		/**
		 * Should the entries be verified, defaults to false.
		 */
		verifyEntries?: boolean | string;

		/**
		 * Retrieve the entries in ascending/descending time order, defaults to Ascending.
		 */
		order?: SortDirection;

		/**
		 * How many entries to return.
		 */
		pageSize?: boolean | string;

		/**
		 * Cursor to use for next chunk of data.
		 */
		cursor?: string;
	};
}
