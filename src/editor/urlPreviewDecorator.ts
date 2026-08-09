import { editorLivePreviewField } from "obsidian";
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { Prec, RangeSetBuilder, StateEffect } from "@codemirror/state";
import type { LinkPreviewService } from "../services/linkPreviewService";
import type { InlineLinkPreviewSettings } from "../settings";
import { buildUrlDecorations } from "../decorators/DecorationBuilder";

// StateEffect to trigger decoration refresh when settings change
export const refreshDecorationsEffect = StateEffect.define<null>();

/**
 * Creates a CodeMirror ViewPlugin that decorates URLs with rich previews
 *
 * Registered at Prec.highest: Obsidian's Live Preview installs its own replace
 * decorations over markdown-link and wikilink ranges before plugin extensions.
 * At default precedence theirs wins those ranges, so previews only ever
 * appeared for bare URLs - bracketed links rendered nothing until the caret
 * moved onto the line and Live Preview revealed the raw markup.
 */
export function createUrlPreviewDecorator(
	service: LinkPreviewService,
	getSettings: () => InlineLinkPreviewSettings
) {
	return Prec.highest(ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;
			private pendingUpdates = new Map<string, Promise<void>>();
			private updateTimeout: number | null = null;

			constructor(view: EditorView) {
				this.decorations = this.buildDecorations(view);
			}

			destroy(): void {
				if (this.updateTimeout !== null) {
					window.clearTimeout(this.updateTimeout);
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

				const promise = service.getMetadata(url)
					.then(() => undefined)
					.catch(() => {
						// Ignore fetch errors - the URL just renders without a preview
					})
					.finally(() => {
						this.pendingUpdates.delete(url);
						this.requestRefresh(view);
					});

				this.pendingUpdates.set(url, promise);
			}

			/**
			 * Ask the view to rebuild decorations through the normal update cycle.
			 *
			 * Deferring to a timer matters for two reasons:
			 *  - dispatching synchronously from a promise callback can land while
			 *    CodeMirror is mid-update, which throws and gets swallowed by the
			 *    fetch's catch handler, losing the repaint
			 *  - several URLs usually resolve at once, so this coalesces them into
			 *    a single rebuild instead of one full-document rescan per URL
			 */
			private requestRefresh(view: EditorView): void {
				if (this.updateTimeout !== null) {
					return;
				}

				this.updateTimeout = window.setTimeout(() => {
					this.updateTimeout = null;
					view.dispatch({ effects: refreshDecorationsEffect.of(null) });
				}, 0);
			}
		},
		{
			decorations: (v) => v.decorations,
		}
	));
}
