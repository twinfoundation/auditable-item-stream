// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdDocument } from "@gtsc/data-json-ld";
import type { HeaderTypes, MimeTypes } from "@gtsc/web";
import type { IAuditableItemStreamEntry } from "../IAuditableItemStreamEntry";

/**
 * Response to getting an auditable item stream entries.
 */
export interface IAuditableItemStreamListEntriesResponse {
	/**
	 * The headers which can be used to determine the response data type.
	 */
	headers?: {
		// False positive
		// eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents
		[HeaderTypes.ContentType]: typeof MimeTypes.Json | typeof MimeTypes.JsonLd;
	};

	/**
	 * The response body, if accept header is set to application/ld+json the return object is JSON-LD document.
	 */
	body: {
		/**
		 * The entries.
		 */
		entries: IAuditableItemStreamEntry[] | IJsonLdDocument[];

		/**
		 * Cursor to retrieve the next chunk of data.
		 */
		cursor?: string;
	};
}
