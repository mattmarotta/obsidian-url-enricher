import type { MetadataHandlerContext, MetadataHandler } from "./metadataHandler";
import { GoogleSearchMetadataHandler } from "./googleSearchMetadataHandler";
import { RedditMetadataHandler } from "./redditMetadataHandler";

export { MetadataHandler, MetadataHandlerContext } from "./metadataHandler";

export function createDefaultMetadataHandlers(): MetadataHandler[] {
	return [new RedditMetadataHandler(), new GoogleSearchMetadataHandler()];
}
