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
	DEFAULT_VECTOR_POLYGON_STYLE,
	DEFAULT_CAD_STYLE,
	createMatchColorStyleRandomMapping,
	createColorStyleDXFMapping
} from '$routes/map/data/entries/vector/_style';

import { getRandomColor } from '$routes/map/utils/color/color-brewer';
import { createLabelsExpressions } from '$routes/map/data/entries/vector/_style';
import { DEFAULT_CUSTOM_META_DATA } from '$routes/map/data/entries/_meta_data';

import type { BaseSingleColor } from '$routes/map/utils/color/color-brewer';
import type { ColorsStyle } from '../../types/vector/style';
import { findCenterTile } from '$routes/map/utils/map';

export type VecterStyleType = 'cad' | 'dm' | 'dxf' | 'default';

export const createGeoJsonEntry = (
	data: FeatureCollection,
	entryGeometryType: VectorEntryGeometryType,
	name: string,
	bbox: [number, number, number, number],
	styleType: VecterStyleType,
	color: string = getRandomColor()
): VectorEntry<GeoJsonMetaData> | undefined => {
	const metaData: GeoJsonMetaData = {
		...DEFAULT_CUSTOM_META_DATA,
		name,
		bounds: bbox,
		xyzImageTile: findCenterTile(bbox)
	};

	const colorsConfig: ColorsStyle = {
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

	if (styleType === 'dm') {
		const classNames = groupPropertyByGeometryType(data, (props) =>
			props?.className != null ? String(props.className) : undefined
		);

		const layers = groupPropertyByGeometryType(data, (props) =>
			props?.layer != null ? String(props.layer) : undefined
		);
		colorsConfig.expressions.push({
			type: 'match',
			key: 'className',
			name: '分類ごとの色分け',
			mapping: createMatchColorStyleRandomMapping(classNames[entryGeometryType])
		});

		colorsConfig.expressions.push({
			type: 'match',
			key: 'layer',
			name: 'レイヤごとの色分け',
			mapping: createMatchColorStyleRandomMapping(layers[entryGeometryType])
		});

		colorsConfig.key = 'layer';
	}

	if (styleType === 'dxf') {
		const colors = groupPropertyByGeometryType(data, (props) =>
			props?.color != null ? String(props.color) : undefined
		);
		const dxfCategories = colors[entryGeometryType] ?? [];
		if (dxfCategories.length > 0) {
			const dxfColorMapping = createColorStyleDXFMapping(dxfCategories);
			colorsConfig.expressions.push({
				type: 'match',
				key: 'color',
				name: 'カラーコードによる色分け',
				mapping: dxfColorMapping
			});
			colorsConfig.key = 'color';
		}
		// カテゴリが空の場合はデフォルトのシングルカラースタイルを維持
	}

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
			fields: propKeys.map((key) => ({ key, label: key })),
			attributeView: {
				popupKeys: propKeys,
				titles: [
					{
						conditions: [],
						template: name
					}
				]
			}
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
		if (styleType === 'cad' || styleType === 'dm' || styleType === 'dxf') {
			const style = { ...DEFAULT_CAD_STYLE, colors: colorsConfig, labels: labelsConfig };
			return {
				...baseEntry,
				format: {
					type: 'geojson' as const,
					geometryType: 'LineString' as const,
					url: ''
				},
				style
			};
		} else {
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
		}
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
			fields: [],
			attributeView: {
				popupKeys: [],
				titles: [
					{
						conditions: [],
						template: name
					}
				]
			}
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
		console.error('不明なジオメトリタイプです。');
		return undefined;
	}
};

export const createVectorPmtilesEntry = (
	name: string,
	url: string,
	sourceLayer: string,
	entryGeometryType: VectorEntryGeometryType,
	color: string = getRandomColor()
): VectorEntry<TileMetaData> | undefined => {
	// createVectorTileEntryと同じ構造でformat.typeだけ'pmtiles'にする
	const entry = createVectorTileEntry(name, url, sourceLayer, entryGeometryType, color);
	if (!entry) return undefined;

	return {
		...entry,
		id: 'pmtiles_' + crypto.randomUUID(),
		format: {
			...entry.format,
			type: 'pmtiles' as const
		}
	} as VectorEntry<TileMetaData>;
};

/** GeoJSON に含まれるジオメトリタイプの一覧を返す */
export const getGeometryTypes = (geojson: FeatureCollection): VectorEntryGeometryType[] => {
	const types = new Set<VectorEntryGeometryType>();
	for (const feature of geojson.features) {
		if (!feature.geometry?.type) continue;
		const t = feature.geometry.type;
		if (t === 'Point' || t === 'MultiPoint') types.add('Point');
		else if (t === 'LineString' || t === 'MultiLineString') types.add('LineString');
		else if (t === 'Polygon' || t === 'MultiPolygon') types.add('Polygon');
	}
	const order: VectorEntryGeometryType[] = ['Point', 'LineString', 'Polygon'];
	return order.filter((t) => types.has(t));
};

/** GeoJSON を指定ジオメトリタイプのフィーチャのみにフィルターする */
export const filterByGeometryType = (
	geojson: FeatureCollection,
	geometryType: VectorEntryGeometryType
): FeatureCollection => {
	const multiType = `Multi${geometryType}`;
	return {
		type: 'FeatureCollection',
		features: geojson.features.filter(
			(f) => f.geometry?.type === geometryType || f.geometry?.type === multiType
		)
	};
};

/** プロパティからグルーピングキーを取得する関数型 */
export type PropertyKeyExtractor = (properties: Record<string, unknown>) => string | undefined;

/** GeoJSON のフィーチャを指定プロパティの値でフィルターする */
export const filterByProperty = (
	geojson: FeatureCollection,
	values: string[],
	extractor: PropertyKeyExtractor
): FeatureCollection => ({
	type: 'FeatureCollection',
	features: geojson.features.filter((f) => {
		const v = extractor((f.properties as Record<string, unknown>) ?? {});
		return v !== undefined && values.includes(v);
	})
});

/** ジオメトリタイプごとに指定プロパティの値一覧を返す */
export const groupPropertyByGeometryType = (
	geojson: FeatureCollection,
	extractor: PropertyKeyExtractor
): Record<string, string[]> => {
	const map = new Map<string, Set<string>>();
	for (const feature of geojson.features) {
		const geomType = feature.geometry?.type;
		if (!geomType) continue;
		const key =
			geomType === 'MultiPoint'
				? 'Point'
				: geomType === 'MultiLineString'
					? 'LineString'
					: geomType === 'MultiPolygon'
						? 'Polygon'
						: geomType;
		const v = extractor((feature.properties as Record<string, unknown>) ?? {});
		if (!v) continue;
		if (!map.has(key)) map.set(key, new Set());
		map.get(key)!.add(v);
	}
	const result: Record<string, string[]> = {};
	for (const [key, set] of map) {
		result[key] = [...set].sort();
	}
	return result;
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
