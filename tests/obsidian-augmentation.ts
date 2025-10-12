import type { RequestUrlParams, RequestUrlResponse } from "./stubs/obsidian";

declare module "obsidian" {
	// Augment the testing build with a helper for swapping the requestUrl mock.
	function __setRequestUrlMock(
		mock: ((params: RequestUrlParams) => Promise<RequestUrlResponse> | RequestUrlResponse) | null,
	): void;
}

export {};
