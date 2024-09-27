// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { AuditableItemStreamTypes } from "./auditableItemStreamTypes";
import type { AuditableItemStreamVerificationState } from "./auditableItemStreamVerificationState";

/**
 * Interface describing an auditable item stream verification.
 */
export interface IAuditableItemStreamVerification {
	[id: string]: unknown;

	/**
	 * JSON-LD Context.
	 */
	"@context":
		| typeof AuditableItemStreamTypes.ContextRoot
		| [typeof AuditableItemStreamTypes.ContextRoot, ...string[]];

	/**
	 * JSON-LD Type.
	 */
	type: typeof AuditableItemStreamTypes.Verification;

	/**
	 * The id, only used if the verification if for an entry.
	 */
	id?: string;

	/**
	 * The state of the verification.
	 */
	state: AuditableItemStreamVerificationState;
}
