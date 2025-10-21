export const HTML_WITH_OPENGRAPH = `
<!DOCTYPE html>
<html>
<head>
	<meta property="og:title" content="OpenGraph Title" />
	<meta property="og:description" content="OpenGraph Description for testing" />
	<meta property="og:image" content="https://example.com/image.jpg" />
	<meta property="og:site_name" content="Example Site" />
</head>
<body>Content</body>
</html>
`;

export const HTML_WITH_TWITTER_CARDS = `
<!DOCTYPE html>
<html>
<head>
	<meta name="twitter:title" content="Twitter Title" />
	<meta name="twitter:description" content="Twitter Description for testing" />
	<meta name="twitter:image" content="https://example.com/twitter-image.jpg" />
</head>
<body>Content</body>
</html>
`;

export const HTML_WITH_STANDARD_META = `
<!DOCTYPE html>
<html>
<head>
	<title>Standard HTML Title</title>
	<meta name="description" content="Standard meta description" />
	<link rel="icon" href="https://example.com/favicon.ico" />
</head>
<body>Content</body>
</html>
`;

export const HTML_WITH_MIXED_META = `
<!DOCTYPE html>
<html>
<head>
	<title>Fallback Title</title>
	<meta property="og:title" content="OG Title Takes Precedence" />
	<meta name="twitter:title" content="Twitter Title" />
	<meta name="description" content="Standard description" />
	<meta property="og:description" content="OG description takes precedence" />
</head>
<body>Content</body>
</html>
`;

export const HTML_WITH_ENTITIES = `
<!DOCTYPE html>
<html>
<head>
	<meta property="og:title" content="Title with &amp; entities &lt;test&gt;" />
	<meta property="og:description" content="Description with &quot;quotes&quot; and &#39;apostrophes&#39;" />
</head>
<body>Content</body>
</html>
`;

export const HTML_WITH_SOFT_404_REDDIT = `
<!DOCTYPE html>
<html>
<head>
	<title>page not found - Reddit</title>
	<meta property="og:title" content="page not found" />
</head>
<body>Sorry, we couldn't find that page</body>
</html>
`;

export const HTML_WITH_SOFT_404_YOUTUBE = `
<!DOCTYPE html>
<html>
<head>
	<title>Video Unavailable - YouTube</title>
	<meta property="og:title" content="Video unavailable" />
</head>
<body>This video is unavailable</body>
</html>
`;

export const HTML_WITH_SOFT_404_GENERIC = `
<!DOCTYPE html>
<html>
<head>
	<title>404 Not Found</title>
	<meta property="og:title" content="404 - Page Not Found" />
</head>
<body>Page not found</body>
</html>
`;

export const HTML_WIKIPEDIA_ARTICLE = `
<!DOCTYPE html>
<html>
<head>
	<title>Quantum Mechanics - Wikipedia</title>
	<meta property="og:title" content="Quantum Mechanics" />
	<meta property="og:description" content="Quantum mechanics is a fundamental theory in physics." />
	<meta property="og:site_name" content="Wikipedia" />
</head>
<body>Quantum mechanics is a fundamental theory...</body>
</html>
`;

export const HTML_REDDIT_POST = `
<!DOCTYPE html>
<html>
<head>
	<title>Post Title : subreddit</title>
	<meta property="og:title" content="Interesting Post Title" />
	<meta property="og:description" content="This is the post content" />
	<meta property="og:site_name" content="Reddit" />
</head>
<body>Post content</body>
</html>
`;

export const HTML_WITH_LONG_DESCRIPTION = `
<!DOCTYPE html>
<html>
<head>
	<meta property="og:title" content="Article Title" />
	<meta property="og:description" content="${'Lorem ipsum dolor sit amet, '.repeat(50)}" />
</head>
<body>Content</body>
</html>
`;

export const HTML_EMPTY = `
<!DOCTYPE html>
<html>
<head>
	<title></title>
</head>
<body></body>
</html>
`;

export const HTML_NO_META = `
<!DOCTYPE html>
<html>
<body>Just plain content</body>
</html>
`;
