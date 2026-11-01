import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MetadataHandlerContext } from '../../src/services/metadataHandlers/metadataHandler';
import { WikipediaMetadataHandler } from '../../src/services/metadataHandlers/wikipediaMetadataHandler';
import { RedditMetadataHandler } from '../../src/services/metadataHandlers/redditMetadataHandler';
import { GoogleSearchMetadataHandler } from '../../src/services/metadataHandlers/googleSearchMetadataHandler';
import { TwitterMetadataHandler } from '../../src/services/metadataHandlers/twitterMetadataHandler';
import { LinkedInMetadataHandler } from '../../src/services/metadataHandlers/linkedinMetadataHandler';
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
		let metadata: LinkMetadata;

		const oEmbed = (title: string) => ({ status: 200, text: JSON.stringify({ title, author_name: 'someone' }) });
		const enrich = (url: string) => handler.enrich(createMockContext(url, metadata, mockRequest));

		beforeEach(() => {
			handler = new RedditMetadataHandler();
			mockRequest = vi.fn();
			// What the service passes in when it skips the page fetch
			metadata = {
				title: 'reddit.com',
				description: null,
				favicon: null,
				siteName: null,
			};
		});

		describe('matches', () => {
			it.each([
				'https://www.reddit.com/r/programming',
				'https://reddit.com/r/programming',
				'https://old.reddit.com/r/programming',
				'https://new.reddit.com/r/programming',
			])('should match %s', (url) => {
				expect(handler.matches(createMockContext(url, metadata, mockRequest))).toBe(true);
			});

			it('should not match non-Reddit domains', () => {
				expect(handler.matches(createMockContext('https://notreddit.com/r/x', metadata, mockRequest))).toBe(false);
				expect(handler.matches(createMockContext('https://reddit.com.evil.org/r/x', metadata, mockRequest))).toBe(false);
			});

			it('should replace the page fetch for Reddit only', () => {
				expect(handler.replacesPageFetch(new URL('https://www.reddit.com/r/programming'))).toBe(true);
				expect(handler.replacesPageFetch(new URL('https://example.com/'))).toBe(false);
			});
		});

		describe('posts', () => {
			it('should use the oEmbed title, with the subreddit as context', async () => {
				const url = 'https://www.reddit.com/r/Cooking/comments/2ya11p/eli5_if_we_are_never_supposed/';
				mockRequest.mockResolvedValueOnce(oEmbed('ELI5: cast iron'));

				await enrich(url);

				expect(mockRequest).toHaveBeenCalledTimes(1);
				const oEmbedUrl = new URL(mockRequest.mock.calls[0][0].url);
				expect(oEmbedUrl.origin + oEmbedUrl.pathname).toBe('https://www.reddit.com/oembed');
				expect(oEmbedUrl.searchParams.get('url')).toBe(url);
				expect(metadata.context).toBe('r/Cooking');
				expect(metadata.title).toBe('ELI5: cast iron');
				expect(metadata.description).toBeNull();
			});

			it('should send oEmbed a www.reddit.com URL for other Reddit hosts', async () => {
				mockRequest.mockResolvedValueOnce(oEmbed('Post'));

				await enrich('https://old.reddit.com/r/test/comments/abc123/post/?utm_source=share');

				const oEmbedUrl = new URL(mockRequest.mock.calls[0][0].url);
				expect(oEmbedUrl.searchParams.get('url')).toBe('https://www.reddit.com/r/test/comments/abc123/post/');
			});

			it('should label posts on user profiles with the user', async () => {
				mockRequest.mockResolvedValueOnce(oEmbed('Profile post'));

				await enrich('https://www.reddit.com/user/spez/comments/abc123/hello/');

				expect(metadata.context).toBe('u/spez');
				expect(metadata.title).toBe('Profile post');
			});

			it.each([
				['an HTTP error', { status: 404, text: '' }],
				['malformed JSON', { status: 200, text: 'not json' }],
				['an empty title', { status: 200, text: JSON.stringify({ title: '   ' }) }],
			])('should fall back to the subreddit label on %s', async (_, response) => {
				mockRequest.mockResolvedValueOnce(response);

				await enrich('https://www.reddit.com/r/test/comments/abc123/post/');

				expect(metadata.title).toBe('r/test');
				expect(metadata.context).toBeUndefined();
			});

			it('should fall back to the subreddit label when the request throws', async () => {
				mockRequest.mockRejectedValueOnce(new Error('Network error'));

				await enrich('https://www.reddit.com/r/test/comments/abc123/post/');

				expect(metadata.title).toBe('r/test');
			});
		});

		describe('share links', () => {
			const shareUrl = 'https://www.reddit.com/r/learnpython/s/acLJEVUdmr';

			it('should resolve share links (/r/<sub>/s/<id>) to the full post', async () => {
				const challengePage =
					'<title>Reddit</title><form hidden method="GET" ' +
					'action="/r/learnpython/comments/1w1vcia/cna_someone_please_explain/">';
				mockRequest
					.mockResolvedValueOnce({ status: 200, text: challengePage })
					.mockResolvedValueOnce(oEmbed('Can someone please explain this'));

				await enrich(shareUrl);

				expect(mockRequest).toHaveBeenCalledTimes(2);
				expect(mockRequest.mock.calls[0][0].url).toBe(shareUrl);
				expect(new URL(mockRequest.mock.calls[1][0].url).searchParams.get('url')).toBe(
					'https://www.reddit.com/r/learnpython/comments/1w1vcia/cna_someone_please_explain/'
				);
				expect(metadata.context).toBe('r/learnpython');
				expect(metadata.title).toBe('Can someone please explain this');
			});

			it('should fall back to the subreddit label when a share link cannot be resolved', async () => {
				mockRequest.mockResolvedValueOnce({ status: 200, text: '<title>Reddit</title>' });

				await enrich(shareUrl);

				expect(mockRequest).toHaveBeenCalledTimes(1);
				expect(metadata.title).toBe('r/learnpython');
				expect(metadata.context).toBeUndefined();
			});
		});

		describe('other Reddit links', () => {
			it.each([
				['https://www.reddit.com/r/learnpython', 'r/learnpython'],
				['https://www.reddit.com/r/learnpython/top/?t=week', 'r/learnpython'],
				['https://www.reddit.com/r/learnpython/wiki/index', 'r/learnpython'],
				['https://www.reddit.com/user/spez/', 'u/spez'],
				['https://www.reddit.com/u/spez', 'u/spez'],
				['https://www.reddit.com/', 'Reddit'],
				['https://www.reddit.com/search/?q=obsidian', 'Reddit'],
			])('should label %s as "%s" without any request', async (url, label) => {
				metadata.description = 'Log in or sign up to personalize your feed';

				await enrich(url);

				expect(mockRequest).not.toHaveBeenCalled();
				expect(metadata.title).toBe(label);
				expect(metadata.description).toBeNull();
				expect(metadata.context).toBeUndefined();
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

	describe('LinkedInMetadataHandler', () => {
		let handler: LinkedInMetadataHandler;
		let mockRequest: ReturnType<typeof vi.fn>;
		let context: MetadataHandlerContext;
		let metadata: LinkMetadata;

		beforeEach(() => {
			handler = new LinkedInMetadataHandler();
			mockRequest = vi.fn();
			metadata = {
				title: '',
				description: null,
				favicon: null,
				siteName: null,
			};
		});

		describe('matches', () => {
			it('should match linkedin.com', () => {
				expect(handler.matches({
					url: new URL('https://linkedin.com/posts/username'),
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://linkedin.com/posts/username',
					settings: {} as any,
				})).toBe(true);
			});

			it('should match www.linkedin.com', () => {
				expect(handler.matches({
					url: new URL('https://www.linkedin.com/posts/username'),
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://www.linkedin.com/posts/username',
					settings: {} as any,
				})).toBe(true);
			});

			it('should match mobile.linkedin.com', () => {
				expect(handler.matches({
					url: new URL('https://mobile.linkedin.com/posts/username'),
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://mobile.linkedin.com/posts/username',
					settings: {} as any,
				})).toBe(true);
			});

			it('should not match non-LinkedIn domains', () => {
				expect(handler.matches({
					url: new URL('https://example.com'),
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://example.com',
					settings: {} as any,
				})).toBe(false);
			});

			it('should not match linkedin-like domains', () => {
				expect(handler.matches({
					url: new URL('https://notlinkedin.com'),
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					originalUrl: 'https://notlinkedin.com',
					settings: {} as any,
				})).toBe(false);
			});
		});

		describe('title cleaning', () => {
			it('should clean title with hashtags, author, comments, and content', async () => {
				metadata.title = '#personalbranding #careerbranding #hinaarora | Hina Arora | 17 comments — We are using the ChatGPT...';
				const url = new URL('https://linkedin.com/posts/hinaaroraa_personalbranding-activity-123');

				context = {
					originalUrl: url.href,
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					settings: DEFAULT_SETTINGS,
				};

				await handler.enrich(context);
				expect(metadata.title).toBe('Hina Arora — We are using the ChatGPT...');
			});

			it('should preserve hashtags that appear in content', async () => {
				metadata.title = '#coding | John Doe | 5 comments — Check out #Python tips and #JavaScript tricks';
				const url = new URL('https://linkedin.com/posts/johndoe-activity-456');

				context = {
					originalUrl: url.href,
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					settings: DEFAULT_SETTINGS,
				};

				await handler.enrich(context);
				expect(metadata.title).toBe('John Doe — Check out #Python tips and #JavaScript tricks');
			});

			it('should handle title with author but no content', async () => {
				metadata.title = '#tags #more | Author Name';
				const url = new URL('https://linkedin.com/posts/author-activity-789');

				context = {
					originalUrl: url.href,
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					settings: DEFAULT_SETTINGS,
				};

				await handler.enrich(context);
				expect(metadata.title).toBe('Author Name');
			});

			it('should handle title with content but no clear author', async () => {
				metadata.title = '#tags — Great post about coding';
				const url = new URL('https://linkedin.com/posts/activity-999');

				context = {
					originalUrl: url.href,
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					settings: DEFAULT_SETTINGS,
				};

				await handler.enrich(context);
				expect(metadata.title).toBe('Great post about coding');
			});

			it('should handle article titles without hashtags', async () => {
				metadata.title = 'How to Code Better | John Doe — A comprehensive guide';
				const url = new URL('https://linkedin.com/pulse/how-to-code-better');

				context = {
					originalUrl: url.href,
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					settings: DEFAULT_SETTINGS,
				};

				await handler.enrich(context);
				expect(metadata.title).toBe('John Doe — A comprehensive guide');
			});

			it('should handle malformed title gracefully', async () => {
				metadata.title = 'Just some random text without structure';
				const url = new URL('https://linkedin.com/posts/random');

				context = {
					originalUrl: url.href,
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					settings: DEFAULT_SETTINGS,
				};

				await handler.enrich(context);
				expect(metadata.title).toBe('Just some random text without structure');
			});

			it('should handle title with only hashtags', async () => {
				metadata.title = '#tag1 #tag2 #tag3';
				const url = new URL('https://linkedin.com/posts/hashtags-only');

				context = {
					originalUrl: url.href,
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					settings: DEFAULT_SETTINGS,
				};

				await handler.enrich(context);
				expect(metadata.title).toBeTruthy();
			});

			it('should not modify title if no title present', async () => {
				metadata.title = null;
				const url = new URL('https://linkedin.com/posts/no-title');

				context = {
					originalUrl: url.href,
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					settings: DEFAULT_SETTINGS,
				};

				await handler.enrich(context);
				expect(metadata.title).toBeNull();
			});

			it('should handle title with multiple pipes and dashes', async () => {
				metadata.title = '#tech #ai | Author | Company | 42 comments — Amazing AI breakthrough — mind-blowing';
				const url = new URL('https://linkedin.com/posts/complex-structure');

				context = {
					originalUrl: url.href,
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					settings: DEFAULT_SETTINGS,
				};

				await handler.enrich(context);
				expect(metadata.title).toContain('Author');
				expect(metadata.title).toContain('—');
				expect(metadata.title).not.toContain('#tech');
				expect(metadata.title).not.toContain('comments');
			});

			it('should remove comment counts', async () => {
				metadata.title = 'Author Name | 1 comment — Single comment post';
				const url = new URL('https://linkedin.com/posts/one-comment');

				context = {
					originalUrl: url.href,
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					settings: DEFAULT_SETTINGS,
				};

				await handler.enrich(context);
				expect(metadata.title).toBe('Author Name — Single comment post');
			expect(metadata.title).not.toContain('1 comment');
			});
		});

		describe('site name', () => {
			it('should set siteName to LinkedIn if not already set', async () => {
				metadata.title = '#tag | Author — Content';
				const url = new URL('https://linkedin.com/posts/test');

				context = {
					originalUrl: url.href,
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					settings: DEFAULT_SETTINGS,
				};

				await handler.enrich(context);
				expect(metadata.siteName).toBe('LinkedIn');
			});

			it('should not override existing siteName', async () => {
				metadata.title = '#tag | Author — Content';
				metadata.siteName = 'Custom Site Name';
				const url = new URL('https://linkedin.com/posts/test');

				context = {
					originalUrl: url.href,
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					settings: DEFAULT_SETTINGS,
				};

				await handler.enrich(context);
				expect(metadata.siteName).toBe('Custom Site Name');
			});
		});

		describe('description handling', () => {
			it('should preserve existing description', async () => {
				metadata.title = '#tag | Author — Content';
				metadata.description = 'Existing description text';
				const url = new URL('https://linkedin.com/posts/test');

				context = {
					originalUrl: url.href,
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s: string | null | undefined) => s ?? null,
					settings: DEFAULT_SETTINGS,
				};

				await handler.enrich(context);
				expect(metadata.description).toBe('Existing description text');
			});
		});
	});
