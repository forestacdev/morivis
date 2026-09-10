const BINARY_HEADER_PREFIX = 'Kaydara FBX Binary  ';
const AXIS_NAMES = ['X', 'Y', 'Z'] as const;
const CONTENT_NODE_NAMES = new Set([
	'Model',
	'Geometry',
	'Material',
	'Texture',
	'Video',
	'AnimationStack'
]);

type FbxScalar = string | number | boolean;
type FbxPropertyMap = Map<string, FbxScalar | FbxScalar[]>;

export interface ModelSourceApplication {
	vendor?: string;
	name?: string;
	version?: string;
}

export interface FbxAxisMetadata {
	axis: 'X' | 'Y' | 'Z';
	sign: -1 | 1;
}

export interface FbxFileMetadata {
	encoding: 'ascii' | 'binary';
	version?: number;
	creator?: string;
	originalApplication?: ModelSourceApplication;
	lastSavedApplication?: ModelSourceApplication;
	createdAt?: string;
	modifiedAt?: string;
	originalFileName?: string;
	lastSavedFileName?: string;
	coordinateSystem?: {
		upAxis?: FbxAxisMetadata;
		frontAxis?: FbxAxisMetadata;
		coordinateAxis?: FbxAxisMetadata;
		unitScaleFactor?: number;
		unitScaleMeters?: number;
		originalUnitScaleFactor?: number;
	};
	contents: {
		modelCount: number;
		geometryCount: number;
		materialCount: number;
		textureCount: number;
		videoCount: number;
		animationStackCount: number;
		geometryTypes?: Record<string, number>;
	};
}

interface ParsedFbxMetadata {
	encoding: FbxFileMetadata['encoding'];
	version?: number;
	creator?: string;
	properties: FbxPropertyMap;
	contentCounts: Record<string, number>;
	geometryTypes: Record<string, number>;
}

const hasPropertyValue = (value: FbxScalar | FbxScalar[]) => {
	const values = Array.isArray(value) ? value : [value];
	return values.some((item) => typeof item !== 'string' || item.trim() !== '');
};

const setPreferredProperty = (
	properties: FbxPropertyMap,
	key: string,
	value: FbxScalar | FbxScalar[]
) => {
	const current = properties.get(key);
	if (current === undefined || (!hasPropertyValue(current) && hasPropertyValue(value))) {
		properties.set(key, value);
	}
};

const getScalar = (value: FbxScalar | FbxScalar[] | undefined) =>
	Array.isArray(value) ? value[0] : value;

const getString = (properties: FbxPropertyMap, key: string) => {
	const value = getScalar(properties.get(key));
	return value == null || String(value).trim() === '' ? undefined : String(value).trim();
};

const getNumber = (properties: FbxPropertyMap, key: string) => {
	const value = Number(getScalar(properties.get(key)));
	return Number.isFinite(value) ? value : undefined;
};

const getApplication = (
	properties: FbxPropertyMap,
	prefix: 'Original' | 'LastSaved'
): ModelSourceApplication | undefined => {
	const application = {
		vendor: getString(properties, `${prefix}|ApplicationVendor`),
		name: getString(properties, `${prefix}|ApplicationName`),
		version: getString(properties, `${prefix}|ApplicationVersion`)
	};
	return Object.values(application).some(Boolean) ? application : undefined;
};

const getAxis = (
	properties: FbxPropertyMap,
	axisKey: string,
	signKey: string
): FbxAxisMetadata | undefined => {
	const axisIndex = getNumber(properties, axisKey);
	const axis = axisIndex == null ? undefined : AXIS_NAMES[axisIndex];
	if (!axis) return undefined;
	return {
		axis,
		sign: getNumber(properties, signKey) === -1 ? -1 : 1
	};
};

const getFileName = (value: string | undefined) => {
	if (!value) return undefined;
	const normalized = value.replace(/\\/g, '/').replaceAll('\0', '').trim();
	return normalized.split('/').filter(Boolean).pop();
};

const createMetadata = (parsed: ParsedFbxMetadata): FbxFileMetadata => {
	const properties = parsed.properties;
	const unitScaleFactor = getNumber(properties, 'UnitScaleFactor');
	const coordinateSystem = {
		upAxis: getAxis(properties, 'UpAxis', 'UpAxisSign'),
		frontAxis: getAxis(properties, 'FrontAxis', 'FrontAxisSign'),
		coordinateAxis: getAxis(properties, 'CoordAxis', 'CoordAxisSign'),
		unitScaleFactor,
		unitScaleMeters: unitScaleFactor == null ? undefined : unitScaleFactor * 0.01,
		originalUnitScaleFactor: getNumber(properties, 'OriginalUnitScaleFactor')
	};
	const geometryTypes = parsed.geometryTypes;
	return {
		encoding: parsed.encoding,
		version: parsed.version,
		creator: parsed.creator,
		originalApplication: getApplication(properties, 'Original'),
		lastSavedApplication: getApplication(properties, 'LastSaved'),
		createdAt: getString(properties, 'Original|DateTime_GMT'),
		modifiedAt: getString(properties, 'LastSaved|DateTime_GMT'),
		originalFileName: getFileName(getString(properties, 'Original|FileName')),
		lastSavedFileName: getFileName(getString(properties, 'LastSaved|FileName')),
		...(Object.values(coordinateSystem).some((value) => value != null)
			? { coordinateSystem }
			: {}),
		contents: {
			modelCount: parsed.contentCounts.Model ?? 0,
			geometryCount: parsed.contentCounts.Geometry ?? 0,
			materialCount: parsed.contentCounts.Material ?? 0,
			textureCount: parsed.contentCounts.Texture ?? 0,
			videoCount: parsed.contentCounts.Video ?? 0,
			animationStackCount: parsed.contentCounts.AnimationStack ?? 0,
			...(Object.keys(geometryTypes).length > 0 ? { geometryTypes } : {})
		}
	};
};

const parseBinaryMetadata = (buffer: ArrayBuffer): ParsedFbxMetadata => {
	const bytes = new Uint8Array(buffer);
	const view = new DataView(buffer);
	const decoder = new TextDecoder();
	const version = view.getUint32(23, true);
	const nodeHeaderLength = version >= 7500 ? 25 : 13;
	const properties: FbxPropertyMap = new Map();
	const contentCounts: Record<string, number> = {};
	const geometryTypes: Record<string, number> = {};
	let creator: string | undefined;
	const hasBytes = (offset: number, length: number, limit: number) =>
		Number.isSafeInteger(offset)
		&& Number.isSafeInteger(length)
		&& offset >= 0
		&& length >= 0
		&& offset + length <= limit
		&& offset + length <= buffer.byteLength;
	const readString = (offset: number, length: number) =>
		decoder.decode(bytes.subarray(offset, offset + length));
	const readProperty = (offset: number, limit: number): [FbxScalar | null, number] => {
		if (!hasBytes(offset, 1, limit)) return [null, limit];
		const type = String.fromCharCode(view.getUint8(offset));
		offset += 1;
		if (type === 'C' && hasBytes(offset, 1, limit)) {
			return [view.getUint8(offset) !== 0, offset + 1];
		}
		if (type === 'Y' && hasBytes(offset, 2, limit)) {
			return [view.getInt16(offset, true), offset + 2];
		}
		if (type === 'I' && hasBytes(offset, 4, limit)) {
			return [view.getInt32(offset, true), offset + 4];
		}
		if (type === 'F' && hasBytes(offset, 4, limit)) {
			return [view.getFloat32(offset, true), offset + 4];
		}
		if (type === 'D' && hasBytes(offset, 8, limit)) {
			return [view.getFloat64(offset, true), offset + 8];
		}
		if (type === 'L' && hasBytes(offset, 8, limit)) {
			return [Number(view.getBigInt64(offset, true)), offset + 8];
		}
		if (type === 'S') {
			if (!hasBytes(offset, 4, limit)) return [null, limit];
			const length = view.getUint32(offset, true);
			return hasBytes(offset + 4, length, limit)
				? [readString(offset + 4, length), offset + 4 + length]
				: [null, limit];
		}
		if (type === 'R') {
			if (!hasBytes(offset, 4, limit)) return [null, limit];
			const length = view.getUint32(offset, true);
			return hasBytes(offset + 4, length, limit)
				? [null, offset + 4 + length]
				: [null, limit];
		}
		if ('fdilb'.includes(type)) {
			if (!hasBytes(offset, 12, limit)) return [null, limit];
			const length = view.getUint32(offset + 8, true);
			return hasBytes(offset + 12, length, limit)
				? [null, offset + 12 + length]
				: [null, limit];
		}
		return [null, limit];
	};
	const parseNode = (offset: number): number => {
		if (!hasBytes(offset, nodeHeaderLength, buffer.byteLength)) return buffer.byteLength;
		const end = version >= 7500
			? Number(view.getBigUint64(offset, true))
			: view.getUint32(offset, true);
		if (end === 0) return offset + nodeHeaderLength;
		if (end <= offset || end > buffer.byteLength) return buffer.byteLength;
		const propertyLength = version >= 7500
			? Number(view.getBigUint64(offset + 16, true))
			: view.getUint32(offset + 8, true);
		const nameLength = view.getUint8(offset + nodeHeaderLength - 1);
		const nameOffset = offset + nodeHeaderLength;
		if (!hasBytes(nameOffset, nameLength, end)) return end;
		const name = readString(nameOffset, nameLength);
		let cursor = nameOffset + nameLength;
		const propertyEnd = cursor + propertyLength;
		if (!Number.isSafeInteger(propertyEnd) || propertyEnd > end) return end;
		const values: Array<FbxScalar | null> = [];
		while (cursor < propertyEnd) {
			const [value, next] = readProperty(cursor, propertyEnd);
			values.push(value);
			if (next <= cursor) return end;
			cursor = next;
		}

		if (CONTENT_NODE_NAMES.has(name)) {
			contentCounts[name] = (contentCounts[name] ?? 0) + 1;
		}
		if (name === 'Geometry' && typeof values[2] === 'string') {
			geometryTypes[values[2]] = (geometryTypes[values[2]] ?? 0) + 1;
		}
		if (name === 'Creator' && typeof values[0] === 'string' && !creator) {
			creator = values[0];
		}
		if (name === 'P' && typeof values[0] === 'string') {
			const propertyValues = values.slice(4).filter((value): value is FbxScalar =>
				value != null
			);
			if (propertyValues.length > 0) {
				setPreferredProperty(
					properties,
					values[0],
					propertyValues.length === 1 ? propertyValues[0] : propertyValues
				);
			}
		}

		while (cursor + nodeHeaderLength <= end) {
			const nextOffset = parseNode(cursor);
			if (nextOffset <= cursor) break;
			cursor = nextOffset;
		}
		return end;
	};

	let offset = 27;
	while (offset + nodeHeaderLength <= buffer.byteLength) {
		const nextOffset = parseNode(offset);
		if (nextOffset <= offset) break;
		offset = nextOffset;
	}
	return { encoding: 'binary', version, creator, properties, contentCounts, geometryTypes };
};

interface AsciiToken {
	value: FbxScalar;
	quoted: boolean;
}

const parseAsciiTokens = (source: string): AsciiToken[] => {
	const tokens: AsciiToken[] = [];
	let value = '';
	let quoted = false;
	let inQuotes = false;
	for (let index = 0; index <= source.length; index += 1) {
		const character = source[index];
		if (character === '"') {
			inQuotes = !inQuotes;
			quoted = true;
			continue;
		}
		if ((character === ',' && !inQuotes) || index === source.length) {
			const trimmed = value.trim();
			const numeric = Number(trimmed);
			tokens.push({
				value: !quoted && trimmed !== '' && Number.isFinite(numeric) ? numeric : trimmed,
				quoted
			});
			value = '';
			quoted = false;
			continue;
		}
		value += character;
	}
	return tokens;
};

const parseAsciiMetadata = (text: string): ParsedFbxMetadata => {
	const properties: FbxPropertyMap = new Map();
	const contentCounts: Record<string, number> = {};
	const geometryTypes: Record<string, number> = {};
	const version = Number(text.match(/^\s*FBXVersion\s*:\s*(\d+)/m)?.[1]);
	const creator = text.match(/^\s*Creator\s*:\s*"([^"]*)"/m)?.[1];
	for (
		const match of text.matchAll(
			/^\s*(Model|Geometry|Material|Texture|Video|AnimationStack)\s*:\s*(.*)$/gm
		)
	) {
		const name = match[1];
		contentCounts[name] = (contentCounts[name] ?? 0) + 1;
		if (name === 'Geometry') {
			const values = parseAsciiTokens((match[2] ?? '').replace(/\s*\{\s*$/, ''));
			const geometryType = values[2]?.value;
			if (typeof geometryType === 'string' && geometryType) {
				geometryTypes[geometryType] = (geometryTypes[geometryType] ?? 0) + 1;
			}
		}
	}
	for (const match of text.matchAll(/^\s*P\s*:\s*(.*)$/gm)) {
		const values = parseAsciiTokens(match[1] ?? '');
		const key = values[0]?.value;
		if (typeof key !== 'string') continue;
		const propertyValues = values.slice(4).map((token) => token.value);
		if (propertyValues.length > 0) {
			setPreferredProperty(
				properties,
				key,
				propertyValues.length === 1 ? propertyValues[0] : propertyValues
			);
		}
	}
	return {
		encoding: 'ascii',
		version: Number.isFinite(version) ? version : undefined,
		creator,
		properties,
		contentCounts,
		geometryTypes
	};
};

export const parseFbxFileMetadata = (buffer: ArrayBuffer): FbxFileMetadata => {
	const header = new TextDecoder().decode(
		new Uint8Array(buffer).subarray(0, BINARY_HEADER_PREFIX.length)
	);
	return createMetadata(
		header === BINARY_HEADER_PREFIX
			? parseBinaryMetadata(buffer)
			: parseAsciiMetadata(new TextDecoder().decode(buffer))
	);
};

const formatApplication = (application: ModelSourceApplication) =>
	[application.vendor, application.name, application.version].filter(Boolean).join(' ');

const formatFileSize = (byteSize: number) => {
	if (byteSize >= 1024 ** 2) return `${(byteSize / 1024 ** 2).toFixed(1)} MB`;
	if (byteSize >= 1024) return `${(byteSize / 1024).toFixed(1)} KB`;
	return `${byteSize} bytes`;
};

const formatUnit = (meters: number) => {
	if (meters >= 1) return `${meters} m`;
	if (meters >= 0.01) return `${meters * 100} cm`;
	if (meters >= 0.001) return `${meters * 1000} mm`;
	return `${meters} m`;
};

export const formatFbxMetadataDescription = (metadata: FbxFileMetadata, byteSize: number) => {
	const details: string[] = [];
	details.push(
		`${metadata.encoding === 'binary' ? 'Binary' : 'ASCII'} FBX${
			metadata.version ? ` ${metadata.version}` : ''
		}`
	);
	if (metadata.creator) details.push(`生成ツール: ${metadata.creator}`);
	if (metadata.originalApplication) {
		details.push(`変換元: ${formatApplication(metadata.originalApplication)}`);
	}
	if (metadata.lastSavedApplication) {
		details.push(`最終保存: ${formatApplication(metadata.lastSavedApplication)}`);
	}
	if (metadata.originalFileName) details.push(`元ファイル: ${metadata.originalFileName}`);
	if (metadata.createdAt) details.push(`作成日時: ${metadata.createdAt}`);
	if (metadata.modifiedAt) details.push(`更新日時: ${metadata.modifiedAt}`);
	if (metadata.coordinateSystem?.upAxis) {
		const { axis, sign } = metadata.coordinateSystem.upAxis;
		details.push(`${sign === -1 ? '-' : ''}${axis}-up`);
	}
	if (metadata.coordinateSystem?.unitScaleMeters != null) {
		details.push(`1単位=${formatUnit(metadata.coordinateSystem.unitScaleMeters)}`);
	}
	details.push(`ファイルサイズ: ${formatFileSize(byteSize)}`);
	const contents = metadata.contents;
	details.push(`Model ${contents.modelCount.toLocaleString('ja-JP')}件`);
	details.push(`Geometry ${contents.geometryCount.toLocaleString('ja-JP')}件`);
	if (contents.geometryTypes) {
		const geometryTypes = Object.entries(contents.geometryTypes)
			.map(([type, count]) => `${type} ${count.toLocaleString('ja-JP')}件`)
			.join('、');
		if (geometryTypes) details.push(`内訳: ${geometryTypes}`);
	}
	details.push(`Material ${contents.materialCount.toLocaleString('ja-JP')}件`);
	if (contents.textureCount > 0) {
		details.push(`Texture ${contents.textureCount.toLocaleString('ja-JP')}件`);
	}
	if (contents.animationStackCount > 0) {
		details.push(`Animation ${contents.animationStackCount.toLocaleString('ja-JP')}件`);
	}
	return `${details.join('、')}。`;
};
