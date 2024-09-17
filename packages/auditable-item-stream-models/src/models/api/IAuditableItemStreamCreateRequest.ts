// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdNodeObject } from "@gtsc/data-json-ld";

/**
 * Create an auditable item stream.
 */
export interface IAuditableItemStreamCreateRequest {
	/**
	 * The data to be used in the stream.
	 */
	body?: {
		/**
		 * The metadata to be used in the stream as JSON-LD.
		 */
		metadata?: IJsonLdNodeObject;

		/**
		 * The entries for the stream.
		 */
		entries?: {
			object: IJsonLdNodeObject;
		}[];

		/**
		 * After how many entries do we add immutable checks, defaults to service configured value.
		 * A value of 0 will disable immutable checks, 1 will be every item, or any other integer for an interval.
		 */
		immutableInterval?: number;
	};
}
