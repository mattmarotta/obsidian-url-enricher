import type InlineLinkPreviewPlugin from "../main";

export interface ProgressReporter {
	setTotal(total: number | null): void;
	setLabel(label: string): void;
	increment(amount?: number): void;
	finish(): void;
}

export class LinkProcessingStatusManager {
	private readonly plugin: InlineLinkPreviewPlugin;
	private statusEl: HTMLElement | null = null;
	private activeHandle: ProgressHandle | null = null;
	private clearTimeoutId: number | null = null;

	constructor(plugin: InlineLinkPreviewPlugin) {
		this.plugin = plugin;
	}

	create(label: string, total: number | null = null): ProgressReporter {
		const handle = new ProgressHandle(this, label, total);
		this.activate(handle);
		return handle;
	}

	private activate(handle: ProgressHandle): void {
		if (this.activeHandle) {
			this.activeHandle.detach();
		}
		this.activeHandle = handle;
		this.render(handle);
	}

	private ensureStatusEl(): HTMLElement {
		if (!this.statusEl) {
			const container = document.body;
			this.statusEl = container.createDiv({ cls: "inline-link-preview-progress" });
			this.statusEl.createSpan({ cls: "inline-link-preview-progress__label" });
			const bar = this.statusEl.createDiv({ cls: "inline-link-preview-progress__bar" });
			bar.createDiv({ cls: "inline-link-preview-progress__bar-fill" });
		}
		this.statusEl.removeClass("inline-link-preview-progress--fade");
		return this.statusEl;
	}

	private render(handle: ProgressHandle): void {
		if (handle !== this.activeHandle) {
			return;
		}

		const el = this.ensureStatusEl();
		const label = el.querySelector(".inline-link-preview-progress__label");
		if (label) {
			label.textContent = this.formatLabel(handle);
		}

		const fill = el.querySelector<HTMLElement>(".inline-link-preview-progress__bar-fill");
		if (fill) {
			const percent = this.computePercent(handle);
			if (percent === null) {
				fill.style.width = "100%";
				fill.style.opacity = "0.3";
			} else {
				fill.style.opacity = "1";
				fill.style.width = `${percent}%`;
			}
		}
	}

	private formatLabel(handle: ProgressHandle): string {
		const { label, completed, total } = handle;
		const hasTotal = typeof total === "number" && total > 0;

		if (hasTotal) {
			const cappedTotal = Math.max(total ?? 0, completed);
			return `${label} ${completed}/${cappedTotal}`;
		}

		return completed > 0 ? `${label} ${completed} processed` : `${label}…`;
	}

	private computePercent(handle: ProgressHandle): number | null {
		if (!handle.total || handle.total <= 0) {
			return null;
		}
		const clamped = Math.min(handle.completed, handle.total);
		return (clamped / handle.total) * 100;
	}

	private clear(handle: ProgressHandle): void {
		if (handle !== this.activeHandle) {
			return;
		}

		if (this.statusEl) {
			this.statusEl.addClass("inline-link-preview-progress--fade");
			if (this.clearTimeoutId !== null) {
				window.clearTimeout(this.clearTimeoutId);
			}
			this.clearTimeoutId = window.setTimeout(() => {
				this.statusEl?.remove();
				this.statusEl = null;
				this.clearTimeoutId = null;
			}, 200);
		}

		this.activeHandle = null;
	}

	notifyProgress(handle: ProgressHandle): void {
		this.render(handle);
	}

	complete(handle: ProgressHandle): void {
		if (handle !== this.activeHandle) {
			return;
		}
		this.clear(handle);
	}
}

class ProgressHandle implements ProgressReporter {
	label: string;
	private readonly manager: LinkProcessingStatusManager;
	private finished = false;
	completed = 0;
	total: number | null;

	constructor(manager: LinkProcessingStatusManager, label: string, total: number | null) {
		this.manager = manager;
		this.label = label;
		this.total = total && total > 0 ? total : null;
	}

	setLabel(label: string): void {
		if (this.finished) {
			return;
		}
		this.label = label;
		this.manager.notifyProgress(this);
	}

	setTotal(total: number | null): void {
		if (this.finished) {
			return;
		}
		this.total = total && total > 0 ? total : null;
		this.manager.notifyProgress(this);
	}

	increment(amount = 1): void {
		if (this.finished) {
			return;
		}
		this.completed += amount;
		this.manager.notifyProgress(this);
	}

	finish(): void {
		if (this.finished) {
			return;
		}
		this.finished = true;
		this.manager.complete(this);
	}

	detach(): void {
		this.finished = true;
	}
}
