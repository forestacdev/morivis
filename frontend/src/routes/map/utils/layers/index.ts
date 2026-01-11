import { INT_ADD_LAYER_IDS } from '$routes/constants';
import { createPointIconLayer, createSymbolLayer } from '$routes/map/utils/layers/vector/label';

import type {
	LayerSpecification,
	FillLayerSpecification,
	LineLayerSpecification,
	SymbolLayerSpecification,
	CircleLayerSpecification,
	FillExtrusionLayerSpecification,
	FilterSpecification
} from 'maplibre-gl';

import { streetViewLineLayer, streetViewCircleLayer } from '$routes/map/utils/layers/street_view';
import { clickableVectorIds, clickableRasterIds } from '$routes/stores';

import { geoDataEntries } from '$routes/map/data/entries';
import type { GeoDataEntry } from '$routes/map/data/types';
import type { VectorStyle } from '$routes/map/data/types/vector/style';

import { FeatureStateManager } from '$routes/map/utils/feature_state';
import { labelLayers } from '$routes/map/utils/layers/label';
import { roadLineLayers, roadLabelLayers } from '$routes/map/utils/layers/road';
import { boundaryLayers } from '$routes/map/utils/layers/boundary';
import { cloudLayers } from '$routes/map/utils/layers/cloud';
import { poiLayers } from '$routes/map/utils/layers/poi';
import {
	baseMapSatelliteLayers,
	baseMaphillshadeLayers,
	baseMapOsmLayers
} from '$routes/map/utils/layers/base_map';
import {
	showPoiLayer,
	showLabelLayer,
	showBoundaryLayer,
	showRoadLayer,
	showStreetViewLayer,
	selectedBaseMap
} from '$routes/stores/layers';

import {
	createFillExtrusionPatternLayer,
	createFillPatternLayer,
	createFillLayer,
	createFillExtrusionLayer,
	createOutLineLayer
} from '$routes/map/utils/layers/vector/polygon';
import { createLineLayer } from '$routes/map/utils/layers/vector/line_string';
import { createCircleLayer } from '$routes/map/utils/layers/vector/point';

import { get } from 'svelte/store';

import {
	getAttribution,
	type AttributionKey
} from '$routes/map/data/entries/meta_data/_attribution';
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

// ベクターレイヤーの作成
const createVectorLayer = (
	layer: LayerItem,
	style: VectorStyle
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
			} else {
				return createFillLayer(layer, style);
			}
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
	const fillExtrusionLayerItems: LayerSpecification[] = [];
	const rasterLayerItems: LayerSpecification[] = [];
	// const vectorLayerItems: LayerSpecification[] = [];
	const rasterAndVectorLayerItems: LayerSpecification[] = [];
	const clickableVecter: string[] = []; // クリックイベントを有効にするレイヤーID
	const clickableRaster: string[] = []; // クリックイベントを有効にするレイヤーID

	const attributionMap = new Map<string, AttributionKey>();

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
				minzoom: metaData.minZoom ?? 1
			};

			const attributionItem = getAttribution(metaData.attribution);

			if (attributionItem && metaData.attribution !== 'カスタムデータ') {
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
								'raster-opacity': style.opacity
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
					if (format.type === 'mvt' || format.type === 'pmtiles' || format.type === 'geojsontile') {
						if ('sourceLayer' in metaData) {
							layer['source-layer'] = metaData.sourceLayer as string; // 型を保証
						}
					}

					const vectorLayer = createVectorLayer(layer, style);
					if (!vectorLayer) return;

					// ポリゴン
					if (style.type === 'fill') {
						if (!style.extrusion || (style.extrusion && !style.extrusion.show)) {
							fillLayerItems.push(vectorLayer);
							// ポリゴンの塗りつぶしパターン
							const fillPatternLayer = createFillPatternLayer(layer, style);
							if (fillPatternLayer) {
								fillLayerItems.push(fillPatternLayer);
							}
						} else if (style.extrusion && style.extrusion.show) {
							// 押し出し
							fillExtrusionLayerItems.push(vectorLayer);
							// ポリゴンの塗りつぶしパターン
							const fillExtrusionPatternLayer = createFillExtrusionPatternLayer(layer, style);
							fillExtrusionLayerItems.push(fillExtrusionPatternLayer);
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
						const fields = entry.properties.fields;
						const symbolLayer = createSymbolLayer(layer, style, fields);
						symbolLayerItems.push(symbolLayer);
					}

					// 補助レイヤーの追加
					if ('auxiliaryLayers' in entry && entry.auxiliaryLayers) {
						entry.auxiliaryLayers.layers.forEach((auxiliaryLayer) => {
							const type = auxiliaryLayer.type;
							if (type === 'fill') {
								fillLayerItems.push(auxiliaryLayer);
							} else if (type === 'line') {
								lineLayerItems.push(auxiliaryLayer);
							} else if (type === 'circle') {
								circleLayerItems.push(auxiliaryLayer);
							} else if (type === 'symbol') {
								symbolLayerItems.push(auxiliaryLayer);
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
		} else if (get(selectedBaseMap) === 'hillshade') {
			baseMapLayerItems = baseMaphillshadeLayers;
		} else if (get(selectedBaseMap) === 'osm') {
			baseMapLayerItems = baseMapOsmLayers;
		} else {
			baseMapLayerItems = [];
		}
	} else {
		baseMapLayerItems = [];
	}

	const isNotOsm = get(selectedBaseMap) !== 'osm';

	const poiLayerItems = get(showPoiLayer) && _type === 'main' && isNotOsm ? poiLayers : [];
	const labelLayerItems = get(showLabelLayer) && _type === 'main' && isNotOsm ? labelLayers : [];
	const roadLabelLayerItems =
		get(showRoadLayer) && _type === 'main' && isNotOsm ? roadLabelLayers : [];
	const roadLineLayerItems =
		get(showRoadLayer) && _type === 'main' && isNotOsm ? roadLineLayers : [];
	const boundaryLayerItems =
		get(showBoundaryLayer) && _type === 'main' && isNotOsm ? boundaryLayers : [];

	const cloudLayerItems =
		_type === 'main' && get(selectedBaseMap) === 'satellite' ? cloudLayers : [];

	return [
		...baseMapLayerItems,
		...rasterLayerItems,
		...fillLayerItems,
		...boundaryLayerItems,
		...roadLineLayerItems,
		...lineLayerItems,
		...fillExtrusionLayerItems,
		...circleLayerItems,
		...streetViewLayers,
		...cloudLayerItems,
		...labelLayerItems,
		...roadLabelLayerItems,
		...symbolLayerItems,
		...poiLayerItems
	];
};
