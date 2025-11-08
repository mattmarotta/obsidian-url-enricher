import type { MetadataHandler } from "./metadataHandler";
import { GoogleSearchMetadataHandler } from "./googleSearchMetadataHandler";
import { LinkedInMetadataHandler } from "./linkedinMetadataHandler";
import { RedditMetadataHandler } from "./redditMetadataHandler";
import { TwitterMetadataHandler } from "./twitterMetadataHandler";
import { WikipediaMetadataHandler } from "./wikipediaMetadataHandler";

export type { MetadataHandler, MetadataHandlerContext } from "./metadataHandler";

export function createDefaultMetadataHandlers(): MetadataHandler[] {
	return [
		new WikipediaMetadataHandler(),
		new RedditMetadataHandler(),
		new GoogleSearchMetadataHandler(),
		new TwitterMetadataHandler(),
		new LinkedInMetadataHandler(),
	];
}
