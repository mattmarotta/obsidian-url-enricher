const HTML_TAG_REGEX = /<[^>]+>/g;
const ENTITY_REGEX = /&(#x?[0-9a-f]+|\w+);/gi;

const NAMED_ENTITIES: Record<string, string> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
	nbsp: " ",
	cent: "¢",
	pound: "£",
	yen: "¥",
	euro: "€",
	copy: "©",
	reg: "®",
	ndash: "–",
	mdash: "—",
	hellip: "…",
};

function decodeEntity(entity: string): string | null {
	if (!entity) {
		return null;
	}

	if (entity[0] === "#") {
		const isHex = entity[1]?.toLowerCase() === "x";
		const numericValue = isHex ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10);
		if (Number.isFinite(numericValue) && numericValue > 0) {
			try {
				return String.fromCodePoint(numericValue);
			} catch {
				return null;
			}
		}
		return null;
	}

	const mapped = NAMED_ENTITIES[entity.toLowerCase()];
	return mapped ?? null;
}

export function decodeHtmlEntities(value: string): string {
	if (!value || !value.includes("&")) {
		return value;
	}

	if (typeof document !== "undefined" && document?.createElement) {
		const textarea = document.createElement("textarea");
		textarea.innerHTML = value;
		return textarea.value;
	}

	return value.replace(ENTITY_REGEX, (match, entity) => decodeEntity(entity) ?? match);
}

export function stripHtmlTags(value: string): string {
	return value.replace(HTML_TAG_REGEX, " ");
}

export function collapseWhitespace(value: string): string {
	return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

export function sanitizeTextContent(value: string): string {
	if (!value) {
		return "";
	}

	const decoded = decodeHtmlEntities(value);
	const withoutTags = stripHtmlTags(decoded);
	return collapseWhitespace(withoutTags);
}
