import { parquetMetadata, parquetReadObjects, type FileMetaData } from 'hyparquet';
import { compressors } from 'hyparquet-compressors';

import type { Feature, FeatureCollection } from '$routes/map/types/geojson';
import type { Geometry } from '$routes/map/types/geometry';
import type { FeatureProp } from '$routes/map/types/properties';
import { isValidEpsg, type EpsgCode } from '$routes/map/utils/proj/dict';

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
				(element as HyparquetSchemaElement).logical_type?.type === 'GEOMETRY' ||
				(element as HyparquetSchemaElement).logical_type?.type === 'GEOGRAPHY'
			);
		})
		.map((element) => element.name);
};

const getGeometryColumns = (metadata: FileMetaData, geoMetadata: GeoParquetMetadata | null): string[] => {
	const metadataColumns = Object.entries(geoMetadata?.columns ?? {})
		.filter(([, column]) => column.encoding === 'WKB')
		.map(([name]) => name);

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
	const geometryType = (value as { type?: string }).type;
	return typeof geometryType === 'string' && GEOMETRY_TYPES.has(geometryType);
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

export const geoParquetFileToGeoJson = async (file: File): Promise<GeoParquetReadResult> => {
	const buffer = await file.arrayBuffer();
	const metadata = parquetMetadata(buffer);
	const geoMetadata = parseGeoParquetMetadata(metadata);
	const geometryColumns = getGeometryColumns(metadata, geoMetadata);
	const primaryGeometryColumn = getPrimaryGeometryColumn(geometryColumns, geoMetadata);

	if (!primaryGeometryColumn) {
		throw new Error('GeoParquetのgeometry列が見つかりませんでした');
	}

	const sourceCrsName = extractCrsName(metadata, geoMetadata, primaryGeometryColumn);
	const sourceEpsgCode = extractEpsgCode(sourceCrsName);

	const rows = (await parquetReadObjects({
		file: buffer,
		compressors
	})) as Record<string, unknown>[];

	const features = rows
		.map((row, index): Feature<Geometry> | null => {
			const geometry = row[primaryGeometryColumn];
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
