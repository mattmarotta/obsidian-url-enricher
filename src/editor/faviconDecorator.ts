import { editorLivePreviewField, editorViewField } from "obsidian";
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import type { LinkPreviewService } from "../services/linkPreviewService";
import type { InlineLinkPreviewSettings } from "../settings";

class FaviconWidget extends WidgetType {
	constructor(private faviconUrl: string) {
		super();
	}

	toDOM(): HTMLElement {
		const img = document.createElement("img");
		img.src = this.faviconUrl;
		img.className = "inline-link-favicon";
		img.alt = "";
		return img;
	}

	eq(other: FaviconWidget): boolean {
		return other.faviconUrl === this.faviconUrl;
	}

	ignoreEvent(): boolean {
		return true;
	}
}

export function createFaviconDecorator(
	service: LinkPreviewService,
	getSettings: () => InlineLinkPreviewSettings
) {
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;
			private pendingUpdates = new Map<string, Promise<void>>();
			private updateTimeout: ReturnType<typeof setTimeout> | null = null;

			constructor(view: EditorView) {
				this.decorations = this.buildDecorations(view);
			}

			destroy(): void {
				if (this.updateTimeout !== null) {
					clearTimeout(this.updateTimeout);
				}
			}

			update(update: ViewUpdate): void {
				if (update.docChanged || update.viewportChanged) {
					this.decorations = this.buildDecorations(update.view);
				}
			}

			buildDecorations(view: EditorView): DecorationSet {
				const settings = getSettings();
				if (!settings.showFavicon) {
					return Decoration.none;
				}

				// Only show in Live Preview mode
				const isLivePreview = view.state.field(editorLivePreviewField);
				if (!isLivePreview) {
					return Decoration.none;
				}

				const builder = new RangeSetBuilder<Decoration>();
				const doc = view.state.doc;
				const text = doc.toString();

				// Match markdown links: [text](url)
				const linkRegex = /\[([^\]]+)\]\(<?([^)>]+)>?\)/g;
				let match;

				while ((match = linkRegex.exec(text)) !== null) {
					const url = match[2];
					const linkStart = match.index;

					// Only process http/https URLs
					if (url.startsWith("http://") || url.startsWith("https://")) {
						// Queue favicon fetch and decoration update
						this.queueFaviconFetch(url, linkStart, view);

						// Try to get cached favicon
						const cache = (service as any).cache as Map<string, any> | undefined;
						const metadata = cache?.get(url);
						if (metadata && metadata.favicon) {
							const widget = Decoration.widget({
								widget: new FaviconWidget(metadata.favicon),
								side: -1,
							});
							builder.add(linkStart, linkStart, widget);
						}
					}
				}

				return builder.finish();
			}

			private queueFaviconFetch(url: string, pos: number, view: EditorView): void {
				if (this.pendingUpdates.has(url)) {
					return;
				}

				const promise = service.getMetadata(url).then(() => {
					// Use a short timeout to batch updates and ensure cache is populated
					if (this.updateTimeout !== null) {
						clearTimeout(this.updateTimeout);
					}
					this.updateTimeout = setTimeout(() => {
						this.decorations = this.buildDecorations(view);
						view.requestMeasure();
						this.updateTimeout = null;
					}, 50);
				}).catch(() => {
					// Silently ignore errors
				}).finally(() => {
					this.pendingUpdates.delete(url);
				});

				this.pendingUpdates.set(url, promise);
			}
		},
		{
			decorations: (v) => v.decorations,
		}
	);
}
