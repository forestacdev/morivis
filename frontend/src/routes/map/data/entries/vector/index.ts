import turfBbox from '@turf/bbox';

import type { FeatureCollection } from '$routes/map/types/geojson';
import type {
	VectorEntry,
	GeoJsonMetaData,
	VectorEntryGeometryType,
	TileMetaData
} from '$routes/map/data/types/vector';
import { createAdjustableRange } from '$routes/map/data/types';

import { getUniquePropertyKeys } from '$routes/map/utils/data/properties';
import { GeojsonCache } from '$routes/map/utils/cache/geojson-cache';

import {
	DEFAULT_VECTOR_POINT_STYLE,
	DEFAULT_VECTOR_LINE_STYLE,
	DEFAULT_VECTOR_POLYGON_STYLE,
	DEFAULT_CAD_STYLE,
	createMatchColorMapping,
	createColorStyleDXFMapping
} from '$routes/map/data/entries/vector/_style';
import type { SequentialCount, SequentialScheme } from '$routes/map/utils/color/color-brewer';

import { getRandomColor } from '$routes/map/utils/color/color-brewer';
import { createLabelsExpressions } from '$routes/map/data/entries/vector/_style';
import { DEFAULT_CUSTOM_META_DATA } from '$routes/map/data/entries/_meta_data';
import { showNotification } from '$routes/stores/notification';

import type { BaseSingleColor } from '$routes/map/utils/color/color-brewer';
import type {
	ColorsStyle,
	ColorMatchExpression,
	ColorStepExpression,
	VectorStyle,
	PolygonStyle,
	LineStringStyle,
	PointStyle
} from '../../types/vector/style';
import { findCenterTile } from '$routes/map/utils/map/tile';
import type { AnyGeometry, GeometryCollection } from '$routes/map/types/geometry';

// --- ジオメトリタイプ判定 ---

const collectGeometryTypes = (
	geometry: AnyGeometry | GeometryCollection | null | undefined,
	types: Set<VectorEntryGeometryType>
) => {
	if (!geometry) return;

	const t = geometry.type;
	if (t === 'Point' || t === 'MultiPoint') {
		types.add('Point');
		return;
	}
	if (t === 'LineString' || t === 'MultiLineString') {
		types.add('LineString');
		return;
	}
	if (t === 'Polygon' || t === 'MultiPolygon') {
		types.add('Polygon');
		return;
	}
	if (t === 'GeometryCollection') {
		for (const child of geometry.geometries) {
			collectGeometryTypes(child, types);
		}
	}
};

const matchesGeometryType = (
	geometry: AnyGeometry | GeometryCollection | null | undefined,
	geometryType: VectorEntryGeometryType
): boolean => {
	if (!geometry) return false;

	if (geometry.type === geometryType) return true;
	if (geometryType === 'Point' && geometry.type === 'MultiPoint') return true;
	if (geometryType === 'LineString' && geometry.type === 'MultiLineString') return true;
	if (geometryType === 'Polygon' && geometry.type === 'MultiPolygon') return true;
	if (geometry.type === 'GeometryCollection') {
		return geometry.geometries.some((child) => matchesGeometryType(child, geometryType));
	}

	return false;
};

const isPointOnSegment = (
	px: number,
	py: number,
	ax: number,
	ay: number,
	bx: number,
	by: number
) => {
	const epsilon = 1e-10;

	return (
		px <= Math.max(ax, bx) + epsilon &&
		px >= Math.min(ax, bx) - epsilon &&
		py <= Math.max(ay, by) + epsilon &&
		py >= Math.min(ay, by) - epsilon
	);
};

const orientation = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => {
	const value = (by - ay) * (cx - bx) - (bx - ax) * (cy - by);
	if (Math.abs(value) < 1e-10) return 0;
	return value > 0 ? 1 : 2;
};

const segmentsIntersect = (
	a1: [number, number],
	a2: [number, number],
	b1: [number, number],
	b2: [number, number]
) => {
	const o1 = orientation(a1[0], a1[1], a2[0], a2[1], b1[0], b1[1]);
	const o2 = orientation(a1[0], a1[1], a2[0], a2[1], b2[0], b2[1]);
	const o3 = orientation(b1[0], b1[1], b2[0], b2[1], a1[0], a1[1]);
	const o4 = orientation(b1[0], b1[1], b2[0], b2[1], a2[0], a2[1]);

	if (o1 !== o2 && o3 !== o4) return true;
	if (o1 === 0 && isPointOnSegment(b1[0], b1[1], a1[0], a1[1], a2[0], a2[1])) return true;
	if (o2 === 0 && isPointOnSegment(b2[0], b2[1], a1[0], a1[1], a2[0], a2[1])) return true;
	if (o3 === 0 && isPointOnSegment(a1[0], a1[1], b1[0], b1[1], b2[0], b2[1])) return true;
	if (o4 === 0 && isPointOnSegment(a2[0], a2[1], b1[0], b1[1], b2[0], b2[1])) return true;

	return false;
};

const ringHasSelfIntersection = (ring: [number, number][]) => {
	if (ring.length < 4) return false;

	for (let i = 0; i < ring.length - 1; i += 1) {
		for (let j = i + 1; j < ring.length - 1; j += 1) {
			if (Math.abs(i - j) <= 1) continue;
			if (i === 0 && j === ring.length - 2) continue;

			if (segmentsIntersect(ring[i], ring[i + 1], ring[j], ring[j + 1])) {
				return true;
			}
		}
	}

	return false;
};

const geometryHasSelfIntersection = (
	geometry: AnyGeometry | GeometryCollection | null | undefined
): boolean => {
	if (!geometry) return false;

	if (geometry.type === 'Polygon') {
		return geometry.coordinates.some((ring) => ringHasSelfIntersection(ring));
	}

	if (geometry.type === 'MultiPolygon') {
		return geometry.coordinates.some((polygon) =>
			polygon.some((ring) => ringHasSelfIntersection(ring))
		);
	}

	if (geometry.type === 'GeometryCollection') {
		return geometry.geometries.some((child) => geometryHasSelfIntersection(child));
	}

	return false;
};

const filterGeometry = (
	geometry: AnyGeometry | GeometryCollection | null | undefined,
	geometryType: VectorEntryGeometryType
): AnyGeometry | GeometryCollection | null => {
	if (!geometry) return null;

	if (geometry.type === 'GeometryCollection') {
		const geometries = geometry.geometries
			.map((child) => filterGeometry(child, geometryType))
			.filter((child): child is AnyGeometry | GeometryCollection => child !== null);

		if (geometries.length === 0) return null;
		if (geometries.length === 1) return geometries[0];

		return {
			type: 'GeometryCollection',
			geometries
		} as GeometryCollection;
	}

	return matchesGeometryType(geometry, geometryType) ? geometry : null;
};

const notifySelfIntersectingPolygons = async (
	data: FeatureCollection
): Promise<FeatureCollection> => {
	const invalidFeatureCount = data.features.reduce((count, feature) => {
		return count + (geometryHasSelfIntersection(feature.geometry) ? 1 : 0);
	}, 0);

	if (invalidFeatureCount === 0) return data;

	showNotification(`${invalidFeatureCount}件の自己交差ポリゴンが含まれています。`, 'warning');

	return data;
};

export const getGeometryTypes = (geojson: FeatureCollection): VectorEntryGeometryType[] => {
	const types = new Set<VectorEntryGeometryType>();
	for (const feature of geojson.features) {
		collectGeometryTypes(feature.geometry, types);
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
	return {
		type: 'FeatureCollection',
		features: geojson.features
			.map((feature) => {
				const geometry = filterGeometry(feature.geometry, geometryType);
				if (!geometry) return null;

				return {
					...feature,
					geometry
				};
			})
			.filter((feature): feature is FeatureCollection['features'][number] => feature !== null)
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
		Polygon: new Set()
	};
	for (const feature of data.features) {
		if (!feature.geometry) continue;
		const key = getKey(feature.properties as Record<string, unknown>);
		if (key == null) continue;
		if (matchesGeometryType(feature.geometry, 'Point')) result.Point.add(key);
		if (matchesGeometryType(feature.geometry, 'LineString')) result.LineString.add(key);
		if (matchesGeometryType(feature.geometry, 'Polygon')) result.Polygon.add(key);
	}
	return {
		Point: Array.from(result.Point),
		LineString: Array.from(result.LineString),
		Polygon: Array.from(result.Polygon)
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
			mapping: { value: color as BaseSingleColor, pattern: null }
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

export { createMatchColorMapping, createColorStyleDXFMapping, DEFAULT_CAD_STYLE };

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
		mapping: createMatchColorMapping(classNames[entryGeometryType])
	});
	colorsConfig.expressions.push({
		type: 'match',
		key: 'layer',
		name: 'レイヤごとの色分け',
		mapping: createMatchColorMapping(layers[entryGeometryType])
	});
	if (dataTypes[entryGeometryType]?.length > 0) {
		colorsConfig.expressions.push({
			type: 'match',
			key: 'dataType',
			name: 'データタイプごとの色分け',
			mapping: createMatchColorMapping(dataTypes[entryGeometryType])
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
			mapping: createMatchColorMapping(entityTypes[entryGeometryType])
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
const AUTO_STEP_SCHEME: SequentialScheme = 'YlOrRd';
const AUTO_STEP_DIVISIONS: SequentialCount = 5;

const isNumericString = (v: string): boolean => {
	if (v === '') return false;
	return !isNaN(Number(v)) && isFinite(Number(v));
};

const parseNumericPropertyValue = (value: unknown): number | null => {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : null;
	}

	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (trimmed === '' || !isNumericString(trimmed)) return null;
		const numericValue = Number(trimmed);
		return Number.isFinite(numericValue) ? numericValue : null;
	}

	return null;
};

const buildAutoColorExpressions = (
	data: FeatureCollection,
	entryGeometryType: VectorEntryGeometryType
): (ColorMatchExpression | ColorStepExpression)[] => {
	const expressions: (ColorMatchExpression | ColorStepExpression)[] = [];
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
		const stringValues = new Set<string>();
		const numericValues = new Set<number>();
		let hasNonNull = false;
		let hasNumeric = false;
		let hasNonNumeric = false;
		let min = Number.POSITIVE_INFINITY;
		let max = Number.NEGATIVE_INFINITY;

		for (const f of data.features) {
			const v = (f.properties as Record<string, unknown>)?.[key];
			if (v == null || v === '') continue;
			hasNonNull = true;

			const numericValue = parseNumericPropertyValue(v);
			if (numericValue != null) {
				hasNumeric = true;
				numericValues.add(numericValue);
				if (numericValue < min) min = numericValue;
				if (numericValue > max) max = numericValue;
				continue;
			}

			hasNonNumeric = true;
			stringValues.add(String(v));
			if (stringValues.size > MAX_UNIQUE_VALUES) break;
		}

		// フィルタリング
		if (!hasNonNull) continue;

		if (hasNumeric && !hasNonNumeric) {
			if (numericValues.size < MIN_UNIQUE_VALUES) continue;
			if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) continue;

			expressions.push({
				type: 'step',
				key,
				name: `${key}`,
				mapping: {
					scheme: AUTO_STEP_SCHEME,
					range: createAdjustableRange(min, max),
					divisions: AUTO_STEP_DIVISIONS
				}
			});
			continue;
		}

		if (stringValues.size < MIN_UNIQUE_VALUES) continue;
		if (stringValues.size > MAX_UNIQUE_VALUES) continue;

		const categories = Array.from(stringValues).sort();
		expressions.push({
			type: 'match',
			key,
			name: `${key}`,
			mapping: createMatchColorMapping(categories)
		});
	}

	return expressions;
};

// --- メインのエントリ作成関数 ---

export const createGeoJsonEntry = async (
	data: FeatureCollection,
	entryGeometryType: VectorEntryGeometryType,
	name: string,
	bbox: [number, number, number, number],
	style?: VectorStyle,
	options?: {
		attribution?: string;
		extraColorExpressions?: ColorMatchExpression[];
		defaultColor?: string;
		coverImage?: string;
	}
): Promise<VectorEntry<GeoJsonMetaData> | undefined> => {
	const normalizedData = await notifySelfIntersectingPolygons(data);
	const repairedBbox = turfBbox(normalizedData) as [number, number, number, number];

	const metaData: GeoJsonMetaData = {
		...DEFAULT_CUSTOM_META_DATA,
		name,
		bounds: repairedBbox,
		...(options?.attribution && { attribution: options.attribution }),
		...(options?.coverImage && { coverImage: options.coverImage }),
		xyzImageTile: findCenterTile(repairedBbox)
	};

	const extraColorExpressions = options?.extraColorExpressions;

	const propKeys = getUniquePropertyKeys(normalizedData as any);

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
		const colorsConfig = createDefaultColorsConfig(
			entryGeometryType,
			options?.defaultColor ?? undefined
		);

		// 属性から自動分類を生成
		const autoColorExpressions = buildAutoColorExpressions(normalizedData, entryGeometryType);
		for (const expr of autoColorExpressions) {
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
	GeojsonCache.set(id, normalizedData as any);

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
			format: {
				type: 'geojson' as const,
				geometryType: 'Point' as const,
				url: ''
			},
			style: resolvedStyle as PointStyle
		};
	} else if (entryGeometryType === 'LineString') {
		return {
			...baseEntry,
			format: {
				type: 'geojson' as const,
				geometryType: 'LineString' as const,
				url: ''
			},
			style: resolvedStyle as LineStringStyle
		};
	} else if (entryGeometryType === 'Polygon') {
		return {
			...baseEntry,
			format: {
				type: 'geojson' as const,
				geometryType: 'Polygon' as const,
				url: ''
			},
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
	options?: {
		bounds?: [number, number, number, number];
		minZoom?: number;
		maxZoom?: number;
	}
): VectorEntry<TileMetaData> | undefined => {
	const bounds = options?.bounds ?? DEFAULT_CUSTOM_META_DATA.bounds;
	const metaData: TileMetaData = {
		...DEFAULT_CUSTOM_META_DATA,
		name,
		sourceLayer,
		bounds,
		minZoom: options?.minZoom ?? DEFAULT_CUSTOM_META_DATA.minZoom,
		maxZoom: options?.maxZoom ?? DEFAULT_CUSTOM_META_DATA.maxZoom,
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

export const createOgcFeatureTileEntry = (
	name: string,
	url: string,
	entryGeometryType: VectorEntryGeometryType,
	options?: { bounds?: [number, number, number, number] },
	color: string = getRandomColor()
): VectorEntry<TileMetaData> | undefined => {
	const entry = createVectorTileEntry(name, url, 'geojsonLayer', entryGeometryType, color, options);
	if (!entry) return undefined;

	return {
		...entry,
		id: 'ogc_feature_' + crypto.randomUUID(),
		format: {
			...entry.format,
			type: 'ogc-feature' as const
		}
	} as VectorEntry<TileMetaData>;
};

export const createWfsFeatureTileEntry = (
	name: string,
	url: string,
	entryGeometryType: VectorEntryGeometryType,
	options?: { bounds?: [number, number, number, number] },
	color: string = getRandomColor()
): VectorEntry<TileMetaData> | undefined => {
	const entry = createVectorTileEntry(name, url, 'geojsonLayer', entryGeometryType, color, options);
	if (!entry) return undefined;

	return {
		...entry,
		id: 'wfs_feature_' + crypto.randomUUID(),
		format: {
			...entry.format,
			type: 'wfs-feature' as const
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
			attribution: 'PMTiles',
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
