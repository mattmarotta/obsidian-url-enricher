import type InlineLinkPreviewPlugin from "../main";

export class RateLimitStatusManager {
	private readonly plugin: InlineLinkPreviewPlugin;
	private enabled = true;
	private statusEl: HTMLElement | null = null;
	private intervalId: number | null = null;
	private resetAt: number | null = null;

	constructor(plugin: InlineLinkPreviewPlugin) {
		this.plugin = plugin;
	}

	setEnabled(enabled: boolean): void {
		this.enabled = enabled;
		if (!enabled) {
			this.clearStatus();
			return;
		}

		if (this.resetAt && this.resetAt > Date.now()) {
			this.ensureStatus();
		}
	}

	update(resetAt: number | null): void {
		this.resetAt = resetAt && resetAt > Date.now() ? resetAt : null;
		if (!this.enabled) {
			return;
		}

		if (this.resetAt) {
			this.ensureStatus();
		} else {
			this.clearStatus();
		}
	}

	private ensureStatus(): void {
		if (!this.statusEl) {
			this.statusEl = this.plugin.addStatusBarItem();
			this.statusEl.addClass("inline-link-preview-rate-limit");
		}

		this.render();
		if (this.intervalId === null) {
			const id = window.setInterval(() => this.render(), 1000);
			this.plugin.registerInterval(id);
			this.intervalId = id;
		}
	}

	private render(): void {
		if (!this.statusEl) {
			return;
		}

		if (!this.resetAt || this.resetAt <= Date.now()) {
			this.clearStatus();
			return;
		}

		const remainingMs = this.resetAt - Date.now();
		const totalSeconds = Math.ceil(remainingMs / 1000);
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;

		let label: string;
		if (hours > 0) {
			label = `LinkPreview.net retry in ${hours}h ${minutes}m`;
		} else if (minutes > 0) {
			label = `LinkPreview.net retry in ${minutes}m ${seconds.toString().padStart(2, "0")}s`;
		} else {
			label = `LinkPreview.net retry in ${seconds}s`;
		}

		this.statusEl.setText(label);
	}

	private clearStatus(): void {
		if (this.statusEl) {
			this.statusEl.remove();
			this.statusEl = null;
		}

		if (this.intervalId !== null) {
			window.clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}
}
