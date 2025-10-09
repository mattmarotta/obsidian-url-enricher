import type { InlineLinkPreviewSettings } from "../settings";
import type { LinkMetadata, LinkPreviewService } from "../services/linkPreviewService";
import { buildMarkdownPreview } from "./previewFormatter";

export class LinkPreviewBuilder {
	private readonly service: LinkPreviewService;
	private readonly getSettings: () => InlineLinkPreviewSettings;

	constructor(service: LinkPreviewService, getSettings: () => InlineLinkPreviewSettings) {
		this.service = service;
		this.getSettings = getSettings;
	}

	async build(url: string): Promise<string> {
		const metadata = await this.service.getMetadata(url);
		return this.format(url, metadata);
	}

	private format(url: string, metadata: LinkMetadata): string {
		return buildMarkdownPreview(url, metadata, this.getSettings());
	}
}
