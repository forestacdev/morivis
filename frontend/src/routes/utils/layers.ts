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
	DataDrivenPropertyValueSpecification,
	ColorSpecification
} from 'maplibre-gl';

import { clickableVectorIds, clickableRasterIds, type SelectedHighlightData } from '$routes/store';
import { geoDataEntries } from '$routes/data';
import type { GeoDataEntry } from '$routes/data/types';
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
} from '$routes/data/types/vector/style';

import { FeatureStateManager } from '$routes/utils/featureState';
import { getLabelLayers } from '$routes/utils/label';
import { showLabelLayer } from '$routes/store/layers';

import { generateNumberAndColorMap } from '$routes/utils/colorMapping';
import { get } from 'svelte/store';

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
	const { format, style, metaData, properties, interaction, type } = entry;

	if (entry.type === 'raster') return undefined;
	const layerId = `@highlight_${entry.id}`;

	// TODO 元のデータが削除されたらハイライトを消す必要がある
	const sourceId = `${entry.id}_source`;

	const layer: LayerItem = {
		id: layerId,
		source: sourceId,
		maxzoom: 24,
		minzoom: 0
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

// ポリゴンのアウトラインレイヤーの作成
const createOutLineLayer = (layer: LayerItem, outline: PolygonOutLine, opacity: number) => {
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
			'text-font': ['Noto Sans JP Light'],
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
		'text-max-width': 12,
		'text-font': ['Noto Sans JP Light']
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
const createSymbolLayer = (layer: LayerItem, style: LabelStyle): SymbolLayerSpecification => {
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
			...(defaultStyle ? defaultStyle.symbol.paint : {})
		},
		layout: {
			'text-field': style.labels.expressions.find((label) => label.key === key)?.value ?? '',
			'text-size': 12,
			'text-max-width': 12,
			'text-font': ['Noto Sans JP Light'],
			...(defaultStyle ? defaultStyle.symbol.layout : {})

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
	const layerItems: LayerSpecification[] = [];
	const symbolLayerItems: LayerSpecification[] = [];
	const pointItems: LayerSpecification[] = [];
	const lineItems: LayerSpecification[] = [];
	const clickableVecter: string[] = []; // クリックイベントを有効にするレイヤーID
	const clickableRaster: string[] = []; // クリックイベントを有効にするレイヤーID

	FeatureStateManager.clear();

	// const layerIdNameDict: { [_: string]: string } = {};

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
						layerItems.push({
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
						layerItems.push({
							...layer,
							type: 'raster',
							paint: {
								'raster-opacity': style.opacity
							}
						});
					} else if (style.type === 'dem') {
						layerItems.push({
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
					if (vectorLayer) {
						layerItems.push(vectorLayer);
					}

					// ポリゴンのアウトライン
					if (style.type === 'fill' && style.outline.show) {
						const lineLayer = createOutLineLayer(layer, style.outline, style.opacity);
						layerItems.push(lineLayer);
					}

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

	// クリックイベントを有効にするレイヤーIDをstoreに保存
	clickableVectorIds.set(clickableVecter);
	clickableRasterIds.set(clickableRaster);

	// デフォルトラベルの表示
	const mapLabelItems = get(showLabelLayer) && _type === 'main' ? getLabelLayers() : [];

	return [...layerItems, ...mapLabelItems, ...symbolLayerItems];
};
