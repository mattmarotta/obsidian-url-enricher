import { expect } from 'vitest';

export function expectValidUrl(url: string | null): void {
	expect(url).toBeTruthy();
	expect(url).toMatch(/^https?:\/\/.+/);
}

export function expectValidHttpsUrl(url: string | null): void {
	expect(url).toBeTruthy();
	expect(url).toMatch(/^https:\/\/.+/);
}

export function expectNullOrUndefined(value: any): void {
	expect(value == null).toBe(true);
}

export function expectMetadataStructure(metadata: any): void {
	expect(metadata).toBeDefined();
	expect(metadata).toHaveProperty('title');
	expect(metadata).toHaveProperty('description');
	expect(metadata).toHaveProperty('favicon');
}

export function expectValidMetadata(metadata: any): void {
	expectMetadataStructure(metadata);
	expect(typeof metadata.title).toBe('string');
	expect(metadata.title.length).toBeGreaterThan(0);
}

export function expectErrorMetadata(metadata: any): void {
	expectMetadataStructure(metadata);
	expect(metadata).toHaveProperty('error');
	expect(typeof metadata.error).toBe('string');
}

export function expectUrlListEntry(entry: any): void {
	expect(entry).toHaveProperty('url');
	expect(entry).toHaveProperty('start');
	expect(entry).toHaveProperty('end');
	expect(typeof entry.url).toBe('string');
	expect(typeof entry.start).toBe('number');
	expect(typeof entry.end).toBe('number');
	expect(entry.start).toBeGreaterThanOrEqual(0);
	expect(entry.end).toBeGreaterThan(entry.start);
}
