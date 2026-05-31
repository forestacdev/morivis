import { tableFromIPC, type Table } from 'apache-arrow';
import { LZ4Compression, ZstdCompression } from '@loaders.gl/compression';
import { compressionRegistry } from 'apache-arrow/ipc/compression/registry';
import { CompressionType } from 'apache-arrow/fb/compression-type';
import lz4js from 'lz4js';
import { ZstdCodec } from 'zstd-codec';

import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';

export interface GeoArrowReadResult {
	table: Table;
	geometryTypes: VectorEntryGeometryType[];
}

type Bbox = [number, number, number, number];

const GEOARROW_EXTENSION_TO_GEOMETRY_TYPE: Record<string, VectorEntryGeometryType> = {
	'geoarrow.point': 'Point',
	'geoarrow.multipoint': 'Point',
	'geoarrow.linestring': 'LineString',
	'geoarrow.multilinestring': 'LineString',
	'geoarrow.polygon': 'Polygon',
	'geoarrow.multipolygon': 'Polygon'
};

let arrowCodecInitializationPromise: Promise<void> | null = null;

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer =>
	bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

const ensureArrowCompressionCodecs = async () => {
	if (arrowCodecInitializationPromise) {
		return arrowCodecInitializationPromise;
	}

	arrowCodecInitializationPromise = (async () => {
		if (!compressionRegistry.get(CompressionType.LZ4_FRAME)) {
			const lz4Compression = new LZ4Compression({ modules: { lz4js } });
			await lz4Compression.preload({ modules: { lz4js } });
			compressionRegistry.set(CompressionType.LZ4_FRAME, {
				decode: (bytes: Uint8Array) => new Uint8Array(lz4Compression.decompressSync(toArrayBuffer(bytes)))
			});
		}

		if (!compressionRegistry.get(CompressionType.ZSTD)) {
			const zstdCompression = new ZstdCompression({
				modules: { 'zstd-codec': ZstdCodec }
			});
			await zstdCompression.preload({ modules: { 'zstd-codec': ZstdCodec } });
			compressionRegistry.set(CompressionType.ZSTD, {
				decode: (bytes: Uint8Array) =>
					new Uint8Array(zstdCompression.decompressSync(toArrayBuffer(bytes)))
			});
		}
	})();

	return arrowCodecInitializationPromise;
};

const getGeoArrowGeometryTypes = (table: Table): VectorEntryGeometryType[] => {
	const geometryTypes = new Set<VectorEntryGeometryType>();

	for (const field of table.schema.fields) {
		const extensionName = field.metadata.get('ARROW:extension:name');
		if (!extensionName) continue;

		const geometryType = GEOARROW_EXTENSION_TO_GEOMETRY_TYPE[extensionName];
		if (geometryType) {
			geometryTypes.add(geometryType);
		}
	}

	return Array.from(geometryTypes);
};

const isFiniteNumber = (value: unknown): value is number =>
	typeof value === 'number' && Number.isFinite(value);

const updateBbox = (bbox: Bbox, lng: number, lat: number) => {
	if (lng < bbox[0]) bbox[0] = lng;
	if (lat < bbox[1]) bbox[1] = lat;
	if (lng > bbox[2]) bbox[2] = lng;
	if (lat > bbox[3]) bbox[3] = lat;
};

const getObjectCoordinate = (value: Record<string, unknown>): [number, number] | null => {
	if (isFiniteNumber(value.x) && isFiniteNumber(value.y)) {
		return [value.x, value.y];
	}

	if (isFiniteNumber(value.lng) && isFiniteNumber(value.lat)) {
		return [value.lng, value.lat];
	}

	if (isFiniteNumber(value.lon) && isFiniteNumber(value.lat)) {
		return [value.lon, value.lat];
	}

	return null;
};

const extendBboxFromGeometry = (bbox: Bbox, value: unknown, seen = new WeakSet<object>()) => {
	if (value == null) return;

	if (Array.isArray(value)) {
		if (value.length >= 2 && isFiniteNumber(value[0]) && isFiniteNumber(value[1])) {
			updateBbox(bbox, value[0], value[1]);
			return;
		}

		for (const item of value) {
			extendBboxFromGeometry(bbox, item, seen);
		}
		return;
	}

	if (ArrayBuffer.isView(value)) {
		const values = Array.from(value as unknown as Iterable<unknown>);
		if (values.length >= 2 && isFiniteNumber(values[0]) && isFiniteNumber(values[1])) {
			updateBbox(bbox, values[0], values[1]);
			return;
		}

		for (const item of values) {
			extendBboxFromGeometry(bbox, item, seen);
		}
		return;
	}

	if (typeof value === 'object') {
		if (seen.has(value)) return;
		seen.add(value);

		if ('toJSON' in value && typeof value.toJSON === 'function') {
			extendBboxFromGeometry(bbox, value.toJSON(), seen);
			return;
		}

		const coordinate = getObjectCoordinate(value as Record<string, unknown>);
		if (coordinate) {
			updateBbox(bbox, coordinate[0], coordinate[1]);
			return;
		}

		for (const item of Object.values(value as Record<string, unknown>)) {
			extendBboxFromGeometry(bbox, item, seen);
		}
	}
};

const getGeometryFieldNames = (table: Table, geometryType: VectorEntryGeometryType): string[] =>
	table.schema.fields
		.filter((field) => {
			const extensionName = field.metadata.get('ARROW:extension:name');
			return extensionName
				? GEOARROW_EXTENSION_TO_GEOMETRY_TYPE[extensionName] === geometryType
				: false;
		})
		.map((field) => field.name);

export const getGeoArrowBounds = (
	table: Table,
	geometryType: VectorEntryGeometryType
): Bbox | null => {
	const fieldNames = getGeometryFieldNames(table, geometryType);
	if (fieldNames.length === 0) {
		return null;
	}

	const bbox: Bbox = [Infinity, Infinity, -Infinity, -Infinity];

	for (const fieldName of fieldNames) {
		const geometryVector = table.getChild(fieldName);
		if (!geometryVector) continue;

		for (const geometry of geometryVector) {
			extendBboxFromGeometry(bbox, geometry);
		}
	}

	return bbox.every(Number.isFinite) ? bbox : null;
};

export const geoArrowFileToTable = async (file: File): Promise<GeoArrowReadResult> => {
	await ensureArrowCompressionCodecs();

	const buffer = await file.arrayBuffer();
	const table = tableFromIPC(new Uint8Array(buffer));
	const geometryTypes = getGeoArrowGeometryTypes(table);

	if (geometryTypes.length === 0) {
		throw new Error('GeoArrow geometry 列が見つかりませんでした');
	}

	return {
		table,
		geometryTypes
	};
};
