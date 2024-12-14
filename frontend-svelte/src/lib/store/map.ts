// stores/mapStore.js
import { writable } from 'svelte/store';
import maplibregl from 'maplibre-gl';
import type {
	StyleSpecification,
	LngLat,
	AnimationOptions,
	SourceSpecification,
	LayerSpecification,
	TerrainSpecification,
	PointLike,
	Marker,
	MapMouseEvent,
	MapLibreEvent,
	QueryRenderedFeaturesOptions,
	MapGeoJSONFeature,
	CircleLayerSpecification,
	FillLayerSpecification,
	LineLayerSpecification,
	SymbolLayerSpecification,
	RasterSourceSpecification,
	RasterTileSource
} from 'maplibre-gl';
import * as pmtiles from 'pmtiles';

import debounce from 'lodash.debounce';
import { webglToPng } from '$lib/utils/image';
import { imageToIcon } from '$lib/utils/icon/index';
import type { LayerEntry } from '$lib/data/types';
import { layerData } from '$lib/data/layers';
import { isSide } from '$lib//store/store';
import { getGeojson } from '$lib/utils/geojson';
import { getLocationBbox } from '$lib/data/locationBbox';
import turfBbox from '@turf/bbox';
import type { ProtocolKey } from '$lib/data/types';

import { rgbdemProtocol } from '$lib/data/customprotocol/rgbdem';
import { tilesProtocol } from '$lib/data/customprotocol/vector';

const protocolName1: ProtocolKey = 'customdem';
const rgbdem = rgbdemProtocol(protocolName1);
maplibregl.addProtocol(protocolName1, rgbdem.request);

const protocolName2: ProtocolKey = 'customtiles';
const customVector = tilesProtocol(protocolName2);
maplibregl.addProtocol(protocolName2, customVector);

const createMapStore = () => {
	let map: maplibregl.Map | null = null;
	let lockOnMarker: Marker | null = null;

	const { subscribe, set } = writable<maplibregl.Map | null>(null);
	const clickEvent = writable<MapMouseEvent | null>(null);
	const rotateEvent = writable<MapLibreEvent | null>(null);
	const isLoadingEvent = writable<boolean>(true);

	const init = (mapContainer: HTMLElement, mapStyle: StyleSpecification) => {
		map = new maplibregl.Map({
			container: mapContainer,
			style: mapStyle,
			center: [136.923004009, 35.5509525769706],
			zoom: 14.5,
			fadeDuration: 100, // フェードアニメーションの時間
			preserveDrawingBuffer: true, // スクリーンショットを撮るために必要
			// renderWorldCopies: false // 世界地図を繰り返し表示しない
			attributionControl: false // 著作権表示を非表示

			// transformCameraUpdate: true // カメラの変更をトランスフォームに反映
			// localIdeographFontFamily: 'Noto Sans CJK JP' // 日本語フォントを指定
			// maxZoom: 18,
			// maxBounds: [135.120849, 33.93533, 139.031982, 37.694841]
		});

		if (!map) return;
		set(map);
		map.addControl(
			new maplibregl.AttributionControl({
				compact: false
			}),
			'bottom-right'
		);

		map.addControl(new maplibregl.ScaleControl(), 'bottom-right');

		map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
		// 3D地形コントロール
		map.addControl(
			new maplibregl.TerrainControl({
				source: 'terrain',
				exaggeration: 1
			}),
			'bottom-right'
		);

		map.on('click', (e) => {
			clickEvent.set(e);
		});

		map.on('data', function (e) {
			//your code here
			isLoadingEvent.set(true);
			// console.log(e);
		});

		map.on('idle', function (e) {
			//your code here
			isLoadingEvent.set(false);
			// console.log(e);
		});

		map.on('rotate', (e) => {
			rotateEvent.set(e);

			// mapInstance.on('rotate', (e) => {
			// 	console.log();
			// 	// 角度が負の場合、360を足して0〜360度に変換
			// 	const bearing360 = (Number(e.target.getBearing().toFixed(1)) + 360) % 360;
			// 	mapBearing = bearing360;
			// });
		});

		// const iconWorker = new Worker(new URL('../utils/icon/worker.ts', import.meta.url), {
		// 	type: 'module'
		// });

		// // メッセージハンドラーを一度だけ定義
		// iconWorker.onmessage = async (e) => {
		// 	const { imageBitmap, id } = e.data;
		// 	if (map && !map.hasImage(id)) {
		// 		map.addImage(id, imageBitmap);
		// 	}
		// };

		// // エラーハンドリングを追加
		// iconWorker.onerror = (error) => {
		// 	console.error('Worker error:', error);
		// };

		// // 処理中の画像IDを追跡
		// const processingImages = new Set();

		// map.on('styleimagemissing', async (e) => {
		// 	if (!map) return;
		// 	const id = e.id;

		// 	// すでに処理中または追加済みの画像はスキップ
		// 	if (processingImages.has(id) || map.hasImage(id)) return;

		// 	try {
		// 		processingImages.add(id);
		// 		iconWorker.postMessage({ url: id });
		// 	} catch (error) {
		// 		console.error(`Error processing image for id ${id}:`, error);
		// 		processingImages.delete(id);
		// 	}
		// });
	};

	// マップスタイルを設定するメソッド
	const setStyle = debounce((style: StyleSpecification) => {
		// NOTE: debug
		if (import.meta.env.DEV) console.log('mapstyle', style);
		if (!map) return;
		map.setStyle(style);
	}, 100);

	// クリックマーカーを追加するメソッド
	const addLockonMarker = (element: HTMLElement, lngLat: LngLat) => {
		if (!map) return;
		lockOnMarker = new maplibregl.Marker({ element }).setLngLat(lngLat).addTo(map);
	};

	// クリックマーカーを削除するメソッド
	const removeLockonMarker = () => {
		if (!map || !lockOnMarker) return;
		lockOnMarker.remove();
	};

	const queryRenderedFeatures = (
		geometryOrOptions?: PointLike | [PointLike, PointLike] | QueryRenderedFeaturesOptions,
		options?: QueryRenderedFeaturesOptions
	): MapGeoJSONFeature[] | undefined => {
		return map?.queryRenderedFeatures(geometryOrOptions, options);
	};

	const panTo = (lngLat: LngLat, option?: AnimationOptions) => {
		if (!map) return;
		map.panTo(lngLat, option);
	};

	const easeTo = (options: AnimationOptions) => {
		if (!map) return;
		map.easeTo(options);
	};

	const focusLayer = async (layerId: string) => {
		if (!map) return;
		const targetLayer = layerData.find((layer: LayerEntry) => layer.id === layerId);
		if (!targetLayer) return;
		if (targetLayer.dataType === 'geojson') {
			try {
				const geojson = await getGeojson(targetLayer.url);
				const bbox = turfBbox(geojson) as [number, number, number, number];
				console.log(bbox);
				map.fitBounds(bbox);
			} catch (error) {
				console.error(error);
				alert('Failed to fetch GeoJSON');
			}
		} else if (targetLayer.location) {
			console.log(targetLayer.location);
			const bbox = getLocationBbox(targetLayer.location[0]);

			if (bbox) {
				map.fitBounds(bbox);
			}
		}
	};

	const focusFeature = async (feature: MapGeoJSONFeature) => {
		if (!map) return;
		const bbox = turfBbox(feature.geometry) as [number, number, number, number];
		map.fitBounds(bbox);
	};

	// isSide.subscribe((value) => {
	// 	console.log(value);
	// 	if (value !== null && value) {
	// 		if (!map) return;
	// 		map.panBy([-200, 0]);
	// 	} else {
	// 		if (!map) return;
	// 		map.panBy([200, 0]);
	// 	}
	// });

	const addSearchFeature = (feature: MapGeoJSONFeature) => {
		if (!map) return;
		const sourceId = `search_source`;
		const sourceItems: Record<string, SourceSpecification> = {};
		sourceItems[sourceId] = {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: [feature]
			}
		};
		if (map.getSource(sourceId)) map.removeSource(sourceId);
		map.addSource(sourceId, sourceItems[sourceId]);

		const layerId = `search_layer`;

		const layerItems: LayerSpecification[] = [];

		const baseLayer = {
			id: layerId,
			source: sourceId
		};

		const type = feature.geometry.type;

		switch (type) {
			case 'Point':
				layerItems.push({
					...baseLayer,
					type: 'circle',
					paint: {
						'circle-radius': 10,
						'circle-color': '#ff0000'
					}
				});
				break;
			case 'LineString':
			case 'MultiLineString':
				layerItems.push({
					...baseLayer,
					type: 'line',
					paint: {
						'line-width': 5,
						'line-color': '#ff0000'
					}
				});
				break;
			case 'Polygon':
			case 'MultiPolygon':
				layerItems.push({
					...baseLayer,
					type: 'fill',
					paint: {
						'fill-color': '#ff0000',
						'fill-opacity': 0.5
					}
				});
				break;
			default:
				break;
		}

		map.addLayer(layerItems[0]);
	};

	// プレビューレイヤーを追加するメソッド
	const addPreviewLayer = (layerEntry: LayerEntry) => {
		if (!map) return;
		const sourceId = `preview_source`;
		const sourceItems: Record<string, SourceSpecification> = {};

		if (layerEntry.dataType === 'raster') {
			sourceItems[sourceId] = {
				type: 'raster',
				tiles: [layerEntry.url],
				maxzoom: layerEntry.sourceMaxZoom ?? 24,
				minzoom: layerEntry.sourceMinZoom ?? 0,
				tileSize: 256,
				attribution: layerEntry.attribution
			};
		} else if (layerEntry.dataType === 'vector') {
			sourceItems[sourceId] = {
				type: 'vector',
				tiles: [layerEntry.url],
				maxzoom: layerEntry.sourceMaxZoom ?? 24,
				minzoom: layerEntry.sourceMinZoom ?? 0,
				attribution: layerEntry.attribution,
				promoteId: layerEntry.idField ?? undefined
			};
		} else if (layerEntry.dataType === 'geojson') {
			sourceItems[sourceId] = {
				type: 'geojson',
				data: layerEntry.url,
				generateId: true,
				attribution: layerEntry.attribution
			};
		} else {
			console.warn(`Unknown layer type: ${layerEntry.dataType}`);
		}
		if (map.getLayer('preview_layer')) map.removeLayer('preview_layer');
		if (map.getSource(sourceId)) map.removeSource(sourceId);
		map.addSource(sourceId, sourceItems[sourceId]);

		const layerId = `preview_layer`;

		const layerItems: LayerSpecification[] = [];

		const layer = {
			id: layerId,
			source: sourceId,
			maxzoom: layerEntry.layerMaxZoom ?? 24,
			minzoom: layerEntry.layerMinZoom ?? 0
		};

		const layerColor = '#37ff00';
		const layerOpacity = 0.7;

		switch (layerEntry.dataType) {
			// ラスターレイヤー
			case 'raster': {
				layerItems.push({
					...layer,
					type: 'raster',
					paint: {
						'raster-opacity': layerEntry.opacity,
						...(layerEntry.style?.raster?.[0]?.paint ?? {})
					}
				});
				break;
			}
			// ベクトルタイル ポリゴンレイヤー
			// ベクトルタイル ポリゴンレイヤー
			case 'vector':
			case 'geojson': {
				const styleKey = layerEntry.styleKey;

				if (layerEntry.filter) layer.filter = layerEntry.filter as FilterSpecification;
				if (layerEntry.dataType === 'vector') {
					layer['source-layer'] = layerEntry.sourceLayer;
				}
				if (layerEntry.geometryType === 'polygon') {
					const setStyele = layerEntry.style?.fill?.find(
						(item) => item.name === styleKey
					);
					const fillLayer = {
						...layer,
						type: 'fill',
						paint: {
							'fill-opacity': layerOpacity,
							'fill-outline-color': '#fff',
							'fill-color': layerColor
						},
						layout: {
							...(setStyele?.layout ?? {})
						}
					};

					layerItems.push(fillLayer as FillLayerSpecification);
				} else if (layerEntry.geometryType === 'line') {
					const setStyele = layerEntry.style?.line?.find(
						(item) => item.name === styleKey
					);
					const lineLayer = {
						...layer,
						type: 'line',
						paint: {
							'line-opacity': layerOpacity,
							'line-color': layerColor
						},
						layout: {
							...(setStyele?.layout ?? {})
						}
					};

					layerItems.push(lineLayer as LineLayerSpecification);
				} else if (layerEntry.geometryType === 'point') {
					const setStyele = layerEntry.style?.circle?.find(
						(item) => item.name === styleKey
					);
					const pointLayer = {
						...layer,
						type: 'circle',
						paint: {
							'circle-opacity': layerOpacity,
							'circle-color': layerColor
						},
						layout: {
							...(setStyele?.layout ?? {})
						}
					};

					layerItems.push(pointLayer as CircleLayerSpecification);
				} else if (layerEntry.geometryType === 'label') {
					const setStyele = layerEntry.style?.label?.find(
						(item) => item.name === styleKey
					);
					const pointLayer = {
						...layer,
						type: 'symbol',
						paint: {
							'text-opacity': 1,
							'icon-opacity': 1,
							'text-color': layerColor,
							'icon-color': layerColor,
							'text-halo-color': '#fff'
						},
						layout: {
							...(setStyele?.layout ?? {})
						}
					};

					layerItems.push(pointLayer as SymbolLayerSpecification);
				}

				break;
			}

			default:
				console.warn(`Unknown layer: ${layerEntry}`);
				break;
		}
		if (map.getLayer('preview_background')) map.removeLayer('preview_background');
		map.addLayer({
			id: 'preview_background',
			type: 'background',
			paint: {
				'background-color': '#000',
				'background-opacity': 0.7
			}
		});

		map.addLayer(layerItems[0]);
	};

	const reloadDemTile = () => {
		if (!map) return;

		rgbdem.cancelAllRequests();

		const demSource = map.getSource('custom-rgb-dem_source') as RasterTileSource;

		demSource.setTiles(demSource.tiles);
	};

	return {
		subscribe,
		init,
		setStyle,
		addLockonMarker,
		removeLockonMarker,
		getLockonMarker: () => lockOnMarker,
		queryRenderedFeatures,
		getZoom: () => map?.getZoom(),
		panTo,
		easeTo,
		addPreviewLayer,
		addSearchFeature,
		focusLayer,
		focusFeature,
		reloadDemTile,
		getTerrain: () => map?.getTerrain(),
		onClick: clickEvent.subscribe, // クリックイベントの購読用メソッド
		onRotate: rotateEvent.subscribe, // 回転イベントの購読用メソッド
		onLoading: isLoadingEvent.subscribe // ローディングイベントの購読用メソッド
	};
};

export const mapStore = createMapStore();
