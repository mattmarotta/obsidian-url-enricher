import { beforeEach, afterEach, vi } from 'vitest';
import { mockRequestUrlBuilder } from './mocks/obsidian';

// Reset mocks before each test
beforeEach(() => {
	mockRequestUrlBuilder.reset();
	vi.clearAllMocks();
});

// Cleanup after each test
afterEach(() => {
	vi.clearAllTimers();
	vi.restoreAllMocks();
});

// Global test utilities
declare global {
	function flushPromises(): Promise<void>;
}

// Helper to flush all pending promises
global.flushPromises = () => new Promise((resolve) => setImmediate(resolve));

// Obsidian injects activeDocument/activeWindow and the createEl/createDiv/createSpan
// DOM helpers as runtime globals (for popout-window compatibility). happy-dom doesn't
// provide them, so plugin code that uses them needs shims to run under test.
interface DomElementInfo {
	cls?: string | string[];
	text?: string;
	attr?: Record<string, string | number | boolean | null>;
}

function applyDomElementInfo(el: HTMLElement, o?: DomElementInfo | string): void {
	if (!o) {
		return;
	}
	if (typeof o === 'string') {
		el.className = o;
		return;
	}
	if (o.cls) {
		el.className = Array.isArray(o.cls) ? o.cls.join(' ') : o.cls;
	}
	if (o.text !== undefined) {
		el.textContent = o.text;
	}
	if (o.attr) {
		for (const [key, value] of Object.entries(o.attr)) {
			if (value !== null) {
				el.setAttribute(key, String(value));
			}
		}
	}
}

global.activeDocument = document;
global.activeWindow = window as unknown as typeof globalThis & Window;

global.createEl = ((tag: string, o?: DomElementInfo | string) => {
	const el = document.createElement(tag);
	applyDomElementInfo(el, o);
	return el;
}) as typeof createEl;

global.createDiv = ((o?: DomElementInfo | string) => {
	const el = document.createElement('div');
	applyDomElementInfo(el, o);
	return el;
}) as typeof createDiv;

global.createSpan = ((o?: DomElementInfo | string) => {
	const el = document.createElement('span');
	applyDomElementInfo(el, o);
	return el;
}) as typeof createSpan;
