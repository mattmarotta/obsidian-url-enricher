import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MetadataHandlerContext } from '../../src/services/metadataHandlers/metadataHandler';
import { WikipediaMetadataHandler } from '../../src/services/metadataHandlers/wikipediaMetadataHandler';
import { RedditMetadataHandler } from '../../src/services/metadataHandlers/redditMetadataHandler';
import { GoogleSearchMetadataHandler } from '../../src/services/metadataHandlers/googleSearchMetadataHandler';
import type { LinkMetadata } from '../../src/services/types';

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
				url: '',
				title: null,
				description: null,
				favicon: null,
				siteName: null,
			};
		});

		describe('matches', () => {
			it('should match wikipedia.org domains', () => {
				expect(handler.matches({
					url: new URL('https://en.wikipedia.org/wiki/Test'),
					metadata,
					request: mockRequest,
					sanitizeText: (s) => s,
				})).toBe(true);
			});

			it('should match all language variants of Wikipedia', () => {
				expect(handler.matches({
					url: new URL('https://fr.wikipedia.org/wiki/Test'),
					metadata,
					request: mockRequest,
					sanitizeText: (s) => s,
				})).toBe(true);

				expect(handler.matches({
					url: new URL('https://ja.wikipedia.org/wiki/Test'),
					metadata,
					request: mockRequest,
					sanitizeText: (s) => s,
				})).toBe(true);
			});

			it('should not match non-Wikipedia domains', () => {
				expect(handler.matches({
					url: new URL('https://example.com'),
					metadata,
					request: mockRequest,
					sanitizeText: (s) => s,
				})).toBe(false);

				expect(handler.matches({
					url: new URL('https://wikipedia.com'), // not .org
					metadata,
					request: mockRequest,
					sanitizeText: (s) => s,
				})).toBe(false);
			});
		});

		describe('enrich', () => {
			it('should set siteName to "Wikipedia"', async () => {
				const url = new URL('https://en.wikipedia.org/wiki/Test');
				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s) => s,
				};

				await handler.enrich(context);

				expect(metadata.siteName).toBe('Wikipedia');
			});

			it('should not fetch if description already exists', async () => {
				metadata.description = 'Existing description';
				const url = new URL('https://en.wikipedia.org/wiki/Test');
				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s) => s,
				};

				await handler.enrich(context);

				expect(mockRequest).not.toHaveBeenCalled();
			});

			it('should not fetch if URL path does not match /wiki/ pattern', async () => {
				const url = new URL('https://en.wikipedia.org/');
				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s) => s,
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
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s) => s,
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
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s) => s,
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
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s) => s,
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
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s) => s,
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
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s) => s,
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
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s) => s,
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
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s) => s,
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
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s) => s,
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
				url: '',
				title: null,
				description: null,
				favicon: null,
				siteName: null,
			};
		});

		describe('matches', () => {
			it('should match reddit.com', () => {
				expect(handler.matches({
					url: new URL('https://www.reddit.com/r/programming'),
					metadata,
					request: mockRequest,
					sanitizeText: (s) => s,
				})).toBe(true);
			});

			it('should match reddit.com without www', () => {
				expect(handler.matches({
					url: new URL('https://reddit.com/r/programming'),
					metadata,
					request: mockRequest,
					sanitizeText: (s) => s,
				})).toBe(true);
			});

			it('should match old.reddit.com', () => {
				expect(handler.matches({
					url: new URL('https://old.reddit.com/r/programming'),
					metadata,
					request: mockRequest,
					sanitizeText: (s) => s,
				})).toBe(true);
			});

			it('should not match non-Reddit domains', () => {
				expect(handler.matches({
					url: new URL('https://example.com'),
					metadata,
					request: mockRequest,
					sanitizeText: (s) => s,
				})).toBe(false);
			});
		});

		describe('enrich', () => {
			it('should not enrich if title is specific and description exists', async () => {
				metadata.title = 'Specific Title';
				metadata.description = 'Existing description';
				const url = new URL('https://reddit.com/r/programming/comments/abc123/test_post');

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s) => s,
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
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s) => s,
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
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s) => s,
				};

				await handler.enrich(context);

				expect(metadata.title).toBe('r/test');
			});

			it('should not fetch if URL does not match /comments/ pattern', async () => {
				const url = new URL('https://reddit.com/r/programming');

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s) => s,
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
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s) => s,
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
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s) => s,
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
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s) => s,
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
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s) => s,
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
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s) => s,
				};

				await handler.enrich(context);

				expect(metadata.title).toBeNull();
			});

			it('should handle invalid JSON gracefully', async () => {
				const url = new URL('https://reddit.com/r/test/comments/abc123/post');
				mockRequest.mockResolvedValue({
					status: 200,
					text: 'Invalid JSON',
				});

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s) => s,
				};

				await handler.enrich(context);

				expect(metadata.title).toBeNull();
			});

			it('should handle network errors gracefully', async () => {
				const url = new URL('https://reddit.com/r/test/comments/abc123/post');
				mockRequest.mockRejectedValue(new Error('Network error'));

				context = {
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s) => s,
				};

				await handler.enrich(context);

				expect(metadata.title).toBeNull();
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
					url,
					metadata,
					request: mockRequest,
					sanitizeText: (s) => s,
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

		beforeEach(() => {
			handler = new GoogleSearchMetadataHandler();
			metadata = {
				url: '',
				title: null,
				description: null,
				favicon: null,
				siteName: null,
			};
		});

		describe('matches', () => {
			it('should match google.com search URLs', () => {
				expect(handler.matches({
					url: new URL('https://www.google.com/search?q=test'),
					metadata,
					request: vi.fn(),
					sanitizeText: (s) => s,
				})).toBe(true);
			});

			it('should match google.com without www', () => {
				expect(handler.matches({
					url: new URL('https://google.com/search?q=test'),
					metadata,
					request: vi.fn(),
					sanitizeText: (s) => s,
				})).toBe(true);
			});

			it('should match country-specific Google domains', () => {
				expect(handler.matches({
					url: new URL('https://www.google.co.uk/search?q=test'),
					metadata,
					request: vi.fn(),
					sanitizeText: (s) => s,
				})).toBe(true);

				expect(handler.matches({
					url: new URL('https://www.google.ca/search?q=test'),
					metadata,
					request: vi.fn(),
					sanitizeText: (s) => s,
				})).toBe(true);
			});

			it('should not match non-search Google URLs', () => {
				expect(handler.matches({
					url: new URL('https://www.google.com/'),
					metadata,
					request: vi.fn(),
					sanitizeText: (s) => s,
				})).toBe(false);

				expect(handler.matches({
					url: new URL('https://www.google.com/maps'),
					metadata,
					request: vi.fn(),
					sanitizeText: (s) => s,
				})).toBe(false);
			});

			it('should not match non-Google domains', () => {
				expect(handler.matches({
					url: new URL('https://example.com/search?q=test'),
					metadata,
					request: vi.fn(),
					sanitizeText: (s) => s,
				})).toBe(false);
			});
		});

		describe('enrich', () => {
			it('should set title with search query', async () => {
				const url = new URL('https://www.google.com/search?q=TypeScript');
				const context = {
					url,
					metadata,
					request: vi.fn(),
					sanitizeText: (s) => s,
				};

				await handler.enrich(context);

				expect(metadata.title).toBe('Google Search — TypeScript');
			});

			it('should handle "query" parameter', async () => {
				const url = new URL('https://www.google.com/search?query=Test');
				const context = {
					url,
					metadata,
					request: vi.fn(),
					sanitizeText: (s) => s,
				};

				await handler.enrich(context);

				expect(metadata.title).toBe('Google Search — Test');
			});

			it('should normalize whitespace in query', async () => {
				const url = new URL('https://www.google.com/search?q=test   query   here');
				const context = {
					url,
					metadata,
					request: vi.fn(),
					sanitizeText: (s) => s,
				};

				await handler.enrich(context);

				expect(metadata.title).toBe('Google Search — test query here');
			});

			it('should not enrich if no query parameter', async () => {
				const url = new URL('https://www.google.com/search');
				const context = {
					url,
					metadata,
					request: vi.fn(),
					sanitizeText: (s) => s,
				};

				await handler.enrich(context);

				expect(metadata.title).toBeNull();
			});

			it('should not enrich if query is empty', async () => {
				const url = new URL('https://www.google.com/search?q=');
				const context = {
					url,
					metadata,
					request: vi.fn(),
					sanitizeText: (s) => s,
				};

				await handler.enrich(context);

				expect(metadata.title).toBeNull();
			});

			it('should not enrich if query is only whitespace', async () => {
				const url = new URL('https://www.google.com/search?q=   ');
				const context = {
					url,
					metadata,
					request: vi.fn(),
					sanitizeText: (s) => s,
				};

				await handler.enrich(context);

				expect(metadata.title).toBeNull();
			});

			it('should not override specific existing title', async () => {
				metadata.title = 'Specific Search Title';
				const url = new URL('https://www.google.com/search?q=test');
				const context = {
					url,
					metadata,
					request: vi.fn(),
					sanitizeText: (s) => s,
				};

				await handler.enrich(context);

				expect(metadata.title).toBe('Specific Search Title');
			});

			it('should override generic "google" title', async () => {
				metadata.title = 'google';
				const url = new URL('https://www.google.com/search?q=test');
				const context = {
					url,
					metadata,
					request: vi.fn(),
					sanitizeText: (s) => s,
				};

				await handler.enrich(context);

				expect(metadata.title).toBe('Google Search — test');
			});

			it('should override "Google Search" title', async () => {
				metadata.title = 'Google Search';
				const url = new URL('https://www.google.com/search?q=test');
				const context = {
					url,
					metadata,
					request: vi.fn(),
					sanitizeText: (s) => s,
				};

				await handler.enrich(context);

				expect(metadata.title).toBe('Google Search — test');
			});

			it('should handle special characters in query', async () => {
				const url = new URL('https://www.google.com/search?q=C%2B%2B');
				const context = {
					url,
					metadata,
					request: vi.fn(),
					sanitizeText: (s) => s,
				};

				await handler.enrich(context);

				expect(metadata.title).toBe('Google Search — C++');
			});
		});
	});
});
