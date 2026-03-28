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
import type {
	ColorsStyle,
	ColorMatchExpression,
	VectorStyle,
	PolygonStyle,
	LineStringStyle,
	PointStyle
} from '../../types/vector/style';
import { findCenterTile } from '$routes/map/utils/map';

// --- ジオメトリタイプ判定 ---

export const getGeometryTypes = (geojson: FeatureCollection): VectorEntryGeometryType[] => {
	const types = new Set<VectorEntryGeometryType>();
	for (const feature of geojson.features) {
		if (!feature.geometry) continue;
		const t = feature.geometry.type;
		if (t === 'Point' || t === 'MultiPoint') types.add('Point');
		else if (t === 'LineString' || t === 'MultiLineString') types.add('LineString');
		else if (t === 'Polygon' || t === 'MultiPolygon') types.add('Polygon');
	}
	return Array.from(types);
};

export const geometryTypeToEntryType = (
	geojson: FeatureCollection
): VectorEntryGeometryType | null => {
	const types = getGeometryTypes(geojson);
	return types.length > 0 ? types[0] : null;
};

export const filterByGeometryType = (
	geojson: FeatureCollection,
	geometryType: VectorEntryGeometryType
): FeatureCollection => {
	const multiPrefix =
		geometryType === 'Point'
			? 'MultiPoint'
			: geometryType === 'LineString'
				? 'MultiLineString'
				: 'MultiPolygon';
	return {
		type: 'FeatureCollection',
		features: geojson.features.filter(
			(f) => f.geometry && (f.geometry.type === geometryType || f.geometry.type === multiPrefix)
		)
	};
};

// --- プロパティグルーピング（DM/DXF用ヘルパー、export） ---

export const groupPropertyByGeometryType = (
	data: FeatureCollection,
	getKey: (props: Record<string, unknown>) => string | undefined
): Record<VectorEntryGeometryType, string[]> => {
	const result: Record<VectorEntryGeometryType, Set<string>> = {
		Point: new Set(),
		LineString: new Set(),
		Polygon: new Set(),
		Label: new Set()
	};
	for (const feature of data.features) {
		if (!feature.geometry) continue;
		const key = getKey(feature.properties as Record<string, unknown>);
		if (key == null) continue;
		const t = feature.geometry.type;
		if (t === 'Point' || t === 'MultiPoint') result.Point.add(key);
		else if (t === 'LineString' || t === 'MultiLineString') result.LineString.add(key);
		else if (t === 'Polygon' || t === 'MultiPolygon') result.Polygon.add(key);
	}
	return {
		Point: Array.from(result.Point),
		LineString: Array.from(result.LineString),
		Polygon: Array.from(result.Polygon),
		Label: Array.from(result.Label)
	};
};

// --- デフォルト単色colorsConfig ---

const createDefaultColorsConfig = (
	entryGeometryType: VectorEntryGeometryType,
	color: string = getRandomColor()
): ColorsStyle => ({
	key: '単色',
	show: true,
	expressions: [
		{
			type: 'single' as const,
			key: '単色',
			name: '単色',
			mapping:
				entryGeometryType === 'Polygon'
					? { value: color as BaseSingleColor, pattern: null }
					: { value: color as BaseSingleColor }
		}
	]
});

// --- デフォルトスタイル取得 ---

const getDefaultStyle = (
	entryGeometryType: VectorEntryGeometryType,
	colorsConfig: ColorsStyle,
	labelsConfig: ReturnType<typeof createLabelsExpressions>
): VectorStyle => {
	if (entryGeometryType === 'Point') {
		return { ...DEFAULT_VECTOR_POINT_STYLE, colors: colorsConfig, labels: labelsConfig };
	} else if (entryGeometryType === 'LineString') {
		return { ...DEFAULT_VECTOR_LINE_STYLE, colors: colorsConfig, labels: labelsConfig };
	} else {
		return { ...DEFAULT_VECTOR_POLYGON_STYLE, colors: colorsConfig, labels: labelsConfig };
	}
};

// --- DM/DXF/CAD スタイル構築ヘルパー（export） ---

export { createMatchColorStyleRandomMapping, createColorStyleDXFMapping, DEFAULT_CAD_STYLE };

export const buildDmStyle = (
	data: FeatureCollection,
	entryGeometryType: VectorEntryGeometryType,
	propKeys: string[]
): VectorStyle => {
	const colorsConfig = createDefaultColorsConfig(entryGeometryType);

	const classNames = groupPropertyByGeometryType(data, (props) =>
		props?.className != null ? String(props.className) : undefined
	);
	const layers = groupPropertyByGeometryType(data, (props) =>
		props?.layer != null ? String(props.layer) : undefined
	);
	const dataTypes = groupPropertyByGeometryType(data, (props) =>
		props?.dataType != null ? String(props.dataType) : undefined
	);

	colorsConfig.expressions.push({
		type: 'match',
		key: 'className',
		name: '分類ごとの色分け',
		mapping: createMatchColorStyleRandomMapping(
			classNames[entryGeometryType],
			entryGeometryType === 'Polygon'
		)
	});
	colorsConfig.expressions.push({
		type: 'match',
		key: 'layer',
		name: 'レイヤごとの色分け',
		mapping: createMatchColorStyleRandomMapping(
			layers[entryGeometryType],
			entryGeometryType === 'Polygon'
		)
	});
	if (dataTypes[entryGeometryType]?.length > 0) {
		colorsConfig.expressions.push({
			type: 'match',
			key: 'dataType',
			name: 'データタイプごとの色分け',
			mapping: createMatchColorStyleRandomMapping(
				dataTypes[entryGeometryType],
				entryGeometryType === 'Polygon'
			)
		});
	}
	colorsConfig.key = 'layer';

	const labelsConfig = createLabelsExpressions(propKeys);
	if (entryGeometryType === 'LineString') {
		return { ...DEFAULT_CAD_STYLE, colors: colorsConfig, labels: labelsConfig };
	}
	return getDefaultStyle(entryGeometryType, colorsConfig, labelsConfig);
};

export const buildDxfStyle = (
	data: FeatureCollection,
	entryGeometryType: VectorEntryGeometryType,
	propKeys: string[]
): VectorStyle => {
	const colorsConfig = createDefaultColorsConfig(entryGeometryType);

	const colors = groupPropertyByGeometryType(data, (props) =>
		props?.color != null ? String(props.color) : undefined
	);
	const entityTypes = groupPropertyByGeometryType(data, (props) =>
		props?.type != null ? String(props.type) : undefined
	);

	const dxfCategories = colors[entryGeometryType] ?? [];
	if (dxfCategories.length > 0) {
		colorsConfig.expressions.push({
			type: 'match',
			key: 'color',
			name: 'カラーコードによる色分け',
			mapping: createColorStyleDXFMapping(dxfCategories)
		});
		colorsConfig.key = 'color';
	}
	if (entityTypes[entryGeometryType]?.length > 0) {
		colorsConfig.expressions.push({
			type: 'match',
			key: 'type',
			name: 'エンティティごとの色分け',
			mapping: createMatchColorStyleRandomMapping(
				entityTypes[entryGeometryType],
				entryGeometryType === 'Polygon'
			)
		});
	}

	const labelsConfig = createLabelsExpressions(propKeys);
	if (entryGeometryType === 'LineString') {
		return { ...DEFAULT_CAD_STYLE, colors: colorsConfig, labels: labelsConfig };
	}
	return getDefaultStyle(entryGeometryType, colorsConfig, labelsConfig);
};

export const buildCadStyle = (
	data: FeatureCollection,
	entryGeometryType: VectorEntryGeometryType,
	propKeys: string[]
): VectorStyle => {
	const colorsConfig = createDefaultColorsConfig(entryGeometryType);
	const labelsConfig = createLabelsExpressions(propKeys);
	if (entryGeometryType === 'LineString') {
		return { ...DEFAULT_CAD_STYLE, colors: colorsConfig, labels: labelsConfig };
	}
	return getDefaultStyle(entryGeometryType, colorsConfig, labelsConfig);
};

// --- 属性から自動match分類を生成 ---

const MAX_UNIQUE_VALUES = 30;
const MIN_UNIQUE_VALUES = 2;

const isNumericString = (v: string): boolean => {
	if (v === '') return false;
	return !isNaN(Number(v)) && isFinite(Number(v));
};

const buildAutoMatchExpressions = (
	data: FeatureCollection,
	entryGeometryType: VectorEntryGeometryType
): ColorMatchExpression[] => {
	const expressions: ColorMatchExpression[] = [];
	if (data.features.length === 0) return expressions;

	// 全フィーチャのプロパティキーを収集
	const keyCandidates = new Set<string>();
	for (const f of data.features) {
		if (!f.properties) continue;
		for (const k of Object.keys(f.properties)) {
			keyCandidates.add(k);
		}
	}

	for (const key of keyCandidates) {
		const values = new Set<string>();
		let allNumeric = true;
		let hasNonNull = false;

		for (const f of data.features) {
			const v = (f.properties as Record<string, unknown>)?.[key];
			if (v == null || v === '') continue;
			const str = String(v);
			hasNonNull = true;
			values.add(str);
			if (allNumeric && !isNumericString(str)) allNumeric = false;
			// 早期終了: 上限超え
			if (values.size > MAX_UNIQUE_VALUES) break;
		}

		// フィルタリング
		if (!hasNonNull) continue;
		if (values.size < MIN_UNIQUE_VALUES) continue;
		if (values.size > MAX_UNIQUE_VALUES) continue;
		if (allNumeric) continue;

		const categories = Array.from(values).sort();
		expressions.push({
			type: 'match',
			key,
			name: `${key}`,
			mapping: createMatchColorStyleRandomMapping(categories, entryGeometryType === 'Polygon')
		});
	}

	return expressions;
};

// --- メインのエントリ作成関数 ---

export const createGeoJsonEntry = (
	data: FeatureCollection,
	entryGeometryType: VectorEntryGeometryType,
	name: string,
	bbox: [number, number, number, number],
	style?: VectorStyle,
	options?: {
		attribution?: string;
		extraColorExpressions?: ColorMatchExpression[];
	}
): VectorEntry<GeoJsonMetaData> | undefined => {
	const metaData: GeoJsonMetaData = {
		...DEFAULT_CUSTOM_META_DATA,
		name,
		bounds: bbox,
		...(options?.attribution && { attribution: options.attribution }),
		xyzImageTile: findCenterTile(bbox)
	};

	const extraColorExpressions = options?.extraColorExpressions;

	const propKeys = getUniquePropertyKeys(data as any);

	// スタイル構築
	let resolvedStyle: VectorStyle;
	if (style) {
		resolvedStyle = style;
		if (extraColorExpressions && extraColorExpressions.length > 0) {
			const extraKeys = new Set(extraColorExpressions.map((e) => e.key));
			resolvedStyle.colors.expressions = resolvedStyle.colors.expressions.filter(
				(e) => e.type !== 'match' || !extraKeys.has(e.key)
			);
			for (const expr of extraColorExpressions) {
				resolvedStyle.colors.expressions.push(expr);
			}
			resolvedStyle.colors.key = extraColorExpressions[0].key;
		}
	} else {
		const colorsConfig = createDefaultColorsConfig(entryGeometryType);

		// 属性から自動match分類を生成
		const autoMatchExpressions = buildAutoMatchExpressions(data, entryGeometryType);
		for (const expr of autoMatchExpressions) {
			colorsConfig.expressions.push(expr);
		}

		if (extraColorExpressions && extraColorExpressions.length > 0) {
			// extraと重複するキーの自動match式を除去（extraを優先）
			const extraKeys = new Set(extraColorExpressions.map((e) => e.key));
			colorsConfig.expressions = colorsConfig.expressions.filter(
				(e) => e.type !== 'match' || !extraKeys.has(e.key)
			);
			for (const expr of extraColorExpressions) {
				colorsConfig.expressions.push(expr);
			}
			colorsConfig.key = extraColorExpressions[0].key;
		}
		const labelsConfig = createLabelsExpressions(propKeys);
		resolvedStyle = getDefaultStyle(entryGeometryType, colorsConfig, labelsConfig);
	}

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
		return {
			...baseEntry,
			format: { type: 'geojson' as const, geometryType: 'Point' as const, url: '' },
			style: resolvedStyle as PointStyle
		};
	} else if (entryGeometryType === 'LineString') {
		return {
			...baseEntry,
			format: { type: 'geojson' as const, geometryType: 'LineString' as const, url: '' },
			style: resolvedStyle as LineStringStyle
		};
	} else if (entryGeometryType === 'Polygon') {
		return {
			...baseEntry,
			format: { type: 'geojson' as const, geometryType: 'Polygon' as const, url: '' },
			style: resolvedStyle as PolygonStyle
		};
	}

	console.error('不明なジオメトリタイプです。');
	return undefined;
};

// --- ベクタータイルエントリ作成 ---

export const createVectorTileEntry = (
	name: string,
	url: string,
	sourceLayer: string,
	entryGeometryType: VectorEntryGeometryType,
	color: string = getRandomColor(),
	options?: { bounds?: [number, number, number, number] }
): VectorEntry<TileMetaData> | undefined => {
	const bounds = options?.bounds ?? DEFAULT_CUSTOM_META_DATA.bounds;
	const metaData: TileMetaData = {
		...DEFAULT_CUSTOM_META_DATA,
		name,
		sourceLayer,
		bounds,
		xyzImageTile: findCenterTile(bounds)
	};

	const colorsConfig = createDefaultColorsConfig(entryGeometryType, color);
	const labelsConfig = createLabelsExpressions([]);
	const style = getDefaultStyle(entryGeometryType, colorsConfig, labelsConfig);

	const id = 'vector_tile_' + crypto.randomUUID();

	const baseEntry = {
		id,
		type: 'vector' as const,
		metaData,
		interaction: { clickable: true as const },
		properties: {
			fields: [],
			attributeView: {
				popupKeys: [],
				titles: [{ conditions: [], template: name }]
			}
		}
	};

	if (entryGeometryType === 'Point') {
		return {
			...baseEntry,
			format: { type: 'mvt' as const, geometryType: 'Point' as const, url },
			style: style as PointStyle
		};
	} else if (entryGeometryType === 'LineString') {
		return {
			...baseEntry,
			format: { type: 'mvt' as const, geometryType: 'LineString' as const, url },
			style: style as LineStringStyle
		};
	} else if (entryGeometryType === 'Polygon') {
		return {
			...baseEntry,
			format: { type: 'mvt' as const, geometryType: 'Polygon' as const, url },
			style: style as PolygonStyle
		};
	}

	return undefined;
};

// --- GeoJSON Tile エントリ作成 ---

export const createGeoJsonTileEntry = (
	name: string,
	url: string,
	entryGeometryType: VectorEntryGeometryType,
	color: string = getRandomColor(),
	options?: { bounds?: [number, number, number, number] }
): VectorEntry<TileMetaData> | undefined => {
	const entry = createVectorTileEntry(name, url, 'geojsonLayer', entryGeometryType, color, options);
	if (!entry) return undefined;

	return {
		...entry,
		id: 'geojsontile_' + crypto.randomUUID(),
		format: {
			...entry.format,
			type: 'geojsontile' as const
		}
	} as VectorEntry<TileMetaData>;
};

// --- PMTiles ベクターエントリ作成 ---

export const createVectorPmtilesEntry = (
	name: string,
	url: string,
	sourceLayer: string,
	entryGeometryType: VectorEntryGeometryType,
	color: string = getRandomColor(),
	options?: { bounds?: [number, number, number, number]; minZoom?: number; maxZoom?: number }
): VectorEntry<TileMetaData> | undefined => {
	const entry = createVectorTileEntry(name, url, sourceLayer, entryGeometryType, color);
	if (!entry) return undefined;

	return {
		...entry,
		id: 'pmtiles_' + crypto.randomUUID(),
		format: {
			...entry.format,
			type: 'pmtiles' as const
		},
		metaData: {
			...entry.metaData,
			bounds: options?.bounds ?? entry.metaData.bounds,
			minZoom: options?.minZoom ?? entry.metaData.minZoom,
			maxZoom: options?.maxZoom ?? entry.metaData.maxZoom,
			xyzImageTile: options?.bounds ? findCenterTile(options.bounds) : entry.metaData.xyzImageTile
		}
	} as VectorEntry<TileMetaData>;
};

// --- プロパティフィルタリング ---

export type PropertyKeyExtractor = (properties: Record<string, unknown>) => string | undefined;

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
