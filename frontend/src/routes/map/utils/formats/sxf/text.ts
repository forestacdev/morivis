import { SxfParseError } from './parse-error';

export type SxfTextFormat = 'sfc' | 'p21' | 'unknown';

const SXF_FEATURE_BLOCK_PATTERN = /\/\*SXF\d*\b/i;
const P21_ENTITY_PATTERN = /#\s*\d+\s*=\s*[A-Z][A-Z0-9_]*\s*\(/;

const decodeCandidate = (arrayBuffer: ArrayBuffer, encoding: string): string | null => {
	try {
		return new TextDecoder(encoding, { fatal: false }).decode(arrayBuffer);
	} catch {
		return null;
	}
};

const scoreDecodedText = (text: string): number => {
	const p21Score = text.includes('ISO-10303-21') ? 100_000 : 0;
	const blockCount = (text.match(/\/\*SXF/g) ?? []).length;
	const replacementCount = (text.match(/�/g) ?? []).length;
	return p21Score + blockCount * 1000 - replacementCount;
};

export const decodeSxfText = (arrayBuffer: ArrayBuffer): string => {
	const candidates = ['shift-jis', 'utf-8']
		.map((encoding) => decodeCandidate(arrayBuffer, encoding))
		.filter((candidate): candidate is string => candidate !== null);

	if (candidates.length === 0) {
		throw new SxfParseError('SXF テキストの文字コードを判定できませんでした');
	}

	return candidates.sort((left, right) => scoreDecodedText(right) - scoreDecodedText(left))[0];
};

export const detectSxfTextFormat = (text: string): SxfTextFormat => {
	if (SXF_FEATURE_BLOCK_PATTERN.test(text)) {
		return 'sfc';
	}

	if (text.includes('ISO-10303-21') && P21_ENTITY_PATTERN.test(text)) {
		return 'p21';
	}

	return 'unknown';
};

export const isP21Text = (text: string): boolean => detectSxfTextFormat(text) === 'p21';
