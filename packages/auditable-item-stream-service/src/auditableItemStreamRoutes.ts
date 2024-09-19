// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type {
	ICreatedResponse,
	IHttpRequestContext,
	INoContentResponse,
	INotFoundResponse,
	IRestRoute,
	ITag
} from "@twin.org/api-models";
import type {
	IAuditableItemStream,
	IAuditableItemStreamComponent,
	IAuditableItemStreamCreateEntryRequest,
	IAuditableItemStreamCreateRequest,
	IAuditableItemStreamDeleteEntryRequest,
	IAuditableItemStreamGetEntryRequest,
	IAuditableItemStreamGetEntryResponse,
	IAuditableItemStreamGetRequest,
	IAuditableItemStreamGetResponse,
	IAuditableItemStreamListEntriesRequest,
	IAuditableItemStreamListEntriesResponse,
	IAuditableItemStreamListRequest,
	IAuditableItemStreamListResponse,
	IAuditableItemStreamUpdateEntryRequest,
	IAuditableItemStreamUpdateRequest
} from "@twin.org/auditable-item-stream-models";
import { ComponentFactory, Guards } from "@twin.org/core";
import type { ComparisonOperator, IComparator } from "@twin.org/entity";
import { nameof } from "@twin.org/nameof";
import { HeaderTypes, HttpStatusCode, MimeTypes } from "@twin.org/web";

/**
 * The source used when communicating about these routes.
 */
const ROUTES_SOURCE = "auditableItemStreamRoutes";

/**
 * The tag to associate with the routes.
 */
export const tagsAuditableItemStream: ITag[] = [
	{
		name: "Auditable Item Stream",
		description: "Endpoints which are modelled to access an auditable item stream contract."
	}
];

/**
 * The REST routes for auditable item stream.
 * @param baseRouteName Prefix to prepend to the paths.
 * @param componentName The name of the component to use in the routes stored in the ComponentFactory.
 * @returns The generated routes.
 */
export function generateRestRoutesAuditableItemStream(
	baseRouteName: string,
	componentName: string
): IRestRoute[] {
	const createRoute: IRestRoute<IAuditableItemStreamCreateRequest, ICreatedResponse> = {
		operationId: "auditableItemStreamCreate",
		summary: "Create a new stream",
		tag: tagsAuditableItemStream[0].name,
		method: "POST",
		path: `${baseRouteName}/`,
		handler: async (httpRequestContext, request) =>
			auditableItemStreamCreate(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemStreamCreateRequest>(),
			examples: [
				{
					id: "auditableItemStreamCreateRequestExample",
					request: {
						body: {
							metadata: {
								"@context": "http://schema.org/",
								"@type": "Note",
								content: "This is a simple note"
							},
							entries: [
								{
									object: {
										"@context": "http://schema.org/",
										"@type": "Event",
										startDate: "2011-04-09T20:00:00Z",
										description: "A description of the event"
									}
								}
							]
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<ICreatedResponse>(),
				examples: [
					{
						id: "auditableItemStreamCreateResponseExample",
						description: "The response when a new stream is created.",
						response: {
							statusCode: HttpStatusCode.created,
							headers: {
								Location: "ais:1234567890"
							}
						}
					}
				]
			}
		]
	};

	const getRoute: IRestRoute<IAuditableItemStreamGetRequest, IAuditableItemStreamGetResponse> = {
		operationId: "auditableItemStreamGet",
		summary: "Get a stream",
		tag: tagsAuditableItemStream[0].name,
		method: "GET",
		path: `${baseRouteName}/:id`,
		handler: async (httpRequestContext, request) =>
			auditableItemStreamGet(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemStreamGetRequest>(),
			examples: [
				{
					id: "auditableItemStreamGetRequestExample",
					request: {
						headers: {
							Accept: MimeTypes.Json
						},
						pathParams: {
							id: "ais:1234567890"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IAuditableItemStreamGetResponse>(),
				examples: [
					{
						id: "auditableItemStreamGetResponseExample",
						response: {
							body: {
								id: "ais:1234567890",
								created: 1234567890,
								updated: 1234567890,
								metadata: {
									"@context": "http://schema.org/",
									"@type": "Note",
									content: "This is a simple note"
								},
								entries: [
									{
										id: "tst:1234567890",
										created: 1234567890,
										metadata: {
											"@context": "http://schema.org/",
											"@type": "Event",
											startDate: "2011-04-09T20:00:00Z",
											description: "A description of the event"
										}
									}
								]
							}
						}
					}
				]
			},
			{
				type: nameof<IAuditableItemStreamGetResponse>(),
				mimeType: MimeTypes.JsonLd,
				examples: [
					{
						id: "auditableItemStreamJsonLdGetResponseExample",
						response: {
							headers: {
								[HeaderTypes.ContentType]: MimeTypes.JsonLd
							},
							body: {
								"@context": "https://schema.twindev.org/ais/",
								"@type": "stream",
								id: "ais:1234567890",
								created: "2024-08-22T11:55:16.271Z",
								updated: "2024-08-22T11:55:16.271Z",
								metadata: {
									"@context": "http://schema.org/",
									"@type": "Note",
									content: "This is a simple note"
								},
								entries: [
									{
										"@type": "entry",
										created: "2024-08-22T11:55:16.271Z",
										id: "tst:1234567890",
										metadata: {
											"@context": "http://schema.org/",
											"@type": "Event",
											startDate: "2011-04-09T20:00:00Z",
											description: "A description of the event"
										}
									}
								]
							}
						}
					}
				]
			},
			{
				type: nameof<INotFoundResponse>()
			}
		]
	};

	const updateRoute: IRestRoute<IAuditableItemStreamUpdateRequest, INoContentResponse> = {
		operationId: "auditableItemStreamUpdate",
		summary: "Update a stream",
		tag: tagsAuditableItemStream[0].name,
		method: "PUT",
		path: `${baseRouteName}/:id`,
		handler: async (httpRequestContext, request) =>
			auditableItemStreamUpdate(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemStreamUpdateRequest>(),
			examples: [
				{
					id: "auditableItemStreamUpdateRequestExample",
					request: {
						pathParams: {
							id: "ais:1234567890"
						},
						body: {
							metadata: {
								"@context": "http://schema.org/",
								"@type": "Note",
								content: "This is a simple note"
							}
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<INoContentResponse>()
			},
			{
				type: nameof<INotFoundResponse>()
			}
		]
	};

	const listRoute: IRestRoute<IAuditableItemStreamListRequest, IAuditableItemStreamListResponse> = {
		operationId: "auditableItemStreamList",
		summary: "Query streams",
		tag: tagsAuditableItemStream[0].name,
		method: "GET",
		path: `${baseRouteName}/`,
		handler: async (httpRequestContext, request) =>
			auditableItemStreamList(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemStreamListRequest>(),
			examples: [
				{
					id: "IAuditableItemStreamListAllRequest",
					request: {}
				}
			]
		},
		responseType: [
			{
				type: nameof<IAuditableItemStreamListResponse>(),
				examples: [
					{
						id: "auditableItemStreamListResponseExample",
						response: {
							body: {
								entities: [
									{
										id: "0101010101010101010101010101010101010101010101010101010101010101",
										entries: [
											{
												id: "foo4",
												created: 1234567890
											}
										]
									}
								],
								cursor: "1"
							}
						}
					}
				]
			},
			{
				type: nameof<IAuditableItemStreamListResponse>(),
				mimeType: MimeTypes.JsonLd,
				examples: [
					{
						id: "auditableItemStreamJsonLdListResponseExample",
						response: {
							headers: {
								[HeaderTypes.ContentType]: MimeTypes.JsonLd
							},
							body: {
								"@context": "https://schema.twindev.org/ais/",
								"@graph": [
									{
										"@type": "entry",
										created: "2024-08-22T11:55:16.271Z",
										id: "tst:1234567890",
										metadata: {
											"@type": "http://schema.org/#Event",
											startDate: "2011-04-09T20:00:00Z",
											description: "A description of the event"
										}
									}
								]
							}
						}
					}
				]
			},
			{
				type: nameof<INotFoundResponse>()
			}
		]
	};

	const createEntryRoute: IRestRoute<IAuditableItemStreamCreateEntryRequest, ICreatedResponse> = {
		operationId: "auditableItemStreamCreateEntry",
		summary: "Create a new stream entry",
		tag: tagsAuditableItemStream[0].name,
		method: "POST",
		path: `${baseRouteName}/:id`,
		handler: async (httpRequestContext, request) =>
			auditableItemStreamCreateEntry(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemStreamCreateEntryRequest>(),
			examples: [
				{
					id: "auditableItemStreamCreateEntryRequestExample",
					request: {
						pathParams: {
							id: "ais:1234567890"
						},
						body: {
							object: {
								"@context": "http://schema.org/",
								"@type": "Event",
								startDate: "2011-04-09T20:00:00Z",
								description: "A description of the event"
							}
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<ICreatedResponse>(),
				examples: [
					{
						id: "auditableItemStreamCreateEntryResponseExample",
						description: "The response when a new stream entry is created.",
						response: {
							statusCode: HttpStatusCode.created,
							headers: {
								Location: "ais:1234567890:01010101010"
							}
						}
					}
				]
			}
		]
	};

	const deleteEntryRoute: IRestRoute<IAuditableItemStreamDeleteEntryRequest, INoContentResponse> = {
		operationId: "auditableItemStreamDeleteEntry",
		summary: "Delete an entry from the stream",
		tag: tagsAuditableItemStream[0].name,
		method: "DELETE",
		path: `${baseRouteName}/:id/:entryId`,
		handler: async (httpRequestContext, request) =>
			auditableItemStreamDeleteEntry(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemStreamGetRequest>(),
			examples: [
				{
					id: "auditableItemStreamDeleteEntryRequestExample",
					request: {
						pathParams: {
							id: "ais:1234567890",
							entryId: "ais:1234567890:01010101010"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<INoContentResponse>()
			},
			{
				type: nameof<INotFoundResponse>()
			}
		]
	};

	const updateEntryRoute: IRestRoute<IAuditableItemStreamUpdateEntryRequest, INoContentResponse> = {
		operationId: "auditableItemStreamUpdateEntry",
		summary: "Update a stream entry",
		tag: tagsAuditableItemStream[0].name,
		method: "PUT",
		path: `${baseRouteName}/:id/:entryId`,
		handler: async (httpRequestContext, request) =>
			auditableItemStreamUpdateEntry(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemStreamUpdateRequest>(),
			examples: [
				{
					id: "auditableItemStreamUpdateRequestExample",
					request: {
						pathParams: {
							id: "ais:1234567890",
							entryId: "ais:1234567890:01010101010"
						},
						body: {
							object: {
								"@context": "http://schema.org/",
								"@type": "Note",
								content: "This is a simple note"
							}
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<INoContentResponse>()
			},
			{
				type: nameof<INotFoundResponse>()
			}
		]
	};

	const getEntryRoute: IRestRoute<
		IAuditableItemStreamGetEntryRequest,
		IAuditableItemStreamGetEntryResponse
	> = {
		operationId: "auditableItemStreamGetEntry",
		summary: "Get a stream entry",
		tag: tagsAuditableItemStream[0].name,
		method: "GET",
		path: `${baseRouteName}/:id/:entryId`,
		handler: async (httpRequestContext, request) =>
			auditableItemStreamGetEntry(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemStreamGetEntryRequest>(),
			examples: [
				{
					id: "auditableItemStreamGetRequestExample",
					request: {
						pathParams: {
							id: "ais:1234567890",
							entryId: "ais:1234567890:01010101010"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IAuditableItemStreamGetEntryResponse>(),
				examples: [
					{
						id: "auditableItemStreamGetEntryResponseExample",
						response: {
							body: {
								id: "tst:1234567890",
								created: 1234567890,
								metadata: {
									"@context": "http://schema.org/",
									"@type": "Event",
									startDate: "2011-04-09T20:00:00Z",
									description: "A description of the event"
								}
							}
						}
					}
				]
			},
			{
				type: nameof<IAuditableItemStreamGetEntryResponse>(),
				mimeType: MimeTypes.JsonLd,
				examples: [
					{
						id: "auditableItemStreamJsonLdGetEntryResponseExample",
						response: {
							headers: {
								[HeaderTypes.ContentType]: MimeTypes.JsonLd
							},
							body: {
								"@context": "https://schema.twindev.org/ais/",
								"@type": "entry",
								created: "2024-08-22T11:55:16.271Z",
								id: "tst:1234567890",
								metadata: {
									"@context": "http://schema.org/",
									"@type": "Event",
									startDate: "2011-04-09T20:00:00Z",
									description: "A description of the event"
								}
							}
						}
					}
				]
			},
			{
				type: nameof<INotFoundResponse>()
			}
		]
	};

	const listEntriesRoute: IRestRoute<
		IAuditableItemStreamListEntriesRequest,
		IAuditableItemStreamListEntriesResponse
	> = {
		operationId: "auditableItemStreamListEntries",
		summary: "Get the entries in a stream",
		tag: tagsAuditableItemStream[0].name,
		method: "GET",
		path: `${baseRouteName}/:id/entries`,
		handler: async (httpRequestContext, request) =>
			auditableItemStreamListEntries(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemStreamListEntriesRequest>(),
			examples: [
				{
					id: "IAuditableItemStreamListAllRequest",
					request: {
						pathParams: {
							id: "ais:1234567890"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IAuditableItemStreamListEntriesResponse>(),
				examples: [
					{
						id: "auditableItemStreamListEntriesResponseExample",
						response: {
							body: {
								entries: [
									{
										id: "tst:1234567890",
										created: 1234567890,
										metadata: {
											"@context": "http://schema.org/",
											"@type": "Event",
											startDate: "2011-04-09T20:00:00Z",
											description: "A description of the event"
										}
									}
								]
							}
						}
					}
				]
			},
			{
				type: nameof<IAuditableItemStreamListEntriesResponse>(),
				mimeType: MimeTypes.JsonLd,
				examples: [
					{
						id: "auditableItemStreamJsonLdListEntriesResponseExample",
						response: {
							headers: {
								[HeaderTypes.ContentType]: MimeTypes.JsonLd
							},
							body: {
								"@context": "https://schema.twindev.org/ais/",
								"@graph": [
									{
										"@type": "entry",
										created: "2024-08-22T11:55:16.271Z",
										id: "tst:1234567890",
										metadata: {
											"@type": "http://schema.org/#Event",
											startDate: "2011-04-09T20:00:00Z",
											description: "A description of the event"
										}
									}
								]
							}
						}
					}
				]
			},
			{
				type: nameof<INotFoundResponse>()
			}
		]
	};

	return [
		createRoute,
		getRoute,
		updateRoute,
		listRoute,
		createEntryRoute,
		getEntryRoute,
		deleteEntryRoute,
		updateEntryRoute,
		listEntriesRoute
	];
}

/**
 * Create the stream.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemStreamCreate(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemStreamCreateRequest
): Promise<ICreatedResponse> {
	Guards.object<IAuditableItemStreamCreateRequest>(ROUTES_SOURCE, nameof(request), request);

	const component = ComponentFactory.get<IAuditableItemStreamComponent>(componentName);
	const id = await component.create(
		request.body?.metadata,
		request.body?.entries,
		{
			immutableInterval: request.body?.immutableInterval
		},
		httpRequestContext.userIdentity,
		httpRequestContext.nodeIdentity
	);
	return {
		statusCode: HttpStatusCode.created,
		headers: {
			Location: id
		}
	};
}

/**
 * Get the stream.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemStreamGet(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemStreamGetRequest
): Promise<IAuditableItemStreamGetResponse> {
	Guards.object<IAuditableItemStreamGetRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditableItemStreamGetRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);

	const mimeType = request.headers?.Accept === MimeTypes.JsonLd ? "jsonld" : "json";

	const component = ComponentFactory.get<IAuditableItemStreamComponent>(componentName);
	const result = await component.get(
		request.pathParams.id,
		{
			includeEntries: request.query?.includeEntries,
			includeDeleted: request.query?.includeDeleted,
			verifyStream: request.query?.verifyStream,
			verifyEntries: request.query?.verifyEntries
		},
		mimeType
	);

	return {
		headers: {
			[HeaderTypes.ContentType]: mimeType === "json" ? MimeTypes.Json : MimeTypes.JsonLd
		},
		body: result
	};
}

/**
 * Update the stream.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemStreamUpdate(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemStreamUpdateRequest
): Promise<INoContentResponse> {
	Guards.object<IAuditableItemStreamUpdateRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditableItemStreamUpdateRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);

	const component = ComponentFactory.get<IAuditableItemStreamComponent>(componentName);
	await component.update(
		request.pathParams.id,
		request.body?.metadata,
		httpRequestContext.userIdentity,
		httpRequestContext.nodeIdentity
	);
	return {
		statusCode: HttpStatusCode.noContent
	};
}

/**
 * Query the stream.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemStreamList(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemStreamListRequest
): Promise<IAuditableItemStreamListResponse> {
	Guards.object<IAuditableItemStreamListRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditableItemStreamListRequest["query"]>(
		ROUTES_SOURCE,
		nameof(request.query),
		request.query
	);

	const component = ComponentFactory.get<IAuditableItemStreamComponent>(componentName);

	const mimeType = request.headers?.Accept === MimeTypes.JsonLd ? "jsonld" : "json";

	const result = await component.query(
		convertConditionsQueryString(request.query?.conditions),
		request.query?.orderBy,
		request.query?.orderByDirection,
		convertPropertiesQueryString(request.query?.properties),
		request.query?.cursor,
		request.query?.pageSize,
		mimeType
	);

	return {
		headers: {
			[HeaderTypes.ContentType]: mimeType === "json" ? MimeTypes.Json : MimeTypes.JsonLd
		},
		body: result
	};
}

/**
 * Create the stream entry.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemStreamCreateEntry(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemStreamCreateEntryRequest
): Promise<ICreatedResponse> {
	Guards.object<IAuditableItemStreamCreateEntryRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditableItemStreamCreateEntryRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.object<IAuditableItemStreamCreateEntryRequest["body"]>(
		ROUTES_SOURCE,
		nameof(request.body),
		request.body
	);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);
	Guards.objectValue(ROUTES_SOURCE, nameof(request.body.object), request.body.object);

	const component = ComponentFactory.get<IAuditableItemStreamComponent>(componentName);
	const id = await component.createEntry(
		request.pathParams.id,
		request.body.object,
		httpRequestContext.userIdentity,
		httpRequestContext.nodeIdentity
	);
	return {
		statusCode: HttpStatusCode.created,
		headers: {
			Location: id
		}
	};
}

/**
 * Get the stream.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemStreamDeleteEntry(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemStreamDeleteEntryRequest
): Promise<INoContentResponse> {
	Guards.object<IAuditableItemStreamDeleteEntryRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditableItemStreamDeleteEntryRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.entryId), request.pathParams.entryId);

	const component = ComponentFactory.get<IAuditableItemStreamComponent>(componentName);
	await component.removeEntry(
		request.pathParams.id,
		request.pathParams.entryId,
		httpRequestContext.userIdentity,
		httpRequestContext.nodeIdentity
	);

	return {
		statusCode: HttpStatusCode.noContent
	};
}

/**
 * Update the stream entry.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemStreamUpdateEntry(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemStreamUpdateEntryRequest
): Promise<INoContentResponse> {
	Guards.object<IAuditableItemStreamUpdateEntryRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditableItemStreamUpdateEntryRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.objectValue<IAuditableItemStreamUpdateEntryRequest["body"]>(
		ROUTES_SOURCE,
		nameof(request.body),
		request.body
	);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.entryId), request.pathParams.entryId);
	Guards.objectValue(ROUTES_SOURCE, nameof(request.body.object), request.body.object);

	const component = ComponentFactory.get<IAuditableItemStreamComponent>(componentName);
	await component.updateEntry(
		request.pathParams.id,
		request.pathParams.entryId,
		request.body.object,
		httpRequestContext.userIdentity,
		httpRequestContext.nodeIdentity
	);
	return {
		statusCode: HttpStatusCode.noContent
	};
}

/**
 * Get a stream entry.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemStreamGetEntry(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemStreamGetEntryRequest
): Promise<IAuditableItemStreamGetEntryResponse> {
	Guards.object<IAuditableItemStreamGetEntryRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditableItemStreamGetEntryRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.entryId), request.pathParams.entryId);

	const mimeType = request.headers?.Accept === MimeTypes.JsonLd ? "jsonld" : "json";

	const component = ComponentFactory.get<IAuditableItemStreamComponent>(componentName);
	const result = await component.getEntry(
		request.pathParams.id,
		request.pathParams.entryId,
		{
			verifyEntry: request.query?.verifyEntry
		},
		mimeType
	);

	return {
		headers: {
			[HeaderTypes.ContentType]: mimeType === "json" ? MimeTypes.Json : MimeTypes.JsonLd
		},
		body: result
	};
}

/**
 * Query the stream.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemStreamListEntries(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemStreamListEntriesRequest
): Promise<IAuditableItemStreamListEntriesResponse> {
	Guards.object<IAuditableItemStreamListEntriesRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditableItemStreamListEntriesRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);

	const component = ComponentFactory.get<IAuditableItemStreamComponent>(componentName);

	const mimeType = request.headers?.Accept === MimeTypes.JsonLd ? "jsonld" : "json";

	const result = await component.getEntries(
		request.pathParams.id,
		{
			conditions: convertConditionsQueryString(request.query?.conditions),
			includeDeleted: request.query?.includeDeleted,
			verifyEntries: request.query?.verifyEntries,
			order: request.query?.order,
			pageSize: request.query?.pageSize,
			cursor: request.query?.cursor
		},
		mimeType
	);

	return {
		headers: {
			[HeaderTypes.ContentType]: mimeType === "json" ? MimeTypes.Json : MimeTypes.JsonLd
		},
		body: result
	};
}

/**
 * Convert property names query to array.
 * @param properties The properties query string.
 * @returns The array of properties.
 */
function convertPropertiesQueryString(properties?: string): (keyof IAuditableItemStream)[] {
	return properties?.split(",") as (keyof IAuditableItemStream)[];
}

/**
 * Convert the conditions query string to a list of comparators.
 * @param conditions The conditions query string.
 * @returns The list of comparators.
 * @internal
 */
function convertConditionsQueryString(conditions?: string): IComparator[] | undefined {
	const conditionParts = conditions?.split(",") ?? [];
	const conditionsList: IComparator[] = [];

	for (const conditionPart of conditionParts) {
		const parts = conditionPart.split("|");
		if (parts.length === 3) {
			conditionsList.push({
				property: parts[0],
				comparison: parts[1] as ComparisonOperator,
				value: parts[2]
			});
		}
	}

	return conditionsList.length === 0 ? undefined : conditionsList;
}
