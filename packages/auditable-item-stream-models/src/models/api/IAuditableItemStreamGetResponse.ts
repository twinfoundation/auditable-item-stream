// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdDocument } from "@gtsc/data-json-ld";
import type { HeaderTypes, MimeTypes } from "@gtsc/web";
import type { IAuditableItemStream } from "../IAuditableItemStream";
import type { IAuditableItemStreamVerification } from "../IAuditableItemStreamVerification";

/**
 * Response to getting an auditable item stream.
 */
export interface IAuditableItemStreamGetResponse {
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
		| (IAuditableItemStream & {
				/**
				 * Cursor to retrieve the next chunk of data, can be used with the get entries method.
				 */
				cursor?: string;

				/**
				 * The verification of the stream.
				 */
				verification?: IAuditableItemStreamVerification;

				/**
				 * The verification of the stream entries.
				 */
				entriesVerification?: IAuditableItemStreamVerification[];
		  });
}
