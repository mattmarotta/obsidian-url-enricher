import type { MetadataHandlerContext, MetadataHandler } from "./metadataHandler";
import { GoogleSearchMetadataHandler } from "./googleSearchMetadataHandler";
import { RedditMetadataHandler } from "./redditMetadataHandler";
import { WikipediaMetadataHandler } from "./wikipediaMetadataHandler";

export type { MetadataHandler, MetadataHandlerContext } from "./metadataHandler";

export function createDefaultMetadataHandlers(): MetadataHandler[] {
	return [
		new WikipediaMetadataHandler(),
		new RedditMetadataHandler(),
		new GoogleSearchMetadataHandler(),
	];
}
