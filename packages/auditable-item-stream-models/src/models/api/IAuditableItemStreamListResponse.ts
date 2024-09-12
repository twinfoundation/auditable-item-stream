// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdDocument } from "@gtsc/data-json-ld";
import type { HeaderTypes, MimeTypes } from "@gtsc/web";
import type { IAuditableItemStream } from "../IAuditableItemStream";

/**
 * The response to getting the a list of the streams.
 */
export interface IAuditableItemStreamListResponse {
	/**
	 * The headers which can be used to determine the response data type.
	 */
	headers?: {
		// False positive
		// eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents
		[HeaderTypes.ContentType]: typeof MimeTypes.Json | typeof MimeTypes.JsonLd;
	};

	/**
	 * The response payload.
	 */
	body: {
		/**
		 * The entities, which can be partial if a limited keys list was provided.
		 */
		entities: (Partial<Omit<IAuditableItemStream, "entries">> | IJsonLdDocument)[];

		/**
		 * An optional cursor, when defined can be used to call find to get more entities.
		 */
		cursor?: string;
	};
}
