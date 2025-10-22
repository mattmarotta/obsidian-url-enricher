import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MetadataHandlerContext } from '../../src/services/metadataHandlers/metadataHandler';
import { WikipediaMetadataHandler } from '../../src/services/metadataHandlers/wikipediaMetadataHandler';
import { RedditMetadataHandler } from '../../src/services/metadataHandlers/redditMetadataHandler';
import { GoogleSearchMetadataHandler } from '../../src/services/metadataHandlers/googleSearchMetadataHandler';
import { TwitterMetadataHandler } from '../../src/services/metadataHandlers/twitterMetadataHandler';
import type { LinkMetadata } from '../../src/services/types';
import { DEFAULT_SETTINGS } from '../../src/settings';

// Helper to create a minimal MetadataHandlerContext for testing
function createMockContext(url: string, metadata: LinkMetadata, mockRequest: any): MetadataHandlerContext {
	const urlObj = new URL(url);
	return {
		originalUrl: url,
		url: urlObj,
		metadata,
		request: mockRequest,
		sanitizeText: (s: string | null | undefined) => s ?? null,
		settings: DEFAULT_SETTINGS,
	};
}

describe('Metadata Handlers', () => {
	describe('WikipediaMetadataHandler', () => {
		let handler: WikipediaMetadataHandler;
		let mockRequest: ReturnType<typeof vi.fn>;
		let context: MetadataHandlerContext;
		let metadata: LinkMetadata;

		beforeEach(() => {
			handler = new WikipediaMetadataHandler();
			mockRequest = vi.fn();
			metadata = {
				title: '',
				description: null,
				favicon: null,
				siteName: null,
			};
		});

		describe('matches', () => {
			it('should match wikipedia.org domains', () => {
				let ctx = createMockContext('https://en.wikipedia.org/wiki/Test', metadata, mockRequest);
				expect(handler.matches(ctx)).toBe(true);
			});

			it('should match all language variants of Wikipedia', () => {
				const ctx1 = createMockContext('https://fr.wikipedia.org/wiki/Test', metadata, mockRequest);
				expect(handler.matches(ctx1)).toBe(true);

				const ctx2 = createMockContext('https://ja.wikipedia.org/wiki/Test', metadata, mockRequest);
				expect(handler.matches(ctx2)).toBe(true);
			});

			it('should not match non-Wikipedia domains', () => {
				const ctx1 = createMockContext('https://example.com', metadata, mockRequest);
				expect(handler.matches(ctx1)).toBe(false);

				const ctx2 = createMockContext('https://wikipedia.com', metadata, mockRequest);
				expect(handler.matches(ctx2)).toBe(false);
			});
		});

		describe('enrich', () => {
			it('should set siteName to "Wikipedia"', async () => {
				const url = new URL('https://en.wikipedia.org/wiki/Test');
				context = {
				originalUrl: url.toString(),
				url,
				metadata,
				request: mockRequest,
				sanitizeText: (s: string | null | undefined) => s ?? null,
				settings: DEFAULT_SETTINGS,
			};

				await handler.enrich(context);

				expect(metadata.siteName).toBe('Wikipedia');
			});

			it('should not fetch if description already exists', async () => {
				metadata.description = 'Existing description';
				const url = new URL('https://en.wikipedia.org/wiki/Test');
				context = {
				originalUrl: url.toString(),
				url,
				metadata,
				request: mockRequest,
				sanitizeText: (s: string | null | undefined) => s ?? null,
				settings: DEFAULT_SETTINGS,
			};

				await handler.enrich(context);

				expect(mockRequest).not.toHaveBeenCalled();
			});

			it('should not fetch if URL path does not match /wiki/ pattern', async () => {
				const url = new URL('https://en.wikipedia.org/');
				context = {
				originalUrl: url.toString(),
				url,
				metadata,
				request: mockRequest,
				sanitizeText: (s: string | null | undefined) => s ?? null,
				settings: DEFAULT_SETTINGS,
			};

				await handler.enrich(context);

				expect(mockRequest).not.toHaveBeenCalled();
			});

			it('should fetch and set description from Wikipedia API', async () => {
				const url = new URL('https://en.wikipedia.org/wiki/TypeScript');
				mockRequest.mockResolvedValue({
					status: 200,
					text: JSON.stringify({
						query: {
							pages: {
								'12345': {
									extract: 'TypeScript is a programming language developed by Microsoft.',
								},
							},
						},
					}),
				});

				context = {
				originalUrl: url.toString(),
				url,
				metadata,
				request: mockRequest,
				sanitizeText: (s: string | null | undefined) => s ?? null,
				settings: DEFAULT_SETTINGS,
			};

				await handler.enrich(context);

				expect(mockRequest).toHaveBeenCalledWith(
					expect.objectContaining({
						url: expect.stringContaining('api.php'),
						method: 'GET',
					})
				);
				expect(metadata.description).toBe('TypeScript is a programming language developed by Microsoft.');
			});

			it('should handle URL-encoded article titles', async () => {
				const url = new URL('https://en.wikipedia.org/wiki/C%2B%2B');
				mockRequest.mockResolvedValue({
					status: 200,
					text: JSON.stringify({
						query: {
							pages: {
								'12345': {
									extract: 'C++ is a general-purpose programming language.',
								},
							},
						},
					}),
				});

				context = {
				originalUrl: url.toString(),
				url,
				metadata,
				request: mockRequest,
				sanitizeText: (s: string | null | undefined) => s ?? null,
				settings: DEFAULT_SETTINGS,
			};

				await handler.enrich(context);

				expect(mockRequest).toHaveBeenCalledWith(
					expect.objectContaining({
						url: expect.stringContaining('titles=C%2B%2B'),
					})
				);
			});

			it('should prefer extract over description', async () => {
				const url = new URL('https://en.wikipedia.org/wiki/Test');
				mockRequest.mockResolvedValue({
					status: 200,
					text: JSON.stringify({
						query: {
							pages: {
								'12345': {
									extract: 'Full extract text with more details.',
									description: 'Short description.',
								},
							},
						},
					}),
				});

				context = {
				originalUrl: url.toString(),
				url,
				metadata,
				request: mockRequest,
				sanitizeText: (s: string | null | undefined) => s ?? null,
				settings: DEFAULT_SETTINGS,
			};

				await handler.enrich(context);

				expect(metadata.description).toBe('Full extract text with more details.');
			});

			it('should use description if extract is missing', async () => {
				const url = new URL('https://en.wikipedia.org/wiki/Test');
				mockRequest.mockResolvedValue({
					status: 200,
					text: JSON.stringify({
						query: {
							pages: {
								'12345': {
									description: 'Short description.',
								},
							},
						},
					}),
				});

				context = {
				originalUrl: url.toString(),
				url,
				metadata,
				request: mockRequest,
				sanitizeText: (s: string | null | undefined) => s ?? null,
				settings: DEFAULT_SETTINGS,
			};

				await handler.enrich(context);

				expect(metadata.description).toBe('Short description.');
			});

			it('should handle HTTP errors gracefully', async () => {
				const url = new URL('https://en.wikipedia.org/wiki/Test');
				mockRequest.mockResolvedValue({
					status: 404,
					text: '',
				});

				context = {
				originalUrl: url.toString(),
				url,
				metadata,
				request: mockRequest,
				sanitizeText: (s: string | null | undefined) => s ?? null,
				settings: DEFAULT_SETTINGS,
			};

				await handler.enrich(context);

				expect(metadata.description).toBeNull();
			});

			it('should handle invalid JSON gracefully', async () => {
				const url = new URL('https://en.wikipedia.org/wiki/Test');
				mockRequest.mockResolvedValue({
					status: 200,
					text: 'Invalid JSON',
				});

				context = {
				originalUrl: url.toString(),
				url,
				metadata,
				request: mockRequest,
				sanitizeText: (s: string | null | undefined) => s ?? null,
				settings: DEFAULT_SETTINGS,
			};

				// Should not throw
				await expect(handler.enrich(context)).resolves.toBeUndefined();
				expect(metadata.description).toBeNull();
			});

			it('should handle missing pages in response', async () => {
				const url = new URL('https://en.wikipedia.org/wiki/Test');
				mockRequest.mockResolvedValue({
					status: 200,
					text: JSON.stringify({
						query: {},
					}),
				});

				context = {
				originalUrl: url.toString(),
				url,
				metadata,
				request: mockRequest,
				sanitizeText: (s: string | null | undefined) => s ?? null,
				settings: DEFAULT_SETTINGS,
			};

				await handler.enrich(context);

				expect(metadata.description).toBeNull();
			});

			it('should trim whitespace from description', async () => {
				const url = new URL('https://en.wikipedia.org/wiki/Test');
				mockRequest.mockResolvedValue({
					status: 200,
					text: JSON.stringify({
						query: {
							pages: {
								'12345': {
									extract: '  Whitespace around description  ',
								},
							},
						},
					}),
				});

				context = {
				originalUrl: url.toString(),
				url,
				metadata,
				request: mockRequest,
				sanitizeText: (s: string | null | undefined) => s ?? null,
				settings: DEFAULT_SETTINGS,
			};

				await handler.enrich(context);

				expect(metadata.description).toBe('Whitespace around description');
			});
		});
	});

	describe('RedditMetadataHandler', () => {
		let handler: RedditMetadataHandler;
		let mockRequest: ReturnType<typeof vi.fn>;
		let context: MetadataHandlerContext;
		let metadata: LinkMetadata;

		beforeEach(() => {
			handler = new RedditMetadataHandler();
			mockRequest = vi.fn();
			metadata = {
				title: '',
				description: null,
				favicon: null,
				siteName: null,
			};
		});

		describe('matches', () => {
			it('should match reddit.com', () => {
				let ctx = createMockContext('https://www.reddit.com/r/programming', metadata, mockRequest);
				expect(handler.matches(ctx)).toBe(true);
			});

			it('should match reddit.com without www', () => {
				let ctx = createMockContext('https://reddit.com/r/programming', metadata, mockRequest);
				expect(handler.matches(ctx)).toBe(true);
			});

			it('should match old.reddit.com', () => {
				let ctx = createMockContext('https://old.reddit.com/r/programming', metadata, mockRequest);
				expect(handler.matches(ctx)).toBe(true);
			});

			it('should not match non-Reddit domains', () => {
				let ctx = createMockContext('https://example.com', metadata, mockRequest);
				expect(handler.matches(ctx)).toBe(false);
			});
		});

		describe('enrich', () => {
			it('should not enrich if title is specific and description exists', async () => {
				metadata.title = 'Specific Title';
				metadata.description = 'Existing description';
				const url = new URL('https://reddit.com/r/programming/comments/abc123/test_post');

				context = {
				originalUrl: url.toString(),
				url,
				metadata,
				request: mockRequest,
				sanitizeText: (s: string | null | undefined) => s ?? null,
				settings: DEFAULT_SETTINGS,
			};

				await handler.enrich(context);

				expect(mockRequest).not.toHaveBeenCalled();
			});

			it('should enrich if title is generic ("reddit.com")', async () => {
				metadata.title = 'reddit.com';
				const url = new URL('https://reddit.com/r/programming/comments/abc123/test_post');
				mockRequest.mockResolvedValue({
					status: 200,
					text: JSON.stringify([{
						data: {
							children: [{
								data: {
									subreddit: 'programming',
									title: 'Test Post Title',
									selftext: 'Post content here',
								},
							}],
						},
					}]),
				});

				context = {
				originalUrl: url.toString(),
				url,
				metadata,
				request: mockRequest,
				sanitizeText: (s: string | null | undefined) => s ?? null,
				settings: DEFAULT_SETTINGS,
			};

				await handler.enrich(context);

				expect(metadata.title).toBe('r/programming');
				expect(metadata.description).toContain('§REDDIT_CARD§Test Post Title');
			});

			it('should enrich if title contains "the heart of the internet"', async () => {
				metadata.title = 'Reddit - The Heart of the Internet';
				const url = new URL('https://reddit.com/r/test/comments/abc123/post');
				mockRequest.mockResolvedValue({
					status: 200,
					text: JSON.stringify([{
						data: {
							children: [{
								data: {
									subreddit: 'test',
									title: 'Post Title',
								},
							}],
						},
					}]),
				});

				context = {
				originalUrl: url.toString(),
				url,
				metadata,
				request: mockRequest,
				sanitizeText: (s: string | null | undefined) => s ?? null,
				settings: DEFAULT_SETTINGS,
			};

				await handler.enrich(context);

				expect(metadata.title).toBe('r/test');
			});

			it('should not fetch if URL does not match /comments/ pattern', async () => {
				const url = new URL('https://reddit.com/r/programming');

				context = {
				originalUrl: url.toString(),
				url,
				metadata,
				request: mockRequest,
				sanitizeText: (s: string | null | undefined) => s ?? null,
				settings: DEFAULT_SETTINGS,
			};

				await handler.enrich(context);

				expect(mockRequest).not.toHaveBeenCalled();
			});

			it('should fetch and parse Reddit post metadata', async () => {
				const url = new URL('https://reddit.com/r/programming/comments/abc123/test_post');
				mockRequest.mockResolvedValue({
					status: 200,
					text: JSON.stringify([{
						data: {
							children: [{
								data: {
									subreddit: 'programming',
									title: 'Test Post Title',
									selftext: 'This is the post content.',
								},
							}],
						},
					}]),
				});

				context = {
				originalUrl: url.toString(),
				url,
				metadata,
				request: mockRequest,
				sanitizeText: (s: string | null | undefined) => s ?? null,
				settings: DEFAULT_SETTINGS,
			};

				await handler.enrich(context);

				expect(mockRequest).toHaveBeenCalledWith({
					url: expect.stringContaining('.json'),
					method: 'GET',
				});
				expect(metadata.title).toBe('r/programming');
				expect(metadata.description).toBe('§REDDIT_CARD§Test Post Title§REDDIT_CONTENT§This is the post content.');
			});

			it('should handle posts without selftext', async () => {
				const url = new URL('https://reddit.com/r/pics/comments/abc123/photo');
				mockRequest.mockResolvedValue({
					status: 200,
					text: JSON.stringify([{
						data: {
							children: [{
								data: {
									subreddit: 'pics',
									title: 'Beautiful Photo',
									// No selftext
								},
							}],
						},
					}]),
				});

				context = {
				originalUrl: url.toString(),
				url,
				metadata,
				request: mockRequest,
				sanitizeText: (s: string | null | undefined) => s ?? null,
				settings: DEFAULT_SETTINGS,
			};

				await handler.enrich(context);

				expect(metadata.title).toBe('r/pics');
				expect(metadata.description).toBe('§REDDIT_CARD§Beautiful Photo');
			});

			it('should use public_description if selftext is missing', async () => {
				const url = new URL('https://reddit.com/r/test/comments/abc123/post');
				mockRequest.mockResolvedValue({
					status: 200,
					text: JSON.stringify([{
						data: {
							children: [{
								data: {
									subreddit: 'test',
									title: 'Test Post',
									public_description: 'Public description here',
								},
							}],
						},
					}]),
				});

				context = {
				originalUrl: url.toString(),
				url,
				metadata,
				request: mockRequest,
				sanitizeText: (s: string | null | undefined) => s ?? null,
				settings: DEFAULT_SETTINGS,
			};

				await handler.enrich(context);

				expect(metadata.description).toContain('Public description here');
			});

			it('should normalize whitespace in description', async () => {
				const url = new URL('https://reddit.com/r/test/comments/abc123/post');
				mockRequest.mockResolvedValue({
					status: 200,
					text: JSON.stringify([{
						data: {
							children: [{
								data: {
									subreddit: 'test',
									title: 'Test',
									selftext: 'Text   with\n\nextra    whitespace',
								},
							}],
						},
					}]),
				});

				context = {
				originalUrl: url.toString(),
				url,
				metadata,
				request: mockRequest,
				sanitizeText: (s: string | null | undefined) => s ?? null,
				settings: DEFAULT_SETTINGS,
			};

				await handler.enrich(context);

				expect(metadata.description).toContain('Text with extra whitespace');
			});

			it('should handle HTTP errors gracefully', async () => {
				const url = new URL('https://reddit.com/r/test/comments/abc123/post');
				mockRequest.mockResolvedValue({
					status: 404,
					text: '',
				});

				context = {
				originalUrl: url.toString(),
				url,
				metadata,
				request: mockRequest,
				sanitizeText: (s: string | null | undefined) => s ?? null,
				settings: DEFAULT_SETTINGS,
			};

				await handler.enrich(context);

				expect(metadata.title).toBe('');
			});

			it('should handle invalid JSON gracefully', async () => {
				const url = new URL('https://reddit.com/r/test/comments/abc123/post');
				mockRequest.mockResolvedValue({
					status: 200,
					text: 'Invalid JSON',
				});

				context = {
				originalUrl: url.toString(),
				url,
				metadata,
				request: mockRequest,
				sanitizeText: (s: string | null | undefined) => s ?? null,
				settings: DEFAULT_SETTINGS,
			};

				await handler.enrich(context);

				expect(metadata.title).toBe('');
			});

			it('should handle network errors gracefully', async () => {
				const url = new URL('https://reddit.com/r/test/comments/abc123/post');
				mockRequest.mockRejectedValue(new Error('Network error'));

				context = {
				originalUrl: url.toString(),
				url,
				metadata,
				request: mockRequest,
				sanitizeText: (s: string | null | undefined) => s ?? null,
				settings: DEFAULT_SETTINGS,
			};

				await handler.enrich(context);

				expect(metadata.title).toBe('');
			});

			it('should preserve query parameters when creating JSON URL', async () => {
				const url = new URL('https://reddit.com/r/test/comments/abc123/post?context=3');
				mockRequest.mockResolvedValue({
					status: 200,
					text: JSON.stringify([{
						data: {
							children: [{
								data: {
									subreddit: 'test',
									title: 'Test',
								},
							}],
						},
					}]),
				});

				context = {
				originalUrl: url.toString(),
				url,
				metadata,
				request: mockRequest,
				sanitizeText: (s: string | null | undefined) => s ?? null,
				settings: DEFAULT_SETTINGS,
			};

				await handler.enrich(context);

				expect(mockRequest).toHaveBeenCalledWith(
					expect.objectContaining({
						url: expect.stringContaining('context=3'),
					})
				);
			});
		});
	});

	describe('GoogleSearchMetadataHandler', () => {
		let handler: GoogleSearchMetadataHandler;
		let metadata: LinkMetadata;
		let mockRequest: ReturnType<typeof vi.fn>;

		beforeEach(() => {
			handler = new GoogleSearchMetadataHandler();
			mockRequest = vi.fn();
			metadata = {
				title: '',
				description: null,
				favicon: null,
				siteName: null,
			};
		});

		describe('matches', () => {
			it('should match google.com search URLs', () => {
				let ctx = createMockContext('https://www.google.com/search?q=test', metadata, mockRequest);
				expect(handler.matches(ctx)).toBe(true);
			});

			it('should match google.com without www', () => {
				let ctx = createMockContext('https://google.com/search?q=test', metadata, mockRequest);
				expect(handler.matches(ctx)).toBe(true);
			});

			it('should match country-specific Google domains', () => {
				const ctx1 = createMockContext('https://www.google.co.uk/search?q=test', metadata, mockRequest);
				expect(handler.matches(ctx1)).toBe(true);

				const ctx2 = createMockContext('https://www.google.ca/search?q=test', metadata, mockRequest);
				expect(handler.matches(ctx2)).toBe(true);
			});

			it('should not match non-search Google URLs', () => {
				const ctx1 = createMockContext('https://www.google.com/', metadata, mockRequest);
				expect(handler.matches(ctx1)).toBe(false);

				const ctx2 = createMockContext('https://www.google.com/maps', metadata, mockRequest);
				expect(handler.matches(ctx2)).toBe(false);
			});

			it('should not match non-Google domains', () => {
				let ctx = createMockContext('https://example.com/search?q=test', metadata, mockRequest);
				expect(handler.matches(ctx)).toBe(false);
			});
		});

		describe('enrich', () => {
			it('should set title with search query', async () => {
				const url = new URL('https://www.google.com/search?q=TypeScript');
				const context = {
				originalUrl: url.toString(),
				url,
				metadata,
				request: vi.fn(),
				sanitizeText: (s: string | null | undefined) => s ?? null,
				settings: DEFAULT_SETTINGS,
			};

				await handler.enrich(context);

				expect(metadata.title).toBe('Google Search — TypeScript');
			});

			it('should handle "query" parameter', async () => {
				const url = new URL('https://www.google.com/search?query=Test');
				const context = {
				originalUrl: url.toString(),
				url,
				metadata,
				request: vi.fn(),
				sanitizeText: (s: string | null | undefined) => s ?? null,
				settings: DEFAULT_SETTINGS,
			};

				await handler.enrich(context);

				expect(metadata.title).toBe('Google Search — Test');
			});

			it('should normalize whitespace in query', async () => {
				const url = new URL('https://www.google.com/search?q=test   query   here');
				const context = {
				originalUrl: url.toString(),
				url,
				metadata,
				request: vi.fn(),
				sanitizeText: (s: string | null | undefined) => s ?? null,
				settings: DEFAULT_SETTINGS,
			};

				await handler.enrich(context);

				expect(metadata.title).toBe('Google Search — test query here');
			});

			it('should not enrich if no query parameter', async () => {
				const url = new URL('https://www.google.com/search');
				const context = {
				originalUrl: url.toString(),
				url,
				metadata,
				request: vi.fn(),
				sanitizeText: (s: string | null | undefined) => s ?? null,
				settings: DEFAULT_SETTINGS,
			};

				await handler.enrich(context);

				expect(metadata.title).toBe('');
			});

			it('should not enrich if query is empty', async () => {
				const url = new URL('https://www.google.com/search?q=');
				const context = {
				originalUrl: url.toString(),
				url,
				metadata,
				request: vi.fn(),
				sanitizeText: (s: string | null | undefined) => s ?? null,
				settings: DEFAULT_SETTINGS,
			};

				await handler.enrich(context);

				expect(metadata.title).toBe('');
			});

			it('should not enrich if query is only whitespace', async () => {
				const url = new URL('https://www.google.com/search?q=   ');
				const context = {
				originalUrl: url.toString(),
				url,
				metadata,
				request: vi.fn(),
				sanitizeText: (s: string | null | undefined) => s ?? null,
				settings: DEFAULT_SETTINGS,
			};

				await handler.enrich(context);

				expect(metadata.title).toBe('');
			});

			it('should not override specific existing title', async () => {
				metadata.title = 'Specific Search Title';
				const url = new URL('https://www.google.com/search?q=test');
				const context = {
				originalUrl: url.toString(),
				url,
				metadata,
				request: vi.fn(),
				sanitizeText: (s: string | null | undefined) => s ?? null,
				settings: DEFAULT_SETTINGS,
			};

				await handler.enrich(context);

				expect(metadata.title).toBe('Specific Search Title');
			});

			it('should override generic "google" title', async () => {
				metadata.title = 'google';
				const url = new URL('https://www.google.com/search?q=test');
				const context = {
				originalUrl: url.toString(),
				url,
				metadata,
				request: vi.fn(),
				sanitizeText: (s: string | null | undefined) => s ?? null,
				settings: DEFAULT_SETTINGS,
			};

				await handler.enrich(context);

				expect(metadata.title).toBe('Google Search — test');
			});

			it('should override "Google Search" title', async () => {
				metadata.title = 'Google Search';
				const url = new URL('https://www.google.com/search?q=test');
				const context = {
				originalUrl: url.toString(),
				url,
				metadata,
				request: vi.fn(),
				sanitizeText: (s: string | null | undefined) => s ?? null,
				settings: DEFAULT_SETTINGS,
			};

				await handler.enrich(context);

				expect(metadata.title).toBe('Google Search — test');
			});

			it('should handle special characters in query', async () => {
				const url = new URL('https://www.google.com/search?q=C%2B%2B');
				const context = {
				originalUrl: url.toString(),
				url,
				metadata,
				request: vi.fn(),
				sanitizeText: (s: string | null | undefined) => s ?? null,
				settings: DEFAULT_SETTINGS,
			};

				await handler.enrich(context);

				expect(metadata.title).toBe('Google Search — C++');
			});
		});
	});

	describe('TwitterMetadataHandler', () => {
		let handler: TwitterMetadataHandler;
		let mockRequest: ReturnType<typeof vi.fn>;
		let context: MetadataHandlerContext;
		let metadata: LinkMetadata;

		beforeEach(() => {
			handler = new TwitterMetadataHandler();
			mockRequest = vi.fn();
			metadata = {
				title: '',
				description: null,
				favicon: null,
				siteName: null,
			};
		});

		describe('matches', () => {
			it('should match x.com', () => {
				expect(handler.matches({
					url: new URL('https://x.com/username'),
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://x.com/username',
					settings: {} as any,
				})).toBe(true);
			});

			it('should match twitter.com', () => {
				expect(handler.matches({
					url: new URL('https://twitter.com/username'),
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://twitter.com/username',
					settings: {} as any,
				})).toBe(true);
			});

			it('should match www.x.com', () => {
				expect(handler.matches({
					url: new URL('https://www.x.com/username'),
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://www.x.com/username',
					settings: {} as any,
				})).toBe(true);
			});

			it('should match www.twitter.com', () => {
				expect(handler.matches({
					url: new URL('https://www.twitter.com/username'),
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://www.twitter.com/username',
					settings: {} as any,
				})).toBe(true);
			});

			it('should match mobile.twitter.com', () => {
				expect(handler.matches({
					url: new URL('https://mobile.twitter.com/username'),
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://mobile.twitter.com/username',
					settings: {} as any,
				})).toBe(true);
			});

			it('should not match non-Twitter domains', () => {
				expect(handler.matches({
					url: new URL('https://example.com'),
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://example.com',
					settings: {} as any,
				})).toBe(false);
			});

			it('should not match twitter-like domains', () => {
				expect(handler.matches({
					url: new URL('https://nottwitter.com'),
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://nottwitter.com',
					settings: {} as any,
				})).toBe(false);
			});
		});

		describe('generic title detection', () => {
			it('should detect "x.com" as generic', async () => {
				metadata.title = 'x.com';
				const url = new URL('https://x.com/ThePrimeagen');

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://x.com/ThePrimeagen',
					settings: {} as any,
				};

				await handler.enrich(context);
				expect(metadata.title).toBe('@ThePrimeagen');
			});

			it('should detect "twitter.com" as generic', async () => {
				metadata.title = 'twitter.com';
				const url = new URL('https://twitter.com/user123');

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://twitter.com/user123',
					settings: {} as any,
				};

				await handler.enrich(context);
				expect(metadata.title).toBe('@user123');
			});

			it('should detect "X" as generic', async () => {
				metadata.title = 'X';
				const url = new URL('https://x.com/test');

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://x.com/test',
					settings: {} as any,
				};

				await handler.enrich(context);
				expect(metadata.title).toBe('@test');
			});

			it('should detect "X (FORMERLY TWITTER)" as generic', async () => {
				metadata.title = 'X (FORMERLY TWITTER)';
				const url = new URL('https://x.com/someuser');

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://x.com/someuser',
					settings: {} as any,
				};

				await handler.enrich(context);
				expect(metadata.title).toBe('@someuser');
			});

			it('should detect "on X" in title as generic', async () => {
				metadata.title = 'User on X';
				const url = new URL('https://x.com/username');

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://x.com/username',
					settings: {} as any,
				};

				await handler.enrich(context);
				expect(metadata.title).toBe('@username');
			});

			it('should always enrich titles to @username format', async () => {
				metadata.title = 'Specific Tweet Title';
				const url = new URL('https://x.com/user/status/123');

				mockRequest.mockResolvedValue({
					status: 200,
					text: JSON.stringify({
						html: '<blockquote class="twitter-tweet"><p>Tweet content</p></blockquote>'
					})
				});

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://x.com/user/status/123',
					settings: {} as any,
				};

				await handler.enrich(context);
				expect(metadata.title).toBe('@user');
				expect(metadata.description).toBe('Tweet content');
			});
		});

		describe('username extraction', () => {
			it('should extract username from profile URL', async () => {
				metadata.title = 'x.com';
				const url = new URL('https://x.com/ThePrimeagen');

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://x.com/ThePrimeagen',
					settings: {} as any,
				};

				await handler.enrich(context);
				expect(metadata.title).toBe('@ThePrimeagen');
			});

			it('should extract username from tweet URL', async () => {
				metadata.title = 'x.com';
				const url = new URL('https://x.com/user_123/status/1953502301173244004');
				mockRequest.mockResolvedValue({
					status: 404, // Simulate oEmbed failure for this test
					text: '',
				});

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://x.com/user_123/status/1953502301173244004',
					settings: {} as any,
				};

				await handler.enrich(context);
				expect(metadata.title).toBe('@user_123');
			});

			it('should handle usernames with underscores', async () => {
				metadata.title = 'x.com';
				const url = new URL('https://x.com/test_user_name');

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://x.com/test_user_name',
					settings: {} as any,
				};

				await handler.enrich(context);
				expect(metadata.title).toBe('@test_user_name');
			});

			it('should handle usernames with numbers', async () => {
				metadata.title = 'x.com';
				const url = new URL('https://x.com/user123abc');

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://x.com/user123abc',
					settings: {} as any,
				};

				await handler.enrich(context);
				expect(metadata.title).toBe('@user123abc');
			});

			it('should handle trailing slash in URL', async () => {
				metadata.title = 'x.com';
				const url = new URL('https://x.com/username/');

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://x.com/username/',
					settings: {} as any,
				};

				await handler.enrich(context);
				expect(metadata.title).toBe('@username');
			});

			it('should handle URLs with query parameters', async () => {
				metadata.title = 'x.com';
				const url = new URL('https://x.com/username?lang=en&ref=home');

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://x.com/username?lang=en&ref=home',
					settings: {} as any,
				};

				await handler.enrich(context);
				expect(metadata.title).toBe('@username');
			});
		});

		describe('tweet detection', () => {
			it('should detect tweet URLs with /status/ pattern', async () => {
				metadata.title = 'x.com';
				const url = new URL('https://x.com/user/status/123456789');
				const oembedHtml = '<blockquote class="twitter-tweet"><p>Tweet content here</p></blockquote>';

				mockRequest.mockResolvedValue({
					status: 200,
					text: JSON.stringify({
						html: oembedHtml,
						author_name: 'user',
					}),
				});

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://x.com/user/status/123456789',
					settings: {} as any,
				};

				await handler.enrich(context);
				expect(mockRequest).toHaveBeenCalledWith({
					url: 'https://publish.twitter.com/oembed?url=https%3A%2F%2Fx.com%2Fuser%2Fstatus%2F123456789',
					method: 'GET',
				});
			});

			it('should not call oEmbed for profile URLs', async () => {
				metadata.title = 'x.com';
				const url = new URL('https://x.com/username');

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://x.com/username',
					settings: {} as any,
				};

				await handler.enrich(context);
				expect(mockRequest).not.toHaveBeenCalled();
				expect(metadata.title).toBe('@username');
				expect(metadata.description).toBeNull();
			});

			it('should preserve existing description for profile URLs', async () => {
				metadata.title = 'x.com';
				metadata.description = 'Software engineer and content creator';
				const url = new URL('https://x.com/ThePrimeagen');

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://x.com/ThePrimeagen',
					settings: {} as any,
				};

				await handler.enrich(context);
				expect(metadata.title).toBe('@ThePrimeagen');
				expect(metadata.description).toBe('Software engineer and content creator');
			});

			it('should filter out generic descriptions like "X (FORMERLY TWITTER)"', async () => {
				metadata.title = 'x.com';
				metadata.description = 'X (FORMERLY TWITTER)';
				const url = new URL('https://x.com/username');

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://x.com/username',
					settings: {} as any,
				};

				await handler.enrich(context);
				expect(metadata.description).toBeNull();
			});
		});

		describe('oEmbed API integration', () => {
			it('should fetch tweet content via oEmbed', async () => {
				metadata.title = 'x.com';
				const url = new URL('https://x.com/ThePrimeagen/status/123');
				const oembedHtml = '<blockquote class="twitter-tweet"><p lang="en">This is a test tweet</p></blockquote>';

				mockRequest.mockResolvedValue({
					status: 200,
					text: JSON.stringify({
						html: oembedHtml,
						author_name: 'ThePrimeagen',
					}),
				});

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://x.com/ThePrimeagen/status/123',
					settings: {} as any,
				};

				await handler.enrich(context);
				expect(metadata.title).toBe('@ThePrimeagen');
				expect(metadata.description).toBe('This is a test tweet');
			});

			it('should handle oEmbed HTTP errors gracefully', async () => {
				metadata.title = 'x.com';
				const url = new URL('https://x.com/user/status/456');

				mockRequest.mockResolvedValue({
					status: 404,
					text: '',
				});

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://x.com/user/status/456',
					settings: {} as any,
				};

				await handler.enrich(context);
				expect(metadata.title).toBe('@user');
				expect(metadata.description).toBeNull();
			});

			it('should handle oEmbed network errors gracefully', async () => {
				metadata.title = 'x.com';
				const url = new URL('https://x.com/user/status/789');

				mockRequest.mockRejectedValue(new Error('Network error'));

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://x.com/user/status/789',
					settings: {} as any,
				};

				await handler.enrich(context);
				expect(metadata.title).toBe('@user');
				expect(metadata.description).toBeNull();
			});

			it('should handle invalid JSON in oEmbed response', async () => {
				metadata.title = 'x.com';
				const url = new URL('https://x.com/user/status/999');

				mockRequest.mockResolvedValue({
					status: 200,
					text: 'Invalid JSON{',
				});

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://x.com/user/status/999',
					settings: {} as any,
				};

				await handler.enrich(context);
				expect(metadata.title).toBe('@user');
				expect(metadata.description).toBeNull();
			});

			it('should handle missing HTML in oEmbed response', async () => {
				metadata.title = 'x.com';
				const url = new URL('https://x.com/user/status/111');

				mockRequest.mockResolvedValue({
					status: 200,
					text: JSON.stringify({
						author_name: 'user',
						// html field missing
					}),
				});

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://x.com/user/status/111',
					settings: {} as any,
				};

				await handler.enrich(context);
				expect(metadata.title).toBe('@user');
				expect(metadata.description).toBeNull();
			});
		});

		describe('HTML parsing', () => {
			it('should extract tweet text from blockquote HTML', async () => {
				metadata.title = 'x.com';
				const url = new URL('https://x.com/user/status/123');
				const html = '<blockquote class="twitter-tweet"><p lang="en" dir="ltr">Simple tweet text</p></blockquote>';

				mockRequest.mockResolvedValue({
					status: 200,
					text: JSON.stringify({ html }),
				});

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://x.com/user/status/123',
					settings: {} as any,
				};

				await handler.enrich(context);
				expect(metadata.description).toBe('Simple tweet text');
			});

			it('should decode HTML entities in tweet text', async () => {
				metadata.title = 'x.com';
				const url = new URL('https://x.com/user/status/123');
				const html = '<blockquote class="twitter-tweet"><p>Tweet with &lt;tags&gt; and &amp; symbols &quot;quoted&quot;</p></blockquote>';

				mockRequest.mockResolvedValue({
					status: 200,
					text: JSON.stringify({ html }),
				});

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://x.com/user/status/123',
					settings: {} as any,
				};

				await handler.enrich(context);
				expect(metadata.description).toBe('Tweet with <tags> and & symbols "quoted"');
			});

			it('should strip HTML tags from tweet text', async () => {
				metadata.title = 'x.com';
				const url = new URL('https://x.com/user/status/123');
				const html = '<blockquote class="twitter-tweet"><p>Tweet with <a href="#">links</a> and <strong>bold</strong> text</p></blockquote>';

				mockRequest.mockResolvedValue({
					status: 200,
					text: JSON.stringify({ html }),
				});

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://x.com/user/status/123',
					settings: {} as any,
				};

				await handler.enrich(context);
				expect(metadata.description).toBe('Tweet with links and bold text');
			});

			it('should clean up whitespace in tweet text', async () => {
				metadata.title = 'x.com';
				const url = new URL('https://x.com/user/status/123');
				const html = '<blockquote class="twitter-tweet"><p>Tweet   with   extra     whitespace</p></blockquote>';

				mockRequest.mockResolvedValue({
					status: 200,
					text: JSON.stringify({ html }),
				});

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://x.com/user/status/123',
					settings: {} as any,
				};

				await handler.enrich(context);
				expect(metadata.description).toBe('Tweet with extra whitespace');
			});

			it('should handle tweets with mentions and hashtags', async () => {
				metadata.title = 'x.com';
				const url = new URL('https://x.com/user/status/123');
				const html = '<blockquote class="twitter-tweet"><p>Hey <a href="#">@user</a> check out <a href="#">#hashtag</a>!</p></blockquote>';

				mockRequest.mockResolvedValue({
					status: 200,
					text: JSON.stringify({ html }),
				});

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://x.com/user/status/123',
					settings: {} as any,
				};

				await handler.enrich(context);
				expect(metadata.description).toBe('Hey @user check out #hashtag!');
			});

			it('should handle malformed HTML gracefully', async () => {
				metadata.title = 'x.com';
				const url = new URL('https://x.com/user/status/123');
				const html = '<blockquote>No p tag here</blockquote>';

				mockRequest.mockResolvedValue({
					status: 200,
					text: JSON.stringify({ html }),
				});

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://x.com/user/status/123',
					settings: {} as any,
				};

				await handler.enrich(context);
				expect(metadata.title).toBe('@user');
				expect(metadata.description).toBeNull();
			});

			it('should handle empty HTML gracefully', async () => {
				metadata.title = 'x.com';
				const url = new URL('https://x.com/user/status/123');

				mockRequest.mockResolvedValue({
					status: 200,
					text: JSON.stringify({ html: '' }),
				});

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://x.com/user/status/123',
					settings: {} as any,
				};

				await handler.enrich(context);
				expect(metadata.title).toBe('@user');
				expect(metadata.description).toBeNull();
			});
		});

		describe('edge cases', () => {
			it('should handle URLs with hash fragments', async () => {
				metadata.title = 'x.com';
				const url = new URL('https://x.com/user#section');

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://x.com/user#section',
					settings: {} as any,
				};

				await handler.enrich(context);
				expect(metadata.title).toBe('@user');
			});

			it('should handle URLs with both query params and hash', async () => {
				metadata.title = 'x.com';
				const url = new URL('https://x.com/user?ref=home#top');

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://x.com/user?ref=home#top',
					settings: {} as any,
				};

				await handler.enrich(context);
				expect(metadata.title).toBe('@user');
			});

			it('should handle tweet URLs with additional path segments', async () => {
				metadata.title = 'x.com';
				const url = new URL('https://x.com/user/status/123/analytics');
				const html = '<blockquote class="twitter-tweet"><p>Tweet text</p></blockquote>';

				mockRequest.mockResolvedValue({
					status: 200,
					text: JSON.stringify({ html }),
				});

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://x.com/user/status/123/analytics',
					settings: {} as any,
				};

				await handler.enrich(context);
				expect(metadata.title).toBe('@user');
				expect(metadata.description).toBe('Tweet text');
			});

			it('should handle empty pathname gracefully', async () => {
				metadata.title = 'x.com';
				const url = new URL('https://x.com/');

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://x.com/',
					settings: {} as any,
				};

				await handler.enrich(context);
				// Should not crash, but won't have a username
				expect(metadata.title).toBe('x.com');
			});

			it('should sanitize tweet text using context.sanitizeText', async () => {
				metadata.title = 'x.com';
				const url = new URL('https://x.com/user/status/123');
				const html = '<blockquote class="twitter-tweet"><p>  Tweet text  </p></blockquote>';

				mockRequest.mockResolvedValue({
					status: 200,
					text: JSON.stringify({ html }),
				});

				const mockSanitize = vi.fn((s) => s?.trim() || null);

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: mockSanitize,
					originalUrl: 'https://x.com/user/status/123',
					settings: {} as any,
				};

				await handler.enrich(context);
				expect(mockSanitize).toHaveBeenCalledWith('Tweet text');
			});

			it('should handle case where sanitizeText returns null', async () => {
				metadata.title = 'x.com';
				const url = new URL('https://x.com/user/status/123');
				const html = '<blockquote class="twitter-tweet"><p>Tweet</p></blockquote>';

				mockRequest.mockResolvedValue({
					status: 200,
					text: JSON.stringify({ html }),
				});

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: () => null, // Always returns null
					originalUrl: 'https://x.com/user/status/123',
					settings: {} as any,
				};

				await handler.enrich(context);
				expect(metadata.title).toBe('@user');
				expect(metadata.description).toBeNull();
			});
		});
	});
});
