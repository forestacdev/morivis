import { formatCzml } from './definition';

// 判定時にはCesiumやファイル全体を読み込まない。
export const isCzmlFile = async (file: File): Promise<boolean> => {
	if (/\.czml$/i.test(file.name)) return true;
	if (!/\.json$/i.test(file.name)) return false;
	try {
		const text = (await file.slice(0, 65_536).text()).trim();
		if (!/^\[\s*\{/.test(text)) return false;
		const start = text.indexOf('{');
		let depth = 0, quoted = false, escaped = false;
		for (let i = start; i < text.length; i++) {
			const char = text[i];
			if (quoted) {
				if (escaped) escaped = false;
				else if (char === '\\') escaped = true;
				else if (char === '"') quoted = false;
			} else if (char === '"') quoted = true;
			else if (char === '{') depth++;
			else if (char === '}' && --depth === 0) {
				const packet = JSON.parse(text.slice(start, i + 1));
				return packet.id === 'document' && typeof packet.version === 'string';
			}
		}
	} catch {
		return false;
	}
	return false;
};

/** フォルダードロップ・ZIP・ファイル選択で共通のパス。 */
export const czmlFilePath = (file: File): string =>
	((file as File & { morivisRelativePath?: string; }).morivisRelativePath
		|| file.webkitRelativePath || file.name).replaceAll('\\', '/');

export const mergeCzmlFiles = (current: File[], incoming: File[]): File[] => {
	const files = new Map<string, File>();
	for (const file of [...current, ...incoming]) files.set(czmlFilePath(file), file);
	return [...files.values()];
};

export const isCzmlSupplementaryBatch = async (
	current: File[],
	incoming: File[]
): Promise<boolean> => {
	if (
		!incoming.length
		|| !incoming.every(file =>
			formatCzml.files.optionalExtensions.some(extension =>
				file.name.toLowerCase().endsWith(extension)
			)
		)
	) return false;
	return (await Promise.all(current.map(isCzmlFile))).some(Boolean);
};
