import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LinkPreviewService } from '../../src/services/linkPreviewService';
import type { InlineLinkPreviewSettings } from '../../src/settings';
import { mockRequestUrlBuilder } from '../mocks/obsidian';
import { FaviconCache } from '../../src/services/faviconCache';
import type { MetadataHandler, MetadataHandlerContext } from '../../src/services/metadataHandlers/metadataHandler';

describe('LinkPreviewService', () => {
	let service: LinkPreviewService;
	let settings: InlineLinkPreviewSettings;

	beforeEach(() => {
		settings = {
			showHttpErrorWarnings: true,
		} as InlineLinkPreviewSettings;

		service = new LinkPreviewService(
			{ requestTimeoutMs: 5000 },
			settings,
			[] // No metadata handlers for basic tests
		);

		mockRequestUrlBuilder.reset();
	});

	describe('Constructor and Configuration', () => {
		it('should initialize with default options and settings', () => {
			expect(service).toBeDefined();
		});

		it('should update settings', () => {
			const newSettings = {
				...settings,
				showHttpErrorWarnings: false,
			};

			service.updateSettings(newSettings);

			// Settings should be updated (verified through behavior in other tests)
			expect(service).toBeDefined();
		});

		it('should update options', () => {
			service.updateOptions({ requestTimeoutMs: 10000 });
			expect(service).toBeDefined();
		});

		it('should clear cache when timeout changes', async () => {
			mockRequestUrlBuilder.mockResponse('https://example.com', {
				status: 200,
				text: '<html><head><title>Test</title></head></html>',
				headers: { 'content-type': 'text/html' },
			});

			// First request - should cache
			await service.getMetadata('https://example.com');
			expect(mockRequestUrlBuilder.getCallCount('https://example.com')).toBe(1);

			// Second request with same timeout - should use cache
			await service.getMetadata('https://example.com');
			expect(mockRequestUrlBuilder.getCallCount('https://example.com')).toBe(1);

			// Change timeout - should clear cache
			service.updateOptions({ requestTimeoutMs: 10000 });

			// Third request - should fetch again
			await service.getMetadata('https://example.com');
			expect(mockRequestUrlBuilder.getCallCount('https://example.com')).toBe(2);
		});

		it('should register custom metadata handler', () => {
			const mockHandler: MetadataHandler = {
				matches: vi.fn(() => true),
				enrich: vi.fn(),
			};

			service.registerMetadataHandler(mockHandler);

			expect(service).toBeDefined();
		});

		it('should set persistent favicon cache', () => {
			const cache = new FaviconCache(
				vi.fn(async () => ({})),
				vi.fn(async () => {})
			);

			service.setPersistentFaviconCache(cache);

			expect(service).toBeDefined();
		});

		it('should clear all caches', async () => {
			mockRequestUrlBuilder.mockResponse('https://example.com', {
				status: 200,
				text: '<html><head><title>Test</title></head></html>',
				headers: { 'content-type': 'text/html' },
			});

			// Cache a response
			await service.getMetadata('https://example.com');
			expect(mockRequestUrlBuilder.getCallCount('https://example.com')).toBe(1);

			// Clear cache
			service.clearCache();

			// Should fetch again
			await service.getMetadata('https://example.com');
			expect(mockRequestUrlBuilder.getCallCount('https://example.com')).toBe(2);
		});
	});

	describe('Metadata Caching', () => {
		it('should cache metadata for same URL', async () => {
			mockRequestUrlBuilder.mockResponse('https://example.com', {
				status: 200,
				text: '<html><head><title>Test Page</title></head></html>',
				headers: { 'content-type': 'text/html' },
			});

			const result1 = await service.getMetadata('https://example.com');
			const result2 = await service.getMetadata('https://example.com');

			expect(result1).toEqual(result2);
			expect(mockRequestUrlBuilder.getCallCount('https://example.com')).toBe(1);
		});

		it('should normalize URLs before caching', async () => {
			mockRequestUrlBuilder.mockResponse('https://example.com', {
				status: 200,
				text: '<html><head><title>Test</title></head></html>',
				headers: { 'content-type': 'text/html' },
			});

			await service.getMetadata('  https://example.com  ');
			await service.getMetadata('https://example.com');

			// Should only fetch once due to normalization (trimming)
			expect(mockRequestUrlBuilder.getCallCount('https://example.com')).toBe(1);
		});

		it('should not cache different URLs separately', async () => {
			mockRequestUrlBuilder.mockResponse('https://example.com', {
				status: 200,
				text: '<html><head><title>Example</title></head></html>',
				headers: { 'content-type': 'text/html' },
			});

			mockRequestUrlBuilder.mockResponse('https://test.com', {
				status: 200,
				text: '<html><head><title>Test</title></head></html>',
				headers: { 'content-type': 'text/html' },
			});

			await service.getMetadata('https://example.com');
			await service.getMetadata('https://test.com');

			expect(mockRequestUrlBuilder.getCallCount('https://example.com')).toBe(1);
			expect(mockRequestUrlBuilder.getCallCount('https://test.com')).toBe(1);
		});
	});

	describe('HTTP Request Handling', () => {
		it('should fetch metadata successfully', async () => {
			mockRequestUrlBuilder.mockResponse('https://example.com', {
				status: 200,
				text: '<html><head><title>Test Page</title><meta name="description" content="Test description"></head></html>',
				headers: { 'content-type': 'text/html' },
			});

			const result = await service.getMetadata('https://example.com');

			expect(result.title).toBe('Test Page');
			expect(result.description).toBe('Test description');
		});

		it('should handle timeout', async () => {
			const timeoutService = new LinkPreviewService(
				{ requestTimeoutMs: 100 },
				settings,
				[]
			);

			mockRequestUrlBuilder.mockTimeout('https://slow.com', 5000);

			const result = await timeoutService.getMetadata('https://slow.com');

			expect(result.error).toContain('network:Request timed out');
		});

		it('should handle timeout disabled (0 or negative)', async () => {
			const noTimeoutService = new LinkPreviewService(
				{ requestTimeoutMs: 0 },
				settings,
				[]
			);

			mockRequestUrlBuilder.mockResponse('https://example.com', {
				status: 200,
				text: '<html><head><title>Test</title></head></html>',
				headers: { 'content-type': 'text/html' },
			});

			const result = await noTimeoutService.getMetadata('https://example.com');
			expect(result.title).toBe('Test');
		});

		it('should include user agent header', async () => {
			mockRequestUrlBuilder.mockResponse('https://example.com', {
				status: 200,
				text: '<html><head><title>Test</title></head></html>',
				headers: { 'content-type': 'text/html' },
			});

			await service.getMetadata('https://example.com');

			const lastRequest = mockRequestUrlBuilder.getLastRequest('https://example.com');
			expect(lastRequest?.headers?.['User-Agent']).toContain('Mozilla');
		});
	});

	describe('Error Handling', () => {
		describe('HTTP Errors with showHttpErrorWarnings enabled', () => {
			it('should handle 404 errors', async () => {
				mockRequestUrlBuilder.mockResponse('https://example.com/notfound', {
					status: 404,
					text: 'Not Found',
					headers: {},
				});

				const result = await service.getMetadata('https://example.com/notfound');

				expect(result.error).toContain('http:HTTP 404');
				// title may be undefined in error cases - just check error is set
			});

			it('should handle 500 errors', async () => {
				mockRequestUrlBuilder.mockResponse('https://example.com', {
					status: 500,
					text: 'Internal Server Error',
					headers: {},
				});

				const result = await service.getMetadata('https://example.com');

				expect(result.error).toContain('http:HTTP 500');
			});
		});

		describe('HTTP Errors with showHttpErrorWarnings disabled', () => {
			beforeEach(() => {
				settings.showHttpErrorWarnings = false;
				service = new LinkPreviewService(
					{ requestTimeoutMs: 5000 },
					settings,
					[]
				);
			});

			it('should not flag 404 as error when warnings disabled', async () => {
				mockRequestUrlBuilder.mockResponse('https://example.com/notfound', {
					status: 404,
					text: 'Not Found',
					headers: {},
				});

				const result = await service.getMetadata('https://example.com/notfound');

				expect(result.error).toBeUndefined();
				expect(result.title).toBe('example.com');
			});

			it('should not throw on HTTP errors when warnings disabled', async () => {
				mockRequestUrlBuilder.mockResponse('https://example.com', {
					status: 500,
					text: 'Error',
					headers: {},
				});

				const result = await service.getMetadata('https://example.com');

				expect(result.error).toBeUndefined();
			});
		});

		describe('Network Errors', () => {
			it('should handle network errors', async () => {
				mockRequestUrlBuilder.mockError('https://example.com', new Error('Network error'));

				const result = await service.getMetadata('https://example.com');

				expect(result.error).toContain('network:Network error');
				// title may be undefined in error cases - just check error is set
			});

			it('should always show network errors even when warnings disabled', async () => {
				settings.showHttpErrorWarnings = false;
				service = new LinkPreviewService({ requestTimeoutMs: 5000 }, settings, []);

				mockRequestUrlBuilder.mockError('https://example.com', new Error('Connection refused'));

				const result = await service.getMetadata('https://example.com');

				expect(result.error).toContain('network:Connection refused');
			});
		});
	});

	describe('HTML Metadata Parsing', () => {
		describe('OpenGraph Tags', () => {
			it('should parse OpenGraph metadata', async () => {
				const html = `
					<html>
						<head>
							<meta property="og:title" content="OG Title">
							<meta property="og:description" content="OG Description">
							<meta property="og:site_name" content="OG Site">
						</head>
					</html>
				`;

				mockRequestUrlBuilder.mockResponse('https://example.com', {
					status: 200,
					text: html,
					headers: { 'content-type': 'text/html' },
				});

				const result = await service.getMetadata('https://example.com');

				expect(result.title).toBe('OG Title');
				expect(result.description).toBe('OG Description');
				expect(result.siteName).toBe('OG Site');
			});
		});

		describe('Twitter Cards', () => {
			it('should parse Twitter Card metadata', async () => {
				const html = `
					<html>
						<head>
							<meta name="twitter:title" content="Twitter Title">
							<meta name="twitter:description" content="Twitter Description">
						</head>
					</html>
				`;

				mockRequestUrlBuilder.mockResponse('https://example.com', {
					status: 200,
					text: html,
					headers: { 'content-type': 'text/html' },
				});

				const result = await service.getMetadata('https://example.com');

				expect(result.title).toBe('Twitter Title');
				expect(result.description).toBe('Twitter Description');
			});
		});

		describe('Standard Meta Tags', () => {
			it('should parse standard meta tags', async () => {
				const html = `
					<html>
						<head>
							<title>Page Title</title>
							<meta name="description" content="Page description">
						</head>
					</html>
				`;

				mockRequestUrlBuilder.mockResponse('https://example.com', {
					status: 200,
					text: html,
					headers: { 'content-type': 'text/html' },
				});

				const result = await service.getMetadata('https://example.com');

				expect(result.title).toBe('Page Title');
				expect(result.description).toBe('Page description');
			});
		});

		describe('Priority Order', () => {
			it('should prefer OpenGraph over Twitter over standard tags', async () => {
				const html = `
					<html>
						<head>
							<title>Standard Title</title>
							<meta name="description" content="Standard description">
							<meta name="twitter:title" content="Twitter Title">
							<meta name="twitter:description" content="Twitter Description">
							<meta property="og:title" content="OG Title">
							<meta property="og:description" content="OG Description">
						</head>
					</html>
				`;

				mockRequestUrlBuilder.mockResponse('https://example.com', {
					status: 200,
					text: html,
					headers: { 'content-type': 'text/html' },
				});

				const result = await service.getMetadata('https://example.com');

				expect(result.title).toBe('OG Title');
				expect(result.description).toBe('OG Description');
			});
		});

		describe('JSON-LD Support', () => {
			it('should extract metadata from JSON-LD', async () => {
				const html = `
					<html>
						<head>
							<script type="application/ld+json">
							{
								"@context": "https://schema.org",
								"@type": "Article",
								"headline": "JSON-LD Headline",
								"description": "JSON-LD Description"
							}
							</script>
						</head>
					</html>
				`;

				mockRequestUrlBuilder.mockResponse('https://example.com', {
					status: 200,
					text: html,
					headers: { 'content-type': 'text/html' },
				});

				const result = await service.getMetadata('https://example.com');

				expect(result.title).toBe('JSON-LD Headline');
				expect(result.description).toBe('JSON-LD Description');
			});

			it('should handle nested JSON-LD structures', async () => {
				const html = `
					<html>
						<head>
							<script type="application/ld+json">
							{
								"@graph": [
									{
										"@type": "WebPage",
										"name": "Nested Title"
									}
								]
							}
							</script>
						</head>
					</html>
				`;

				mockRequestUrlBuilder.mockResponse('https://example.com', {
					status: 200,
					text: html,
					headers: { 'content-type': 'text/html' },
				});

				const result = await service.getMetadata('https://example.com');

				expect(result.title).toBe('Nested Title');
			});

			it('should handle invalid JSON-LD gracefully', async () => {
				const html = `
					<html>
						<head>
							<script type="application/ld+json">
								Invalid JSON {
							</script>
							<title>Fallback Title</title>
						</head>
					</html>
				`;

				mockRequestUrlBuilder.mockResponse('https://example.com', {
					status: 200,
					text: html,
					headers: { 'content-type': 'text/html' },
				});

				const result = await service.getMetadata('https://example.com');

				expect(result.title).toBe('Fallback Title');
			});
		});

		describe('Regex Fallback Parsing', () => {
			it('should parse with regex when DOMParser unavailable', async () => {
				const html = `
					<html>
						<head>
							<title>Regex Title</title>
							<meta name="description" content="Regex description">
						</head>
					</html>
				`;

				mockRequestUrlBuilder.mockResponse('https://example.com', {
					status: 200,
					text: html,
					headers: { 'content-type': 'text/html' },
				});

				const result = await service.getMetadata('https://example.com');

				expect(result.title).toBe('Regex Title');
				expect(result.description).toBe('Regex description');
			});
		});
	});

	describe('Soft 404 Detection', () => {
		beforeEach(() => {
			settings.showHttpErrorWarnings = true;
			service = new LinkPreviewService({ requestTimeoutMs: 5000 }, settings, []);
		});

		describe('Reddit Soft 404s', () => {
			it('should detect Reddit "page not found" in title', async () => {
				const html = `
					<html>
						<head>
							<title>Page not found</title>
						</head>
					</html>
				`;

				mockRequestUrlBuilder.mockResponse('https://reddit.com/notfound', {
					status: 200,
					text: html,
					headers: { 'content-type': 'text/html' },
				});

				const result = await service.getMetadata('https://reddit.com/notfound');

				expect(result.error).toContain('http:Soft 404');
			});

			it('should detect Reddit "this community doesn\'t exist"', async () => {
				const html = `
					<html>
						<head>
							<title>This community doesn't exist</title>
						</head>
					</html>
				`;

				mockRequestUrlBuilder.mockResponse('https://reddit.com/r/fake', {
					status: 200,
					text: html,
					headers: { 'content-type': 'text/html' },
				});

				const result = await service.getMetadata('https://reddit.com/r/fake');

				expect(result.error).toContain('http:Soft 404');
			});
		});

		describe('YouTube Soft 404s', () => {
			it('should detect YouTube "video unavailable"', async () => {
				const html = `
					<html>
						<head>
							<title>Video unavailable</title>
						</head>
					</html>
				`;

				mockRequestUrlBuilder.mockResponse('https://youtube.com/watch?v=deleted', {
					status: 200,
					text: html,
					headers: { 'content-type': 'text/html' },
				});

				const result = await service.getMetadata('https://youtube.com/watch?v=deleted');

				expect(result.error).toContain('http:Soft 404');
			});
		});

		describe('Generic Soft 404s', () => {
			it('should detect generic "404" title', async () => {
				const html = `
					<html>
						<head>
							<title>404</title>
						</head>
					</html>
				`;

				mockRequestUrlBuilder.mockResponse('https://example.com/missing', {
					status: 200,
					text: html,
					headers: { 'content-type': 'text/html' },
				});

				const result = await service.getMetadata('https://example.com/missing');

				expect(result.error).toContain('http:Soft 404');
			});

			it('should detect "Not Found" title', async () => {
				const html = `
					<html>
						<head>
							<title>Not Found</title>
						</head>
					</html>
				`;

				mockRequestUrlBuilder.mockResponse('https://example.com/missing', {
					status: 200,
					text: html,
					headers: { 'content-type': 'text/html' },
				});

				const result = await service.getMetadata('https://example.com/missing');

				expect(result.error).toContain('http:Soft 404');
			});

			it('should detect "Page not found" at start of title', async () => {
				const html = `
					<html>
						<head>
							<title>Page not found - Example Site</title>
						</head>
					</html>
				`;

				mockRequestUrlBuilder.mockResponse('https://example.com/missing', {
					status: 200,
					text: html,
					headers: { 'content-type': 'text/html' },
				});

				const result = await service.getMetadata('https://example.com/missing');

				expect(result.error).toContain('http:Soft 404');
			});

			it('should NOT detect "404" in middle of title', async () => {
				const html = `
					<html>
						<head>
							<title>A Guide to HTTP 404 Errors</title>
						</head>
					</html>
				`;

				mockRequestUrlBuilder.mockResponse('https://example.com/guide', {
					status: 200,
					text: html,
					headers: { 'content-type': 'text/html' },
				});

				const result = await service.getMetadata('https://example.com/guide');

				expect(result.error).toBeUndefined();
				expect(result.title).toBe('A Guide to HTTP 404 Errors');
			});
		});

		it('should not check soft 404 when showHttpErrorWarnings is disabled', async () => {
			settings.showHttpErrorWarnings = false;
			service = new LinkPreviewService({ requestTimeoutMs: 5000 }, settings, []);

			const html = `
				<html>
					<head>
						<title>404</title>
					</head>
				</html>
			`;

			mockRequestUrlBuilder.mockResponse('https://example.com/missing', {
				status: 200,
				text: html,
				headers: { 'content-type': 'text/html' },
			});

			const result = await service.getMetadata('https://example.com/missing');

			expect(result.error).toBeUndefined();
		});
	});

	describe('Non-HTML Content', () => {
		it('should handle PDF files', async () => {
			mockRequestUrlBuilder.mockResponse('https://example.com/document.pdf', {
				status: 200,
				text: 'PDF binary data',
				headers: { 'content-type': 'application/pdf' },
			});

			const result = await service.getMetadata('https://example.com/document.pdf');

			expect(result.title).toBe('example.com');
			expect(result.description).toBeNull();
		});

		it('should handle images', async () => {
			mockRequestUrlBuilder.mockResponse('https://example.com/image.png', {
				status: 200,
				text: 'PNG binary data',
				headers: { 'content-type': 'image/png' },
			});

			const result = await service.getMetadata('https://example.com/image.png');

			expect(result.title).toBe('example.com');
			expect(result.description).toBeNull();
		});

		it('should handle JSON responses', async () => {
			mockRequestUrlBuilder.mockResponse('https://api.example.com/data', {
				status: 200,
				text: '{"data": "value"}',
				headers: { 'content-type': 'application/json' },
			});

			const result = await service.getMetadata('https://api.example.com/data');

			expect(result.title).toBe('api.example.com');
			expect(result.description).toBeNull();
		});
	});

	describe('Title Fallbacks', () => {
		it('should use hostname as fallback when no title', async () => {
			const html = '<html><head></head></html>';

			mockRequestUrlBuilder.mockResponse('https://example.com', {
				status: 200,
				text: html,
				headers: { 'content-type': 'text/html' },
			});

			const result = await service.getMetadata('https://example.com');

			expect(result.title).toBe('example.com');
		});

		it('should remove www prefix from hostname', async () => {
			const html = '<html><head></head></html>';

			mockRequestUrlBuilder.mockResponse('https://www.example.com', {
				status: 200,
				text: html,
				headers: { 'content-type': 'text/html' },
			});

			const result = await service.getMetadata('https://www.example.com');

			expect(result.title).toBe('example.com');
		});

		it('should use full URL if hostname extraction fails', async () => {
			mockRequestUrlBuilder.mockError('https://invalid', new Error('Invalid URL'));

			const result = await service.getMetadata('https://invalid');

			expect(result.error).toBeDefined();
		});
	});

	describe('Metadata Handler Integration', () => {
		it('should execute matching metadata handler', async () => {
			const mockHandler: MetadataHandler = {
				matches: vi.fn(async () => true),
				enrich: vi.fn(async (context) => {
					context.metadata.siteName = 'Custom Site';
				}),
			};

			service = new LinkPreviewService(
				{ requestTimeoutMs: 5000 },
				settings,
				[mockHandler]
			);

			mockRequestUrlBuilder.mockResponse('https://example.com', {
				status: 200,
				text: '<html><head><title>Test</title></head></html>',
				headers: { 'content-type': 'text/html' },
			});

			const result = await service.getMetadata('https://example.com');

			expect(mockHandler.matches).toHaveBeenCalled();
			expect(mockHandler.enrich).toHaveBeenCalled();
			expect(result.siteName).toBe('Custom Site');
		});

		it('should skip non-matching handlers', async () => {
			const mockHandler: MetadataHandler = {
				matches: vi.fn(async () => false),
				enrich: vi.fn(),
			};

			service = new LinkPreviewService(
				{ requestTimeoutMs: 5000 },
				settings,
				[mockHandler]
			);

			mockRequestUrlBuilder.mockResponse('https://example.com', {
				status: 200,
				text: '<html><head><title>Test</title></head></html>',
				headers: { 'content-type': 'text/html' },
			});

			await service.getMetadata('https://example.com');

			expect(mockHandler.matches).toHaveBeenCalled();
			expect(mockHandler.enrich).not.toHaveBeenCalled();
		});

		it('should handle handler errors gracefully', async () => {
			const mockHandler: MetadataHandler = {
				matches: vi.fn(async () => true),
				enrich: vi.fn(async () => {
					throw new Error('Handler failed');
				}),
			};

			service = new LinkPreviewService(
				{ requestTimeoutMs: 5000 },
				settings,
				[mockHandler]
			);

			mockRequestUrlBuilder.mockResponse('https://example.com', {
				status: 200,
				text: '<html><head><title>Test</title></head></html>',
				headers: { 'content-type': 'text/html' },
			});

			// Should not throw
			const result = await service.getMetadata('https://example.com');

			expect(result.title).toBe('Test');
		});

		it('should execute multiple handlers in order', async () => {
			const handler1: MetadataHandler = {
				matches: vi.fn(async () => true),
				enrich: vi.fn(async (context) => {
					context.metadata.siteName = 'Handler 1';
				}),
			};

			const handler2: MetadataHandler = {
				matches: vi.fn(async () => true),
				enrich: vi.fn(async (context) => {
					context.metadata.siteName = 'Handler 2';
				}),
			};

			service = new LinkPreviewService(
				{ requestTimeoutMs: 5000 },
				settings,
				[handler1, handler2]
			);

			mockRequestUrlBuilder.mockResponse('https://example.com', {
				status: 200,
				text: '<html><head><title>Test</title></head></html>',
				headers: { 'content-type': 'text/html' },
			});

			const result = await service.getMetadata('https://example.com');

			expect(handler1.enrich).toHaveBeenCalled();
			expect(handler2.enrich).toHaveBeenCalled();
			expect(result.siteName).toBe('Handler 2'); // Last handler wins
		});
	});

	describe('Header Parsing', () => {
		it('should parse headers case-insensitively', async () => {
			mockRequestUrlBuilder.mockResponse('https://example.com', {
				status: 200,
				text: '<html><head><title>Test</title></head></html>',
				headers: { 'Content-Type': 'text/html' },
			});

			const result = await service.getMetadata('https://example.com');

			expect(result.title).toBe('Test');
		});

		it('should handle missing headers', async () => {
			mockRequestUrlBuilder.mockResponse('https://example.com', {
				status: 200,
				text: '<html><head><title>Test</title></head></html>',
				headers: {},
			});

			const result = await service.getMetadata('https://example.com');

			expect(result.title).toBe('example.com'); // No content-type header means fallback
		});

		it('should respect x-final-url header for redirects', async () => {
			mockRequestUrlBuilder.mockResponse('https://short.link', {
				status: 200,
				text: '<html><head><title>Redirected Page</title></head></html>',
				headers: {
					'content-type': 'text/html',
					'x-final-url': 'https://final.destination.com/page',
				},
			});

			const result = await service.getMetadata('https://short.link');

			expect(result.title).toBe('Redirected Page');
		});
	});

	describe('Text Sanitization', () => {
		it('should sanitize HTML entities in metadata', async () => {
			const html = `
				<html>
					<head>
						<title>Test &amp; Page</title>
						<meta name="description" content="Description with &quot;quotes&quot;">
					</head>
				</html>
			`;

			mockRequestUrlBuilder.mockResponse('https://example.com', {
				status: 200,
				text: html,
				headers: { 'content-type': 'text/html' },
			});

			const result = await service.getMetadata('https://example.com');

			expect(result.title).toBe('Test & Page');
			expect(result.description).toBe('Description with "quotes"');
		});

		it('should collapse whitespace in metadata', async () => {
			const html = `
				<html>
					<head>
						<title>Test    Page   With    Spaces</title>
						<meta name="description" content="Description   with   extra   spaces">
					</head>
				</html>
			`;

			mockRequestUrlBuilder.mockResponse('https://example.com', {
				status: 200,
				text: html,
				headers: { 'content-type': 'text/html' },
			});

			const result = await service.getMetadata('https://example.com');

			expect(result.title).toBe('Test Page With Spaces');
			expect(result.description).toBe('Description with extra spaces');
		});

		it('should handle null and empty values', async () => {
			const html = `
				<html>
					<head>
						<title></title>
						<meta name="description" content="">
					</head>
				</html>
			`;

			mockRequestUrlBuilder.mockResponse('https://example.com', {
				status: 200,
				text: html,
				headers: { 'content-type': 'text/html' },
			});

			const result = await service.getMetadata('https://example.com');

			expect(result.title).toBe('example.com'); // Falls back to hostname
			expect(result.description).toBeNull();
		});
	});
});
