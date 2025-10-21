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
