// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { HeaderTypes, MimeTypes } from "@twin.org/web";
import type { IAuditableItemStreamList } from "../IAuditableItemStreamList";

/**
 * The response to getting the a list of the streams.
 */
export interface IAuditableItemStreamListResponse {
	/**
	 * The headers which can be used to determine the response data type.
	 */
	headers?: {
		[HeaderTypes.ContentType]: typeof MimeTypes.Json | typeof MimeTypes.JsonLd;
	};

	/**
	 * The response payload.
	 */
	body: IAuditableItemStreamList;
}
