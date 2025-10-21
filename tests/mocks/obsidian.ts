import { vi } from 'vitest';

// Request URL Types
export interface RequestUrlParams {
	url: string;
	method?: string;
	headers?: Record<string, string>;
	body?: string | ArrayBuffer;
	throw?: boolean;
}

export interface RequestUrlResponse {
	status: number;
	text: string;
	headers: Record<string, string>;
	json?: () => Promise<unknown>;
	arrayBuffer?: () => Promise<ArrayBuffer>;
}

// Mock Request URL Builder
class MockRequestUrlBuilder {
	private mocks = new Map<string, RequestUrlResponse | Error>();
	private calls = new Map<string, RequestUrlParams[]>();
	private defaultResponse: RequestUrlResponse = {
		status: 200,
		text: '',
		headers: {}
	};

	mockResponse(url: string, response: Partial<RequestUrlResponse>): void {
		this.mocks.set(url, {
			...this.defaultResponse,
			...response
		});
	}

	mockError(url: string, error: Error): void {
		this.mocks.set(url, error);
	}

	mockTimeout(url: string, delayMs: number = 5000): void {
		const error = new Error(`Request timed out after ${delayMs}ms`);
		error.name = 'TimeoutError';
		this.mocks.set(url, error);
	}

	async execute(params: RequestUrlParams): Promise<RequestUrlResponse> {
		// Track call
		const urlCalls = this.calls.get(params.url) || [];
		urlCalls.push(params);
		this.calls.set(params.url, urlCalls);

		const mock = this.mocks.get(params.url);

		if (!mock) {
			throw new Error(`No mock configured for URL: ${params.url}`);
		}

		if (mock instanceof Error) {
			throw mock;
		}

		return mock;
	}

	getCallCount(url: string): number {
		return this.calls.get(url)?.length || 0;
	}

	getLastRequest(url: string): RequestUrlParams | undefined {
		const urlCalls = this.calls.get(url);
		return urlCalls?.[urlCalls.length - 1];
	}

	reset(): void {
		this.mocks.clear();
		this.calls.clear();
	}

	hasUrl(url: string): boolean {
		return this.mocks.has(url);
	}
}

export const mockRequestUrlBuilder = new MockRequestUrlBuilder();

export async function requestUrl(params: RequestUrlParams): Promise<RequestUrlResponse> {
	return mockRequestUrlBuilder.execute(params);
}

// Notice Mock
export class Notice {
	message: string;
	constructor(message: string) {
		this.message = message;
	}
}

// Plugin Mock
export class Plugin {
	app: any;
	manifest: any;

	async loadData(): Promise<any> {
		return {};
	}

	async saveData(data: any): Promise<void> {
		// Mock implementation
	}

	addCommand(command: any): void {
		// Mock implementation
	}

	registerEvent(event: any): void {
		// Mock implementation
	}

	registerDomEvent(el: any, type: string, callback: any): void {
		// Mock implementation
	}

	registerInterval(interval: number): number {
		return 0;
	}
}

// Vault Mock
export class Vault {
	adapter: any;

	async read(file: any): Promise<string> {
		return '';
	}

	async modify(file: any, data: string): Promise<void> {
		// Mock implementation
	}

	async create(path: string, data: string): Promise<any> {
		return {};
	}
}

// App Mock
export class App {
	vault: Vault;
	workspace: any;

	constructor() {
		this.vault = new Vault();
		this.workspace = {};
	}
}

// Setting Mock
export class Setting {
	settingEl: HTMLDivElement;

	constructor(containerEl: HTMLElement) {
		this.settingEl = document.createElement('div');
	}

	setName(name: string): this {
		return this;
	}

	setDesc(desc: string): this {
		return this;
	}

	addText(cb: (component: any) => any): this {
		cb({
			setValue: vi.fn(),
			onChange: vi.fn(),
			setPlaceholder: vi.fn()
		});
		return this;
	}

	addToggle(cb: (component: any) => any): this {
		cb({
			setValue: vi.fn(),
			onChange: vi.fn()
		});
		return this;
	}

	addDropdown(cb: (component: any) => any): this {
		cb({
			addOption: vi.fn(),
			setValue: vi.fn(),
			onChange: vi.fn()
		});
		return this;
	}

	addSlider(cb: (component: any) => any): this {
		cb({
			setLimits: vi.fn(),
			setValue: vi.fn(),
			setDynamicTooltip: vi.fn(),
			onChange: vi.fn()
		});
		return this;
	}

	addButton(cb: (component: any) => any): this {
		cb({
			setButtonText: vi.fn(),
			onClick: vi.fn()
		});
		return this;
	}
}

// PluginSettingTab Mock
export class PluginSettingTab {
	app: App;
	plugin: Plugin;
	containerEl: HTMLElement;

	constructor(app: App, plugin: Plugin) {
		this.app = app;
		this.plugin = plugin;
		this.containerEl = document.createElement('div');
	}

	display(): void {
		// Mock implementation
	}

	hide(): void {
		// Mock implementation
	}
}

// TAbstractFile Mock
export class TAbstractFile {
	vault: Vault | null = null;
	path: string = '';
	name: string = '';
	parent: any = null;
}

// TFile Mock
export class TFile extends TAbstractFile {
	extension: string;
	stat: any;
	basename: string;

	constructor(extension: string = 'md') {
		super();
		this.extension = extension;
		this.basename = 'file';
		this.stat = { ctime: Date.now(), mtime: Date.now(), size: 0 };
	}
}

// TFolder Mock
export class TFolder extends TAbstractFile {
	children: (TFile | TFolder)[];
	isRoot: boolean;

	constructor(children: (TFile | TFolder)[] = []) {
		super();
		this.children = children;
		this.isRoot = false;
	}
}
