const INVALID_FILENAME_CHARS = /[<>:"/\\|?*]+/g;
const TRAILING_DOTS_AND_SPACES = /[.\s]+$/g;
const isControlCharacter = (char: string) => {
	const code = char.charCodeAt(0);
	return code >= 0 && code <= 31;
};

export const buildGlbExportFilename = (name: string, fallback = 'model'): string => {
	const trimmed = name.trim();
	const withoutControlChars = Array.from(trimmed || fallback)
		.filter((char) => !isControlCharacter(char))
		.join('');
	const baseName = withoutControlChars
		.replace(INVALID_FILENAME_CHARS, '_')
		.replace(TRAILING_DOTS_AND_SPACES, '')
		.trim();

	const resolvedName = baseName.length > 0 ? baseName : fallback;
	return resolvedName.toLowerCase().endsWith('.glb') ? resolvedName : `${resolvedName}.glb`;
};

export const downloadArrayBufferAsGlb = (glb: ArrayBuffer, filename: string): void => {
	const blob = new Blob([glb], { type: 'model/gltf-binary' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	setTimeout(() => {
		URL.revokeObjectURL(url);
	}, 0);
};
