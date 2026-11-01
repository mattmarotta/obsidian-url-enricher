import { describe, it, expect } from 'vitest';
import { rewriteUrlForFetch } from '../../src/utils/url';

describe('rewriteUrlForFetch', () => {
	// www.reddit.com serves a JS bot-challenge page (title: "Reddit") to
	// non-browser clients; old.reddit.com serves real Open Graph metadata.
	it.each([
		['https://www.reddit.com/r/ObsidianMD/', 'https://old.reddit.com/r/ObsidianMD/'],
		['https://reddit.com/r/ObsidianMD', 'https://old.reddit.com/r/ObsidianMD'],
		['https://new.reddit.com/r/x/', 'https://old.reddit.com/r/x/'],
		['https://np.reddit.com/r/x/', 'https://old.reddit.com/r/x/'],
	])('rewrites %s to old.reddit.com', (input, expected) => {
		expect(rewriteUrlForFetch(input)).toBe(expected);
	});

	it('preserves path, query and fragment', () => {
		expect(
			rewriteUrlForFetch('https://www.reddit.com/r/a/comments/b/c/?sort=top#x')
		).toBe('https://old.reddit.com/r/a/comments/b/c/?sort=top#x');
	});

	it('leaves old.reddit.com untouched', () => {
		expect(rewriteUrlForFetch('https://old.reddit.com/r/x/')).toBe('https://old.reddit.com/r/x/');
	});

	it('does not rewrite lookalike hosts', () => {
		for (const u of [
			'https://notreddit.com/r/x',
			'https://reddit.com.evil.example/r/x',
			'https://i.redd.it/abc.png',
		]) {
			expect(rewriteUrlForFetch(u)).toBe(u);
		}
	});

	it('leaves unrelated urls and non-urls unchanged', () => {
		expect(rewriteUrlForFetch('https://github.com')).toBe('https://github.com');
		expect(rewriteUrlForFetch('not a url')).toBe('not a url');
	});
});
