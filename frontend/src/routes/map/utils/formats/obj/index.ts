/**
 * References:
 * - https://www.loc.gov/preservation/digital/formats/fdd/fdd000507.shtml
 * - https://www.fileformat.info/format/wavefrontobj/egff.htm
 */
import { type EpsgCode, getEpsgInfo, isValidEpsg } from '$routes/map/utils/proj/dict';

export interface ObjFileInspectionResult {
	isPointCloud: boolean;
	hasFaces: boolean;
	vertexCount: number;
	projectedModelEpsg: EpsgCode | null;
	referencedMaterialLibraries: string[];
}

export interface ObjPointCloudParseResult {
	positions: Float32Array;
	colors: Uint8Array | null;
	pointCount: number;
}

export interface ObjMaterialInspectionResult {
	referencedTexturePaths: string[];
}

const clampColor = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));
const EPSG_AUTHORITY_PATTERN = /AUTHORITY\s*\[\s*"EPSG"\s*,\s*"(\d+)"\s*\]/gi;
const MTL_OPTION_ARGUMENT_COUNTS: Record<string, number> = {
	'-blendu': 1,
	'-blendv': 1,
	'-boost': 1,
	'-mm': 2,
	'-o': 3,
	'-s': 3,
	'-t': 3,
	'-texres': 1,
	'-clamp': 1,
	'-bm': 1,
	'-imfchan': 1,
	'-type': 1,
	'-colorspace': 1,
	'-gamma': 1
};

const tokenizeWavefrontArguments = (value: string): string[] => {
	return value.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
};

const unquoteWavefrontToken = (value: string): string => {
	return value.replace(/^['"]|['"]$/g, '');
};

const isMtlTextureReferenceCommand = (keyword: string): boolean => {
	return keyword.startsWith('map_')
		|| ['bump', 'disp', 'decal', 'norm', 'refl'].includes(keyword);
};

const extractMtlTexturePath = (value: string): string | null => {
	const tokens = tokenizeWavefrontArguments(value);
	let index = 0;

	while (index < tokens.length) {
		const token = unquoteWavefrontToken(tokens[index] ?? '');
		if (!token.startsWith('-')) break;

		const optionKey = token.toLowerCase();
		const argumentCount = MTL_OPTION_ARGUMENT_COUNTS[optionKey];
		if (argumentCount === undefined) break;

		index += argumentCount + 1;
	}

	const texturePath = tokens
		.slice(index)
		.map((token) => unquoteWavefrontToken(token))
		.join(' ')
		.trim();

	return texturePath || null;
};

const detectProjectedModelEpsgFromObjText = (text: string): EpsgCode | null => {
	const lines = text.split(/\r?\n/);
	const coordinateSystemLineIndex = lines.findIndex((rawLine) => {
		const line = rawLine.trim();
		return line.startsWith('#') && line.includes('COORDINATE_SYSTEM:');
	});
	if (coordinateSystemLineIndex < 0) return null;

	const coordinateSystemLines: string[] = [];
	for (let index = coordinateSystemLineIndex; index < lines.length; index += 1) {
		const line = lines[index]?.trim() ?? '';
		if (!line.startsWith('#')) break;
		coordinateSystemLines.push(line.replace(/^#\s?/, ''));
	}

	const candidateCodes = Array.from(
		coordinateSystemLines.join('\n').matchAll(EPSG_AUTHORITY_PATTERN),
		(match) => match[1]
	).reverse();

	for (const code of candidateCodes) {
		if (!isValidEpsg(code)) continue;
		if (!getEpsgInfo(code).projection_method) continue;
		return code;
	}

	return null;
};

export const inspectObjFile = async (file: File): Promise<ObjFileInspectionResult> => {
	const text = await file.text();
	const lines = text.split(/\r?\n/);
	const projectedModelEpsg = detectProjectedModelEpsgFromObjText(text);
	const referencedMaterialLibraries = new Set<string>();

	let vertexCount = 0;
	let hasFaces = false;

	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#')) continue;

		if (line.startsWith('mtllib ')) {
			const libraryPath = line.slice('mtllib '.length).trim();
			if (libraryPath) {
				referencedMaterialLibraries.add(libraryPath);
			}
		}

		if (line.startsWith('f ')) {
			hasFaces = true;
			break;
		}

		if (line.startsWith('v ')) {
			vertexCount += 1;
		}
	}

	return {
		isPointCloud: vertexCount > 0 && !hasFaces,
		hasFaces,
		vertexCount,
		projectedModelEpsg,
		referencedMaterialLibraries: [...referencedMaterialLibraries]
	};
};

export const inspectMtlFile = async (file: File): Promise<ObjMaterialInspectionResult> => {
	const text = await file.text();
	const lines = text.split(/\r?\n/);
	const referencedTexturePaths = new Set<string>();

	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#')) continue;

		const match = line.match(/^([^\s]+)\s+(.+)$/);
		if (!match) continue;

		const keyword = match[1]?.toLowerCase() ?? '';
		const value = match[2]?.trim() ?? '';
		if (!isMtlTextureReferenceCommand(keyword) || !value) continue;

		const texturePath = extractMtlTexturePath(value);
		if (texturePath) {
			referencedTexturePaths.add(texturePath);
		}
	}

	return {
		referencedTexturePaths: [...referencedTexturePaths]
	};
};

export const parseObjPointCloudFile = async (file: File): Promise<ObjPointCloudParseResult> => {
	const text = await file.text();
	const lines = text.split(/\r?\n/);
	const positions: number[] = [];
	const colorRows: number[][] = [];
	let hasFaces = false;

	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#')) continue;

		if (line.startsWith('f ')) {
			hasFaces = true;
			break;
		}

		if (!line.startsWith('v ')) continue;

		const valuesText = line.slice(2).trim();
		const values: number[] = valuesText.split(/\s+/).map((value: string) => Number(value));

		if (values.length < 3 || values.slice(0, 3).some((value) => !Number.isFinite(value))) {
			continue;
		}

		positions.push(values[0], values[1], values[2]);

		if (values.length >= 6 && values.slice(3, 6).every((value) => Number.isFinite(value))) {
			colorRows.push(values.slice(3, 6));
		}
	}

	if (hasFaces) {
		throw new Error('面を持つOBJは点群として読み込めません');
	}

	const pointCount = positions.length / 3;
	if (pointCount === 0) {
		return { positions: new Float32Array(0), colors: null, pointCount: 0 };
	}

	const hasColor = colorRows.length === pointCount;
	let colors: Uint8Array | null = null;

	if (hasColor) {
		const useUnitColor = colorRows.every((row) =>
			row.every((value) => value >= 0 && value <= 1)
		);
		const colorValues = colorRows.flatMap((row) =>
			row.map((value) => clampColor(useUnitColor ? value * 255 : value))
		);
		colors = new Uint8Array(colorValues);
	}

	return {
		positions: new Float32Array(positions),
		colors,
		pointCount
	};
};
