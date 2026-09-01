import type { Feature, FeatureCollection } from '$routes/map/types/geojson';
import type {
	LineStringGeometry,
	PointGeometry,
	PolygonGeometry
} from '$routes/map/types/geometry';
import type { FeatureProp } from '$routes/map/types/properties';

import { SxfParseError } from '../parse-error';
import { decodeSxfText } from '../text';

type StepValue =
	| string
	| number
	| null
	| undefined
	| StepReference
	| StepEnum
	| StepRecord
	| StepValue[];

interface StepReference {
	kind: 'ref';
	id: string;
}

interface StepEnum {
	kind: 'enum';
	value: string;
}

interface StepRecord {
	name: string;
	args: StepValue[];
}

interface StepEntity {
	entityId: string;
	records: StepRecord[];
}

type P21GeometryFeature =
	| Feature<LineStringGeometry, FeatureProp>
	| Feature<PointGeometry, FeatureProp>
	| Feature<PolygonGeometry, FeatureProp>;

type CurveStyle = {
	color?: string;
	lineType?: string;
	lineWidth?: number;
};

type TextStyle = {
	textHeight?: number;
	textWidth?: number;
	textSpacing?: number;
	textRotation?: number;
};

type AxisPlacement2d = {
	origin: [number, number];
	direction: [number, number];
};

type PlanarExtent = {
	width: number;
	height: number;
};

const STEP_DATA_SECTION_PATTERN = /DATA;([\s\S]*?)ENDSEC;/i;
const STEP_IDENTIFIER_PATTERN = /[A-Z0-9_]/i;
const CIRCLE_SEGMENTS = 48;

const PREDEFINED_COLOR_MAP: Record<string, string> = {
	red: '#ff0000',
	green: '#00ff00',
	blue: '#0000ff',
	yellow: '#ffff00',
	cyan: '#00ffff',
	white: '#ffffff',
	black: '#000000'
};

const isReference = (value: StepValue | undefined): value is StepReference =>
	typeof value === 'object' && value !== null && 'kind' in value && value.kind === 'ref';

const isEnum = (value: StepValue | undefined): value is StepEnum =>
	typeof value === 'object' && value !== null && 'kind' in value && value.kind === 'enum';

const isRecord = (value: StepValue | undefined): value is StepRecord =>
	typeof value === 'object'
	&& value !== null
	&& 'name' in value
	&& Array.isArray((value as StepRecord).args);

const isList = (value: StepValue | undefined): value is StepValue[] => Array.isArray(value);

const skipWhitespace = (text: string, startIndex: number): number => {
	let index = startIndex;
	while (index < text.length && /\s/.test(text[index])) {
		index += 1;
	}
	return index;
};

const decodeStepString = (value: string): string =>
	value.replace(/\\X2\\([0-9A-F]+)\\X0\\/gi, (_, hex: string) => {
		const chars: string[] = [];
		for (let index = 0; index + 3 < hex.length; index += 4) {
			chars.push(String.fromCharCode(parseInt(hex.slice(index, index + 4), 16)));
		}
		return chars.join('');
	});

const parseStepString = (
	text: string,
	startIndex: number
): { value: string; nextIndex: number; } => {
	let index = startIndex + 1;
	let value = '';

	while (index < text.length) {
		const current = text[index];
		if (current === "'") {
			if (text[index + 1] === "'") {
				value += "'";
				index += 2;
				continue;
			}

			return {
				value: decodeStepString(value),
				nextIndex: index + 1
			};
		}

		value += current;
		index += 1;
	}

	throw new SxfParseError('P21 文字列の終端が見つかりません');
};

const parseIdentifier = (
	text: string,
	startIndex: number
): { value: string; nextIndex: number; } => {
	let index = startIndex;
	while (index < text.length && STEP_IDENTIFIER_PATTERN.test(text[index])) {
		index += 1;
	}

	if (index === startIndex) {
		throw new SxfParseError(
			`P21 識別子を解釈できません: ${text.slice(startIndex, startIndex + 20)}`
		);
	}

	return {
		value: text.slice(startIndex, index),
		nextIndex: index
	};
};

const parseReference = (
	text: string,
	startIndex: number
): { value: StepReference; nextIndex: number; } => {
	let index = startIndex + 1;
	while (index < text.length && /[0-9]/.test(text[index])) {
		index += 1;
	}

	if (index === startIndex + 1) {
		throw new SxfParseError('P21 参照IDを解釈できません');
	}

	return {
		value: {
			kind: 'ref',
			id: text.slice(startIndex + 1, index)
		},
		nextIndex: index
	};
};

const parseEnum = (
	text: string,
	startIndex: number
): { value: StepEnum; nextIndex: number; } => {
	let index = startIndex + 1;
	while (index < text.length && text[index] !== '.') {
		index += 1;
	}

	if (text[index] !== '.') {
		throw new SxfParseError('P21 enum の終端が見つかりません');
	}

	return {
		value: {
			kind: 'enum',
			value: text.slice(startIndex + 1, index)
		},
		nextIndex: index + 1
	};
};

const parseNumber = (
	text: string,
	startIndex: number
): { value: number; nextIndex: number; } => {
	let index = startIndex;
	while (index < text.length && /[0-9eE+\-.]/.test(text[index])) {
		index += 1;
	}

	const numericValue = Number(text.slice(startIndex, index));
	if (!Number.isFinite(numericValue)) {
		throw new SxfParseError(`P21 数値を解釈できません: ${text.slice(startIndex, index)}`);
	}

	return {
		value: numericValue,
		nextIndex: index
	};
};

const parseRecord = (
	text: string,
	startIndex: number
): { record: StepRecord; nextIndex: number; } => {
	const { value: name, nextIndex: identifierEnd } = parseIdentifier(text, startIndex);
	const index = skipWhitespace(text, identifierEnd);
	if (text[index] !== '(') {
		throw new SxfParseError(`P21 レコードの引数開始が見つかりません: ${name}`);
	}

	const { values, nextIndex } = parseList(text, index);
	return {
		record: { name, args: values },
		nextIndex
	};
};

const parseValue = (
	text: string,
	startIndex: number
): { value: StepValue; nextIndex: number; } => {
	const index = skipWhitespace(text, startIndex);
	const current = text[index];

	if (current === "'") {
		return parseStepString(text, index);
	}

	if (current === '#') {
		return parseReference(text, index);
	}

	if (current === '(') {
		const parsed = parseList(text, index);
		return {
			value: parsed.values,
			nextIndex: parsed.nextIndex
		};
	}

	if (current === '$') {
		return { value: null, nextIndex: index + 1 };
	}

	if (current === '*') {
		return { value: undefined, nextIndex: index + 1 };
	}

	if (current === '.') {
		return parseEnum(text, index);
	}

	if (/[+\-0-9]/.test(current)) {
		return parseNumber(text, index);
	}

	if (STEP_IDENTIFIER_PATTERN.test(current)) {
		const { record, nextIndex } = parseRecord(text, index);
		return {
			value: record,
			nextIndex
		};
	}

	throw new SxfParseError(`P21 値を解釈できません: ${text.slice(index, index + 20)}`);
};

function parseList(
	text: string,
	startIndex: number
): { values: StepValue[]; nextIndex: number; } {
	let index = startIndex + 1;
	const values: StepValue[] = [];

	while (index < text.length) {
		index = skipWhitespace(text, index);
		if (text[index] === ')') {
			return { values, nextIndex: index + 1 };
		}

		const parsed = parseValue(text, index);
		values.push(parsed.value);
		index = skipWhitespace(text, parsed.nextIndex);

		if (text[index] === ',') {
			index += 1;
			continue;
		}

		if (text[index] === ')') {
			return { values, nextIndex: index + 1 };
		}

		throw new SxfParseError(
			`P21 配列の区切りを解釈できません: ${text.slice(index, index + 20)}`
		);
	}

	throw new SxfParseError('P21 配列の終端が見つかりません');
}

const parseComplexEntity = (
	text: string,
	startIndex: number
): { records: StepRecord[]; nextIndex: number; } => {
	let index = startIndex + 1;
	const records: StepRecord[] = [];

	while (index < text.length) {
		index = skipWhitespace(text, index);
		if (text[index] === ')') {
			return {
				records,
				nextIndex: index + 1
			};
		}

		const parsed = parseRecord(text, index);
		records.push(parsed.record);
		index = parsed.nextIndex;
	}

	throw new SxfParseError('P21 複合エンティティの終端が見つかりません');
};

const parseP21Entities = (text: string): Map<string, StepEntity> => {
	const dataSection = text.match(STEP_DATA_SECTION_PATTERN)?.[1];
	if (!dataSection) {
		throw new SxfParseError('P21 の DATA セクションが見つかりませんでした');
	}

	const entities = new Map<string, StepEntity>();
	let index = 0;

	while (index < dataSection.length) {
		index = skipWhitespace(dataSection, index);
		if (index >= dataSection.length) break;

		if (dataSection[index] !== '#') {
			index += 1;
			continue;
		}

		const { value: reference, nextIndex: referenceEnd } = parseReference(dataSection, index);
		index = skipWhitespace(dataSection, referenceEnd);

		if (dataSection[index] !== '=') {
			throw new SxfParseError(`P21 エンティティ #${reference.id} の '=' が見つかりません`);
		}

		index = skipWhitespace(dataSection, index + 1);
		const parsed = dataSection[index] === '('
			? parseComplexEntity(dataSection, index)
			: (() => {
				const record = parseRecord(dataSection, index);
				return {
					records: [record.record],
					nextIndex: record.nextIndex
				};
			})();

		index = skipWhitespace(dataSection, parsed.nextIndex);
		if (dataSection[index] !== ';') {
			throw new SxfParseError(`P21 エンティティ #${reference.id} の ';' が見つかりません`);
		}

		entities.set(reference.id, {
			entityId: reference.id,
			records: parsed.records
		});
		index += 1;
	}

	return entities;
};

const getSimpleRecord = (
	entities: Map<string, StepEntity>,
	entityId: string
): StepRecord | null => {
	const entity = entities.get(entityId);
	if (!entity || entity.records.length !== 1) return null;
	return entity.records[0] ?? null;
};

const getString = (value: StepValue | undefined): string | undefined => {
	if (typeof value === 'string') return value;
	return undefined;
};

const getNumber = (value: StepValue | undefined): number | null => {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	return null;
};

const getReferenceId = (value: StepValue | undefined): string | null =>
	isReference(value) ? value.id : null;

const getList = (
	value: StepValue | undefined
): StepValue[] | null => (isList(value) ? value : null);

const getRecord = (
	value: StepValue | undefined
): StepRecord | null => (isRecord(value) ? value : null);

const getEnumValue = (value: StepValue | undefined): string | undefined =>
	isEnum(value) ? value.value : undefined;

const getReferenceIds = (value: StepValue | undefined): string[] => {
	if (!isList(value)) return [];
	return value
		.map((item) => getReferenceId(item))
		.filter((item): item is string => item !== null);
};

const getNestedRecordNumber = (record: StepRecord | null): number | null => {
	if (!record) return null;
	return getNumber(record.args[0]);
};

const createProperties = (properties: Record<string, unknown>): FeatureProp => {
	const normalized: FeatureProp = {};
	for (const [key, value] of Object.entries(properties)) {
		if (value !== undefined) {
			normalized[key] = value as FeatureProp[string];
		}
	}
	return normalized;
};

const createLineFeature = (
	entityId: string,
	coordinates: [number, number][],
	properties: FeatureProp
): P21GeometryFeature => ({
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
): P21GeometryFeature => ({
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
): P21GeometryFeature => ({
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
	clockwise: boolean,
	segments = CIRCLE_SEGMENTS
): [number, number][] => {
	let normalizedEnd = endAngle;

	if (clockwise) {
		while (normalizedEnd >= startAngle) {
			normalizedEnd -= 360;
		}
	} else {
		while (normalizedEnd <= startAngle) {
			normalizedEnd += 360;
		}
	}

	const coordinates: [number, number][] = [];
	for (let index = 0; index <= segments; index += 1) {
		const angle = startAngle + ((normalizedEnd - startAngle) * index) / segments;
		const radian = (angle * Math.PI) / 180;
		coordinates.push([
			centerX + radius * Math.cos(radian),
			centerY + radius * Math.sin(radian)
		]);
	}

	return coordinates;
};

const rgbToHex = (red: number, green: number, blue: number): string => {
	const toHex = (value: number) =>
		Math.max(0, Math.min(255, Math.round(value * 255)))
			.toString(16)
			.padStart(2, '0');
	return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
};

const buildLayerMap = (entities: Map<string, StepEntity>): Map<string, string> => {
	const layerMap = new Map<string, string>();

	for (const [entityId, entity] of entities) {
		const record = entity.records[0];
		if (!record || record.name !== 'PRESENTATION_LAYER_ASSIGNMENT') continue;

		const layer = getString(record.args[0]);
		if (!layer) continue;

		for (const targetId of getReferenceIds(record.args[2])) {
			layerMap.set(targetId, layer);
		}
	}

	return layerMap;
};

const buildColorMap = (entities: Map<string, StepEntity>): Map<string, string> => {
	const colorMap = new Map<string, string>();

	for (const [entityId, entity] of entities) {
		const record = entity.records[0];
		if (!record) continue;

		if (record.name === 'DRAUGHTING_PRE_DEFINED_COLOUR') {
			const colorName = getString(record.args[0])?.toLowerCase();
			if (colorName) {
				colorMap.set(entityId, PREDEFINED_COLOR_MAP[colorName] ?? colorName);
			}
		}

		if (record.name === 'COLOUR_RGB') {
			const red = getNumber(record.args[1]);
			const green = getNumber(record.args[2]);
			const blue = getNumber(record.args[3]);
			if (red !== null && green !== null && blue !== null) {
				colorMap.set(entityId, rgbToHex(red, green, blue));
			}
		}
	}

	return colorMap;
};

const buildCurveFontMap = (entities: Map<string, StepEntity>): Map<string, string> => {
	const fontMap = new Map<string, string>();

	for (const [entityId, entity] of entities) {
		const record = entity.records[0];
		if (record?.name !== 'DRAUGHTING_PRE_DEFINED_CURVE_FONT') continue;

		const fontName = getString(record.args[0]);
		if (fontName) {
			fontMap.set(entityId, fontName);
		}
	}

	return fontMap;
};

const buildMeasureMap = (entities: Map<string, StepEntity>): Map<string, number> => {
	const measureMap = new Map<string, number>();

	for (const [entityId, entity] of entities) {
		const record = entity.records[0];
		if (!record) continue;

		if (record.name === 'LENGTH_MEASURE_WITH_UNIT' || record.name === 'LENGTH_MEASURE') {
			const value = getNestedRecordNumber(getRecord(record.args[0]))
				?? getNumber(record.args[0]);
			if (value !== null) {
				measureMap.set(entityId, value);
			}
		}
	}

	return measureMap;
};

const buildCurveStyleMap = (
	entities: Map<string, StepEntity>,
	colorMap: Map<string, string>,
	curveFontMap: Map<string, string>,
	measureMap: Map<string, number>
): Map<string, CurveStyle> => {
	const styleMap = new Map<string, CurveStyle>();

	for (const [entityId, entity] of entities) {
		const record = entity.records[0];
		if (record?.name !== 'CURVE_STYLE') continue;

		const lineType = curveFontMap.get(getReferenceId(record.args[1]) ?? '');
		const lineWidth = measureMap.get(getReferenceId(record.args[2]) ?? '');
		const color = colorMap.get(getReferenceId(record.args[3]) ?? '');

		styleMap.set(entityId, {
			color,
			lineType,
			lineWidth
		});
	}

	return styleMap;
};

const buildPresentationStyleMap = (entities: Map<string, StepEntity>): Map<string, string[]> => {
	const presentationStyleMap = new Map<string, string[]>();

	for (const [entityId, entity] of entities) {
		const record = entity.records[0];
		if (record?.name !== 'PRESENTATION_STYLE_ASSIGNMENT') continue;
		presentationStyleMap.set(entityId, getReferenceIds(record.args[0]));
	}

	return presentationStyleMap;
};

const buildTextStyleMap = (entities: Map<string, StepEntity>): Map<string, TextStyle> => {
	const textStyleMap = new Map<string, TextStyle>();

	for (const [entityId, entity] of entities) {
		if (entity.records.length <= 1) continue;

		const boxRecord = entity.records.find(
			(record) => record.name === 'TEXT_STYLE_WITH_BOX_CHARACTERISTICS'
		);
		const spacingRecord = entity.records.find((record) =>
			record.name === 'TEXT_STYLE_WITH_SPACING'
		);
		if (!boxRecord && !spacingRecord) continue;

		const textStyle: TextStyle = {};
		for (const nestedRecord of getList(boxRecord?.args[0]) ?? []) {
			if (!isRecord(nestedRecord)) continue;
			if (nestedRecord.name === 'BOX_HEIGHT') {
				textStyle.textHeight = getNumber(nestedRecord.args[0]) ?? undefined;
			}
			if (nestedRecord.name === 'BOX_WIDTH') {
				textStyle.textWidth = getNumber(nestedRecord.args[0]) ?? undefined;
			}
			if (nestedRecord.name === 'BOX_ROTATE_ANGLE') {
				const radians = getNumber(nestedRecord.args[0]);
				if (radians !== null) {
					textStyle.textRotation = (radians * 180) / Math.PI;
				}
			}
		}

		const spacingValue = getNestedRecordNumber(getRecord(spacingRecord?.args[0]))
			?? getNumber(spacingRecord?.args[0]);
		if (spacingValue !== null) {
			textStyle.textSpacing = spacingValue;
		}

		textStyleMap.set(entityId, textStyle);
	}

	return textStyleMap;
};

const buildFontMap = (entities: Map<string, StepEntity>): Map<string, string> => {
	const fontMap = new Map<string, string>();

	for (const [entityId, entity] of entities) {
		const record = entity.records[0];
		if (record?.name !== 'EXTERNALLY_DEFINED_TEXT_FONT') continue;

		const identifierRecord = getRecord(record.args[0]);
		const fontName = getString(identifierRecord?.args[0]);
		if (fontName) {
			fontMap.set(entityId, fontName);
		}
	}

	return fontMap;
};

const getPointMap = (entities: Map<string, StepEntity>) => {
	const pointMap = new Map<string, [number, number] | null>();

	const resolvePoint = (entityId: string): [number, number] | null => {
		if (pointMap.has(entityId)) {
			return pointMap.get(entityId) ?? null;
		}

		const record = getSimpleRecord(entities, entityId);
		if (record?.name !== 'CARTESIAN_POINT') {
			pointMap.set(entityId, null);
			return null;
		}

		const coordinates = getList(record.args[1]);
		const x = getNumber(coordinates?.[0]);
		const y = getNumber(coordinates?.[1]);
		if (x === null || y === null) {
			pointMap.set(entityId, null);
			return null;
		}

		const point: [number, number] = [x, y];
		pointMap.set(entityId, point);
		return point;
	};

	return resolvePoint;
};

const getDirectionMap = (entities: Map<string, StepEntity>) => {
	const directionMap = new Map<string, [number, number] | null>();

	const resolveDirection = (entityId: string): [number, number] | null => {
		if (directionMap.has(entityId)) {
			return directionMap.get(entityId) ?? null;
		}

		const record = getSimpleRecord(entities, entityId);
		if (record?.name !== 'DIRECTION') {
			directionMap.set(entityId, null);
			return null;
		}

		const values = getList(record.args[1]);
		const x = getNumber(values?.[0]);
		const y = getNumber(values?.[1]);
		if (x === null || y === null) {
			directionMap.set(entityId, null);
			return null;
		}

		const direction: [number, number] = [x, y];
		directionMap.set(entityId, direction);
		return direction;
	};

	return resolveDirection;
};

const getAxisPlacementMap = (
	entities: Map<string, StepEntity>,
	resolvePoint: (entityId: string) => [number, number] | null,
	resolveDirection: (entityId: string) => [number, number] | null
) => {
	const axisMap = new Map<string, AxisPlacement2d | null>();

	const resolveAxis = (entityId: string): AxisPlacement2d | null => {
		if (axisMap.has(entityId)) {
			return axisMap.get(entityId) ?? null;
		}

		const record = getSimpleRecord(entities, entityId);
		if (record?.name !== 'AXIS2_PLACEMENT_2D') {
			axisMap.set(entityId, null);
			return null;
		}

		const origin = resolvePoint(getReferenceId(record.args[1]) ?? '');
		if (!origin) {
			axisMap.set(entityId, null);
			return null;
		}

		const direction = resolveDirection(getReferenceId(record.args[2]) ?? '')
			?? ([1, 0] as [number, number]);
		const axis = { origin, direction };
		axisMap.set(entityId, axis);
		return axis;
	};

	return resolveAxis;
};

const getPlanarExtentMap = (entities: Map<string, StepEntity>) => {
	const extentMap = new Map<string, PlanarExtent | null>();

	const resolveExtent = (entityId: string): PlanarExtent | null => {
		if (extentMap.has(entityId)) {
			return extentMap.get(entityId) ?? null;
		}

		const record = getSimpleRecord(entities, entityId);
		if (record?.name !== 'PLANAR_EXTENT') {
			extentMap.set(entityId, null);
			return null;
		}

		const width = getNumber(record.args[1]);
		const height = getNumber(record.args[2]);
		if (width === null || height === null) {
			extentMap.set(entityId, null);
			return null;
		}

		const extent = { width, height };
		extentMap.set(entityId, extent);
		return extent;
	};

	return resolveExtent;
};

const getStyledCurveStyle = (
	styleAssignmentId: string | null,
	presentationStyleMap: Map<string, string[]>,
	curveStyleMap: Map<string, CurveStyle>
): CurveStyle => {
	if (!styleAssignmentId) return {};

	const styleRefs = presentationStyleMap.get(styleAssignmentId) ?? [];
	for (const styleRef of styleRefs) {
		const curveStyle = curveStyleMap.get(styleRef);
		if (curveStyle) {
			return curveStyle;
		}
	}

	return {};
};

const getStyledTextStyle = (
	styleAssignmentId: string | null,
	presentationStyleMap: Map<string, string[]>,
	textStyleMap: Map<string, TextStyle>
): TextStyle => {
	if (!styleAssignmentId) return {};

	const styleRefs = presentationStyleMap.get(styleAssignmentId) ?? [];
	for (const styleRef of styleRefs) {
		const textStyle = textStyleMap.get(styleRef);
		if (textStyle) {
			return textStyle;
		}
	}

	return {};
};

const buildBaseProperties = (
	entityId: string,
	geometryEntityId: string,
	layer: string | undefined,
	type: string,
	curveStyle?: CurveStyle
): FeatureProp =>
	createProperties({
		entityId,
		sourceEntityId: geometryEntityId,
		type,
		layer,
		color: curveStyle?.color,
		lineType: curveStyle?.lineType,
		lineWidth: curveStyle?.lineWidth
	});

const parsePolylineFeature = (
	entityId: string,
	geometryEntityId: string,
	record: StepRecord,
	layer: string | undefined,
	curveStyle: CurveStyle,
	resolvePoint: (entityId: string) => [number, number] | null
): P21GeometryFeature | null => {
	const coordinates = getReferenceIds(record.args[1])
		.map((pointId) => resolvePoint(pointId))
		.filter((point): point is [number, number] => point !== null);

	if (coordinates.length < 2) return null;

	const properties = createProperties({
		...buildBaseProperties(entityId, geometryEntityId, layer, 'polyline', curveStyle),
		name: getString(record.args[0]),
		closed: coordinatesAreClosed(coordinates)
	});

	if (coordinatesAreClosed(coordinates) && coordinates.length >= 4) {
		return createPolygonFeature(entityId, coordinates, properties);
	}

	return createLineFeature(entityId, coordinates, properties);
};

const parseCircleFeature = (
	entityId: string,
	geometryEntityId: string,
	record: StepRecord,
	layer: string | undefined,
	curveStyle: CurveStyle,
	resolveAxis: (entityId: string) => AxisPlacement2d | null
): P21GeometryFeature | null => {
	const axis = resolveAxis(getReferenceId(record.args[1]) ?? '');
	const radius = getNumber(record.args[2]);
	if (!axis || radius === null || radius <= 0) return null;

	const coordinates = createArcCoordinates(
		axis.origin[0],
		axis.origin[1],
		radius,
		0,
		360,
		false
	);

	return createLineFeature(
		entityId,
		coordinates,
		createProperties({
			...buildBaseProperties(entityId, geometryEntityId, layer, 'circle', curveStyle),
			name: getString(record.args[0]),
			radius
		})
	);
};

const parseTrimmedCurveFeature = (
	entityId: string,
	geometryEntityId: string,
	record: StepRecord,
	layer: string | undefined,
	curveStyle: CurveStyle,
	entities: Map<string, StepEntity>,
	resolvePoint: (entityId: string) => [number, number] | null,
	resolveAxis: (entityId: string) => AxisPlacement2d | null
): P21GeometryFeature | null => {
	const basisEntityId = getReferenceId(record.args[1]);
	if (!basisEntityId) return null;

	const trimStartPoint = resolvePoint(getReferenceIds(record.args[2])[0] ?? '');
	const trimEndPoint = resolvePoint(getReferenceIds(record.args[3])[0] ?? '');
	const sense = getEnumValue(record.args[4]) !== 'F';
	const basisRecord = getSimpleRecord(entities, basisEntityId);
	if (!basisRecord || !trimStartPoint || !trimEndPoint) return null;

	if (basisRecord.name === 'LINE') {
		return createLineFeature(
			entityId,
			[trimStartPoint, trimEndPoint],
			createProperties({
				...buildBaseProperties(
					entityId,
					geometryEntityId,
					layer,
					'trimmed_curve',
					curveStyle
				),
				basisType: 'line'
			})
		);
	}

	if (basisRecord.name === 'CIRCLE') {
		const axis = resolveAxis(getReferenceId(basisRecord.args[1]) ?? '');
		const radius = getNumber(basisRecord.args[2]);
		if (!axis || radius === null || radius <= 0) return null;

		const startAngle =
			(Math.atan2(trimStartPoint[1] - axis.origin[1], trimStartPoint[0] - axis.origin[0])
				* 180)
			/ Math.PI;
		const endAngle =
			(Math.atan2(trimEndPoint[1] - axis.origin[1], trimEndPoint[0] - axis.origin[0]) * 180)
			/ Math.PI;

		return createLineFeature(
			entityId,
			createArcCoordinates(
				axis.origin[0],
				axis.origin[1],
				radius,
				startAngle,
				endAngle,
				!sense
			),
			createProperties({
				...buildBaseProperties(entityId, geometryEntityId, layer, 'arc', curveStyle),
				basisType: 'circle',
				radius,
				startAngle,
				endAngle
			})
		);
	}

	return null;
};

const parseTextFeature = (
	entityId: string,
	geometryEntityId: string,
	record: StepRecord,
	layer: string | undefined,
	styleAssignmentId: string | null,
	presentationStyleMap: Map<string, string[]>,
	textStyleMap: Map<string, TextStyle>,
	fontMap: Map<string, string>,
	resolveAxis: (entityId: string) => AxisPlacement2d | null,
	resolveExtent: (entityId: string) => PlanarExtent | null
): P21GeometryFeature | null => {
	const axis = resolveAxis(getReferenceId(record.args[2]) ?? '');
	if (!axis) return null;

	const extent = resolveExtent(getReferenceId(record.args[6]) ?? '');
	const textStyle = getStyledTextStyle(styleAssignmentId, presentationStyleMap, textStyleMap);
	const rotation = textStyle.textRotation
		?? (Math.atan2(axis.direction[1], axis.direction[0]) * 180) / Math.PI;

	return createPointFeature(
		entityId,
		axis.origin,
		createProperties({
			entityId,
			sourceEntityId: geometryEntityId,
			type: 'text_literal',
			layer,
			text: getString(record.args[1]),
			font: fontMap.get(getReferenceId(record.args[5]) ?? ''),
			textHeight: textStyle.textHeight ?? extent?.height,
			textWidth: textStyle.textWidth ?? extent?.width,
			textSpacing: textStyle.textSpacing,
			textRotation: rotation,
			textAlign: `${getString(record.args[3]) ?? ''} ${getEnumValue(record.args[4]) ?? ''}`
				.trim()
		})
	);
};

const parseCurveOccurrenceFeature = (
	entityId: string,
	entity: StepEntity,
	entities: Map<string, StepEntity>,
	layerMap: Map<string, string>,
	presentationStyleMap: Map<string, string[]>,
	curveStyleMap: Map<string, CurveStyle>,
	resolvePoint: (entityId: string) => [number, number] | null,
	resolveAxis: (entityId: string) => AxisPlacement2d | null
): P21GeometryFeature | null => {
	const styledItemRecord = entity.records.find((record) => record.name === 'STYLED_ITEM');
	if (!styledItemRecord) return null;

	const geometryEntityId = getReferenceId(styledItemRecord.args[1]);
	if (!geometryEntityId) return null;

	const geometryRecord = getSimpleRecord(entities, geometryEntityId);
	if (!geometryRecord) return null;

	const styleAssignmentId = getReferenceIds(styledItemRecord.args[0])[0] ?? null;
	const curveStyle = getStyledCurveStyle(styleAssignmentId, presentationStyleMap, curveStyleMap);
	const layer = layerMap.get(entityId);

	switch (geometryRecord.name) {
		case 'POLYLINE':
			return parsePolylineFeature(
				entityId,
				geometryEntityId,
				geometryRecord,
				layer,
				curveStyle,
				resolvePoint
			);
		case 'CIRCLE':
			return parseCircleFeature(
				entityId,
				geometryEntityId,
				geometryRecord,
				layer,
				curveStyle,
				resolveAxis
			);
		case 'TRIMMED_CURVE':
			return parseTrimmedCurveFeature(
				entityId,
				geometryEntityId,
				geometryRecord,
				layer,
				curveStyle,
				entities,
				resolvePoint,
				resolveAxis
			);
		default:
			return null;
	}
};

const parseTextOccurrenceFeature = (
	entityId: string,
	entity: StepEntity,
	entities: Map<string, StepEntity>,
	layerMap: Map<string, string>,
	presentationStyleMap: Map<string, string[]>,
	textStyleMap: Map<string, TextStyle>,
	fontMap: Map<string, string>,
	resolveAxis: (entityId: string) => AxisPlacement2d | null,
	resolveExtent: (entityId: string) => PlanarExtent | null
): P21GeometryFeature | null => {
	const styledItemRecord = entity.records.find((record) => record.name === 'STYLED_ITEM');
	if (!styledItemRecord) return null;

	const geometryEntityId = getReferenceId(styledItemRecord.args[1]);
	if (!geometryEntityId) return null;

	const textRecord = getSimpleRecord(entities, geometryEntityId);
	if (!textRecord || textRecord.name !== 'TEXT_LITERAL_WITH_EXTENT') return null;

	const styleAssignmentId = getReferenceIds(styledItemRecord.args[0])[0] ?? null;
	return parseTextFeature(
		entityId,
		geometryEntityId,
		textRecord,
		layerMap.get(entityId),
		styleAssignmentId,
		presentationStyleMap,
		textStyleMap,
		fontMap,
		resolveAxis,
		resolveExtent
	);
};

export const p21TextToGeoJson = (text: string): FeatureCollection => {
	const entities = parseP21Entities(text);
	if (entities.size === 0) {
		throw new SxfParseError('P21 のエンティティを抽出できませんでした');
	}

	const layerMap = buildLayerMap(entities);
	const colorMap = buildColorMap(entities);
	const curveFontMap = buildCurveFontMap(entities);
	const measureMap = buildMeasureMap(entities);
	const curveStyleMap = buildCurveStyleMap(entities, colorMap, curveFontMap, measureMap);
	const presentationStyleMap = buildPresentationStyleMap(entities);
	const textStyleMap = buildTextStyleMap(entities);
	const fontMap = buildFontMap(entities);
	const resolvePoint = getPointMap(entities);
	const resolveDirection = getDirectionMap(entities);
	const resolveAxis = getAxisPlacementMap(entities, resolvePoint, resolveDirection);
	const resolveExtent = getPlanarExtentMap(entities);

	const features = Array.from(entities.entries())
		.map(([entityId, entity]) => {
			if (entity.records.some((record) => record.name === 'ANNOTATION_TEXT_OCCURRENCE')) {
				return parseTextOccurrenceFeature(
					entityId,
					entity,
					entities,
					layerMap,
					presentationStyleMap,
					textStyleMap,
					fontMap,
					resolveAxis,
					resolveExtent
				);
			}

			if (entity.records.some((record) => record.name === 'ANNOTATION_CURVE_OCCURRENCE')) {
				return parseCurveOccurrenceFeature(
					entityId,
					entity,
					entities,
					layerMap,
					presentationStyleMap,
					curveStyleMap,
					resolvePoint,
					resolveAxis
				);
			}

			return null;
		})
		.filter((feature): feature is P21GeometryFeature => feature !== null);

	if (features.length === 0) {
		throw new SxfParseError(
			'P21 から対応している図形を抽出できませんでした。現在はポリライン・円・円弧・文字の一部だけ対応しています。'
		);
	}

	return {
		type: 'FeatureCollection',
		features
	};
};

export const p21ArrayBufferToGeoJson = (arrayBuffer: ArrayBuffer): FeatureCollection =>
	p21TextToGeoJson(decodeSxfText(arrayBuffer));
