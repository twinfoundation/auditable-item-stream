// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { AuditableItemStreamClient } from "../src/auditableItemStreamClient";

describe("AuditableItemStreamClient", () => {
	test("Can create an instance", async () => {
		const client = new AuditableItemStreamClient({ endpoint: "http://localhost:8080" });
		expect(client).toBeDefined();
	});
});
