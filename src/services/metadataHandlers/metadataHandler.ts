import type { RequestUrlParam, RequestUrlResponse } from "obsidian";
import type { LinkMetadata } from "../types";
import type { InlineLinkPreviewSettings } from "../../settings";

export interface MetadataRequestExecutor {
	(request: RequestUrlParam): Promise<RequestUrlResponse>;
}

export interface MetadataHandlerContext {
	originalUrl: string;
	url: URL;
	metadata: LinkMetadata;
	request: MetadataRequestExecutor;
	sanitizeText(value: string | null | undefined): string | null;
	settings: InlineLinkPreviewSettings;
}

export interface MetadataHandler {
	matches(context: MetadataHandlerContext): boolean | Promise<boolean>;
	enrich(context: MetadataHandlerContext): Promise<void>;
}
