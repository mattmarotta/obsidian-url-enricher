export interface TextReplacement {
	start: number;
	end: number;
	value: string;
}

export function applyReplacements(source: string, replacements: TextReplacement[]): string {
	if (!replacements.length) {
		return source;
	}

	const sorted = [...replacements].sort((a, b) => b.start - a.start);
	let output = source;
	for (const replacement of sorted) {
		output =
			output.slice(0, replacement.start) + replacement.value + output.slice(replacement.end);
	}

	return output;
}
