import type { FeatureCollection } from '$routes/map/types/geojson';
import type {
	VectorEntry,
	GeoJsonMetaData,
	VectorEntryGeometryType,
	TileMetaData
} from '$routes/map/data/types/vector';

import { getUniquePropertyKeys } from '$routes/map/utils/properties';
import { GeojsonCache } from '$routes/map/utils/file/geojson';

import {
	DEFAULT_VECTOR_POINT_STYLE,
	DEFAULT_VECTOR_LINE_STYLE,
	DEFAULT_VECTOR_POLYGON_STYLE
} from '$routes/map/data/entries/vector/_style';

import { getRandomColor } from '$routes/map/utils/color/color-brewer';
import { createLabelsExpressions } from '$routes/map/data/entries/vector/_style';
import { DEFAULT_CUSTOM_META_DATA } from '$routes/map/data/entries/_meta_data';

import type { BaseSingleColor } from '$routes/map/utils/color/color-brewer';

export const createGeoJsonEntry = (
	data: FeatureCollection,
	entryGeometryType: VectorEntryGeometryType,
	name: string,
	bbox: [number, number, number, number],
	color: string = getRandomColor()
): VectorEntry<GeoJsonMetaData> | undefined => {
	const metaData: GeoJsonMetaData = {
		...DEFAULT_CUSTOM_META_DATA,
		name,
		bounds: bbox
	};

	const colorsConfig = {
		key: '単色',
		show: true,
		expressions: [
			{
				type: 'single' as const,
				key: '単色',
				name: '単色',
				mapping: {
					value: color as BaseSingleColor
				}
			}
		]
	};

	const propKeys = getUniquePropertyKeys(data as any);
	const labelsConfig = createLabelsExpressions(propKeys);

	const id = 'geojson_' + crypto.randomUUID();
	GeojsonCache.set(id, data as any);

	const baseEntry = {
		id,
		type: 'vector' as const,
		metaData,
		interaction: {
			clickable: true as const
		},
		properties: {
			keys: propKeys,
			titles: [
				{
					conditions: [],
					template: name
				}
			]
		}
	};

	if (entryGeometryType === 'Point') {
		const style = { ...DEFAULT_VECTOR_POINT_STYLE, colors: colorsConfig, labels: labelsConfig };
		return {
			...baseEntry,
			format: {
				type: 'geojson' as const,
				geometryType: 'Point' as const,
				url: ''
			},
			style
		};
	} else if (entryGeometryType === 'LineString') {
		const style = { ...DEFAULT_VECTOR_LINE_STYLE, colors: colorsConfig, labels: labelsConfig };
		return {
			...baseEntry,
			format: {
				type: 'geojson' as const,
				geometryType: 'LineString' as const,
				url: ''
			},
			style
		};
	} else if (entryGeometryType === 'Polygon') {
		const style = { ...DEFAULT_VECTOR_POLYGON_STYLE, colors: colorsConfig, labels: labelsConfig };
		return {
			...baseEntry,
			format: {
				type: 'geojson' as const,
				geometryType: 'Polygon' as const,
				url: ''
			},
			style
		};
	} else {
		// Label またはその他の不明なタイプ
		console.error('不明なジオメトリタイプです。');
		return undefined;
	}
};

export const createVectorTileEntry = (
	name: string,
	url: string,
	sourceLayer: string,
	entryGeometryType: VectorEntryGeometryType,
	color: string = getRandomColor()
): VectorEntry<TileMetaData> | undefined => {
	const metaData: TileMetaData = {
		...DEFAULT_CUSTOM_META_DATA,
		name,
		sourceLayer
	};

	const colorsConfig = {
		key: '単色',
		show: true,
		expressions: [
			{
				type: 'single' as const,
				key: '単色',
				name: '単色',
				mapping: {
					value: color as BaseSingleColor
				}
			}
		]
	};

	const id = 'vectorTile_' + crypto.randomUUID();

	const baseEntry = {
		id,
		type: 'vector' as const,
		metaData,
		interaction: {
			clickable: true as const
		},
		properties: {
			keys: [],
			titles: [
				{
					conditions: [],
					template: name
				}
			]
		}
	};

	if (entryGeometryType === 'Point') {
		const style = { ...DEFAULT_VECTOR_POINT_STYLE, colors: colorsConfig };
		return {
			...baseEntry,
			format: {
				type: 'mvt' as const,
				geometryType: 'Point' as const,
				url
			},
			style
		};
	} else if (entryGeometryType === 'LineString') {
		const style = { ...DEFAULT_VECTOR_LINE_STYLE, colors: colorsConfig };
		return {
			...baseEntry,
			format: {
				type: 'mvt' as const,
				geometryType: 'LineString' as const,
				url
			},
			style
		};
	} else if (entryGeometryType === 'Polygon') {
		const style = { ...DEFAULT_VECTOR_POLYGON_STYLE, colors: colorsConfig };
		return {
			...baseEntry,
			format: {
				type: 'mvt' as const,
				geometryType: 'Polygon' as const,
				url
			},
			style
		};
	} else {
		// Label またはその他の不明なタイプ
		console.error('不明なジオメトリタイプです。');
		return undefined;
	}
};

/** geojsonのジオメトリ対応からEntryTypeを取得 */
export const geometryTypeToEntryType = (
	geojson: FeatureCollection
): VectorEntryGeometryType | undefined => {
	const geometryTypes = new Set<string>();
	geojson.features.forEach((feature) => {
		if (feature.geometry && feature.geometry.type) {
			geometryTypes.add(feature.geometry.type);
		}
	});

	if (geometryTypes.has('Point')) {
		return 'Point';
	} else if (geometryTypes.has('LineString')) {
		return 'LineString';
	} else if (geometryTypes.has('Polygon')) {
		return 'Polygon';
	} else if (geometryTypes.has('MultiPoint')) {
		return 'Point';
	} else if (geometryTypes.has('MultiLineString')) {
		return 'LineString';
	} else if (geometryTypes.has('MultiPolygon')) {
		return 'Polygon';
	}
};
