// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdNodeObject } from "@twin.org/data-json-ld";

/**
 * Update an auditable item stream.
 */
export interface IAuditableItemStreamUpdateRequest {
	/**
	 * The path parameters.
	 */
	pathParams: {
		/**
		 * The id of the stream to update.
		 */
		id: string;
	};

	/**
	 * The data to be used in the stream.
	 */
	body: {
		/**
		 * The object to be used in the stream as JSON-LD.
		 */
		annotationObject?: IJsonLdNodeObject;
	};
}
