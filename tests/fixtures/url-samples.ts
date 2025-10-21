export const VALID_URLS = [
	'https://example.com',
	'http://example.com',
	'https://example.com/path',
	'https://example.com/path/to/page',
	'https://example.com?query=value',
	'https://example.com?q1=v1&q2=v2',
	'https://example.com#fragment',
	'https://example.com/path?query=value#fragment',
	'https://example.com:8080',
	'https://subdomain.example.com',
	'https://sub.domain.example.com',
	'https://example.com/path-with-dashes',
	'https://example.com/path_with_underscores',
	'https://example.com/~username',
	'https://example.com/%20spaces',
];

export const INVALID_URLS = [
	'not a url',
	'ftp://example.com',
	'javascript:alert("xss")',
	'example.com',
	'www.example.com',
	'',
	'   ',
	'http://',
	'https://',
];

export const WRAPPED_URLS = [
	{ input: '<https://example.com>', expected: 'https://example.com' },
	{ input: '< https://example.com >', expected: 'https://example.com' },
	{ input: '<  https://example.com  >', expected: 'https://example.com' },
];

export const MARKDOWN_LINKS = [
	'[text](https://example.com)',
	'[](https://example.com)',
	'[link with spaces](https://example.com/path)',
	'[https://example.com](https://example.com)',
];

export const MULTIPLE_URL_TEXT = `
https://first.com
https://second.com
https://third.com
`;

export const MIXED_CONTENT_WITH_URLS = `
Some text before
https://example.com
More text
https://another.com
Text after
`;

export const URLS_WITH_MARKDOWN = `
Regular URL: https://example.com
Markdown link: [text](https://markdown.com)
Another URL: https://third.com
`;
