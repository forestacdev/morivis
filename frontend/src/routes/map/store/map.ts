// stores/mapStore.js
import { writable, get } from 'svelte/store';
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
import { Protocol } from 'pmtiles';

import { getLocationBbox } from '$map/data/locationBbox';

const pmtilesProtocol = new Protocol();
maplibregl.addProtocol('pmtiles', pmtilesProtocol.tile);

import { GUI } from 'lil-gui';
import turfBbox from '@turf/bbox';
import { getParams } from '$map/utils/url';
import { DEBUG_MODE, EDIT_MODE } from '$map/store';
import type { GeoDataEntry } from '../data/types';
import { GeojsonCache } from '../utils/geojson';

const createMapStore = () => {
	let map: maplibregl.Map | null = null;
	let isInitialized = false;
	let lockOnMarker: Marker | null = null;
	const gui: GUI | null = null;

	const { subscribe, set } = writable<maplibregl.Map | null>(null);
	const clickEvent = writable<MapMouseEvent | null>(null);
	const rotateEvent = writable<MapLibreEvent | null>(null);
	const setStyleEvent = writable<StyleSpecification | null>(null);
	const isLoadingEvent = writable<boolean>(true);

	const init = (mapContainer: HTMLElement, mapStyle: StyleSpecification) => {
		const params = getParams(location.search);

		if (params) {
			if (params.debug && params.debug === 'true') {
				DEBUG_MODE.set(true);
			}
		}

		map = new maplibregl.Map({
			container: mapContainer,
			style: mapStyle,
			center: [136.923004009, 35.5509525769706],
			zoom: 14.5,
			fadeDuration: 100, // フェードアニメーションの時間
			preserveDrawingBuffer: true, // スクリーンショットを撮るために必要
			attributionControl: false, // 著作権表示を非表示
			localIdeographFontFamily: false, // ローカルのフォントを使う
			// renderWorldCopies: false // 世界地図を繰り返し表示しない
			// localIdeographFontFamily: 'sans-serif',
			// transformCameraUpdate: true // カメラの変更をトランスフォームに反映
			// localIdeographFontFamily: 'Noto Sans CJK JP' // 日本語フォントを指定
			// maxZoom: 18,
			// maxBounds: [135.120849, 33.93533, 139.031982, 37.694841]
			hash: get(DEBUG_MODE) ? true : false,
			transformRequest: (url, resourceType) => {
				// ここでリクエストのカスタマイズ

				// console.log(url, resourceType);
				return { url };
			}
		});

		setStyleEvent.set(mapStyle);

		if (!map) return;
		// set(map);

		map.addControl(new maplibregl.NavigationControl());
		// 3D地形コントロール
		map.addControl(
			new maplibregl.TerrainControl({
				source: 'terrain',
				exaggeration: 1
			})
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

		map.on('mouseleave', (e) => {});

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
		isInitialized = true;
	};

	// マップスタイルを設定するメソッド
	const setStyle = (style: StyleSpecification) => {
		if (!map) return;
		setStyleEvent.set(style);
		map.setStyle(style);
	};

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

	const focusLayer = async (entry: GeoDataEntry) => {
		if (!map) return;
		if (entry.format.type === 'fgb') {
			try {
				const geojson = GeojsonCache.get(entry.id);
				const bbox = turfBbox(geojson) as [number, number, number, number];
				map.fitBounds(bbox);
			} catch (error) {
				console.error(error);
			}
		} else if (entry.metaData.location) {
			const bbox = getLocationBbox(entry.metaData.location);
			if (bbox) {
				map.fitBounds(bbox);
			}
		} else {
			console.warn('フォーカスの処理に対応してません', entry.id);
		}
	};

	// フィーチャーをフォーカスするメソッド
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

	// マップに検索結果を追加するメソッド
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

	const getBounds = () => {
		if (!map) return;
		const { _sw, _ne } = map.getBounds();
		return {
			minX: _sw.lng,
			minY: _sw.lat,
			maxX: _ne.lng,
			maxY: _ne.lat
		};
	};

	return {
		subscribe,
		init,
		isInitialized,
		setStyle,
		addLockonMarker,
		removeLockonMarker,
		getLockonMarker: () => lockOnMarker,
		getMap: () => map,
		queryRenderedFeatures,
		getZoom: () => map?.getZoom(),
		panTo,
		easeTo,
		addSearchFeature,
		focusLayer,
		focusFeature,
		onSetStyle: setStyleEvent.subscribe,
		getTerrain: () => map?.getTerrain(),
		getBounds: getBounds,
		onClick: clickEvent.subscribe, // クリックイベントの購読用メソッド
		onRotate: rotateEvent.subscribe, // 回転イベントの購読用メソッド
		onLoading: isLoadingEvent.subscribe // ローディングイベントの購読用メソッド
	};
};

export const mapStore = createMapStore();
