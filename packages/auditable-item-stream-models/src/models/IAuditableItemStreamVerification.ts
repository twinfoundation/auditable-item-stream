// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { AuditableItemStreamVerificationState } from "./auditableItemStreamVerificationState";

/**
 * Interface describing an auditable item stream verification.
 */
export interface IAuditableItemStreamVerification {
	[id: string]: unknown;

	/**
	 * The id if used for an entry.
	 */
	id?: string;

	/**
	 * The state of the verification.
	 */
	state: AuditableItemStreamVerificationState;
}
