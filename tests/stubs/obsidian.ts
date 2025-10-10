export interface RequestUrlParams {
	url: string;
	method?: string;
	headers?: Record<string, string>;
}

export interface RequestUrlResponse {
	status: number;
	text: string;
	headers?: Record<string, string>;
}

type RequestUrlMock = (params: RequestUrlParams) => Promise<RequestUrlResponse> | RequestUrlResponse;

let requestUrlMock: RequestUrlMock | null = null;

export function __setRequestUrlMock(mock: RequestUrlMock | null): void {
	requestUrlMock = mock;
}

export async function requestUrl(params: RequestUrlParams): Promise<RequestUrlResponse> {
	if (!requestUrlMock) {
		throw new Error("requestUrl mock not configured.");
	}
	return await requestUrlMock(params);
}

export class Notice {
	// Minimal stub used only to satisfy imports during tests.
	message: string;

	constructor(message: string) {
		this.message = message;
	}
}
