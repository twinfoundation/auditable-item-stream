// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdDocument } from "@twin.org/data-json-ld";
import type { HeaderTypes, MimeTypes } from "@twin.org/web";
import type { IAuditableItemStreamEntry } from "../IAuditableItemStreamEntry";
import type { IAuditableItemStreamVerification } from "../IAuditableItemStreamVerification";

/**
 * Response to getting an auditable item stream entries.
 */
export interface IAuditableItemStreamListEntriesResponse {
	/**
	 * The headers which can be used to determine the response data type.
	 */
	headers?: {
		[HeaderTypes.ContentType]: typeof MimeTypes.Json | typeof MimeTypes.JsonLd;
	};

	/**
	 * The response body, if accept header is set to application/ld+json the return object is JSON-LD document.
	 */
	body:
		| IJsonLdDocument
		| {
				/**
				 * The entries.
				 */
				entries: IAuditableItemStreamEntry[];

				/**
				 * Cursor to retrieve the next chunk of data.
				 */
				cursor?: string;

				/**
				 * The verification states for the entries.
				 */
				verificationEntries?: IAuditableItemStreamVerification[];
		  };
}
