/**
 * Format spec:
 * - https://geoparquet.org/releases/v1.1.0/
 *
 * References:
 * - https://parquet.apache.org/
 * - https://geoarrow.org/
 */
import { parse } from '@loaders.gl/core';
import { GeoParquetLoader } from '@loaders.gl/parquet';
import { type FileMetaData, parquetMetadata, parquetReadObjects } from 'hyparquet';
import { compressors } from 'hyparquet-compressors';

import type { Feature, FeatureCollection } from '$routes/map/types/geojson';
import type { Geometry } from '$routes/map/types/geometry';
import type { FeatureProp } from '$routes/map/types/properties';
import { type EpsgCode, isValidEpsg } from '$routes/map/utils/proj/dict';

type GeoParquetColumnMetadata = {
	encoding?: string;
	crs?: {
		id?: {
			authority?: string;
			code?: string | number;
		} | null;
		ids?: {
			authority?: string;
			code?: string | number;
		}[];
	} | null;
};

type GeoParquetGeometryEncoding =
	| 'wkb'
	| 'geoarrow.wkb'
	| 'geoarrow.point'
	| 'geoarrow.multipoint'
	| 'geoarrow.linestring'
	| 'geoarrow.multilinestring'
	| 'geoarrow.polygon'
	| 'geoarrow.multipolygon';

type GeoParquetMetadata = {
	primary_column?: string;
	columns?: Record<string, GeoParquetColumnMetadata>;
};

type HyparquetSchemaElement = FileMetaData['schema'][number] & {
	logical_type?: {
		type?: string;
		crs?: string;
	};
};

export interface GeoParquetReadResult {
	geojson: FeatureCollection;
	geometryColumns: string[];
	primaryGeometryColumn: string;
	sourceEpsgCode: EpsgCode | null;
	sourceCrsName: string | null;
}

const GEOMETRY_TYPES = new Set([
	'Point',
	'LineString',
	'Polygon',
	'MultiPoint',
	'MultiLineString',
	'MultiPolygon',
	'GeometryCollection'
]);

const parseGeoParquetMetadata = (metadata: FileMetaData): GeoParquetMetadata | null => {
	const rawGeoMetadata = metadata.key_value_metadata?.find(({ key }) => key === 'geo')?.value;
	if (!rawGeoMetadata) return null;

	try {
		return JSON.parse(rawGeoMetadata) as GeoParquetMetadata;
	} catch (error) {
		console.error('GeoParquet metadata parsing error:', error);
		return null;
	}
};

const getGeometryColumnsFromSchema = (metadata: FileMetaData): string[] => {
	return metadata.schema
		.filter((element): element is HyparquetSchemaElement => {
			return (
				(element as HyparquetSchemaElement).logical_type?.type === 'GEOMETRY'
				|| (element as HyparquetSchemaElement).logical_type?.type === 'GEOGRAPHY'
			);
		})
		.map((element) => element.name);
};

const getGeometryColumns = (
	metadata: FileMetaData,
	geoMetadata: GeoParquetMetadata | null
): string[] => {
	const metadataColumns = Object.keys(geoMetadata?.columns ?? {});

	return metadataColumns.length > 0 ? metadataColumns : getGeometryColumnsFromSchema(metadata);
};

const getPrimaryGeometryColumn = (
	geometryColumns: string[],
	geoMetadata: GeoParquetMetadata | null
): string | null => {
	if (geometryColumns.length === 0) return null;

	const primaryColumn = geoMetadata?.primary_column;
	if (primaryColumn && geometryColumns.includes(primaryColumn)) {
		return primaryColumn;
	}

	return geometryColumns[0];
};

const extractCrsName = (
	metadata: FileMetaData,
	geoMetadata: GeoParquetMetadata | null,
	geometryColumn: string
): string | null => {
	const columnMetadata = geoMetadata?.columns?.[geometryColumn];
	const crsIdentifier = columnMetadata?.crs?.id ?? columnMetadata?.crs?.ids?.[0];
	if (crsIdentifier?.authority && crsIdentifier.code != null) {
		return `${crsIdentifier.authority}:${String(crsIdentifier.code)}`;
	}

	const schemaElement = metadata.schema.find((element) => element.name === geometryColumn) as
		| HyparquetSchemaElement
		| undefined;

	return schemaElement?.logical_type?.crs ?? null;
};

const extractEpsgCode = (crsName: string | null): EpsgCode | null => {
	if (!crsName) return null;

	const match = crsName.match(/(?:EPSG|epsg):(\d+)/);
	if (!match) return null;

	const code = match[1];
	return isValidEpsg(code) ? code : null;
};

const isGeometry = (value: unknown): value is Geometry => {
	if (!value || typeof value !== 'object') return false;
	const geometryType = (value as { type?: string; }).type;
	return typeof geometryType === 'string' && GEOMETRY_TYPES.has(geometryType);
};

const getGeometryEncoding = (
	geoMetadata: GeoParquetMetadata | null,
	geometryColumn: string
): GeoParquetGeometryEncoding => {
	const rawEncoding = geoMetadata?.columns?.[geometryColumn]?.encoding?.toLowerCase();

	switch (rawEncoding) {
		case 'wkb':
		case 'geoarrow.wkb':
		case 'geoarrow.point':
		case 'geoarrow.multipoint':
		case 'geoarrow.linestring':
		case 'geoarrow.multilinestring':
		case 'geoarrow.polygon':
		case 'geoarrow.multipolygon':
			return rawEncoding;
		default:
			return 'wkb';
	}
};

const toCoordinate = (value: unknown): [number, number] | null => {
	if (Array.isArray(value) && value.length >= 2) {
		const x = Number(value[0]);
		const y = Number(value[1]);
		return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
	}

	if (value && typeof value === 'object') {
		const candidate = value as Record<string, unknown>;
		const x = Number(candidate.x);
		const y = Number(candidate.y);
		return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
	}

	return null;
};

const toCoordinateArray = (value: unknown): [number, number][] | null => {
	if (!Array.isArray(value)) return null;
	const coordinates = value
		.map((item) => toCoordinate(item))
		.filter((coordinate): coordinate is [number, number] => coordinate !== null);

	return coordinates.length > 0 ? coordinates : null;
};

const toCoordinateArray2 = (value: unknown): [number, number][][] | null => {
	if (!Array.isArray(value)) return null;
	const coordinates = value
		.map((item) => toCoordinateArray(item))
		.filter((coordinate): coordinate is [number, number][] => coordinate !== null);

	return coordinates.length > 0 ? coordinates : null;
};

const toCoordinateArray3 = (value: unknown): [number, number][][][] | null => {
	if (!Array.isArray(value)) return null;
	const coordinates = value
		.map((item) => toCoordinateArray2(item))
		.filter((coordinate): coordinate is [number, number][][] => coordinate !== null);

	return coordinates.length > 0 ? coordinates : null;
};

const decodeGeoArrowGeometry = (
	value: unknown,
	encoding: GeoParquetGeometryEncoding
): Geometry | null => {
	switch (encoding) {
		case 'geoarrow.point': {
			const coordinates = toCoordinate(value);
			return coordinates ? { type: 'Point', coordinates } : null;
		}
		case 'geoarrow.multipoint': {
			const coordinates = toCoordinateArray(value);
			return coordinates ? { type: 'MultiPoint', coordinates } : null;
		}
		case 'geoarrow.linestring': {
			const coordinates = toCoordinateArray(value);
			return coordinates ? { type: 'LineString', coordinates } : null;
		}
		case 'geoarrow.multilinestring': {
			const coordinates = toCoordinateArray2(value);
			return coordinates ? { type: 'MultiLineString', coordinates } : null;
		}
		case 'geoarrow.polygon': {
			const coordinates = toCoordinateArray2(value);
			return coordinates ? { type: 'Polygon', coordinates } : null;
		}
		case 'geoarrow.multipolygon': {
			const coordinates = toCoordinateArray3(value);
			return coordinates ? { type: 'MultiPolygon', coordinates } : null;
		}
		default:
			return isGeometry(value) ? value : null;
	}
};

const fallbackGeoArrowWithLoaders = async (
	buffer: ArrayBuffer
): Promise<FeatureCollection | null> => {
	try {
		const parsed = (await parse(buffer, GeoParquetLoader, {
			parquet: {
				shape: 'geojson-table'
			}
		})) as { shape?: string; type?: string; features?: Feature[]; };

		if (parsed?.shape === 'geojson-table' && parsed.type === 'FeatureCollection') {
			return {
				type: 'FeatureCollection',
				features: parsed.features ?? []
			} as unknown as FeatureCollection;
		}
	} catch (error) {
		console.error('GeoParquetLoader fallback error:', error);
	}

	return null;
};

const toFeaturePropValue = (value: unknown): FeatureProp[string] | null => {
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return value;
	}

	if (typeof value === 'bigint') {
		const numericValue = Number(value);
		return Number.isSafeInteger(numericValue) ? numericValue : value.toString();
	}

	if (value instanceof Date) {
		return value.toISOString();
	}

	if (value == null) return null;

	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
};

const sanitizeProperties = (
	row: Record<string, unknown>,
	geometryColumns: string[],
	primaryGeometryColumn: string
): FeatureProp => {
	const properties: FeatureProp = {};

	for (const [key, value] of Object.entries(row)) {
		if (key === primaryGeometryColumn || geometryColumns.includes(key)) continue;

		const propertyValue = toFeaturePropValue(value);
		if (propertyValue != null) {
			properties[key] = propertyValue;
		}
	}

	return properties;
};

export const geoParquetArrayBufferToGeoJson = async (
	buffer: ArrayBuffer
): Promise<GeoParquetReadResult> => {
	const metadata = parquetMetadata(buffer);
	const geoMetadata = parseGeoParquetMetadata(metadata);
	const geometryColumns = getGeometryColumns(metadata, geoMetadata);
	const primaryGeometryColumn = getPrimaryGeometryColumn(geometryColumns, geoMetadata);

	if (!primaryGeometryColumn) {
		throw new Error('GeoParquetのgeometry列が見つかりませんでした');
	}

	const sourceCrsName = extractCrsName(metadata, geoMetadata, primaryGeometryColumn);
	const sourceEpsgCode = extractEpsgCode(sourceCrsName);
	const geometryEncoding = getGeometryEncoding(geoMetadata, primaryGeometryColumn);

	const rows = (await parquetReadObjects({
		file: buffer,
		compressors,
		geoparquet: geometryEncoding === 'wkb' || geometryEncoding === 'geoarrow.wkb'
	})) as Record<string, unknown>[];

	const features = rows
		.map((row, index): Feature<Geometry> | null => {
			const geometryValue = row[primaryGeometryColumn];
			const geometry = geometryEncoding === 'wkb' || geometryEncoding === 'geoarrow.wkb'
				? isGeometry(geometryValue)
					? geometryValue
					: null
				: decodeGeoArrowGeometry(geometryValue, geometryEncoding);

			if (!isGeometry(geometry)) return null;

			return {
				type: 'Feature',
				id: index,
				geometry,
				properties: sanitizeProperties(row, geometryColumns, primaryGeometryColumn)
			};
		})
		.filter((feature): feature is Feature<Geometry> => feature !== null);

	if (features.length === 0) {
		if (geometryEncoding !== 'wkb' && geometryEncoding !== 'geoarrow.wkb') {
			const fallbackGeojson = await fallbackGeoArrowWithLoaders(buffer);
			if (fallbackGeojson && fallbackGeojson.features.length > 0) {
				return {
					geojson: fallbackGeojson,
					geometryColumns,
					primaryGeometryColumn,
					sourceEpsgCode,
					sourceCrsName
				};
			}
		}

		throw new Error('GeoParquetのフィーチャが見つかりませんでした');
	}

	return {
		geojson: {
			type: 'FeatureCollection',
			features
		} as unknown as FeatureCollection,
		geometryColumns,
		primaryGeometryColumn,
		sourceEpsgCode,
		sourceCrsName
	};
};

export const geoParquetFileToGeoJson = async (file: File): Promise<GeoParquetReadResult> =>
	geoParquetArrayBufferToGeoJson(await file.arrayBuffer());
