import type { FeatureProp } from '$routes/map/types/properties';

interface PropertyDefinition {
	type: string;
	componentType?: string;
	array?: boolean;
	count?: number;
	enumType?: string;
	normalized?: boolean;
	offset?: number | number[];
	scale?: number | number[];
	noData?: unknown;
	default?: unknown;
}
interface PropertyStorage {
	values: number;
	arrayOffsets?: number;
	stringOffsets?: number;
	arrayOffsetType?: string;
	stringOffsetType?: string;
	offset?: number | number[];
	scale?: number | number[];
}
interface StructuralMetadata {
	schema?: {
		classes: Record<string, { properties: Record<string, PropertyDefinition>; }>;
		enums?: Record<string, { valueType?: string; values: { name: string; value: number; }[]; }>;
	};
	propertyTables?: {
		class: string;
		count: number;
		properties: Record<string, PropertyStorage>;
	}[];
}
export interface MetadataGltf {
	bufferViews?: { data: Uint8Array; }[];
	extensions?: Record<string, unknown>;
}
export interface MetadataTileContent {
	batchTableJson?: Record<string, unknown>;
	batchTableBinary?: Uint8Array;
	featureTableJson?: { BATCH_LENGTH?: number; };
	gltf?: MetadataGltf;
}

const components: Record<string, number> = {
	SCALAR: 1,
	VEC2: 2,
	VEC3: 3,
	VEC4: 4,
	MAT2: 4,
	MAT3: 9,
	MAT4: 16
};
const numericTypes: Record<string, [number, (view: DataView, offset: number) => number | bigint]> =
	{
		INT8: [1, (v, o) => v.getInt8(o)],
		UINT8: [1, (v, o) => v.getUint8(o)],
		INT16: [2, (v, o) => v.getInt16(o, true)],
		UINT16: [2, (v, o) => v.getUint16(o, true)],
		INT32: [4, (v, o) => v.getInt32(o, true)],
		UINT32: [4, (v, o) => v.getUint32(o, true)],
		INT64: [8, (v, o) => v.getBigInt64(o, true)],
		UINT64: [8, (v, o) => v.getBigUint64(o, true)],
		FLOAT32: [4, (v, o) => v.getFloat32(o, true)],
		FLOAT64: [8, (v, o) => v.getFloat64(o, true)]
	};
const readNumber = (data: Uint8Array | undefined, type: string, index: number): number | bigint => {
	const format = numericTypes[type];
	if (
		!data || !format || !Number.isSafeInteger(index) || index < 0
		|| (index + 1) * format[0] > data.byteLength
	) {
		throw new Error('属性バッファの範囲または型が不正です');
	}
	return format[1](
		new DataView(data.buffer, data.byteOffset, data.byteLength),
		index * format[0]
	);
};
const displayValue = (value: unknown): string | number | boolean => {
	if (typeof value === 'bigint') return value.toString();
	if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
		return value;
	}
	return JSON.stringify(value, (_, item) => typeof item === 'bigint' ? item.toString() : item)
		?? '';
};

const readStructuralProperty = (
	gltf: MetadataGltf,
	metadata: StructuralMetadata,
	definition: PropertyDefinition,
	storage: PropertyStorage | undefined,
	row: number
): unknown => {
	if (!storage) return definition.default;
	const buffer = (index: number | undefined) =>
		index === undefined ? undefined : gltf.bufferViews?.[index]?.data;
	const offsetAt = (index: number | undefined, type: string | undefined, at: number) => {
		const offset = Number(readNumber(buffer(index), type ?? 'UINT32', at));
		if (!Number.isSafeInteger(offset) || offset < 0) {
			throw new Error('属性のオフセットが不正です');
		}
		return offset;
	};
	const values = buffer(storage.values);
	if (!values) throw new Error('属性バッファがありません');
	let start = row;
	let end = row + 1;
	if (definition.array) {
		if (definition.count !== undefined) {
			start = row * definition.count;
			end = start + definition.count;
		} else {
			start = offsetAt(storage.arrayOffsets, storage.arrayOffsetType, row);
			end = offsetAt(storage.arrayOffsets, storage.arrayOffsetType, row + 1);
		}
	}
	const enumDefinition = definition.enumType
		? metadata.schema?.enums?.[definition.enumType]
		: undefined;
	const componentType = definition.type === 'ENUM'
		? enumDefinition?.valueType ?? 'UINT16'
		: definition.componentType;
	const width = components[definition.type] ?? 1;
	// オフセットを検証してから配列を確保する（空文字列の配列も有効）。
	const capacity = definition.type === 'STRING'
		? (buffer(storage.stringOffsets)?.byteLength ?? 0)
				/ (numericTypes[storage.stringOffsetType ?? 'UINT32']?.[0] ?? Infinity) - 1
		: definition.type === 'BOOLEAN'
		? values.byteLength * 8
		: values.byteLength / ((numericTypes[componentType ?? '']?.[0] ?? Infinity) * width);
	if (
		!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start
		|| end > capacity
	) {
		throw new Error('属性配列の範囲が不正です');
	}
	const readElement = (index: number): unknown => {
		if (definition.type === 'STRING') {
			const begin = offsetAt(storage.stringOffsets, storage.stringOffsetType, index);
			const finish = offsetAt(storage.stringOffsets, storage.stringOffsetType, index + 1);
			if (finish < begin || finish > values.byteLength) {
				throw new Error('文字列の範囲が不正です');
			}
			return new TextDecoder().decode(values.subarray(begin, finish));
		}
		if (definition.type === 'BOOLEAN') {
			if (index >= values.byteLength * 8) throw new Error('真偽値の範囲が不正です');
			return Boolean(values[Math.floor(index / 8)] & (1 << (index % 8)));
		}
		if (!componentType || (!components[definition.type] && definition.type !== 'ENUM')) {
			throw new Error('未対応の属性型です');
		}
		const parts = Array.from(
			{ length: width },
			(_, i) => readNumber(values, componentType, index * width + i)
		);
		if (definition.type === 'ENUM') {
			return enumDefinition?.values.find((item) => BigInt(item.value) === BigInt(parts[0]))
				?.name ?? parts[0];
		}
		return width === 1 ? parts[0] : parts;
	};
	const raw = Array.from({ length: end - start }, (_, i) => readElement(start + i));
	const value = definition.array ? raw : raw[0];
	if (
		definition.noData !== undefined && displayValue(value) === displayValue(definition.noData)
	) return definition.default;
	const scale = storage.scale ?? definition.scale ?? 1;
	const offset = storage.offset ?? definition.offset ?? 0;
	const transform = (item: unknown, index = 0): unknown => {
		if (Array.isArray(item)) return item.map((part, i) => transform(part, i));
		if (typeof item !== 'number' && typeof item !== 'bigint') return item;
		let result = item;
		if (definition.normalized && componentType?.includes('INT')) {
			const bits = numericTypes[componentType][0] * 8;
			result = componentType.startsWith('UINT')
				? Number(item) / (2 ** bits - 1)
				: Math.max(Number(item) / (2 ** (bits - 1) - 1), -1);
		}
		const factor = Array.isArray(scale) ? scale[index] : scale;
		const addition = Array.isArray(offset) ? offset[index] : offset;
		return factor === 1 && addition === 0 ? result : Number(result) * factor + addition;
	};
	return definition.array ? raw.map((item) => transform(item)) : transform(value);
};

/** 選択した行だけを展開する。タイル全体の属性は複製しない。 */
export const readTileFeatureProperties = (
	content: MetadataTileContent,
	featureId: number,
	propertyTable?: number
): FeatureProp => {
	const properties: FeatureProp = {};
	if (!Number.isSafeInteger(featureId) || featureId < 0) return properties;
	if (propertyTable !== undefined) {
		const gltf = content.gltf;
		const metadata = gltf?.extensions?.EXT_structural_metadata as
			| StructuralMetadata
			| undefined;
		const table = metadata?.propertyTables?.[propertyTable];
		const definitions = table && metadata?.schema?.classes?.[table.class]?.properties;
		if (!gltf || !metadata || !table || featureId >= table.count || !definitions) {
			return properties;
		}
		for (const [key, definition] of Object.entries(definitions)) {
			try {
				const value = readStructuralProperty(
					gltf,
					metadata,
					definition,
					table.properties[key],
					featureId
				);
				if (value !== undefined) properties[key] = displayValue(value);
			} catch {
				properties[key] = '属性を読み取れません（未対応の形式または不正なデータ）';
			}
		}
		return properties;
	}
	const count = content.featureTableJson?.BATCH_LENGTH;
	if (count !== undefined && featureId >= count) return properties;
	const batchTypes: Record<string, string> = {
		BYTE: 'INT8',
		UNSIGNED_BYTE: 'UINT8',
		SHORT: 'INT16',
		UNSIGNED_SHORT: 'UINT16',
		INT: 'INT32',
		UNSIGNED_INT: 'UINT32',
		FLOAT: 'FLOAT32',
		DOUBLE: 'FLOAT64'
	};
	for (const [key, column] of Object.entries(content.batchTableJson ?? {})) {
		if (key === 'extensions' || key === 'extras') continue;
		if (Array.isArray(column)) {
			if (featureId < column.length) properties[key] = displayValue(column[featureId]);
		} else if (column && typeof column === 'object') {
			const spec = column as { byteOffset?: number; componentType?: string; type?: string; };
			try {
				const type = batchTypes[spec.componentType ?? ''];
				const width = components[spec.type ?? ''];
				if (
					!type || !width || spec.byteOffset === undefined
					|| !Number.isSafeInteger(spec.byteOffset) || spec.byteOffset < 0
					|| !content.batchTableBinary
				) throw new Error('属性定義が不正です');
				const bytes = content.batchTableBinary.subarray(spec.byteOffset);
				const value = Array.from(
					{ length: width },
					(_, i) => readNumber(bytes, type, featureId * width + i)
				);
				properties[key] = displayValue(width === 1 ? value[0] : value);
			} catch {
				properties[key] = '属性を読み取れません（未対応の形式または不正なデータ）';
			}
		}
	}
	return properties;
};
