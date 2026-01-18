import type { Region } from '$routes/map/data/types/location';
import type { Tag } from '$routes/map/data/types/tags';
import type { AttributionKey } from '$routes/map/data/entries/_meta_data/_attribution';
import type {
	VectorFormatType,
	TileMetaData,
	PolygonEntry,
	LineStringEntry,
	PointEntry
} from '$routes/map/data/types/vector';
import type {
	PolygonStyle,
	LineStringStyle,
	PointStyle,
	ColorsStyle,
	NumbersStyle,
	Labels,
	ColorsExpression,
	ColorSingleExpression
} from '$routes/map/data/types/vector/style';
import type { BaseSingleColor } from '$routes/map/utils/color/color-brewer';
import type { FieldDef, AttributeView } from '$routes/map/data/types/vector/properties';
import { IMAGE_TILE_XYZ_SETS } from '$routes/constants';
import { resolveBounds, type Bounds } from '$routes/map/data/entries/_meta_data/_bounds_map';
import {
	DEFAULT_VECTOR_POINT_STYLE,
	DEFAULT_VECTOR_LINE_STYLE,
	DEFAULT_VECTOR_POLYGON_STYLE
} from '$routes/map/data/entries/vector/_style';

type XYZPresetKey = keyof typeof IMAGE_TILE_XYZ_SETS;

// ========================================
// 共通設定型
// ========================================
interface BaseVectorConfig {
	id: string;
	name: string;
	url: string;
	format: VectorFormatType;
	sourceLayer?: string;
	attribution: AttributionKey;
	location: Region;
	bounds?: Region | Bounds;
	tags?: Tag[];
	downloadUrl?: string;
	sourceDataName?: string;
	zoom?: { min: number; max: number };
	xyzImageTile?: XYZPresetKey;
	fields?: FieldDef[];
	popupKeys?: string[];
	titleTemplate?: string;
	opacity?: 0.3 | 0.5 | 0.7 | 1;
}

// ========================================
// ヘルパー関数
// ========================================
function createLabelsFromFields(fields: FieldDef[]): Labels {
	const labelExpressions = fields
		.filter((f) => f.type === 'string' || !f.type)
		.slice(0, 5)
		.map((f) => ({
			key: f.key,
			name: f.label ?? f.key
		}));

	return {
		key: labelExpressions[0]?.key ?? 'name',
		show: false,
		expressions: labelExpressions.length > 0 ? labelExpressions : [{ key: 'name', name: 'name' }]
	};
}

function createAttributeView(
	fields: FieldDef[],
	popupKeys?: string[],
	titleTemplate?: string
): AttributeView {
	const keys = popupKeys ?? fields.map((f) => f.key);
	const firstStringField = fields.find((f) => f.type === 'string' || !f.type);

	return {
		popupKeys: keys,
		titles: [
			{
				conditions: firstStringField ? [firstStringField.key] : [],
				template: titleTemplate ?? (firstStringField ? `{${firstStringField.key}}` : '')
			}
		]
	};
}

function createSingleColorStyle(color: string = '#ff7f00'): ColorsStyle {
	return {
		key: '単色',
		show: true,
		expressions: [
			{
				type: 'single',
				key: '単色',
				name: '単色',
				mapping: { value: color as BaseSingleColor }
			}
		]
	};
}

function createColorsStyleFromExpressions(
	expressions: ColorsExpression[],
	defaultColor: string = '#ff7f00'
): ColorsStyle {
	if (expressions.length === 0) {
		return createSingleColorStyle(defaultColor);
	}
	return {
		key: expressions[0].key,
		show: true,
		expressions
	};
}

// ========================================
// ポイントエントリ用ファクトリー
// ========================================
export interface PointEntryConfig extends BaseVectorConfig {
	color?: string;
	colors?: ColorsExpression[];
	radius?: number;
	radiusExpressions?: NumbersStyle['expressions'];
}

export function createPointEntry(config: PointEntryConfig): PointEntry<TileMetaData> {
	const {
		id,
		name,
		url,
		format,
		sourceLayer = id,
		attribution,
		location,
		bounds = location,
		tags = [],
		downloadUrl,
		sourceDataName,
		zoom = { min: 0, max: 24 },
		xyzImageTile = 'zoom_15',
		fields = [],
		popupKeys,
		titleTemplate,
		opacity = 0.7,
		color = '#ff7f00',
		colors,
		radius = 8,
		radiusExpressions
	} = config;

	const colorsStyle = colors
		? createColorsStyleFromExpressions(colors, color)
		: createSingleColorStyle(color);

	const radiusStyle: NumbersStyle = radiusExpressions
		? { key: radiusExpressions[0]?.key ?? '単一', expressions: radiusExpressions }
		: {
				key: '単一',
				expressions: [{ type: 'single', key: '単一', name: '単一', mapping: { value: radius } }]
			};

	return {
		id,
		type: 'vector',
		format: {
			type: format,
			geometryType: 'Point',
			url
		},
		metaData: {
			name,
			sourceDataName,
			attribution,
			downloadUrl,
			location,
			tags,
			minZoom: zoom.min,
			maxZoom: zoom.max,
			bounds: resolveBounds(bounds),
			xyzImageTile: IMAGE_TILE_XYZ_SETS[xyzImageTile],
			sourceLayer
		},
		properties: {
			fields,
			attributeView: createAttributeView(fields, popupKeys, titleTemplate)
		},
		interaction: { clickable: true },
		style: {
			...DEFAULT_VECTOR_POINT_STYLE,
			opacity,
			colors: colorsStyle,
			radius: radiusStyle,
			labels: createLabelsFromFields(fields)
		}
	};
}

// ========================================
// ラインエントリ用ファクトリー
// ========================================
export interface LineEntryConfig extends BaseVectorConfig {
	color?: string;
	colors?: ColorsExpression[];
	width?: number;
	widthExpressions?: NumbersStyle['expressions'];
	lineStyle?: 'solid' | 'dashed';
}

export function createLineEntry(config: LineEntryConfig): LineStringEntry<TileMetaData> {
	const {
		id,
		name,
		url,
		format,
		sourceLayer = id,
		attribution,
		location,
		bounds = location,
		tags = [],
		downloadUrl,
		sourceDataName,
		zoom = { min: 0, max: 24 },
		xyzImageTile = 'zoom_15',
		fields = [],
		popupKeys,
		titleTemplate,
		opacity = 0.7,
		color = '#ff7f00',
		colors,
		width = 5,
		widthExpressions,
		lineStyle = 'solid'
	} = config;

	const colorsStyle = colors
		? createColorsStyleFromExpressions(colors, color)
		: createSingleColorStyle(color);

	const widthStyle: NumbersStyle = widthExpressions
		? { key: widthExpressions[0]?.key ?? '単一', expressions: widthExpressions }
		: {
				key: '単一',
				expressions: [{ type: 'single', key: '単一', name: '単一', mapping: { value: width } }]
			};

	return {
		id,
		type: 'vector',
		format: {
			type: format,
			geometryType: 'LineString',
			url
		},
		metaData: {
			name,
			sourceDataName,
			attribution,
			downloadUrl,
			location,
			tags,
			minZoom: zoom.min,
			maxZoom: zoom.max,
			bounds: resolveBounds(bounds),
			xyzImageTile: IMAGE_TILE_XYZ_SETS[xyzImageTile],
			sourceLayer
		},
		properties: {
			fields,
			attributeView: createAttributeView(fields, popupKeys, titleTemplate)
		},
		interaction: { clickable: true },
		style: {
			...DEFAULT_VECTOR_LINE_STYLE,
			opacity,
			colors: colorsStyle,
			width: widthStyle,
			lineStyle,
			labels: createLabelsFromFields(fields)
		}
	};
}

// ========================================
// ポリゴンエントリ用ファクトリー
// ========================================
export interface PolygonEntryConfig extends BaseVectorConfig {
	color?: string;
	colors?: ColorsExpression[];
	outline?: {
		show?: boolean;
		color?: string;
		width?: number;
		lineStyle?: 'solid' | 'dashed';
	};
}

export function createPolygonEntry(config: PolygonEntryConfig): PolygonEntry<TileMetaData> {
	const {
		id,
		name,
		url,
		format,
		sourceLayer = id,
		attribution,
		location,
		bounds = location,
		tags = [],
		downloadUrl,
		sourceDataName,
		zoom = { min: 0, max: 24 },
		xyzImageTile = 'zoom_15',
		fields = [],
		popupKeys,
		titleTemplate,
		opacity = 0.7,
		color = '#ff7f00',
		colors,
		outline = {}
	} = config;

	const colorsStyle = colors
		? createColorsStyleFromExpressions(colors, color)
		: createSingleColorStyle(color);

	const outlineStyle = {
		show: outline.show ?? true,
		color: outline.color ?? '#000000',
		width: outline.width ?? 1,
		lineStyle: outline.lineStyle ?? ('solid' as const)
	};

	return {
		id,
		type: 'vector',
		format: {
			type: format,
			geometryType: 'Polygon',
			url
		},
		metaData: {
			name,
			sourceDataName,
			attribution,
			downloadUrl,
			location,
			tags,
			minZoom: zoom.min,
			maxZoom: zoom.max,
			bounds: resolveBounds(bounds),
			xyzImageTile: IMAGE_TILE_XYZ_SETS[xyzImageTile],
			sourceLayer
		},
		properties: {
			fields,
			attributeView: createAttributeView(fields, popupKeys, titleTemplate)
		},
		interaction: { clickable: true },
		style: {
			...DEFAULT_VECTOR_POLYGON_STYLE,
			opacity,
			colors: colorsStyle,
			outline: outlineStyle,
			labels: createLabelsFromFields(fields)
		}
	};
}
