import { INT_ADD_LAYER_IDS } from '$routes/constants';
import { createSymbolLayer } from '$routes/map/utils/layers/vector/label';

import {
	createPointIconLayer,
	createPointImageIconLayer
} from '$routes/map/utils/layers/vector/point';

import type {
	LayerSpecification,
	FillLayerSpecification,
	FillExtrusionLayerSpecification,
	LineLayerSpecification,
	SymbolLayerSpecification,
	CircleLayerSpecification,
	FilterSpecification
} from 'maplibre-gl';

import { streetViewLineLayer, streetViewCircleLayer } from '$routes/map/utils/layers/street_view';
import { clickableVectorIds, clickableRasterIds } from '$routes/stores';

import { geoDataEntries } from '$routes/map/data/entries';
import type { GeoDataEntry } from '$routes/map/data/types';
import type { VectorStyle } from '$routes/map/data/types/vector/style';
import type { IconImageSource } from '$routes/map/data/types/vector/properties';

import { labelLayers } from '$routes/map/utils/layers/label';
import {
	applyVectorSourceLayer,
	createBaseLayerItem
} from '$routes/map/utils/layers/highlight-builder';
import { roadLineLayers, roadLabelLayers } from '$routes/map/utils/layers/road';
import { railLineLayers } from '$routes/map/utils/layers/rail';
import { boundaryLayers } from '$routes/map/utils/layers/boundary';
import { cloudLayers } from '$routes/map/utils/layers/cloud';
import { poiLayers } from '$routes/map/utils/layers/poi';
import { hillshadeLayers } from '$routes/map/utils/layers/hillshade';
import {
	baseMapSatelliteLayers,
	baseMapReliefLayers,
	baseMapSlopeLayers,
	baseMapAspectLayers,
	baseMapCurvatureLayers,
	baseMapOsmLayers
} from '$routes/map/utils/layers/base_map';
import {
	showPoiLayer,
	showLabelLayer,
	showHillshadeLayer,
	showBoundaryLayer,
	showRoadLayer,
	showStreetViewLayer,
	selectedBaseMap,
	showCloudLayer
} from '$routes/stores/layers';

import {
	createFillExtrusionPatternLayer,
	createFillExtrusionLayer,
	createFillLayer,
	createFillPatternLayer,
	createOutLineLayer
} from '$routes/map/utils/layers/vector/polygon';
import {
	createLineLayer,
	createLinePatternLayer
} from '$routes/map/utils/layers/vector/line_string';
import { createCircleLayer } from '$routes/map/utils/layers/vector/point';

import { get } from 'svelte/store';

import {
	getAttribution,
	type AttributionKey
} from '$routes/map/data/entries/_meta_data/_attribution';
import { mapAttributions } from '$routes/stores/attributions';
import { createRasterPaint } from '$routes/map/utils/layers/raster';

// IDを収集
const validIds = geoDataEntries.map((entry) => entry.id);
const validateId = (id: string) => {
	if (!validIds.includes(id)) {
		throw new Error(`Invalid ID: ${id}`);
	}
};
INT_ADD_LAYER_IDS.forEach((id) => {
	try {
		validateId(id);
	} catch (error) {
		if (error instanceof Error) {
			console.warn(`無効なidです: ${id}`);
			console.warn('有効なid: ', validIds.join(', '));
			console.error(error.message);
		}
	}
});

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
	pointImageIcon?: IconImageSource
):
	| FillLayerSpecification
	| LineLayerSpecification
	| CircleLayerSpecification
	| SymbolLayerSpecification
	| FillExtrusionLayerSpecification
	| undefined => {
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
				return createPointImageIconLayer(layer, style, pointImageIcon);
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
export const createLayersItems = (
	_dataEntries: GeoDataEntry[],
	_type: 'main' | 'preview' = 'main'
): LayerSpecification[] => {
	const symbolLayerItems: LayerSpecification[] = [];
	const circleLayerItems: LayerSpecification[] = [];
	const circleIconLayerItems: LayerSpecification[] = [];
	const lineLayerItems: LayerSpecification[] = [];
	const fillLayerItems: LayerSpecification[] = [];
	const fillExtrusionLayerItems: LayerSpecification[] = [];
	const rasterLayerItems: LayerSpecification[] = [];
	// const vectorLayerItems: LayerSpecification[] = [];
	const rasterAndVectorLayerItems: LayerSpecification[] = [];
	const clickableVecter: string[] = []; // クリックイベントを有効にするレイヤーID
	const clickableRaster: string[] = []; // クリックイベントを有効にするレイヤーID

	const attributionMap = new Map<string, AttributionKey>();

	_dataEntries
		.filter((entry) => entry.style.visible)
		.reverse()
		.forEach((entry) => {
			const layerId = `${entry.id}`;
			const { format, style, metaData, interaction, type } = entry;

			const layer = createBaseLayerItem(entry);

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
					applyVectorSourceLayer(layer, entry);

					const vectorLayer = createVectorLayer(layer, style, entry.properties.images?.icon);
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
								const fillExtrusionPatternLayer = createFillExtrusionPatternLayer(layer, style);
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
					if (style.labels.show) {
						// ラベルを追加
						const fields = entry.properties.fields;
						const symbolLayer = createSymbolLayer(layer, style, fields);
						symbolLayerItems.push(symbolLayer);
					}

					// 補助レイヤーの追加
					if ('auxiliaryLayers' in entry && entry.auxiliaryLayers) {
						entry.auxiliaryLayers.layers.forEach((auxiliaryLayer) => {
							const type = auxiliaryLayer.type;
							if (type === 'fill') {
								fillLayerItems.push({
									...auxiliaryLayer,
									paint: { ...auxiliaryLayer.paint, 'fill-opacity': style.opacity }
								});
							} else if (type === 'fill-extrusion') {
								fillLayerItems.push({
									...auxiliaryLayer,
									paint: { ...auxiliaryLayer.paint, 'fill-extrusion-opacity': style.opacity }
								});
							} else if (type === 'line') {
								lineLayerItems.push({
									...auxiliaryLayer,
									paint: { ...auxiliaryLayer.paint, 'line-opacity': style.opacity }
								});
							} else if (type === 'circle') {
								circleLayerItems.push({
									...auxiliaryLayer,
									paint: { ...auxiliaryLayer.paint, 'circle-opacity': style.opacity }
								});
							} else if (type === 'heatmap') {
								circleLayerItems.push({
									...auxiliaryLayer,
									paint: { ...auxiliaryLayer.paint, 'heatmap-opacity': style.opacity }
								});
							} else if (type === 'symbol') {
								symbolLayerItems.push({
									...auxiliaryLayer,
									paint: {
										...auxiliaryLayer.paint,
										'icon-opacity': style.opacity,
										'text-opacity': style.opacity
									}
								});
							}
						});
					}
					break;
				}

				default:
					console.warn(`対応してないtypeのデータ: ${layerId}`);
					break;
			}
		});

	const attributionArray = Array.from(attributionMap.values());
	mapAttributions.set(attributionArray);

	// ストリートビューレイヤー表示がオンの時
	if (get(showStreetViewLayer)) {
		clickableVecter.push('@street_view_line_layer');
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
	let baseMapLayerItems: LayerSpecification[] = [];
	if (_type === 'main') {
		if (get(selectedBaseMap) === 'satellite') {
			baseMapLayerItems = baseMapSatelliteLayers;
		} else if (get(selectedBaseMap) === 'relief') {
			baseMapLayerItems = baseMapReliefLayers;
		} else if (get(selectedBaseMap) === 'slope') {
			baseMapLayerItems = baseMapSlopeLayers;
		} else if (get(selectedBaseMap) === 'aspect') {
			baseMapLayerItems = baseMapAspectLayers;
		} else if (get(selectedBaseMap) === 'curvature') {
			baseMapLayerItems = baseMapCurvatureLayers;
		} else if (get(selectedBaseMap) === 'osm') {
			baseMapLayerItems = baseMapOsmLayers;
		} else {
			baseMapLayerItems = [];
		}
	} else {
		baseMapLayerItems = [];
	}

	const isNotOsm = get(selectedBaseMap) !== 'osm';
	const isNotHillshade =
		get(selectedBaseMap) !== 'satellite' &&
		get(selectedBaseMap) !== 'slope' &&
		get(selectedBaseMap) !== 'aspect';
	// const isNotRelief = get(selectedBaseMap) !== 'relief';

	const poiLayerItems = get(showPoiLayer) && _type === 'main' ? poiLayers : [];
	const labelLayerItems = get(showLabelLayer) && _type === 'main' ? labelLayers : [];
	const roadLabelLayerItems = get(showRoadLayer) && _type === 'main' ? roadLabelLayers : [];
	const roadLineLayerItems = get(showRoadLayer) && _type === 'main' ? roadLineLayers : [];
	const railLayerItems = get(showRoadLayer) && _type === 'main' ? railLineLayers : [];
	const boundaryLayerItems = get(showBoundaryLayer) && _type === 'main' ? boundaryLayers : [];
	const hillshadeLayerItems = get(showHillshadeLayer) && _type === 'main' ? hillshadeLayers : [];

	const cloudLayerItems = get(showCloudLayer) && _type === 'main' ? cloudLayers : [];

	return [
		...baseMapLayerItems,
		...cloudLayerItems,
		...boundaryLayerItems,
		...railLayerItems,
		...roadLineLayerItems,
		...rasterLayerItems,
		...fillLayerItems,
		...lineLayerItems,
		...fillExtrusionLayerItems,
		...hillshadeLayerItems,
		...circleLayerItems,
		...streetViewLayers,
		...labelLayerItems,
		...roadLabelLayerItems,
		...symbolLayerItems,
		...poiLayerItems,
		...circleIconLayerItems
	];
};
