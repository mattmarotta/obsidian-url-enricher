# Dynamic Preview Mode Demo

## What you should see in Live Preview:

When dynamic preview mode is enabled in settings, bare URLs will show inline preview bubbles with:
- Site favicon (if enabled)
- Page title
- Description (if available and enabled)
- **Clickable preview bubbles** - Click to open the URL in a new tab

The previews appear based on your chosen **URL Display Mode**:

### Display Mode Options:

1. **URL + Preview** (default)
   - Shows the full URL followed by a preview bubble
   - Best for maintaining full context while seeing metadata
   - URL appears in standard link styling (blue/purple, underlined)

2. **Preview Only**
   - Completely hides the URL
   - Shows only the preview bubble with favicon, title, and description
   - Cleanest reading experience
   - URL is still in your markdown source and bubble is clickable

3. **Small URL + Preview** (recommended)
   - Shows the URL in a subtle, smaller, non-intrusive style
   - URL is faded, smaller (75% size), and not underlined
   - Followed by the preview bubble
   - Best balance: see the URL without it being distracting
   - URL remains fully clickable and editable

## Test URLs:

Try these bare URLs with different display modes:

https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues

https://openai.com/index/why-language-models-hallucinate/

https://github.com/mattmarotta

https://en.wikipedia.org/wiki/Nobel_Prize_in_Physics

https://www.reddit.com/r/PixelBook/comments/1nxv8v5/i_am_deeply_embedded_within_the_google_android/

## Description Length Control:

The preview bubble respects your **Description Length** setting. Try adjusting it from 60 to 200 characters to see longer descriptions wrap naturally within the bubble.

## Comparison with markdown links:

These are already converted to markdown links (dynamic preview won't affect them):

[Anthropic Engineering Blog](https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues)

[Why Language Models Hallucinate](https://openai.com/index/why-language-models-hallucinate/)

## Instructions:

1. Go to Settings → Inline Link Preview
2. Toggle "Dynamic preview mode" **ON**
3. Select your preferred "URL display mode" from the dropdown
4. Adjust "Description length" to see how it affects wrapping (try 120 or 200)
5. View this note in Live Preview mode
6. Toggle between the three display modes to see the difference:
   - **URL + Preview**: Full-sized URL (standard link style) with bubble after
   - **Preview Only**: URL hidden, only bubble shown - **click the bubble to open link**
   - **Small URL + Preview**: Subtle, faded, smaller URL with bubble - **recommended!**
7. **Try clicking** on the preview bubbles - they open the URL in a new tab
8. Settings changes now apply **immediately** without needing to navigate away

## Tips:

- **Small URL + Preview** is the recommended mode for most users - clean but still shows the URL
- **Preview Only** mode is great for presentations or when you want the absolute cleanest view
- **URL + Preview** mode is best when you need standard link styling
- The description will wrap to multiple lines if your length setting is high
- Favicon display can be toggled independently
- Preview bubbles are fully clickable - click anywhere on them to open the URL
- Settings now update in real-time - no need to navigate away and back!
