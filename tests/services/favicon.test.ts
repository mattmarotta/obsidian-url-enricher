import { describe, it, expect } from 'vitest';
import { getFaviconUrl } from '../../src/services/favicon';

describe('getFaviconUrl', () => {
	it('builds the Google s2 favicon URL from the hostname', () => {
		expect(getFaviconUrl('https://github.com/user/repo?tab=readme#top')).toBe(
			'https://www.google.com/s2/favicons?domain=github.com&sz=128'
		);
	});

	it('keeps subdomains and ignores port, path, and protocol', () => {
		expect(getFaviconUrl('http://docs.example.co.uk:8080/a/b')).toBe(
			'https://www.google.com/s2/favicons?domain=docs.example.co.uk&sz=128'
		);
	});

	it('returns null for unparseable URLs', () => {
		expect(getFaviconUrl('not a url')).toBeNull();
		expect(getFaviconUrl('')).toBeNull();
	});

	it('returns null for URLs without a hostname', () => {
		expect(getFaviconUrl('mailto:someone@example.com')).toBeNull();
		expect(getFaviconUrl('file:///C:/notes/a.md')).toBeNull();
	});
});
