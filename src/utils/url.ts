const SINGLE_URL_REGEX = /^https?:\/\/[^\s]+$/i;
const WRAPPED_URL_REGEX = /^<\s*(https?:\/\/[^\s>]+)\s*>$/i;

export const URL_IN_TEXT_REGEX = /https?:\/\/[^\s<>\]\)}"']+/gi;

export function extractSingleUrl(text: string): string | null {
	if (!text) {
		return null;
	}

	const trimmed = text.trim();
	if (!trimmed) {
		return null;
	}

	const wrappedMatch = trimmed.match(WRAPPED_URL_REGEX);
	if (wrappedMatch) {
		return wrappedMatch[1];
	}

	if (SINGLE_URL_REGEX.test(trimmed)) {
		return trimmed;
	}

	return null;
}

export function looksLikeUrl(text: string): boolean {
	return SINGLE_URL_REGEX.test(text.trim());
}
