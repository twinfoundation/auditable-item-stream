// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IValidationFailure } from "@gtsc/core";
import { DataTypeHelper } from "@gtsc/data-core";
import { JsonLdDataTypes } from "@gtsc/data-json-ld";
import { AuditableItemStreamDataTypes } from "../../src/dataTypes/auditableItemStreamDataTypes";
import { AuditableItemStreamTypes } from "../../src/models/auditableItemStreamTypes";

describe("AuditableItemStreamDataTypes", () => {
	beforeAll(async () => {
		JsonLdDataTypes.registerTypes();
		AuditableItemStreamDataTypes.registerTypes();
	});

	test("Can validate an empty stream", async () => {
		const validationFailures: IValidationFailure[] = [];
		const isValid = await DataTypeHelper.validate(
			"",
			AuditableItemStreamTypes.Stream,
			{
				id: "foo",
				created: 1234567890,
				immutableInterval: 10,
				signature: "foo",
				hash: "bar",
				nodeIdentity: "node",
				userIdentity: "user"
			},
			validationFailures
		);
		expect(validationFailures.length).toEqual(0);
		expect(isValid).toEqual(true);
	});
});
