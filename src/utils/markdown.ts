export interface MarkdownLinkRange {
	start: number;
	end: number;
}

export function findMarkdownLinkRange(content: string, urlStart: number, urlEnd: number): MarkdownLinkRange | null {
	if (urlStart <= 0) {
		return null;
	}

	const openBracket = content.lastIndexOf("[", urlStart);
	if (openBracket === -1) {
		return null;
	}
	if (openBracket > urlStart) {
		return null;
	}
	if (openBracket > 0 && content[openBracket - 1] === "!") {
		return null;
	}

	const closeBracket = content.indexOf("]", urlEnd);
	if (closeBracket === -1 || closeBracket < urlEnd) {
		return null;
	}

	let cursor = closeBracket + 1;
	while (cursor < content.length && content[cursor] === " ") {
		cursor += 1;
	}

	if (cursor >= content.length || content[cursor] !== "(") {
		return null;
	}

	let depth = 0;
	for (let index = cursor; index < content.length; index += 1) {
		const char = content[index];
		if (char === "(") {
			depth += 1;
		} else if (char === ")") {
			depth -= 1;
			if (depth === 0) {
				return {
					start: openBracket,
					end: index + 1,
				};
			}
		} else if (char === "\n") {
			break;
		}
	}

	return null;
}
