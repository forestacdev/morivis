import { HIGHLIGHT_LAYER_COLOR, INT_ADD_LAYER_IDS } from '$routes/constants';

import type {
	SourceSpecification,
	LayerSpecification,
	FillLayerSpecification,
	LineLayerSpecification,
	SymbolLayerSpecification,
	CircleLayerSpecification,
	HeatmapLayerSpecification,
	FillExtrusionLayerSpecification,
	RasterLayerSpecification,
	HillshadeLayerSpecification,
	BackgroundLayerSpecification,
	FilterSpecification,
	ColorSpecification,
	DataDrivenPropertyValueSpecification,
	ResolvedImageSpecification
} from 'maplibre-gl';

import { streetViewCircleLayer, streetViewLineLayer } from '$routes/map/utils/layers/street_view';
import { hillshadeLayer } from '$routes/map/utils/layers/hillshade';

import { clickableVectorIds, clickableRasterIds, type SelectedHighlightData } from '$routes/stores';
import { showStreetViewLayer } from '$routes/stores/layers';

import { geoDataEntries } from '$routes/map/data';
import type { GeoDataEntry } from '$routes/map/data/types';
import type {
	Labels,
	VectorStyle,
	ColorsStyle,
	NumbersStyle,
	NumbersExpression,
	NumberSingleExpression,
	NumberLinearExpression,
	NumberMatchExpression,
	NumberStepExpressions,
	ColorsExpression,
	ColorSingleExpression,
	ColorMatchExpression,
	ColorStepExpression,
	PointStyle,
	PolygonStyle,
	LineStringStyle,
	LabelStyle,
	PolygonOutLine
} from '$routes/map/data/types/vector/style';

import { FeatureStateManager } from '$routes/map/utils/feature_state';
import { getLabelLayers, getLoadLayers } from '$routes/map/utils/layers/label';
import { showLabelLayer } from '$routes/stores/layers';
import { poiStyleJson } from '$routes/map/utils/layers/poi';

import { generateNumberAndColorMap } from '$routes/map/utils/color_mapping';
import { get } from 'svelte/store';

import { cloudStyleJson } from './cloud';
import { getBaseMapLayers } from './base_map';

// IDを収集
const validIds = geoDataEntries.map((entry) => entry.id);
const validateId = (id: string) => {
	if (!validIds.includes(id)) {
		throw new Error(`Invalid ID: ${id}`);
	}
};
INT_ADD_LAYER_IDS.forEach((id) => {
	try {
		validateId(id); // ここでエラーが発生します
	} catch (error) {
		if (error instanceof Error) {
			console.warn(`無効なidです: ${id}`);
			console.warn('有効なid: ', validIds.join(', '));
			console.error(error.message);
		}
	}
});

const highlightFillPaint: FillLayerSpecification['paint'] = {
	'fill-opacity': 0.4,
	'fill-color': HIGHLIGHT_LAYER_COLOR,
	'fill-outline-color': '#ffffff'
};

const highlightLinePaint: LineLayerSpecification['paint'] = {
	'line-color': HIGHLIGHT_LAYER_COLOR,
	'line-opacity': 1,
	'line-width': 5
};

const highlightCirclePaint: CircleLayerSpecification['paint'] = {
	'circle-color': HIGHLIGHT_LAYER_COLOR,
	'circle-radius': 10,
	'circle-stroke-width': 5,
	'circle-stroke-color': '#ffffff'
};

const highlightSymbolPaint: SymbolLayerSpecification['paint'] = {
	'text-color': HIGHLIGHT_LAYER_COLOR,
	'text-halo-color': '#FFFFFF',
	'text-halo-width': 10,
	'text-opacity': 1
};

const highlightSymbolLayout: SymbolLayerSpecification['layout'] = {
	'text-size': 20
};

interface LayerItem {
	id: string;
	source: string;
	maxzoom: number;
	minzoom: number;
	metadata?: unknown;
	type?: string;
	paint?:
		| FillLayerSpecification['paint']
		| LineLayerSpecification['paint']
		| CircleLayerSpecification['paint']
		| SymbolLayerSpecification['paint'];
	layout?:
		| FillLayerSpecification['layout']
		| LineLayerSpecification['layout']
		| CircleLayerSpecification['layout']
		| SymbolLayerSpecification['layout'];
	'source-layer'?: string;
	filter?: FilterSpecification;
}

// TODO: 使ってないので消す
/* ハイライトレイヤー */
export const createHighlightLayer = (
	_selectedHighlightData: SelectedHighlightData | null
):
	| FillLayerSpecification
	| LineLayerSpecification
	| CircleLayerSpecification
	| SymbolLayerSpecification
	| undefined => {
	if (!_selectedHighlightData) return undefined;
	const entry = _selectedHighlightData.layerEntry;
	const { format, style, metaData, type } = entry;

	if (entry.type === 'raster') return undefined;
	const layerId = `@highlight_${entry.id}`;

	// TODO 元のデータが削除されたらハイライトを消す必要がある
	const sourceId = `${entry.id}_source`;

	const layer: LayerItem = {
		id: layerId,
		source: sourceId,
		maxzoom: 24,
		minzoom: metaData.minZoom ?? 1
	};

	// case 'vector': {

	// TODO idとして決めるkey
	// if (layerEntry.idField) {
	// 	baseLayer.filter = ['==', ['get', layerEntry.idField], selectedhighlightData.featureId];
	// }
	// filter: ['==', ['get', layerEntry.id_field], selectedhighlightData.featureId]

	// }

	let vectorLayer;

	if (type === 'vector') {
		if (format.type === 'mvt' || format.type === 'pmtiles') {
			if ('sourceLayer' in metaData) {
				layer['source-layer'] = metaData.sourceLayer as string; // 型を保証
			}
		}

		vectorLayer = createVectorLayer(layer, style);
		if (!vectorLayer) return undefined;
		switch (vectorLayer.type) {
			case 'fill':
				vectorLayer.paint = highlightFillPaint;
				break;
			case 'line':
				vectorLayer.paint = highlightLinePaint;
				break;
			case 'circle':
				vectorLayer.paint = highlightCirclePaint;
				break;
			case 'symbol':
				vectorLayer.paint = highlightSymbolPaint;
				// vectorLayer.layout = highlightSymbolLayout;
				break;
			default:
				break;
		}

		vectorLayer.filter = ['==', ['id'], _selectedHighlightData.featureId];
	}
	return vectorLayer;
};

const generateMatchExpression = (
	expressionData: ColorMatchExpression
): DataDrivenPropertyValueSpecification<ColorSpecification> => {
	const key = expressionData.key;
	const expression = ['match', ['get', key]];

	const { categories, values } = expressionData.mapping;

	if (categories.length !== values.length) {
		console.warn('ステップ式のカテゴリーと値の長さが一致しません。');
		return '#ff0000';
	}

	// categories と values のペアをループ処理
	for (let i = 0; i < categories.length; i++) {
		expression.push(categories[i] as string, values[i]);
	}

	// デフォルト値を最後に追加
	expression.push('#00000000');

	return expression as DataDrivenPropertyValueSpecification<ColorSpecification>;
};

const generateStepExpression = (
	expressionData: ColorStepExpression
): DataDrivenPropertyValueSpecification<ColorSpecification> => {
	const key = expressionData.key;

	// 'coalesce' を使用して数値以外の場合のデフォルト値を設定
	const expression = [
		'step',
		[
			'case',
			['==', ['get', key], null],
			-9999, // 値が null の場合
			['!=', ['to-number', ['get', key], -9999], -9999], // 数値に変換可能な場合
			['to-number', ['get', key], -9999], // 数値を使用
			-9999 // デフォルトは -9999
		] // 数値以外の場合に -9999 を使用
	];

	const { categories, values } = generateNumberAndColorMap(expressionData.mapping);

	if (categories.length !== values.length) {
		console.warn('ステップ式のカテゴリーと値の長さが一致しません。');
		return '#ff0000';
	}

	// 最初のカテゴリの色を追加（数値が -9999 の場合のデフォルト色）
	expression.push('#00000000');

	// 残りのカテゴリと対応する色を追加
	// for (let i = 0; i < categories.length; i++) {
	// 	expression.push(categories[i], values[i]);
	// }

	categories.forEach((category, index) => {
		// カテゴリの値と対応する色をステップ式に追加
		expression.push(category, values[index]);
	});

	return expression as DataDrivenPropertyValueSpecification<ColorSpecification>;
};

const getColorExpression = (colors: ColorsStyle) => {
	const key = colors.key;
	const expressionData = colors.expressions.find((expression) => expression.key === key);
	if (!expressionData) {
		console.warn(`カラー設定が見つかりません: ${key}`);
		return '#ff0000';
	}
	switch (expressionData.type) {
		case 'single':
			return expressionData.mapping.value;
		case 'match':
			return generateMatchExpression(expressionData);
		case 'step':
			return generateStepExpression(expressionData);
		default:
			console.warn(`カラー設定が見つかりません: ${key}`);
			return '#ff0000';
	}
};

const getPatternSingleExpression = (
	colors: ColorsStyle
): DataDrivenPropertyValueSpecification<ColorSpecification> | undefined => {
	const key = colors.key;
	const expressionData = colors.expressions.find((expression) => expression.key === key);
	if (!expressionData) {
		return undefined;
	}

	if (expressionData.type === 'single') {
		console.warn(expressionData.mapping.pattern);
		if (!expressionData.mapping.pattern) {
			return undefined;
		}
		return ['get', expressionData.mapping.pattern];
	}
};

const getPatternMatchExpression = (
	expressionData: ColorMatchExpression
): DataDrivenPropertyValueSpecification<ResolvedImageSpecification> | null => {
	const key = expressionData.key;

	const { categories, patterns } = expressionData.mapping;
	if (!patterns) return null;

	const patternFilter = patterns.filter((item) => item !== null);

	if (!patternFilter.length) {
		return null;
	}

	const expression: (string | string[] | null)[] = ['match', ['get', key]];

	for (let i = 0; i < categories.length; i++) {
		if (patterns[i] !== null) expression.push(categories[i] as string, patterns[i]);
	}

	expression.push(''); // デフォルト値

	return expression as DataDrivenPropertyValueSpecification<ColorSpecification>;
};

const getPatternExpression = (colors: ColorsStyle) => {
	const key = colors.key;
	const expressionData = colors.expressions.find((expression) => expression.key === key);
	if (!expressionData) {
		return null;
	}

	switch (expressionData.type) {
		case 'single':
			return expressionData.mapping.pattern;
		case 'match':
			return getPatternMatchExpression(expressionData);
		default:
			return null;
	}
};

const generateNumberMatchExpression = (
	expressionData: NumberMatchExpression
): DataDrivenPropertyValueSpecification<number> => {
	const key = expressionData.key;
	const expression: (string | string[] | number)[] = ['match', ['get', key]];

	const { categories, values } = expressionData.mapping;

	if (categories.length !== values.length) {
		console.warn('ステップ式のカテゴリーと値の長さが一致しません。');
		return 0;
	}

	// categories と values のペアをループ処理
	for (let i = 0; i < categories.length; i++) {
		expression.push(categories[i] as number, values[i]);
	}

	// デフォルト値を最後に追加
	expression.push(0);

	return expression as DataDrivenPropertyValueSpecification<number>;
};

const generateNumberStepExpression = (
	expressionData: NumberStepExpressions
): DataDrivenPropertyValueSpecification<number> => {
	const key = expressionData.key;

	// 'coalesce' を使用して数値以外の場合のデフォルト値を設定
	const expression = [
		'step',
		[
			'case',
			['==', ['get', key], null],
			-9999, // 値が null の場合
			['!=', ['to-number', ['get', key], -9999], -9999], // 数値に変換可能な場合
			['to-number', ['get', key], -9999], // 数値を使用
			-9999 // デフォルトは -9999
		] // 数値以外の場合に -9999 を使用
	];

	const { categories, values } = generateNumberAndColorMap(expressionData.mapping);

	if (categories.length !== values.length) {
		console.warn('ステップ式のカテゴリーと値の長さが一致しません。');
		return 0;
	}

	// 最初のカテゴリの色を追加（数値が -9999 の場合のデフォルト色）
	expression.push(0);

	// 残りのカテゴリと対応する色を追加
	// for (let i = 0; i < categories.length; i++) {
	// 	expression.push(categories[i], values[i]);
	// }

	categories.forEach((category, index) => {
		// カテゴリの値と対応する色をステップ式に追加
		expression.push(category, values[index]);
	});

	return expression as DataDrivenPropertyValueSpecification<number>;
};

export const generateNumberLinearExpression = (
	expr: NumberLinearExpression
): DataDrivenPropertyValueSpecification<number> => {
	const { key, mapping } = expr;
	const [inputMin, inputMax] = mapping.range;
	const [outputMin, outputMax] = mapping.values;

	return ['interpolate', ['linear'], ['get', key], inputMin, outputMin, inputMax, outputMax];
};

const getNumberExpression = (numbers: NumbersStyle) => {
	const key = numbers.key;
	const expressionData = numbers.expressions.find((expression) => expression.key === key);
	if (!expressionData) {
		console.warn(`数値設定が見つかりません: ${key}`);
		return 0;
	}
	switch (expressionData.type) {
		case 'single':
			return expressionData.mapping.value;
		case 'match':
			return generateNumberMatchExpression(expressionData);
		case 'linear':
			return generateNumberLinearExpression(expressionData);
		case 'step':
			return generateNumberStepExpression(expressionData);
		default:
			console.warn(`数値設定が見つかりません: ${key}`);
			return 0;
	}
};

const getSelectedColorExpression = (
	colorExpression: DataDrivenPropertyValueSpecification<ColorSpecification>
): DataDrivenPropertyValueSpecification<ColorSpecification> => {
	return [
		'case',
		['boolean', ['feature-state', 'selected'], false],
		HIGHLIGHT_LAYER_COLOR,
		colorExpression
	];
};

const getSelectedOpacityExpression = (
	numbercolorExpression: DataDrivenPropertyValueSpecification<number>
): DataDrivenPropertyValueSpecification<number> => {
	return ['case', ['boolean', ['feature-state', 'selected'], false], 0.8, numbercolorExpression];
};

const getSelectedIconSizeExpression = (
	numbercolorExpression: DataDrivenPropertyValueSpecification<number>
): DataDrivenPropertyValueSpecification<number> => {
	return ['case', ['boolean', ['feature-state', 'selected'], false], 0.12, numbercolorExpression];
};
// fillレイヤーの作成
const createFillLayer = (layer: LayerItem, style: PolygonStyle): FillLayerSpecification => {
	const defaultStyle = style.default;
	const color = getColorExpression(style.colors);
	const colorExpression = getSelectedColorExpression(color);
	const opacity = getSelectedOpacityExpression(style.opacity);
	const fillLayer: FillLayerSpecification = {
		...layer,
		type: 'fill',
		paint: {
			'fill-opacity': opacity,
			'fill-outline-color': '#00000000',
			'fill-color': style.colors.show ? colorExpression : '#00000000',
			...(defaultStyle && defaultStyle.fill ? defaultStyle.fill.paint : {})
		},
		layout: {
			...(defaultStyle && defaultStyle.fill ? defaultStyle.fill.layout : {})
		}
	};

	return fillLayer;
};

// ポリゴンのパターンレイヤーの作成
const createFillPatternLayer = (
	layer: LayerItem,
	style: PolygonStyle
): FillLayerSpecification | undefined => {
	const patternExpression = getPatternExpression(style.colors);
	if (!patternExpression) {
		return undefined;
	}
	const opacity = getSelectedOpacityExpression(style.opacity);

	const fillPatternLayer: FillLayerSpecification = {
		...layer,
		id: `${layer.id}_fill_pattern`,
		type: 'fill',
		paint: {
			'fill-pattern': patternExpression,
			'fill-opacity': opacity
		},
		layout: {}
	};

	return fillPatternLayer;
};

// ポリゴンのアウトラインレイヤーの作成
const createOutLineLayer = (layer: LayerItem, outline: PolygonOutLine, opacity: number) => {
	// TODO ライン幅固定関数
	const _createExponentialLineWidth = (baseWidth: number, baseZoom: number) => {
		return [
			'interpolate',
			['exponential', 2],
			['zoom'],
			0,
			baseWidth * Math.pow(2, 0 - baseZoom),
			24,
			baseWidth * Math.pow(2, 24 - baseZoom)
		];
	};

	const outlineLayer: LineLayerSpecification = {
		...layer,
		id: `${layer.id}_outline`,
		type: 'line',
		paint: {
			'line-color': outline.color,
			'line-width': outline.width,
			'line-opacity': opacity,
			...(outline.lineStyle === 'dashed' && { 'line-dasharray': [2, 2] })
		}
	};
	return outlineLayer;
};

// lineレイヤーの作成
const createLineLayer = (layer: LayerItem, style: LineStringStyle): LineLayerSpecification => {
	const defaultStyle = style.default;
	const color = getColorExpression(style.colors);
	const colorExpression = getSelectedColorExpression(color);
	const width = getNumberExpression(style.width);
	const lineLayer: LineLayerSpecification = {
		...layer,
		type: 'line',
		paint: {
			'line-opacity': style.colors.show ? style.opacity : 0,
			'line-color': style.colors.show ? colorExpression : '#00000000',
			'line-width': width,
			...(style.lineStyle === 'dashed' && { 'line-dasharray': [2, 2] }),
			...(defaultStyle && defaultStyle.line ? defaultStyle.line.paint : {})
		},
		layout: {
			...(defaultStyle && defaultStyle.line ? defaultStyle.line.layout : {})
		}
	};

	// TODO width line-gradient
	return lineLayer;
};

// pointレイヤーの作成
const createCircleLayer = (layer: LayerItem, style: PointStyle): CircleLayerSpecification => {
	const outline = style.outline;
	const defaultStyle = style.default;
	const color = getColorExpression(style.colors);
	const colorExpression = getSelectedColorExpression(color);
	const radius = getNumberExpression(style.radius);
	const circleLayer: CircleLayerSpecification = {
		...layer,
		type: 'circle',
		paint: {
			'circle-opacity': style.colors.show ? style.opacity : 0,
			'circle-stroke-opacity': style.opacity,
			'circle-color': style.colors.show ? colorExpression : '#00000000',
			'circle-radius': radius,
			'circle-stroke-color': outline.show ? style.outline.color : '#00000000',
			'circle-stroke-width': outline.show ? style.outline.width : 0,
			...(defaultStyle && defaultStyle.circle ? defaultStyle.circle.paint : {})
		},
		layout: {
			...(defaultStyle && defaultStyle.circle ? defaultStyle.circle.layout : {})
		}
	};
	return circleLayer;
};

// TODO: 破棄する
// ラベルレイヤーの作成
const createLabelLayer = (layer: LayerItem, style: VectorStyle): SymbolLayerSpecification => {
	const defaultStyle = style.default;
	const color = getColorExpression(style.colors);
	const key = style.labels.key as keyof Labels;
	const symbolLayer: SymbolLayerSpecification = {
		...layer,
		id: `${layer.id}`,
		type: 'symbol',
		paint: {
			'text-opacity': style.opacity,
			'icon-opacity': style.opacity,
			'text-color': color,
			'text-halo-color': '#FFFFFF',
			'text-halo-width': 2,
			...(defaultStyle && defaultStyle.symbol ? defaultStyle.symbol.paint : {})
		},
		layout: {
			'text-field': style.labels.expressions.find((label) => label.key === key)?.value ?? '',
			'text-size': 12,
			'text-max-width': 12,
			...(defaultStyle && defaultStyle.symbol ? defaultStyle.symbol.layout : {})

			// "text-variable-anchor": ["top", "bottom", "left", "right"],
			// "text-radial-offset": 0.5,
			// "text-justify": "auto",
		}
	};

	// TODO: text-halo-color text-halo-width text-size
	return symbolLayer;
};

// ポイントのicon用レイヤーの作成
// TODO: 廃止予定
const createPointIconLayer = (layer: LayerItem, style: PointStyle): SymbolLayerSpecification => {
	const defaultStyle = style.default;
	const key = style.labels.key as keyof Labels;
	const showLabel = style.labels.show;
	const textField = style.labels.expressions.find((label) => label.key === key)?.value ?? '';
	const labelPaint = {
		'text-opacity': 1,
		'text-color': '#000000',
		'text-halo-color': '#FFFFFF',
		'text-halo-width': 2
	};
	const labelLayout = {
		'text-field': textField,
		'text-size': 12,
		'text-max-width': 12
	};

	const symbolLayer: SymbolLayerSpecification = {
		...layer,
		id: `${layer.id}`,
		type: 'symbol',
		paint: {
			...(showLabel ? labelPaint : {}),
			...(showLabel && defaultStyle && defaultStyle.symbol ? defaultStyle.symbol.paint : {}),
			'icon-opacity': style.opacity
		},
		layout: {
			...(showLabel ? labelLayout : {}),
			...(showLabel && defaultStyle && defaultStyle.symbol ? defaultStyle.symbol.layout : {}),
			'icon-image': ['get', '_prop_id'],
			'icon-size': style.icon?.size ?? 0.1,
			'icon-anchor': 'bottom'

			// ...(symbolStyle.layout ?? {})

			// "text-variable-anchor": ["top", "bottom", "left", "right"],
			// "text-radial-offset": 0.5,
			// "text-justify": "auto",
		}
	};

	// TODO: text-halo-color text-halo-width text-size
	return symbolLayer;
};

// symbolレイヤーの作成
// TODO: フォント
const createSymbolLayer = (layer: LayerItem, style: VectorStyle): SymbolLayerSpecification => {
	const defaultStyle = style.default;
	const key = style.labels.key as keyof Labels;
	const symbolLayer: SymbolLayerSpecification = {
		...layer,
		id: `${layer.id}_label`,
		type: 'symbol',
		paint: {
			'text-opacity': 1,
			'icon-opacity': 1,
			'text-color': '#000000',
			'text-halo-color': '#FFFFFF',
			'text-halo-width': 2,
			...(defaultStyle && defaultStyle.symbol ? defaultStyle.symbol.paint : {})
		},
		layout: {
			'text-field': style.labels.expressions.find((label) => label.key === key)?.value ?? '',
			'text-size': 12,
			'text-max-width': 12,
			'text-font': ['Noto Sans JP Regular'],
			...(defaultStyle && defaultStyle.symbol ? defaultStyle.symbol.layout : {})

			// "text-variable-anchor": ["top", "bottom", "left", "right"],
			// "text-radial-offset": 0.5,
			// "text-justify": "auto",
		}
	};

	// TODO: text-halo-color text-halo-width text-size
	return symbolLayer;
};

// ベクターレイヤーの作成
const createVectorLayer = (
	layer: LayerItem,
	style: VectorStyle
):
	| FillLayerSpecification
	| LineLayerSpecification
	| CircleLayerSpecification
	| SymbolLayerSpecification
	| undefined => {
	switch (style.type) {
		case 'fill': {
			return createFillLayer(layer, style);
		}
		case 'line': {
			return createLineLayer(layer, style);
		}
		case 'circle': {
			switch (style.markerType) {
				case 'icon':
					if (style.icon?.show) {
						return createPointIconLayer(layer, style);
					} else {
						return undefined;
					}
				case 'circle':
					return createCircleLayer(layer, style);
				default:
					console.warn(`未対応の style.markerType: ${style.markerType} （layer.id: ${layer.id}）`);
					return undefined;
			}
		}
		case 'symbol': {
			return createLabelLayer(layer, style);
		}
		default:
			console.warn(`対応してないstyle.typeのデータ: ${layer.id}`);
			return undefined;
	}
};

// layersの作成
export const createLayersItems = (
	_dataEntries: GeoDataEntry[],
	_type: 'main' | 'preview' = 'main'
) => {
	const symbolLayerItems: LayerSpecification[] = [];
	const circleLayerItems: LayerSpecification[] = [];
	const lineLayerItems: LayerSpecification[] = [];
	const fillLayerItems: LayerSpecification[] = [];
	const rasterLayerItems: LayerSpecification[] = [];
	// const vectorLayerItems: LayerSpecification[] = [];
	const rasterAndVectorLayerItems: LayerSpecification[] = [];
	const clickableVecter: string[] = []; // クリックイベントを有効にするレイヤーID
	const clickableRaster: string[] = []; // クリックイベントを有効にするレイヤーID

	FeatureStateManager.clear();

	_dataEntries
		.filter((entry) => entry.style.visible)
		.reverse()
		.forEach((entry) => {
			const layerId = `${entry.id}`;
			const sourceId = `${entry.id}_source`;
			const { format, style, metaData, interaction, type } = entry;

			const layer: LayerItem = {
				id: layerId,
				source: sourceId,
				maxzoom: 24,
				minzoom: 0,
				metadata: {
					name: metaData.name,
					location: metaData.location,
					titles: entry.type === 'vector' ? entry.properties.titles : null
				}
			};

			switch (type) {
				// ラスターレイヤー

				case 'raster': {
					if (interaction.clickable) clickableRaster.push(layerId);

					if (style.type === 'basemap') {
						rasterLayerItems.push({
							...layer,
							type: 'raster',
							paint: {
								'raster-opacity': style.opacity,
								'raster-hue-rotate': style.hueRotate,
								'raster-brightness-max': style.brightnessMax,
								'raster-brightness-min': style.brightnessMin,
								'raster-saturation': style.saturation,
								'raster-contrast': style.contrast
							}
						});
					} else if (style.type === 'categorical') {
						rasterLayerItems.push({
							...layer,
							type: 'raster',
							paint: {
								'raster-opacity': style.opacity
							}
						});
					} else if (style.type === 'dem') {
						rasterLayerItems.push({
							...layer,
							type: 'raster',
							paint: {
								'raster-opacity': style.opacity
							}
						});
					} else if (style.type === 'tiff') {
						rasterLayerItems.push({
							...layer,
							type: 'raster',
							paint: {
								'raster-opacity': style.opacity
							}
						});
					}
					break;
				}
				// ベクターレイヤー
				case 'vector': {
					if (interaction.clickable) {
						clickableVecter.push(layerId);
						if ('sourceLayer' in metaData) {
							FeatureStateManager.set(layerId, {
								source: sourceId,
								sourceLayer: metaData.sourceLayer
							});
						} else {
							FeatureStateManager.set(layerId, {
								source: sourceId
							});
						}
					}
					if (format.type === 'mvt' || format.type === 'pmtiles') {
						if ('sourceLayer' in metaData) {
							layer['source-layer'] = metaData.sourceLayer as string; // 型を保証
						}
					}

					const vectorLayer = createVectorLayer(layer, style);
					if (!vectorLayer) return;

					// ポリゴン
					if (style.type === 'fill') {
						fillLayerItems.push(vectorLayer);
						// ポリゴンの塗りつぶしパターン
						const fillPatternLayer = createFillPatternLayer(layer, style);
						if (fillPatternLayer) {
							fillLayerItems.push(fillPatternLayer);
						}

						// ポリゴンのアウトライン
						if (style.outline.show) {
							const lineLayer = createOutLineLayer(layer, style.outline, style.opacity);
							fillLayerItems.push(lineLayer);
						}
					}

					// ライン
					if (style.type === 'line') {
						lineLayerItems.push(vectorLayer);
					}

					// ポイント
					if (style.type === 'circle') {
						circleLayerItems.push(vectorLayer);
					}

					// TODO マーカータイプの廃止
					if (
						style.labels.show &&
						!(style.type === 'circle' && style.markerType === 'icon' && style.icon?.show)
					) {
						// ラベルを追加
						const symbolLayer = createSymbolLayer(layer, style);
						symbolLayerItems.push(symbolLayer);
					}
					break;
				}

				default:
					console.warn(`対応してないtypeのデータ: ${layerId}`);
					break;
			}
		});

	// ストリートビューレイヤー表示がオンの時
	if (get(showStreetViewLayer)) {
		clickableVecter.push('@street_view_circle_layer');
	}

	if (_type === 'main') {
		// クリックイベントを有効にするレイヤーIDをstoreに保存
		clickableVectorIds.set(clickableVecter);
		clickableRasterIds.set(clickableRaster);
	}

	// ストリートビューのレイヤーを追加
	const streetViewLayers =
		get(showStreetViewLayer) && _type === 'main'
			? [streetViewLineLayer, streetViewCircleLayer]
			: [];

	// ベースマップ
	const baseMap = _type === 'main' ? getBaseMapLayers() : [];

	// デフォルトラベルの表示
	const mapLabelItems = get(showLabelLayer) && _type === 'main' ? getLabelLayers() : [];
	const mapLineItems = get(showLabelLayer) && _type === 'main' ? getLoadLayers() : [];

	// POIレイヤーの表示
	const poiLayers = get(showLabelLayer) && _type === 'main' ? poiStyleJson.layers : [];

	const cloudLayer = _type === 'main' ? cloudStyleJson.layers : [];

	return [
		...baseMap,
		...rasterLayerItems,
		...mapLineItems,
		...fillLayerItems,
		...lineLayerItems,
		...circleLayerItems,
		...streetViewLayers,
		...cloudLayer,
		...mapLabelItems,
		...symbolLayerItems,
		...poiLayers
	];
};
