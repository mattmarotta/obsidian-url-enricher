import { editorLivePreviewField } from "obsidian";
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { RangeSetBuilder, StateEffect } from "@codemirror/state";
import type { LinkPreviewService } from "../services/linkPreviewService";
import type { InlineLinkPreviewSettings } from "../settings";
import { buildUrlDecorations } from "../decorators/DecorationBuilder";

// StateEffect to trigger decoration refresh when settings change
export const refreshDecorationsEffect = StateEffect.define<null>();

/**
 * Creates a CodeMirror ViewPlugin that decorates URLs with rich previews
 */
export function createUrlPreviewDecorator(
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
				// Check if Live Preview mode changed
				const wasLivePreview = update.startState.field(editorLivePreviewField);
				const isLivePreview = update.state.field(editorLivePreviewField);
				const modeChanged = wasLivePreview !== isLivePreview;

				// Check if selection (cursor position) changed
				const selectionChanged = update.selectionSet;

				// Rebuild if doc changed, viewport changed, mode changed, selection changed, OR if we received a refresh effect
				if (
					update.docChanged ||
					update.viewportChanged ||
					modeChanged ||
					selectionChanged ||
					update.transactions.some(tr => tr.effects.some(e => e.is(refreshDecorationsEffect)))
				) {
					this.decorations = this.buildDecorations(update.view);
				}
			}

			buildDecorations(view: EditorView): DecorationSet {
				const settings = getSettings();

				// Only show in Live Preview mode
				const isLivePreview = view.state.field(editorLivePreviewField);
				if (!isLivePreview) {
					return Decoration.none;
				}

				console.log('[Inline Link Preview] buildDecorations called');

				const builder = new RangeSetBuilder<Decoration>();

				// Build decorations using the DecorationBuilder module
				const decorationsToAdd = buildUrlDecorations(
					view,
					service,
					settings,
					this.pendingUpdates,
					(url: string) => this.queueMetadataFetch(url, view)
				);

				// Sort decorations by position (required by RangeSetBuilder)
				decorationsToAdd.sort((a, b) => a.from - b.from);

				// Add all decorations to builder in sorted order
				for (const { from, to, decoration } of decorationsToAdd) {
					builder.add(from, to, decoration);
				}

				return builder.finish();
			}

			private queueMetadataFetch(url: string, view: EditorView): void {
				if (this.pendingUpdates.has(url)) {
					return;
				}

				// Check if already cached
				if (service.hasCachedMetadata(url)) {
					return;
				}

				const promise = service.getMetadata(url).then(() => {
					// Rebuild decorations immediately after metadata is fetched
					this.decorations = this.buildDecorations(view);

					// Force a full viewport update to ensure the view re-renders
					view.dispatch({
						effects: []
					});
				}).catch(() => {
					// Silently ignore errors - no preview will be shown
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
