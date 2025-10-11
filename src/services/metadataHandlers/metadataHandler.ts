import type { RequestUrlParam, RequestUrlResponse } from "obsidian";
import type { LinkMetadata } from "../types";

export interface MetadataRequestExecutor {
	(request: RequestUrlParam): Promise<RequestUrlResponse>;
}

export interface MetadataHandlerContext {
	originalUrl: string;
	url: URL;
	metadata: LinkMetadata;
	request: MetadataRequestExecutor;
	sanitizeText(value: string | null | undefined): string | null;
}

export interface MetadataHandler {
	matches(context: MetadataHandlerContext): boolean | Promise<boolean>;
	enrich(context: MetadataHandlerContext): Promise<void>;
}
