import type { FieldDef } from '$routes/map/data/types/vector/properties';
import { createSymbolLayer } from '$routes/map/utils/layers/vector/label';

import {
	createPointIconLayer,
	createPointImageIconLayer
} from '$routes/map/utils/layers/vector/point';

import type {
	CircleLayerSpecification,
	FillExtrusionLayerSpecification,
	FillLayerSpecification,
	FilterSpecification,
	LayerSpecification,
	LineLayerSpecification,
	SymbolLayerSpecification
} from '$routes/map/utils/maplibre';

import { streetViewCircleLayer, streetViewLineLayer } from '$routes/map/utils/layers/street_view';

import type { MorivisLayerEntry } from '$routes/map/data/types';
import type { IconImageSource } from '$routes/map/data/types/vector/properties';
import type { VectorStyle } from '$routes/map/data/types/vector/style';

import { createBaseLayerItem } from '$routes/map/utils/layers/base-item';
import { baseMapOsmLayers, baseMapSatelliteLayers } from '$routes/map/utils/layers/base_map';
import { hillshadeLayers } from '$routes/map/utils/layers/hillshade';
import type { BaseMapType } from '$routes/stores/layers';

import { getTemporalFilter } from '$routes/map/utils/layers/vector/filter';
import {
	createLineLayer,
	createLinePatternLayer
} from '$routes/map/utils/layers/vector/line_string';
import { createCircleLayer } from '$routes/map/utils/layers/vector/point';
import {
	createFillExtrusionLayer,
	createFillExtrusionPatternLayer,
	createFillLayer,
	createFillPatternLayer,
	createOutLineLayer
} from '$routes/map/utils/layers/vector/polygon';

import {
	type AttributionKey,
	getAttribution
} from '$routes/map/data/entries/_meta_data/_attribution';
import { resolveDimensionPlaceholders } from '$routes/map/utils/dimension';
import { createMorivisLayerMetadata } from '$routes/map/utils/layers/id';
import { createRasterPaint } from '$routes/map/utils/layers/raster';
import { getRasterDimensionValue } from '$routes/map/utils/raster/dimension-runtime';

export interface LayerItem {
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

export const createVectorLayer = (
	layer: LayerItem,
	style: VectorStyle,
	fields: FieldDef[],
	pointImageIcon?: IconImageSource
):
	| FillLayerSpecification
	| LineLayerSpecification
	| CircleLayerSpecification
	| SymbolLayerSpecification
	| FillExtrusionLayerSpecification
	| undefined =>
{
	switch (style.type) {
		case 'fill': {
			if (style.extrusion && style.extrusion.show) {
				return createFillExtrusionLayer(layer, style);
			}
			return createFillLayer(layer, style);
		}
		case 'line':
			return createLineLayer(layer, style);
		case 'circle': {
			if (style.imageIcon?.show && pointImageIcon) {
				return createPointImageIconLayer(layer, style, pointImageIcon, fields);
			} else {
				return createCircleLayer(layer, style);
			}
		}
		default:
			console.warn(`対応してないstyle.typeのデータ: ${layer.id}`);
			return undefined;
	}
};

// layersの作成
export interface LayerGenerationInput {
	entries: MorivisLayerEntry[];
	mode: 'main' | 'preview';
	baseMap: BaseMapType | null;
	showHillshade: boolean;
	showStreetView: boolean;
	referenceLayers?: LayerSpecification[];
}

export interface LayerGenerationResult {
	layers: LayerSpecification[];
	clickableVectorIds: string[];
	clickableRasterIds: string[];
	attributions: AttributionKey[];
}

export const createLayersItems = ({
	entries: _dataEntries,
	mode: _type,
	baseMap,
	showHillshade,
	showStreetView,
	referenceLayers = []
}: LayerGenerationInput): LayerGenerationResult => {
	const symbolLayerItems: LayerSpecification[] = [];
	const circleLayerItems: LayerSpecification[] = [];
	const circleIconLayerItems: LayerSpecification[] = [];
	const lineLayerItems: LayerSpecification[] = [];
	const fillLayerItems: LayerSpecification[] = [];
	const fillExtrusionLayerItems: LayerSpecification[] = [];
	const rasterLayerItems: LayerSpecification[] = [];
	// const vectorLayerItems: LayerSpecification[] = [];
	const clickableVecter: string[] = []; // クリックイベントを有効にするレイヤーID
	const clickableRaster: string[] = []; // クリックイベントを有効にするレイヤーID

	const attributionMap = new Map<string, AttributionKey>();

	_dataEntries
		.filter((entry) => entry.style.visible)
		.reverse()
		.forEach((entry) => {
			const layerId = `${entry.id}`;
			const { style, metaData, interaction, type } = entry;
			const temporalFilter = getTemporalFilter(entry);
			const layer: LayerItem = {
				...createBaseLayerItem(entry),
				...(temporalFilter ? { filter: temporalFilter } : {})
			};

			const attributionItem = getAttribution(metaData.attribution);

			if (attributionItem && !metaData.isUserUploaded) {
				attributionMap.set(metaData.attribution, metaData.attribution);
			}

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
								'raster-opacity': style.opacity,
								'raster-resampling': style.resampling ? style.resampling : 'linear'
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
								'raster-opacity': style.opacity,
								'raster-resampling': style.resampling ?? 'linear'
							}
						});
					} else if (style.type === 'cad') {
						// lineとして扱う
						lineLayerItems.push({
							...layer,
							type: 'raster',
							paint: {
								'raster-opacity': style.opacity,
								...createRasterPaint(style.color)
							}
						});
					}
					break;
				}
				// ベクターレイヤー
				case 'vector': {
					if (interaction.clickable) {
						clickableVecter.push(layerId);
					}

					if ('sourceLayer' in metaData) {
						layer['source-layer'] = metaData.sourceLayer;
					}

					// TODO: fieldsを渡す必要があるレイヤーとそうでないレイヤーがある。
					const fields = entry.properties.fields;

					const vectorLayer = createVectorLayer(
						layer,
						style,
						fields,
						entry.properties.images?.icon
					);
					if (!vectorLayer) return;

					// ポリゴン
					if (style.type === 'fill') {
						if (!style.extrusion || (style.extrusion && !style.extrusion.show)) {
							fillLayerItems.push(vectorLayer);
							// ポリゴンのパターン
							if (style.colors.show) {
								const fillPatternLayer = createFillPatternLayer(layer, style);
								if (fillPatternLayer) {
									fillLayerItems.push(fillPatternLayer);
								}
							}
						} else if (style.extrusion && style.extrusion.show) {
							// 押し出し
							fillExtrusionLayerItems.push(vectorLayer);
							// ポリゴンのパターン
							if (style.colors.show) {
								const fillExtrusionPatternLayer = createFillExtrusionPatternLayer(
									layer,
									style
								);
								if (fillExtrusionPatternLayer) {
									fillExtrusionLayerItems.push(fillExtrusionPatternLayer);
								}
							}
						}

						// ポリゴンのアウトライン
						if (style.outline.show) {
							const lineLayer = createOutLineLayer(layer, style);
							fillLayerItems.push(lineLayer);
						}
					}

					// ライン
					if (style.type === 'line') {
						lineLayerItems.push(vectorLayer);

						// ラインのパターン
						if (style.colors.show) {
							const linePatternLayer = createLinePatternLayer(layer, style);
							if (linePatternLayer) {
								lineLayerItems.push(linePatternLayer);
							}
						}
					}

					// ポイント
					if (style.type === 'circle') {
						if (style.imageIcon && style.imageIcon.show) {
							// 画像アイコンの場合は、circleLayerではなくsymbolLayerに追加
							circleIconLayerItems.push(vectorLayer);
						} else {
							circleLayerItems.push(vectorLayer);

							// ポイントもパターン（アイコンレイヤー）
							if (style.colors.show) {
								const pointIconLayer = createPointIconLayer(layer, style);
								if (pointIconLayer) {
									circleLayerItems.push(pointIconLayer);
									clickableVecter.push(pointIconLayer.id); // アイコンレイヤーもクリック可能にする
								}
							}
						}
					}

					// ラベル
					if (style.type === 'circle') {
						// ポイントの時は写真アイコンがない場合のみラベルレイヤーを表示。写真アイコンがある時は写真アイコンレイヤーにラベルのスタイルを組み込む。
						if (style.labels.show && !style.imageIcon?.show) {
							// ラベルを追加
							const fields = entry.properties.fields;
							const symbolLayer = createSymbolLayer(layer, style, fields);
							symbolLayerItems.push(symbolLayer);
						}
					} else {
						if (style.labels.show) {
							// ラベルを追加
							const fields = entry.properties.fields;
							const symbolLayer = createSymbolLayer(layer, style, fields);
							symbolLayerItems.push(symbolLayer);
						}
					}

					break;
				}

				default:
					console.warn(`対応してないtypeのデータ: ${layerId}`);
					break;
			}

			if ('auxiliaryLayers' in entry && entry.auxiliaryLayers) {
				entry.auxiliaryLayers.layers.forEach((auxiliaryLayer) => {
					const dimensionValue = getRasterDimensionValue(entry);
					const resolvedAuxiliaryLayer = resolveDimensionPlaceholders(
						auxiliaryLayer,
						dimensionValue
					);
					const { clickable, ...layerWithoutClickable } = resolvedAuxiliaryLayer;
					const metadata = createMorivisLayerMetadata(
						entry.id,
						'auxiliary',
						resolvedAuxiliaryLayer.metadata
					);
					const type = layerWithoutClickable.type;
					if (type === 'fill') {
						const layerItem = {
							...layerWithoutClickable,
							metadata,
							paint: {
								...layerWithoutClickable.paint,
								'fill-opacity': layerWithoutClickable.paint?.['fill-opacity']
									?? style.opacity
							}
						};
						fillLayerItems.push(layerItem);
						if (clickable) clickableVecter.push(layerItem.id);
					} else if (type === 'fill-extrusion') {
						const layerItem = {
							...layerWithoutClickable,
							metadata,
							paint: {
								...layerWithoutClickable.paint,
								'fill-extrusion-opacity':
									layerWithoutClickable.paint?.['fill-extrusion-opacity']
										?? style.opacity
							}
						};
						fillLayerItems.push(layerItem);
						if (clickable) clickableVecter.push(layerItem.id);
					} else if (type === 'line') {
						const layerItem = {
							...layerWithoutClickable,
							metadata,
							paint: {
								...layerWithoutClickable.paint,
								'line-opacity': layerWithoutClickable.paint?.['line-opacity']
									?? style.opacity
							}
						};
						lineLayerItems.push(layerItem);
						if (clickable) clickableVecter.push(layerItem.id);
					} else if (type === 'circle') {
						const layerItem = {
							...layerWithoutClickable,
							metadata,
							paint: {
								...layerWithoutClickable.paint,
								'circle-opacity': layerWithoutClickable.paint?.['circle-opacity']
									?? style.opacity
							}
						};
						circleLayerItems.push(layerItem);
						if (clickable) clickableVecter.push(layerItem.id);
					} else if (type === 'heatmap') {
						const layerItem = {
							...layerWithoutClickable,
							metadata,
							paint: {
								...layerWithoutClickable.paint,
								'heatmap-opacity': layerWithoutClickable.paint?.['heatmap-opacity']
									?? style.opacity
							}
						};
						circleLayerItems.push(layerItem);
						if (clickable) clickableVecter.push(layerItem.id);
					} else if (type === 'symbol') {
						const layerItem = {
							...layerWithoutClickable,
							metadata,
							paint: {
								...layerWithoutClickable.paint,
								'icon-opacity': layerWithoutClickable.paint?.['icon-opacity']
									?? style.opacity,
								'text-opacity': layerWithoutClickable.paint?.['text-opacity']
									?? style.opacity
							}
						};
						symbolLayerItems.push(layerItem);
						if (clickable) clickableVecter.push(layerItem.id);
					} else if (type === 'raster' && entry.type === 'raster') {
						const rasterStyle = entry.style;
						const layerItem = {
							...layerWithoutClickable,
							metadata,
							paint: rasterStyle.type === 'basemap'
								? {
									...layerWithoutClickable.paint,
									'raster-opacity':
										layerWithoutClickable.paint?.['raster-opacity']
											?? rasterStyle.opacity,
									'raster-hue-rotate':
										layerWithoutClickable.paint?.['raster-hue-rotate']
											?? rasterStyle.hueRotate,
									'raster-brightness-max':
										layerWithoutClickable.paint?.['raster-brightness-max']
											?? rasterStyle.brightnessMax,
									'raster-brightness-min':
										layerWithoutClickable.paint?.['raster-brightness-min']
											?? rasterStyle.brightnessMin,
									'raster-saturation':
										layerWithoutClickable.paint?.['raster-saturation']
											?? rasterStyle.saturation,
									'raster-contrast':
										layerWithoutClickable.paint?.['raster-contrast']
											?? rasterStyle.contrast
								}
								: rasterStyle.type === 'categorical'
								? {
									...layerWithoutClickable.paint,
									'raster-opacity':
										layerWithoutClickable.paint?.['raster-opacity']
											?? rasterStyle.opacity,
									'raster-resampling':
										layerWithoutClickable.paint?.['raster-resampling']
											?? rasterStyle.resampling
											?? 'linear'
								}
								: {
									...layerWithoutClickable.paint,
									'raster-opacity':
										layerWithoutClickable.paint?.['raster-opacity']
											?? rasterStyle.opacity
								}
						};
						rasterLayerItems.push(layerItem);
					}
				});
			}
		});

	const attributionArray = Array.from(attributionMap.values());
	if (showStreetView && _type === 'main') {
		clickableVecter.push('@street_view_line_layer', '@street_view_circle_layer');
	}

	// ストリートビューのレイヤーを追加
	const streetViewLayers = showStreetView && _type === 'main'
		? [streetViewLineLayer, streetViewCircleLayer]
		: [];

	// ベースマップ
	let baseMapLayerItems: LayerSpecification[] = [];
	if (_type === 'main') {
		if (baseMap === 'satellite') {
			baseMapLayerItems = baseMapSatelliteLayers;
		} else if (baseMap === 'osm') {
			baseMapLayerItems = baseMapOsmLayers;
		} else {
			baseMapLayerItems = [];
		}
	} else {
		baseMapLayerItems = [];
	}

	const isNotOsm = baseMap !== 'osm';
	const isNotHillshade = baseMap !== 'satellite';
	// const isNotRelief = baseMap !== 'relief';

	const referenceLineItems = _type === 'main' && isNotOsm
		? referenceLayers.filter((layer) => layer.type === 'line')
		: [];
	const referenceSymbolItems = _type === 'main' && isNotOsm
		? referenceLayers.filter((layer) => layer.type === 'symbol')
		: [];
	const hillshadeLayerItems = showHillshade && _type === 'main' && isNotHillshade
		? hillshadeLayers
		: [];

	return {
		attributions: attributionArray,
		clickableVectorIds: clickableVecter,
		clickableRasterIds: clickableRaster,
		layers: [
			...baseMapLayerItems,
			...referenceLineItems,
			...hillshadeLayerItems,

			...rasterLayerItems,
			...fillLayerItems,
			...lineLayerItems,
			...fillExtrusionLayerItems,

			...circleLayerItems,
			...streetViewLayers,
			...referenceSymbolItems,

			...symbolLayerItems,
			...circleIconLayerItems
		]
	};
};
