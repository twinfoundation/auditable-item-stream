// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdNodeObject } from "@twin.org/data-json-ld";
import type { HeaderTypes, MimeTypes } from "@twin.org/web";

/**
 * Response to getting an auditable item stream entry object.
 */
export interface IAuditableItemStreamGetEntryObjectResponse {
	/**
	 * The headers which can be used to determine the response data type.
	 */
	headers?: {
		[HeaderTypes.ContentType]: typeof MimeTypes.Json | typeof MimeTypes.JsonLd;
	};

	/**
	 * The response body, if accept header is set to application/ld+json the return object is JSON-LD document.
	 */
	body: IJsonLdNodeObject;
}
