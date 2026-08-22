import type { Feature, FeatureCollection } from '$routes/map/types/geojson';
import type {
	LineStringGeometry,
	PointGeometry,
	PolygonGeometry
} from '$routes/map/types/geometry';
import type { FeatureProp } from '$routes/map/types/properties';

type SxfValue = string | number | SxfValue[];

interface SxfEntity {
	entityId: string;
	featureName: string;
	args: SxfValue[];
}

type SxfGeometryFeature =
	| Feature<LineStringGeometry, FeatureProp>
	| Feature<PointGeometry, FeatureProp>
	| Feature<PolygonGeometry, FeatureProp>;

type SxfPropertyValue = FeatureProp[string];

const SXF_BLOCK_PATTERN = /\/\*SXF(\d*)\s*([\s\S]*?)\s*SXF\1\*\//g;
const SXF_ENTITY_PATTERN = /#\s*(\d+)\s*=\s*([a-zA-Z0-9_]+)\s*\(([\s\S]*)\)\s*$/m;
const NUMERIC_PATTERN = /^[+-]?(?:\d+\.?\d*|\.\d+)$/;
const CIRCLE_SEGMENTS = 48;

export class SxfParseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'SxfParseError';
	}
}

const unescapeSxfString = (value: string): string =>
	value.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');

const isNumericValue = (value: SxfValue): value is number => typeof value === 'number';
const isStringValue = (value: SxfValue): value is string => typeof value === 'string';
const isArrayValue = (value: SxfValue | undefined): value is SxfValue[] => Array.isArray(value);

const parseScalarToken = (token: string): SxfValue => {
	const trimmed = token.trim();
	if (trimmed === '') return '';
	if (NUMERIC_PATTERN.test(trimmed)) return Number(trimmed);
	return trimmed;
};

const parseQuotedString = (
	text: string,
	startIndex: number
): { value: string; nextIndex: number; } => {
	let index = startIndex;
	const escapedWrapper = text[index] === '\\' && (text[index + 1] === "'" || text[index + 1] === '"');
	if (escapedWrapper) {
		index += 1;
	}

	const quote = text[index];
	index += 1;
	let value = '';

	while (index < text.length) {
		const current = text[index];

		if (escapedWrapper && current === '\\' && index + 1 < text.length) {
			const next = text[index + 1];
			if (next === quote) {
				return { value: unescapeSxfString(value), nextIndex: index + 2 };
			}
			if (next === '\\') {
				value += next;
				index += 2;
				continue;
			}
		}

		if (current === '\\' && index + 1 < text.length) {
			const next = text[index + 1];
			if (next === quote || next === '\\') {
				value += next;
				index += 2;
				continue;
			}
		}

		if (current === quote) {
			index += 1;
			if (text[index] === '\\') {
				index += 1;
			}
			return { value: unescapeSxfString(value), nextIndex: index };
		}

		value += current;
		index += 1;
	}

	throw new SxfParseError('SXF 文字列の終端が見つかりません');
};

const parseList = (
	text: string,
	startIndex = 0,
	terminator?: string
): { values: SxfValue[]; nextIndex: number; } => {
	const values: SxfValue[] = [];
	let index = startIndex;

	while (index < text.length) {
		while (index < text.length && /[\s,]/.test(text[index])) {
			index += 1;
		}

		if (terminator && text[index] === terminator) {
			return { values, nextIndex: index + 1 };
		}

		if (index >= text.length) break;

		const current = text[index];
		if (current === '(') {
			const nested = parseList(text, index + 1, ')');
			values.push(nested.values);
			index = nested.nextIndex;
			continue;
		}

		if (current === "'" || current === '"' || (current === '\\' && (text[index + 1] === "'" || text[index + 1] === '"'))) {
			const parsed = parseQuotedString(text, index);
			values.push(parsed.value);
			index = parsed.nextIndex;
			continue;
		}

		let end = index;
		while (end < text.length && text[end] !== ',' && text[end] !== ')') {
			end += 1;
		}
		values.push(parseScalarToken(text.slice(index, end)));
		index = end;
	}

	if (terminator) {
		throw new SxfParseError(`SXF 配列の終端 ${terminator} が見つかりません`);
	}

	return { values, nextIndex: index };
};

const parseSxfEntities = (text: string): SxfEntity[] => {
	const entities: SxfEntity[] = [];

	for (const match of text.matchAll(SXF_BLOCK_PATTERN)) {
		const block = match[2]?.trim();
		if (!block) continue;

		const entityMatch = block.match(SXF_ENTITY_PATTERN);
		if (!entityMatch) continue;

		const [, entityId, featureName, argsText] = entityMatch;
		const { values } = parseList(argsText);
		entities.push({ entityId, featureName, args: values });
	}

	return entities;
};

const decodeCandidate = (arrayBuffer: ArrayBuffer, encoding: string): string | null => {
	try {
		return new TextDecoder(encoding, { fatal: false }).decode(arrayBuffer);
	} catch {
		return null;
	}
};

const scoreDecodedText = (text: string): number => {
	const blockCount = (text.match(/\/\*SXF/g) ?? []).length;
	const replacementCount = (text.match(/�/g) ?? []).length;
	return blockCount * 1000 - replacementCount;
};

const decodeSxfText = (arrayBuffer: ArrayBuffer): string => {
	const candidates = ['shift-jis', 'utf-8']
		.map((encoding) => decodeCandidate(arrayBuffer, encoding))
		.filter((candidate): candidate is string => candidate !== null);

	if (candidates.length === 0) {
		throw new SxfParseError('SXF テキストの文字コードを判定できませんでした');
	}

	return candidates.sort((left, right) => scoreDecodedText(right) - scoreDecodedText(left))[0];
};

const getString = (value: SxfValue | undefined): string | undefined => {
	if (value == null) return undefined;
	if (isStringValue(value)) return value;
	if (isNumericValue(value)) return String(value);
	return undefined;
};

const getNumber = (value: SxfValue | undefined): number | null => {
	if (value == null) return null;
	if (isNumericValue(value)) return value;
	if (isStringValue(value) && NUMERIC_PATTERN.test(value.trim())) return Number(value);
	return null;
};

const getNumberArray = (value: SxfValue | undefined): number[] | null => {
	if (value == null) return null;

	if (isStringValue(value)) {
		const trimmed = value.trim();
		if (!trimmed.startsWith('(') || !trimmed.endsWith(')')) return null;

		try {
			const { values, nextIndex } = parseList(trimmed, 1, ')');
			if (nextIndex !== trimmed.length) return null;
			const numbers = values.map((item) => getNumber(item));
			return numbers.every((item): item is number => item !== null) ? numbers : null;
		} catch {
			return null;
		}
	}

	if (!isArrayValue(value)) return null;
	const numbers = value.map((item) => getNumber(item));
	return numbers.every((item): item is number => item !== null) ? numbers : null;
};

const getOptionalNumber = (value: SxfValue | undefined): number | undefined => {
	const number = getNumber(value);
	return number === null ? undefined : number;
};

const createProperties = (
	properties: Record<string, SxfPropertyValue | undefined>
): FeatureProp => {
	const normalized: FeatureProp = {};

	for (const [key, value] of Object.entries(properties)) {
		if (value !== undefined) {
			normalized[key] = value;
		}
	}

	return normalized;
};

const createBaseProperties = (
	entity: SxfEntity,
	properties: Record<string, SxfPropertyValue | undefined>
): FeatureProp =>
	createProperties({
		entityId: entity.entityId,
		type: entity.featureName.replace(/_feature$/i, ''),
		...properties
	});

const createLineFeature = (
	entityId: string,
	coordinates: [number, number][],
	properties: FeatureProp
): SxfGeometryFeature => ({
	type: 'Feature',
	id: entityId,
	geometry: {
		type: 'LineString',
		coordinates
	},
	properties
});

const createPointFeature = (
	entityId: string,
	coordinate: [number, number],
	properties: FeatureProp
): SxfGeometryFeature => ({
	type: 'Feature',
	id: entityId,
	geometry: {
		type: 'Point',
		coordinates: coordinate
	},
	properties
});

const createPolygonFeature = (
	entityId: string,
	ring: [number, number][],
	properties: FeatureProp
): SxfGeometryFeature => ({
	type: 'Feature',
	id: entityId,
	geometry: {
		type: 'Polygon',
		coordinates: [ring]
	},
	properties
});

const coordinatesAreClosed = (coordinates: [number, number][]): boolean => {
	const first = coordinates[0];
	const last = coordinates[coordinates.length - 1];
	return !!first && !!last && first[0] === last[0] && first[1] === last[1];
};

const createArcCoordinates = (
	centerX: number,
	centerY: number,
	radius: number,
	startAngle: number,
	endAngle: number,
	segments = CIRCLE_SEGMENTS
): [number, number][] => {
	let normalizedEnd = endAngle;
	while (normalizedEnd <= startAngle) {
		normalizedEnd += 360;
	}

	const coordinates: [number, number][] = [];
	for (let index = 0; index <= segments; index += 1) {
		const angle = startAngle + ((normalizedEnd - startAngle) * index) / segments;
		const radian = (angle * Math.PI) / 180;
		coordinates.push([centerX + radius * Math.cos(radian), centerY + radius * Math.sin(radian)]);
	}

	return coordinates;
};

const parseLineFeature = (entity: SxfEntity): SxfGeometryFeature | null => {
	if (entity.args.length < 8) return null;

	const modern = entity.args.length >= 12;
	const coordinates = modern
		? [
			[getNumber(entity.args[6]), getNumber(entity.args[7])],
			[getNumber(entity.args[9]), getNumber(entity.args[10])]
		]
		: [
			[getNumber(entity.args[4]), getNumber(entity.args[5])],
			[getNumber(entity.args[6]), getNumber(entity.args[7])]
		];

	if (coordinates.some(([x, y]) => x === null || y === null)) {
		return null;
	}

	const offset = modern ? 2 : 0;
	return createLineFeature(
		entity.entityId,
		coordinates as [number, number][],
		createBaseProperties(entity, {
			layer: getString(entity.args[offset]),
			color: getString(entity.args[offset + 1]),
			lineType: getString(entity.args[offset + 2]),
			lineWidth: getString(entity.args[offset + 3]),
			name: modern ? getString(entity.args[1]) : undefined
		})
	);
};

const parsePolylineFeature = (entity: SxfEntity): SxfGeometryFeature | null => {
	const arrays = entity.args.map((value) => getNumberArray(value)).filter((value): value is number[] => value !== null);
	if (arrays.length < 2) return null;

	const xValues = arrays[0];
	const yValues = arrays[1];
	if (xValues.length !== yValues.length || xValues.length < 2) return null;

	const coordinates = xValues.map((x, index) => [x, yValues[index]] as [number, number]);
	const modern = entity.args.length >= 12;
	const offset = modern ? 2 : 0;
	const properties = createBaseProperties(entity, {
		layer: getString(entity.args[offset]),
		color: getString(entity.args[offset + 1]),
		lineType: getString(entity.args[offset + 2]),
		lineWidth: getString(entity.args[offset + 3]),
		name: modern ? getString(entity.args[1]) : undefined,
		closed: coordinatesAreClosed(coordinates)
	});

	if (coordinatesAreClosed(coordinates) && coordinates.length >= 4) {
		return createPolygonFeature(entity.entityId, coordinates, properties);
	}

	return createLineFeature(entity.entityId, coordinates, properties);
};

const parseCircleFeature = (entity: SxfEntity): SxfGeometryFeature | null => {
	if (entity.args.length < 10) return null;

	const centerX = getNumber(entity.args[6]);
	const centerY = getNumber(entity.args[7]);
	const radius = getNumber(entity.args[9]);
	if (centerX === null || centerY === null || radius === null || radius <= 0) return null;

	return createLineFeature(
		entity.entityId,
		createArcCoordinates(centerX, centerY, radius, 0, 360),
		createBaseProperties(entity, {
			layer: getString(entity.args[2]),
			color: getString(entity.args[3]),
			lineType: getString(entity.args[4]),
			lineWidth: getString(entity.args[5]),
			name: getString(entity.args[1]),
			radius
		})
	);
};

const parseArcFeature = (entity: SxfEntity): SxfGeometryFeature | null => {
	if (entity.args.length < 13) return null;

	const centerX = getNumber(entity.args[6]);
	const centerY = getNumber(entity.args[7]);
	const radius = getNumber(entity.args[9]);
	const startAngle = getNumber(entity.args[11]);
	const endAngle = getNumber(entity.args[12]);
	if (
		centerX === null
		|| centerY === null
		|| radius === null
		|| radius <= 0
		|| startAngle === null
		|| endAngle === null
	) {
		return null;
	}

	return createLineFeature(
		entity.entityId,
		createArcCoordinates(centerX, centerY, radius, startAngle, endAngle),
		createBaseProperties(entity, {
			layer: getString(entity.args[2]),
			color: getString(entity.args[3]),
			lineType: getString(entity.args[4]),
			lineWidth: getString(entity.args[5]),
			name: getString(entity.args[1]),
			radius,
			startAngle,
			endAngle
		})
	);
};

const parseTextFeature = (entity: SxfEntity): SxfGeometryFeature | null => {
	if (entity.args.length < 5) return null;

	const modernText = getString(entity.args[3]);
	const modernX = getNumber(entity.args[4]);
	const modernY = getNumber(entity.args[5]);
	if (modernText && getNumber(entity.args[3]) === null && modernX !== null && modernY !== null) {
		return createPointFeature(
			entity.entityId,
			[modernX, modernY],
			createBaseProperties(entity, {
				layer: getString(entity.args[0]),
				color: getString(entity.args[1]),
				font: getString(entity.args[2]),
				text: modernText,
				textHeight: getOptionalNumber(entity.args[6]),
				textWidth: getOptionalNumber(entity.args[7]),
				textSpacing: getOptionalNumber(entity.args[8]),
				textRotation: getOptionalNumber(entity.args[9]),
				textAlign: getString(entity.args[10])
			})
		);
	}

	const legacyText = getString(entity.args[2]);
	const legacyX = getNumber(entity.args[3]);
	const legacyY = getNumber(entity.args[4]);
	if (!legacyText || legacyX === null || legacyY === null) return null;

	return createPointFeature(
		entity.entityId,
		[legacyX, legacyY],
		createBaseProperties(entity, {
			layer: getString(entity.args[0]),
			color: getString(entity.args[1]),
			font: undefined,
			text: legacyText,
			textHeight: getOptionalNumber(entity.args[5]),
			textWidth: getOptionalNumber(entity.args[6]),
			textSpacing: getOptionalNumber(entity.args[7]),
			textRotation: getOptionalNumber(entity.args[8]),
			textAlign: getString(entity.args[9])
		})
	);
};

const parseEntityToFeature = (entity: SxfEntity): SxfGeometryFeature | null => {
	switch (entity.featureName) {
		case 'line_feature':
			return parseLineFeature(entity);
		case 'polyline_feature':
			return parsePolylineFeature(entity);
		case 'circle_feature':
			return parseCircleFeature(entity);
		case 'arc_feature':
			return parseArcFeature(entity);
		case 'text_string_feature':
			return parseTextFeature(entity);
		default:
			return null;
	}
};

export const sxfTextToGeoJson = (text: string): FeatureCollection => {
	const entities = parseSxfEntities(text);
	if (entities.length === 0) {
		if (text.includes('ISO-10303-21')) {
			throw new SxfParseError('SXF の P21 形式はまだ未対応です。SFC ファイルを読み込んでください。');
		}

		throw new SxfParseError('SXF のフィーチャブロックが見つかりませんでした');
	}

	const features = entities
		.map((entity) => parseEntityToFeature(entity))
		.filter((feature): feature is SxfGeometryFeature => feature !== null);

	if (features.length === 0) {
		throw new SxfParseError(
			'SXF から対応している図形を抽出できませんでした。現在は線・折線・円・円弧・文字の一部だけ対応しています。'
		);
	}

	return {
		type: 'FeatureCollection',
		features
	};
};

export const sxfArrayBufferToGeoJson = (arrayBuffer: ArrayBuffer): FeatureCollection =>
	sxfTextToGeoJson(decodeSxfText(arrayBuffer));
