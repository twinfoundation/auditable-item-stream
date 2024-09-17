// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The state of the verification.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const AuditableItemStreamVerificationState = {
	/**
	 * OK.
	 */
	Ok: "ok",

	/**
	 * The stored hash does not matched the calculated one.
	 */
	HashMismatch: "hashMismatch",

	/**
	 * The signature verification failed.
	 */
	SignatureNotVerified: "signatureNotVerified",

	/**
	 * The credential in the immutable storage was revoked.
	 */
	CredentialRevoked: "credentialRevoked",

	/**
	 * Immutable hash mismatch.
	 */
	ImmutableHashMismatch: "immutableHashMismatch",

	/**
	 * Immutable signature mismatch.
	 */
	ImmutableSignatureMismatch: "immutableSignatureMismatch",

	/**
	 * Index mismatch.
	 */
	IndexMismatch: "indexMismatch"
} as const;

/**
 * The state of the verification.
 */
export type AuditableItemStreamVerificationState =
	(typeof AuditableItemStreamVerificationState)[keyof typeof AuditableItemStreamVerificationState];
