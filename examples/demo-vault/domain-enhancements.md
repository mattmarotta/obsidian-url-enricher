---
preview-style: card
---

# Domain-Specific Enhancements Demo

This page demonstrates how URL Enricher provides special handling and enhanced metadata extraction for popular platforms.

## What Makes This Special?

The plugin includes custom extractors that understand the unique structure of different websites, providing richer and more accurate metadata than generic extraction would provide.

---

## Wikipedia

Enhanced metadata extraction for encyclopedia articles:

https://en.wikipedia.org/wiki/Nobel_Prize_in_Physics

**What's enhanced:**
- Clean article titles (removes "- Wikipedia" suffix)
- Accurate first-paragraph descriptions
- Recognizes different Wikipedia language editions

---

## Reddit

Special handling for Reddit threads and posts:

https://www.reddit.com/r/PixelBook/comments/1nxv8v5/i_am_deeply_embedded_within_the_google_android/

https://www.reddit.com/r/Cooking/comments/2ya11p/eli5_if_we_are_never_supposed_to_wash_an_cast/

**What's enhanced:**
- Post titles and content
- Subreddit information
- Better description extraction from post content

---

## Twitter/X

Enhanced tweet and profile metadata:

Profile page:
https://x.com/ThePrimeagen

Individual tweets:
https://x.com/ThePrimeagen/status/1953502301173244004

https://x.com/frontlinekit/status/1934218630230659281

https://x.com/frontlinekit/status/1899325631701110903

**What's enhanced:**
- Tweet content extraction
- User profile information
- Handles both twitter.com and x.com domains

---

## LinkedIn

Professional network posts and profiles:

https://www.linkedin.com/posts/hinaaroraa_personalbranding-careerbranding-hinaarora-activity-7159402629180092416-QR2Z/?utm_source=share&utm_medium=member_android

**What's enhanced:**
- Post content and context
- Professional information
- Better handling of authentication-required content

---

## YouTube

Video metadata extraction:

https://www.youtube.com/watch?v=H75im9fAUMc

https://www.youtube.com/watch?v=yXMjeRXglGc

**What's enhanced:**
- Video titles
- Channel information
- View counts and descriptions
- Thumbnail handling

---

## GitHub

Developer platform content:

Profile:
https://github.com/mattmarotta

**What's enhanced:**
- Repository information
- User profiles
- Issue and PR metadata
- README content

---

## Google Search

Search query pages:

https://www.google.com/search?q=white+richlieu+hook+rack

**What's enhanced:**
- Search query extraction
- Result summaries
- Better title formatting

---

## Technical Blogs & Articles

Anthropic Engineering Blog:
https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues

OpenAI Blog:
https://openai.com/index/why-language-models-hallucinate/

Personal Blogs:
https://ludic.mataroa.blog/

**What's enhanced:**
- Article titles and summaries
- Author information
- Publication metadata

---

## E-Commerce Sites

Product pages with complex URLs:

https://www.newbalance.ca/en_ca/pd/t500/CT500V1-48944-PMG-NA.html#dwvar_CT500V1-48944-PMG-NA_size=10&dwvar_CT500V1-48944-PMG-NA_style=CT500SNB&dwvar_CT500V1-48944-PMG-NA_width=D&pid=CT500V1-48944-PMG-NA&quantity=1

**What's enhanced:**
- Product names
- Pricing information (when available)
- Product descriptions
- Handles complex URLs with parameters

---

## Why This Matters

1. **Better Accuracy** - Domain-specific extractors know exactly where to find the best metadata
2. **Cleaner Titles** - Removes platform-specific noise and formatting
3. **Richer Context** - Extracts platform-specific information (subreddit, tweet author, etc.)
4. **Consistent Experience** - Reliable results across different content types

**See the User Guide for a complete list of enhanced domains and what metadata is extracted for each.**
