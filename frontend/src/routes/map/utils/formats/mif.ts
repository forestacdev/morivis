import type { FeatureCollection, Feature } from '$routes/map/types/geojson';
import type { AnyGeometry, Geometry } from '$routes/map/types/geometry';
import type { FeatureProp } from '$routes/map/types/properties';

type Coordinate = [number, number];
type ParsedGeometry = {
	geometry: Geometry;
	nextIndex: number;
};

const FEATURE_KEYWORDS = new Set([
	'point',
	'line',
	'pline',
	'region',
	'rect',
	'roundrect',
	'ellipse',
	'arc',
	'text',
	'collection'
]);
const STYLE_KEYWORDS = new Set([
	'pen',
	'brush',
	'symbol',
	'center',
	'smooth',
	'font',
	'spacing',
	'justify',
	'label',
	'none'
]);

const splitLines = (text: string): string[] =>
	text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

const getLineKeyword = (line: string): string => line.trim().split(/\s+/)[0]?.toLowerCase() ?? '';

const isValidFeatureLine = (line: string): boolean => FEATURE_KEYWORDS.has(getLineKeyword(line));

const parseDelimitedLine = (line: string, delimiter: string): string[] => {
	const values: string[] = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < line.length; i += 1) {
		const char = line[i];

		if (char === '"') {
			if (inQuotes && line[i + 1] === '"') {
				current += '"';
				i += 1;
			} else {
				inQuotes = !inQuotes;
			}
			continue;
		}

		if (char === delimiter && !inQuotes) {
			values.push(current);
			current = '';
			continue;
		}

		current += char;
	}

	values.push(current);
	return values.map((value) => value.trim());
};

const parseValue = (value: string): string | number | boolean => {
	if (/^(true|false)$/i.test(value)) {
		return value.toLowerCase() === 'true';
	}

	const numberValue = Number(value);
	if (value !== '' && Number.isFinite(numberValue)) {
		return numberValue;
	}

	return value;
};

const parseCoordinateLine = (line: string): Coordinate => {
	const [x, y] = line.trim().split(/\s+/).map(Number);
	if (!Number.isFinite(x) || !Number.isFinite(y)) {
		throw new Error(`座標の解析に失敗しました: ${line}`);
	}
	return [x, y];
};

const closeRing = (ring: Coordinate[]): Coordinate[] => {
	if (ring.length === 0) return ring;
	const [firstX, firstY] = ring[0];
	const [lastX, lastY] = ring[ring.length - 1];
	if (firstX === lastX && firstY === lastY) return ring;
	return [...ring, [firstX, firstY]];
};

const createEllipseRing = (
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	segments = 48
): Coordinate[] => {
	const minX = Math.min(x1, x2);
	const maxX = Math.max(x1, x2);
	const minY = Math.min(y1, y2);
	const maxY = Math.max(y1, y2);
	const centerX = (minX + maxX) / 2;
	const centerY = (minY + maxY) / 2;
	const radiusX = (maxX - minX) / 2;
	const radiusY = (maxY - minY) / 2;
	const coordinates: Coordinate[] = [];

	for (let i = 0; i < segments; i += 1) {
		const angle = (Math.PI * 2 * i) / segments;
		coordinates.push([
			centerX + radiusX * Math.cos(angle),
			centerY + radiusY * Math.sin(angle)
		]);
	}

	return closeRing(coordinates);
};

const createRoundedRectRing = (
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	rounding: number,
	segmentsPerCorner = 8
): Coordinate[] => {
	const minX = Math.min(x1, x2);
	const maxX = Math.max(x1, x2);
	const minY = Math.min(y1, y2);
	const maxY = Math.max(y1, y2);
	const width = maxX - minX;
	const height = maxY - minY;
	const radius = Math.max(0, Math.min(rounding, width / 2, height / 2));

	if (radius === 0) {
		return closeRing([
			[minX, minY],
			[maxX, minY],
			[maxX, maxY],
			[minX, maxY]
		]);
	}

	const arc = (
		centerX: number,
		centerY: number,
		startAngle: number,
		endAngle: number
	): Coordinate[] => {
		const coordinates: Coordinate[] = [];
		for (let i = 0; i <= segmentsPerCorner; i += 1) {
			const angle = startAngle + ((endAngle - startAngle) * i) / segmentsPerCorner;
			coordinates.push([
				centerX + radius * Math.cos(angle),
				centerY + radius * Math.sin(angle)
			]);
		}
		return coordinates;
	};

	const topRight = arc(maxX - radius, minY + radius, -Math.PI / 2, 0);
	const bottomRight = arc(maxX - radius, maxY - radius, 0, Math.PI / 2);
	const bottomLeft = arc(minX + radius, maxY - radius, Math.PI / 2, Math.PI);
	const topLeft = arc(minX + radius, minY + radius, Math.PI, (Math.PI * 3) / 2);

	return closeRing([
		[minX + radius, minY],
		...topRight,
		[maxX, maxY - radius],
		...bottomRight,
		[minX + radius, maxY],
		...bottomLeft,
		[minX, minY + radius],
		...topLeft
	]);
};

const createArcLine = (
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	startX: number,
	startY: number,
	endX: number,
	endY: number,
	segments = 32
): Coordinate[] => {
	const minX = Math.min(x1, x2);
	const maxX = Math.max(x1, x2);
	const minY = Math.min(y1, y2);
	const maxY = Math.max(y1, y2);
	const centerX = (minX + maxX) / 2;
	const centerY = (minY + maxY) / 2;
	const radiusX = (maxX - minX) / 2;
	const radiusY = (maxY - minY) / 2;

	if (radiusX === 0 || radiusY === 0) {
		return [
			[startX, startY],
			[endX, endY]
		];
	}

	const normalizeAngle = (angle: number) => {
		let normalized = angle;
		while (normalized < 0) normalized += Math.PI * 2;
		while (normalized >= Math.PI * 2) normalized -= Math.PI * 2;
		return normalized;
	};

	const startAngle = normalizeAngle(Math.atan2((startY - centerY) / radiusY, (startX - centerX) / radiusX));
	let endAngle = normalizeAngle(Math.atan2((endY - centerY) / radiusY, (endX - centerX) / radiusX));
	if (endAngle <= startAngle) {
		endAngle += Math.PI * 2;
	}

	const coordinates: Coordinate[] = [];
	for (let i = 0; i <= segments; i += 1) {
		const angle = startAngle + ((endAngle - startAngle) * i) / segments;
		coordinates.push([
			centerX + radiusX * Math.cos(angle),
			centerY + radiusY * Math.sin(angle)
		]);
	}

	return coordinates;
};

const normalizeGeometryCollection = (geometries: Geometry[]): Geometry => {
	const singles = geometries.every(
		(geometry) =>
			geometry.type === 'Point' || geometry.type === 'LineString' || geometry.type === 'Polygon'
	);
	const multis = geometries.every(
		(geometry) =>
			geometry.type === 'MultiPoint' ||
			geometry.type === 'MultiLineString' ||
			geometry.type === 'MultiPolygon'
	);

	if (singles || multis) {
		return {
			type: 'GeometryCollection',
			geometries
		} as Geometry;
	}

	return {
		type: 'GeometryCollection',
		geometries: geometries as unknown as AnyGeometry[]
	} as Geometry;
};

class MifLineReader {
	private readonly lines: string[];

	constructor(lines: string[]) {
		this.lines = lines;
	}

	getLine(index: number): string {
		return this.lines[index] ?? '';
	}

	getTrimmedLine(index: number): string {
		return this.getLine(index).trim();
	}

	skipEmpty(index: number): number {
		let cursor = index;
		while (cursor < this.lines.length && this.getTrimmedLine(cursor) === '') {
			cursor += 1;
		}
		return cursor;
	}

	skipStyle(index: number): number {
		let cursor = this.skipEmpty(index);
		while (cursor < this.lines.length) {
			const keyword = getLineKeyword(this.getLine(cursor));
			if (!keyword || !STYLE_KEYWORDS.has(keyword)) {
				break;
			}
			cursor += 1;
			cursor = this.skipEmpty(cursor);
		}
		return cursor;
	}

	readCoordinateBlock(index: number, vertexCount: number): { coordinates: Coordinate[]; nextIndex: number } {
		const coordinates: Coordinate[] = [];
		let cursor = index;

		for (let i = 0; i < vertexCount; i += 1) {
			const lineIndex = this.skipEmpty(cursor);
			coordinates.push(parseCoordinateLine(this.getLine(lineIndex)));
			cursor = lineIndex + 1;
		}

		return {
			coordinates,
			nextIndex: cursor
		};
	}
}

const parsePoint = (line: string): Geometry => {
	const [, xText, yText] = line.trim().split(/\s+/);
	const x = Number(xText);
	const y = Number(yText);
	if (!Number.isFinite(x) || !Number.isFinite(y)) {
		throw new Error(`Point の解析に失敗しました: ${line}`);
	}

	return {
		type: 'Point',
		coordinates: [x, y]
	};
};

const parseLine = (line: string): Geometry => {
	const [, x1Text, y1Text, x2Text, y2Text] = line.trim().split(/\s+/);
	const coordinates = [x1Text, y1Text, x2Text, y2Text].map(Number);
	if (coordinates.some((value) => !Number.isFinite(value))) {
		throw new Error(`Line の解析に失敗しました: ${line}`);
	}

	return {
		type: 'LineString',
		coordinates: [
			[coordinates[0], coordinates[1]],
			[coordinates[2], coordinates[3]]
		]
	};
};

const parseRect = (line: string): Geometry => {
	const [, x1Text, y1Text, x2Text, y2Text] = line.trim().split(/\s+/);
	const coordinates = [x1Text, y1Text, x2Text, y2Text].map(Number);
	if (coordinates.some((value) => !Number.isFinite(value))) {
		throw new Error(`Rect の解析に失敗しました: ${line}`);
	}

	const [x1, y1, x2, y2] = coordinates;
	return {
		type: 'Polygon',
		coordinates: [[
			[x1, y1],
			[x2, y1],
			[x2, y2],
			[x1, y2],
			[x1, y1]
		]]
	};
};

const parseRoundRect = (reader: MifLineReader, index: number): ParsedGeometry => {
	const line = reader.getLine(index);
	const [, x1Text, y1Text, x2Text, y2Text] = line.trim().split(/\s+/);
	const coordinates = [x1Text, y1Text, x2Text, y2Text].map(Number);
	if (coordinates.some((value) => !Number.isFinite(value))) {
		throw new Error(`RoundRect の解析に失敗しました: ${line}`);
	}

	const radiusLineIndex = reader.skipEmpty(index + 1);
	const rounding = Number(reader.getTrimmedLine(radiusLineIndex));
	if (!Number.isFinite(rounding)) {
		throw new Error(`RoundRect の丸み係数が不正です: ${reader.getLine(radiusLineIndex)}`);
	}

	const [x1, y1, x2, y2] = coordinates;
	return {
		geometry: {
			type: 'Polygon',
			coordinates: [createRoundedRectRing(x1, y1, x2, y2, rounding)]
		},
		nextIndex: reader.skipStyle(radiusLineIndex + 1)
	};
};

const parseEllipse = (line: string): Geometry => {
	const [, x1Text, y1Text, x2Text, y2Text] = line.trim().split(/\s+/);
	const coordinates = [x1Text, y1Text, x2Text, y2Text].map(Number);
	if (coordinates.some((value) => !Number.isFinite(value))) {
		throw new Error(`Ellipse の解析に失敗しました: ${line}`);
	}

	const [x1, y1, x2, y2] = coordinates;
	return {
		type: 'Polygon',
		coordinates: [createEllipseRing(x1, y1, x2, y2)]
	};
};

const parseArc = (reader: MifLineReader, index: number): ParsedGeometry => {
	const boundsTokens = reader.getTrimmedLine(index).split(/\s+/);
	const pointsTokens = reader.getTrimmedLine(index + 1).split(/\s+/);
	const coords = [...boundsTokens.slice(1), ...pointsTokens].map(Number);

	if (coords.length < 8 || coords.some((value) => !Number.isFinite(value))) {
		throw new Error(`Arc の解析に失敗しました: ${reader.getLine(index)} / ${reader.getLine(index + 1)}`);
	}

	const [x1, y1, x2, y2, startX, startY, endX, endY] = coords;
	return {
		geometry: {
			type: 'LineString',
			coordinates: createArcLine(x1, y1, x2, y2, startX, startY, endX, endY)
		},
		nextIndex: reader.skipStyle(index + 2)
	};
};

const parseFontClause = (line: string, properties: FeatureProp) => {
	const match = line.match(
		/^Font\s+\("([^"]*)"\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*(?:,\s*([^)]+))?\)$/i
	);
	if (!match) return;

	properties.mif_text_fontname = match[1];
	properties.mif_text_fontstyle = Number(match[2].trim());
	properties.mif_text_fontfgcolor = Number(match[3].trim());
	properties.mif_text_fontbgcolor = Number(match[4].trim());
	if (match[5] != null) {
		const charset = Number(match[5].trim());
		if (Number.isFinite(charset)) {
			properties.mif_text_charset = charset;
		}
	}
};

const parseTextStyleClauses = (
	reader: MifLineReader,
	index: number,
	properties: FeatureProp
): number => {
	let cursor = reader.skipEmpty(index);

	while (cursor < Number.MAX_SAFE_INTEGER) {
		const line = reader.getTrimmedLine(cursor);
		if (!line) {
			cursor = reader.skipEmpty(cursor + 1);
			continue;
		}

		const keyword = getLineKeyword(line);
		if (!keyword || !STYLE_KEYWORDS.has(keyword)) {
			break;
		}

		if (keyword === 'font') {
			parseFontClause(line, properties);
		} else if (keyword === 'spacing') {
			const spacing = Number(line.replace(/^Spacing\s+/i, '').trim());
			if (Number.isFinite(spacing)) {
				properties.mif_text_spacing = spacing;
			}
		} else if (keyword === 'justify') {
			properties.mif_text_justify = line.replace(/^Justify\s+/i, '').trim();
		} else if (keyword === 'angle') {
			const angle = Number(line.replace(/^Angle\s+/i, '').trim());
			if (Number.isFinite(angle)) {
				properties.mif_rotation = angle;
			}
		} else if (keyword === 'label') {
			const match = line.match(/^Label\s+Line\s+(\w+)\s+([^\s]+)\s+([^\s]+)$/i);
			if (match) {
				properties.mif_label_line_type = match[1];
				const x = Number(match[2]);
				const y = Number(match[3]);
				if (Number.isFinite(x)) properties.mif_label_line_x = x;
				if (Number.isFinite(y)) properties.mif_label_line_y = y;
			}
		}

		cursor = reader.skipEmpty(cursor + 1);
	}

	return cursor;
};

const parseText = (
	reader: MifLineReader,
	index: number,
	properties: FeatureProp
): ParsedGeometry => {
	const header = reader.getTrimmedLine(index);
	const textMatch = header.match(/^Text\s+"([\s\S]*)"$/i);
	const boundsTokens = reader.getTrimmedLine(index + 1).split(/\s+/).map(Number);

	if (!textMatch || boundsTokens.length < 4 || boundsTokens.some((value) => !Number.isFinite(value))) {
		throw new Error(`Text の解析に失敗しました: ${reader.getLine(index)} / ${reader.getLine(index + 1)}`);
	}

	const [x1, y1, x2, y2] = boundsTokens;
	properties.mif_text = textMatch[1].replace(/""/g, '"');
	properties.mif_text_bounds = `${x1},${y1},${x2},${y2}`;
	const nextIndex = parseTextStyleClauses(reader, index + 2, properties);

	return {
		geometry: {
			type: 'Point',
			coordinates: [(x1 + x2) / 2, (y1 + y2) / 2]
		},
		nextIndex
	};
};

const parsePline = (reader: MifLineReader, index: number): ParsedGeometry => {
	const header = reader.getTrimmedLine(index);
	const multipleMatch = header.match(/^Pline\s+Multiple\s+(\d+)$/i);

	if (multipleMatch) {
		const partCount = Number(multipleMatch[1]);
		let cursor = index + 1;
		const parts: Coordinate[][] = [];

		for (let partIndex = 0; partIndex < partCount; partIndex += 1) {
			cursor = reader.skipEmpty(cursor);
			const vertexCount = Number(reader.getTrimmedLine(cursor));
			if (!Number.isFinite(vertexCount) || vertexCount <= 0) {
				throw new Error(`Pline Multiple の頂点数が不正です: ${reader.getLine(cursor)}`);
			}

			const result = reader.readCoordinateBlock(cursor + 1, vertexCount);
			parts.push(result.coordinates);
			cursor = result.nextIndex;
		}

		return {
			geometry: {
				type: 'MultiLineString',
				coordinates: parts
			},
			nextIndex: reader.skipStyle(cursor)
		};
	}

	const match = header.match(/^Pline\s+(\d+)$/i);
	if (!match) {
		throw new Error(`Pline の解析に失敗しました: ${header}`);
	}

	const vertexCount = Number(match[1]);
	const result = reader.readCoordinateBlock(index + 1, vertexCount);
	return {
		geometry: {
			type: 'LineString',
			coordinates: result.coordinates
		},
		nextIndex: reader.skipStyle(result.nextIndex)
	};
};

const parseRegion = (reader: MifLineReader, index: number): ParsedGeometry => {
	const header = reader.getTrimmedLine(index);
	const match = header.match(/^Region\s+(\d+)$/i);
	if (!match) {
		throw new Error(`Region の解析に失敗しました: ${header}`);
	}

	const polygonCount = Number(match[1]);
	let cursor = index + 1;
	const polygons: Coordinate[][][] = [];

	for (let polygonIndex = 0; polygonIndex < polygonCount; polygonIndex += 1) {
		cursor = reader.skipEmpty(cursor);
		const vertexCount = Number(reader.getTrimmedLine(cursor));
		if (!Number.isFinite(vertexCount) || vertexCount <= 0) {
			throw new Error(`Region の頂点数が不正です: ${reader.getLine(cursor)}`);
		}

		const result = reader.readCoordinateBlock(cursor + 1, vertexCount);
		polygons.push([closeRing(result.coordinates)]);
		cursor = result.nextIndex;
	}

	return {
		geometry:
			polygons.length === 1
				? {
						type: 'Polygon',
						coordinates: polygons[0]
					}
				: {
						type: 'MultiPolygon',
						coordinates: polygons
					},
		nextIndex: reader.skipStyle(cursor)
	};
};

const parseCollection = (reader: MifLineReader, index: number, properties: FeatureProp): ParsedGeometry => {
	const header = reader.getTrimmedLine(index);
	const match = header.match(/^Collection\s+(\d+)$/i);
	if (!match) {
		throw new Error(`Collection の解析に失敗しました: ${header}`);
	}

	const geometryCount = Number(match[1]);
	let cursor = index + 1;
	const geometries: Geometry[] = [];

	for (let geometryIndex = 0; geometryIndex < geometryCount; geometryIndex += 1) {
		cursor = reader.skipEmpty(cursor);
		if (!isValidFeatureLine(reader.getLine(cursor))) {
			throw new Error(`Collection 内のジオメトリ開始行が不正です: ${reader.getLine(cursor)}`);
		}

		const parsed = parseGeometryAt(reader, cursor, properties);
		geometries.push(parsed.geometry);
		cursor = parsed.nextIndex;
	}

	return {
		geometry: normalizeGeometryCollection(geometries),
		nextIndex: reader.skipStyle(cursor)
	};
};

const parseGeometryAt = (reader: MifLineReader, index: number, properties: FeatureProp): ParsedGeometry => {
	const line = reader.getLine(index);
	const keyword = getLineKeyword(line);

	if (keyword === 'point') {
		return {
			geometry: parsePoint(line),
			nextIndex: reader.skipStyle(index + 1)
		};
	}

	if (keyword === 'line') {
		return {
			geometry: parseLine(line),
			nextIndex: reader.skipStyle(index + 1)
		};
	}

	if (keyword === 'pline') {
		return parsePline(reader, index);
	}

	if (keyword === 'region') {
		return parseRegion(reader, index);
	}

	if (keyword === 'rect') {
		return {
			geometry: parseRect(line),
			nextIndex: reader.skipStyle(index + 1)
		};
	}

	if (keyword === 'roundrect') {
		return parseRoundRect(reader, index);
	}

	if (keyword === 'ellipse') {
		return {
			geometry: parseEllipse(line),
			nextIndex: reader.skipStyle(index + 1)
		};
	}

	if (keyword === 'arc') {
		return parseArc(reader, index);
	}

	if (keyword === 'text') {
		return parseText(reader, index, properties);
	}

	if (keyword === 'collection') {
		return parseCollection(reader, index, properties);
	}

	throw new Error(`未対応のジオメトリです: ${line}`);
};

const readHeader = (lines: string[]) => {
	let delimiter = ',';
	const columns: string[] = [];
	let dataIndex = -1;

	for (let index = 0; index < lines.length; index += 1) {
		const trimmed = lines[index].trim();
		if (!trimmed) continue;

		if (/^Delimiter\s+/i.test(trimmed)) {
			const match = trimmed.match(/^Delimiter\s+"(.+)"$/i);
			if (match?.[1]) {
				delimiter = match[1];
			}
			continue;
		}

		if (/^Columns\s+/i.test(trimmed)) {
			const match = trimmed.match(/^Columns\s+(\d+)$/i);
			const count = Number(match?.[1] ?? 0);
			for (let i = 0; i < count; i += 1) {
				const fieldLine = lines[index + 1 + i]?.trim() ?? '';
				const fieldName = fieldLine.split(/\s+/)[0]?.replace(/^"|"$/g, '');
				columns.push(fieldName || `field_${i + 1}`);
			}
			index += count;
			continue;
		}

		if (/^Data$/i.test(trimmed)) {
			dataIndex = index + 1;
			break;
		}
	}

	if (dataIndex < 0) {
		throw new Error('MIF の DATA セクションが見つかりませんでした');
	}

	return { delimiter, columns, dataIndex };
};

const parseMid = (text: string, delimiter: string, fieldNames: string[]): FeatureProp[] => {
	const lines = splitLines(text).filter((line) => line.trim() !== '');
	return lines.map((line) => {
		const values = parseDelimitedLine(line, delimiter);
		const properties: FeatureProp = {};

		fieldNames.forEach((fieldName, index) => {
			properties[fieldName] = parseValue(values[index] ?? '');
		});

		return properties;
	});
};

export const mifFilesToGeoJson = async (
	mifFile: File,
	midFile?: File | null
): Promise<FeatureCollection<Geometry, FeatureProp>> => {
	const mifText = await mifFile.text();
	const lines = splitLines(mifText);
	const { delimiter, columns, dataIndex } = readHeader(lines);
	const propertiesList = midFile ? parseMid(await midFile.text(), delimiter, columns) : [];
	const reader = new MifLineReader(lines);

	const features: Feature<Geometry, FeatureProp>[] = [];
	let cursor = dataIndex;
	let featureIndex = 0;

	while (cursor < lines.length) {
		cursor = reader.skipEmpty(cursor);
		if (cursor >= lines.length) break;

		const line = reader.getLine(cursor);
		if (!isValidFeatureLine(line)) {
			cursor += 1;
			continue;
		}

		const properties = { ...(propertiesList[featureIndex] ?? {}) };
		const parsed = parseGeometryAt(reader, cursor, properties);
		features.push({
			type: 'Feature',
			id: featureIndex,
			geometry: parsed.geometry,
			properties
		});
		featureIndex += 1;
		cursor = parsed.nextIndex;
	}

	return {
		type: 'FeatureCollection',
		features
	};
};
