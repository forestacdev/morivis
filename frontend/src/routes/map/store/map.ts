// stores/mapStore.js
import { writable, get } from 'svelte/store';
import maplibregl, { ScaleControl } from 'maplibre-gl';
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
	RasterTileSource,
	LngLatBounds
} from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { propData } from '$map/data/propData';

import { getLocationBbox } from '$map/data/locationBbox';

const pmtilesProtocol = new Protocol();
maplibregl.addProtocol('pmtiles', pmtilesProtocol.tile);

import turfBbox from '@turf/bbox';
import { setMapParams, getMapParams, getParams } from '$map/utils/params';
import { DEBUG_MODE, showLayerOptionId } from '$map/store';
import type { GeoDataEntry } from '$map/data/types';
import { GeojsonCache } from '$map/utils/geojson';

const createMapStore = () => {
	let isInitialized = false;
	let lockOnMarker: Marker | null = null;
	let map: maplibregl.Map | null = null;

	const { subscribe, set } = writable<maplibregl.Map | null>(null);
	const clickEvent = writable<MapMouseEvent | null>(null);
	const rotateEvent = writable<number | null>(null);
	const zoomEvent = writable<number | null>(null);
	const setStyleEvent = writable<StyleSpecification | null>(null);
	const isLoadingEvent = writable<boolean>(true);
	const mooveEndEvent = writable<MapLibreEvent | null>(null);

	const init = (mapContainer: HTMLElement, mapStyle: StyleSpecification) => {
		const params = getParams(location.search);

		if (params) {
			if (params.debug && params.debug === 'true') {
				DEBUG_MODE.set(true);
			}
		}

		const mapPosition = getMapParams();

		map = new maplibregl.Map({
			...mapPosition,
			container: mapContainer,
			style: mapStyle,
			fadeDuration: 50, // フェードアニメーションの時間
			preserveDrawingBuffer: true, // スクリーンショットを撮るために必要
			attributionControl: false, // デフォルトの出典を非表示
			localIdeographFontFamily: false, // ローカルのフォントを使う
			maxPitch: 85,
			maxZoom: 20
			// renderWorldCopies: false // 世界地図を繰り返し表示しない
			// transformCameraUpdate: true // カメラの変更をトランスフォームに反映
			// maxZoom: 18,
			// maxBounds: [135.120849, 33.93533, 139.031982, 37.694841]
			// transformRequest: (url, resourceType) => {
			// 	return { url };
			// }
		});

		setStyleEvent.set(mapStyle);

		if (!map) return;

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
		map.on('rotate', (e: MouseEvent) => {
			if (!map) return;
			const bearing = map.getBearing();
			rotateEvent.set(bearing);
		});

		// 地図上でマウスクリックを押した時のイベント
		map.on('mousedown', (e: MouseEvent) => {
			// console.log('mousedown');
		});

		// 地図上でマウスクリックを離した時のイベント
		map.on('mouseup', (e: MouseEvent) => {
			// console.log('mouseup');
		});

		// 地図にマウスが乗った時のイベント
		map.on('mouseover', (e: MouseEvent) => {
			// console.log('mouseover');
		});

		// 地図からマウスが離れた時のイベント
		map.on('mouseout', (e: MouseEvent) => {
			// console.log('mouseout');
		});

		map.on('moveend', (e: MapLibreEvent) => {
			if (!map) return;
			const center = map.getCenter();
			setMapParams({
				center: [center.lng, center.lat],
				zoom: map.getZoom(),
				pitch: map.getPitch(),
				bearing: map.getBearing()
			});
			mooveEndEvent.set(e);
		});

		map.on('zoom', (e: MouseEvent) => {
			if (!map) return;
			const zoom = map.getZoom();
			zoomEvent.set(zoom);
		});

		// showLayerOptionId.subscribe((id) => {
		// 	if (!map) return;

		// });

		const iconWorker = new Worker(new URL('../utils/icon/worker.ts', import.meta.url), {
			type: 'module'
		});

		// メッセージハンドラーを一度だけ定義
		iconWorker.onmessage = async (e) => {
			const { imageBitmap, id } = e.data;

			if (map && !map.hasImage(id)) {
				map.addImage(id, imageBitmap);
			}
		};

		// エラーハンドリングを追加
		iconWorker.onerror = (error) => {
			console.error('Worker error:', error);
		};

		// 処理中の画像IDを追跡
		const processingImages = new Set();

		map.on('styleimagemissing', async (e) => {
			if (!map) return;
			const id = e.id;

			// すでに処理中または追加済みの画像はスキップ
			if (processingImages.has(id) || map.hasImage(id)) return;

			try {
				processingImages.add(id);
				const imageUrl = propData[id].image;
				if (!imageUrl) return;

				iconWorker.postMessage({ id, url: imageUrl });
			} catch (error) {
				console.error(`Error processing image for id ${id}:`, error);
				processingImages.delete(id);
			}
		});

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
				if (!geojson) return;
				const bbox = turfBbox(geojson) as [number, number, number, number];
				map.fitBounds(bbox, {
					bearing: map.getBearing(),
					padding: 100,
					duration: 500
				});
			} catch (error) {
				console.error(error);
			}
		} else if (entry.metaData.bounds) {
			map.fitBounds(entry.metaData.bounds, {
				bearing: map.getBearing(),
				padding: 100,
				duration: 500
			});
		} else if (entry.metaData.location) {
			const bbox = getLocationBbox(entry.metaData.location);
			if (bbox) {
				map.fitBounds(bbox, {
					bearing: map.getBearing(),
					padding: 100,
					duration: 500
				});
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
		onZoom: zoomEvent.subscribe, // ズームイベントの購読用メソッド
		onMooveEnd: mooveEndEvent.subscribe, // マップ移動イベントの購読用メソッド
		onLoading: isLoadingEvent.subscribe // ローディングイベントの購読用メソッド
	};
};

export const mapStore = createMapStore();
