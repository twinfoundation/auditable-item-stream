// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { SortDirection } from "@gtsc/entity";
import type { MimeTypes } from "@gtsc/web";

/**
 * Get the a list of the streams.
 */
export interface IAuditableItemStreamListRequest {
	/**
	 * The headers which can be used to determine the response data type.
	 */
	headers?: {
		// False positive
		// eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents
		Accept: typeof MimeTypes.Json | typeof MimeTypes.JsonLd;
	};

	/**
	 * The query parameters.
	 */
	query?: {
		/**
		 * The conditions to filter the streams, consist of property|comparison|value comma separated.
		 */
		conditions?: string;

		/**
		 * The order for the results, default to created.
		 */
		orderBy?: "created" | "updated";

		/**
		 * The direction for the order, defaults to desc.
		 */
		orderByDirection?: SortDirection;

		/**
		 * The properties to return as a comma separated list, defaults to "id,metadata".
		 */
		properties?: string;

		/**
		 * The optional cursor to get next chunk.
		 */
		cursor?: string;

		/**
		 * The maximum number of entities in a page.
		 */
		pageSize?: number;
	};
}
