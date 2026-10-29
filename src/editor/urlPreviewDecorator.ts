import { editorLivePreviewField } from "obsidian";
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { Prec, RangeSetBuilder, StateEffect } from "@codemirror/state";
import type { LinkPreviewService } from "../services/linkPreviewService";
import type { InlineLinkPreviewSettings } from "../settings";
import { buildUrlDecorations, type ScanRange } from "../decorators/DecorationBuilder";

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
			// From the last build, for deciding whether a cursor move needs a rebuild
			private urlRanges: ScanRange[] = [];
			private cursorSensitive = false;
			private urlsAtLastCursor = "";

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

				// Rebuild if doc changed, viewport changed, mode changed, OR if we received a refresh effect
				if (
					update.docChanged ||
					update.viewportChanged ||
					modeChanged ||
					update.transactions.some(tr => tr.effects.some(e => e.is(refreshDecorationsEffect)))
				) {
					this.decorations = this.buildDecorations(update.view);
					return;
				}

				// A cursor move only matters in inline mode, and only when it
				// enters or leaves a URL (which then shows as raw text)
				if (
					update.selectionSet &&
					this.cursorSensitive &&
					this.urlsAtCursor(update.state.selection.main.head) !== this.urlsAtLastCursor
				) {
					this.decorations = this.buildDecorations(update.view);
				}
			}

			/** Key identifying the URL ranges from the last build that contain `pos` */
			private urlsAtCursor(pos: number): string {
				let key = "";
				for (const { from, to } of this.urlRanges) {
					if (from > pos) {
						break;
					}
					if (pos <= to) {
						key += `${from}-${to},`;
					}
				}
				return key;
			}

			buildDecorations(view: EditorView): DecorationSet {
				const settings = getSettings();

				this.urlRanges = [];
				this.cursorSensitive = false;

				// Only show in Live Preview mode
				const isLivePreview = view.state.field(editorLivePreviewField);
				if (!isLivePreview) {
					return Decoration.none;
				}

				const builder = new RangeSetBuilder<Decoration>();

				// Build decorations for the visible part of the note only
				const result = buildUrlDecorations(
					view.state,
					view.visibleRanges,
					service,
					settings,
					this.pendingUpdates,
					(url: string) => this.queueMetadataFetch(url, view)
				);

				this.urlRanges = result.urlRanges;
				this.cursorSensitive = result.cursorSensitive;
				this.urlsAtLastCursor = this.urlsAtCursor(view.state.selection.main.head);

				// Sort decorations by position (required by RangeSetBuilder)
				const decorationsToAdd = result.decorations.sort((a, b) => a.from - b.from);

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
			 *    a single rebuild instead of one rebuild per URL
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
