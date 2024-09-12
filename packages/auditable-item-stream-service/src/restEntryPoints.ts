// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IRestRouteEntryPoint } from "@gtsc/api-models";
import {
	generateRestRoutesAuditableItemStream,
	tagsAuditableItemStream
} from "./auditableItemStreamRoutes";

export const restEntryPoints: IRestRouteEntryPoint[] = [
	{
		name: "auditable-item-stream",
		defaultBaseRoute: "auditable-item-stream",
		tags: tagsAuditableItemStream,
		generateRoutes: generateRestRoutesAuditableItemStream
	}
];
