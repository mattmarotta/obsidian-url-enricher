import type { RequestUrlResponse } from '../mocks/obsidian';

export function createMockResponse(overrides?: Partial<RequestUrlResponse>): RequestUrlResponse {
	return {
		status: 200,
		text: '',
		headers: {},
		...overrides
	};
}

export function createMockHtmlResponse(html: string, status: number = 200): RequestUrlResponse {
	return createMockResponse({
		status,
		text: html,
		headers: {
			'content-type': 'text/html; charset=utf-8'
		}
	});
}

export function createMockJsonResponse(data: any, status: number = 200): RequestUrlResponse {
	return createMockResponse({
		status,
		text: JSON.stringify(data),
		headers: {
			'content-type': 'application/json'
		},
		json: async () => data
	});
}

export function createMock404Response(): RequestUrlResponse {
	return createMockResponse({
		status: 404,
		text: '<html><body>Not Found</body></html>',
		headers: {
			'content-type': 'text/html'
		}
	});
}

export function createMock403Response(): RequestUrlResponse {
	return createMockResponse({
		status: 403,
		text: '<html><body>Forbidden</body></html>',
		headers: {
			'content-type': 'text/html'
		}
	});
}

export function createMock500Response(): RequestUrlResponse {
	return createMockResponse({
		status: 500,
		text: '<html><body>Internal Server Error</body></html>',
		headers: {
			'content-type': 'text/html'
		}
	});
}

export function createNetworkError(message: string = 'Network error'): Error {
	const error = new Error(message);
	error.name = 'NetworkError';
	return error;
}

export function createTimeoutError(): Error {
	const error = new Error('Request timed out after 5000ms');
	error.name = 'TimeoutError';
	return error;
}
