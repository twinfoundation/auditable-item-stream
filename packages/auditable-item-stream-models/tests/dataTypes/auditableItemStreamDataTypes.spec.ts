// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IValidationFailure } from "@twin.org/core";
import { DataTypeHelper } from "@twin.org/data-core";
import { JsonLdDataTypes } from "@twin.org/data-json-ld";
import { AuditableItemStreamDataTypes } from "../../src/dataTypes/auditableItemStreamDataTypes";
import { AuditableItemStreamTypes } from "../../src/models/auditableItemStreamTypes";

describe("AuditableItemStreamDataTypes", () => {
	beforeAll(async () => {
		JsonLdDataTypes.registerTypes();
		AuditableItemStreamDataTypes.registerTypes();
	});

	test("Can fail to validate an empty stream", async () => {
		const validationFailures: IValidationFailure[] = [];
		const isValid = await DataTypeHelper.validate(
			"",
			AuditableItemStreamTypes.Stream,
			{
				id: "foo",
				dateCreated: new Date().toISOString(),
				immutableInterval: 10,
				nodeIdentity: "node",
				userIdentity: "user"
			},
			validationFailures
		);
		expect(validationFailures.length).toEqual(1);
		expect(isValid).toEqual(false);
	});

	test("Can validate an empty stream", async () => {
		const validationFailures: IValidationFailure[] = [];
		const isValid = await DataTypeHelper.validate(
			"",
			AuditableItemStreamTypes.Stream,
			{
				"@context": [
					AuditableItemStreamTypes.ContextRoot,
					AuditableItemStreamTypes.ContextRootCommon
				],
				type: AuditableItemStreamTypes.Stream,
				id: "foo",
				dateCreated: new Date().toISOString(),
				immutableInterval: 10,
				nodeIdentity: "node",
				userIdentity: "user",
				proofId: "1111"
			},
			validationFailures
		);
		expect(validationFailures.length).toEqual(0);
		expect(isValid).toEqual(true);
	});
});
