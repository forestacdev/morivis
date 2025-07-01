import { writable, type Writable } from 'svelte/store';
import maplibregl from 'maplibre-gl';
import type {
	StyleSpecification,
	LngLat,
	AnimationOptions,
	EaseToOptions,
	PointLike,
	Marker,
	MapMouseEvent,
	MapLibreEvent,
	QueryRenderedFeaturesOptions,
	MapGeoJSONFeature,
	LngLatBoundsLike
} from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import type { CSSCursor } from '$routes/map/types';

import { getLocationBbox } from '$routes/map/data/location_bbox';

import turfBbox, { bbox } from '@turf/bbox';
import { setMapParams, getMapParams, getParams } from '$routes/map/utils/params';
import { DEBUG_MODE, isTerrain3d } from '$routes/store';
import type { GeoDataEntry } from '$routes/map/data/types';
import { GeojsonCache } from '$routes/map/utils/file/geojson';
import { get } from 'svelte/store';

import { demProtocol } from '$routes/map/protocol/raster';
import { tileIndexProtocol } from '$routes/map/protocol/vector/tileindex';
import { terrainProtocol } from '$routes/map/protocol/terrain';

import {
	WEB_MERCATOR_MIN_LAT,
	WEB_MERCATOR_MAX_LAT,
	WEB_MERCATOR_MIN_LNG,
	WEB_MERCATOR_MAX_LNG
} from '$routes/map/utils/map';

const pmtilesProtocol = new Protocol();
maplibregl.addProtocol('pmtiles', pmtilesProtocol.tile);

const webgl = demProtocol('webgl');
maplibregl.addProtocol(webgl.protocolName, webgl.request);

const terrain = terrainProtocol('terrain');
maplibregl.addProtocol(terrain.protocolName, terrain.request);

const tileIndex = tileIndexProtocol('tile_index');
maplibregl.addProtocol(tileIndex.protocolName, tileIndex.request);

export const isHoverPoiMarker = writable<boolean>(false); // POIマーカーにホバーしているかどうか

export const isLoadingEvent = writable<boolean>(true); // マップの読み込み状態を管理するストア

export const displayingArea = writable<string | null>(null); // 現在の位を管理するストア

//prefecture, municipalities
const updateSisplayingArea = async (
	lng: number,
	lat: number,
	zoom: number,
	map: maplibregl.Map
) => {
	const layerName = 'municipalities'; // ズームレベルが8未満の場合は8にする

	console.log(layerName);
	if (zoom <= 9) {
		return;
	}
	const features = map.queryRenderedFeatures([lng, lat], {
		layers: [layerName]
	});

	console.log(features);

	console.log(features);

	if (features.length > 0) {
		const feature = features[0] as MapGeoJSONFeature;

		console.log('Displaying area feature:', feature.properties);

		let name;

		if (zoom + 1.5 >= 8) {
			name = feature.properties['N03_001'] + feature.properties['N03_004']; // 都道府県名
		} else {
			name = feature.properties['N03_001']; // 都道府県名
		}

		displayingArea.set(name);
	}
};
export interface MapState {
	bbox: [number, number, number, number];
	zoom: number;
	center: [number, number];
	pitch: number;
	bearing: number;
}

const createMapStore = () => {
	let lockOnMarker: Marker | null = null;
	let map: maplibregl.Map | null = null;

	const { subscribe, set } = writable<maplibregl.Map | null>(null);

	const state = writable<MapState>({
		bbox: [0, 0, 0, 0],
		zoom: 0,
		center: [0, 0],
		pitch: 0,
		bearing: 0
	});

	// maplibre-glのイベントを管理するストア
	const clickEvent = writable<MapMouseEvent | null>(null);
	const mouseoverEvent = writable<MapMouseEvent | null>(null);
	const mouseoutEvent = writable<MapMouseEvent | null>(null);
	const rotateEvent = writable<number | null>(null);
	const zoomEvent = writable<number | null>(null);
	const setStyleEvent = writable<StyleSpecification | null>(null);
	const isStyleLoadEvent = writable<maplibregl.Map | null>(null);
	const mooveEndEvent = writable<MapLibreEvent | null>(null);
	const resizeEvent = writable<MapLibreEvent | null>(null);
	const initEvent = writable<maplibregl.Map | null>(null);
	const onLoadEvent = writable<MapLibreEvent | null>(null);

	const init = (mapContainer: HTMLElement, mapStyle: StyleSpecification) => {
		const mapPosition = getMapParams();

		map = new maplibregl.Map({
			...mapPosition,
			container: mapContainer,
			// canvasContextAttributes: {
			// 	// WebGLのコンテキスト属性を設定
			// 	antialias: true, // アンチエイリアスを有効にする
			// 	depth: true, // 深度バッファを有効にする
			// 	stencil: true, // ステンシルバッファを有効にする
			// 	alpha: true, // アルファチャンネルを有効にする
			// 	preserveDrawingBuffer: true // 描画バッファを保持する 地図のスクリーンショット機能が必要な場合
			// },
			centerClampedToGround: true, // 地図の中心を地面にクランプする
			style: mapStyle,
			fadeDuration: 0, // フェードアニメーションの時間 シンボル
			attributionControl: false, // デフォルトの出典を非表示
			localIdeographFontFamily: false, // ローカルのフォントを使う
			maxPitch: 85 // 最大ピッチ角度
			// maxZoom: 20
			// renderWorldCopies: false // 世界地図を繰り返し表示しない
			// transformCameraUpdate: true // カメラの変更をトランスフォームに反映
			// maxZoom: 18,
			// maxBounds: [135.120849, 33.93533, 139.031982, 37.694841]
			// transformRequest: (url, resourceType) => {
			// 	return { url };
			// }

			// collectResourceTiming: true // リソースのタイミングを収集する Vector TileとGeoJSON(デバッグ用)
		});

		if (get(DEBUG_MODE)) {
			// map.showTileBoundaries = true; // タイルの境界を表示
			// データ読み込みイベントを監視
			map.on('data', (e) => {
				// resourceTimingプロパティにタイミング情報が含まれる
				if (e.resourceTiming) {
					console.log('リソースタイミング情報:', e.resourceTiming);

					// 各タイミングの詳細
					const timing = e.resourceTiming;
					console.log('DNS解決時間:', timing.domainLookupEnd - timing.domainLookupStart);
					console.log('接続時間:', timing.connectEnd - timing.connectStart);
					console.log('ダウンロード時間:', timing.responseEnd - timing.responseStart);
					console.log('総時間:', timing.responseEnd - timing.fetchStart);
				}
			});
		}
		// map.scrollZoom.setWheelZoomRate(1 / 800);

		// map.setBearing(mapPosition.bearing);
		// map.setZoom(mapPosition.zoom);

		setStyleEvent.set(mapStyle);

		if (!map) return;

		// poi用の透明アイコンを追加
		const width = 16;
		const bytesPerPixel = 4;
		const data = new Uint8Array(width * width * bytesPerPixel);
		map.addImage('poi-icon', { width, height: width, data });

		map.once('style.load', () => {
			isStyleLoadEvent.set(map);
		});

		map.on('load', (e: MapLibreEvent) => {
			onLoadEvent.set(e);
		});

		map.on('click', (e: MapMouseEvent) => {
			if (get(isHoverPoiMarker)) {
				// POIマーカーにホバーしている場合はクリックイベントを無視
				return;
			}
			clickEvent.set(e);
		});

		map.on('resize', (e) => {
			resizeEvent.set(e);
		});
		map.on('data', (e) => {
			//your code here
			isLoadingEvent.set(true);
			// console.log(e);
		});
		map.on('idle', (e) => {
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
		map.on('mouseover', (e) => {
			mouseoverEvent.set(e);
		});

		// 地図からマウスが離れた時のイベント
		map.on('mouseout', (e) => {
			mouseoutEvent.set(e);
		});

		map.on('moveend', (e: MapLibreEvent) => {
			if (!map) return;
			const url = window.location.href;
			const origin = window.location.origin;

			const zoom = map.getZoom();
			// 地図の中心座標を取得
			const center = map.getCenter();
			// 地図のピッチとベアリングを取得
			const bearing = map.getBearing();
			const pitch = map.getPitch();

			// updateSisplayingArea(center.lng, center.lat, zoom, map);

			// mapページのときに有効
			if (url.startsWith(`${origin}/map`)) {
				setMapParams({
					center: [center.lng, center.lat],
					zoom,
					pitch,
					bearing
				});
			}
			state.set({
				bbox: getMapBounds(),
				zoom: map.getZoom(),
				center: [map.getCenter().lng, map.getCenter().lat],
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

		// TODO: 使用してない
		// map.on('styleimagemissing', (e) => handleStyleImageMissing(e, map));

		initEvent.set(map);
	};

	// Method for setting map style
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

	// 森林文化アカデミーへジャンプするメソッド
	const jumpToFac = () => {
		if (!map) return;
		const bounds = [136.91278, 35.543576, 136.92986, 35.556704] as LngLatBoundsLike;
		map.fitBounds(bounds, {
			padding: 20,
			bearing: map.getBearing(),
			duration: 1000,
			animate: true
		});
	};

	const getMapContainer = async () => {
		if (!map) return;
		const canvas = map.getCanvasContainer();
		const witdh = canvas.clientWidth;
		const height = canvas.clientHeight;

		return {
			canvas,
			witdh,
			height
		};
	};

	// クリックマーカーを削除するメソッド
	const removeLockonMarker = () => {
		if (!map || !lockOnMarker) return;
		lockOnMarker.remove();
	};

	// 地形をリロードするメソッド
	// https://github.com/maplibre/maplibre-gl-js/issues/3001
	const terrainReload = () => {
		if (!map || !map.getTerrain()) return;
		setTimeout(() => {
			if (map) map.terrain.sourceCache.sourceCache.reload();
		}, 200);
	};

	const queryRenderedFeatures = (
		geometryOrOptions?: PointLike | [PointLike, PointLike] | QueryRenderedFeaturesOptions,
		options?: QueryRenderedFeaturesOptions
	): MapGeoJSONFeature[] | undefined => {
		return map?.queryRenderedFeatures(geometryOrOptions, options);
	};

	const panTo = (
		lngLat:
			| [number, number]
			| {
					lng: number;
					lat: number;
			  },
		option?: AnimationOptions
	) => {
		if (!map) return;
		map.panTo(lngLat, option);
	};

	const panToPoi = (
		lngLat:
			| [number, number]
			| {
					lng: number;
					lat: number;
			  }
	) => {
		if (!map) return;
		map.panTo(lngLat, {
			duration: 300,
			padding: {
				left: 400, // サイドバー分の余白を左に確保
				top: 20,
				right: 20,
				bottom: 20
			}
		});
	};

	const easeTo = (options: EaseToOptions) => {
		if (!map) return;
		map.easeTo(options);
	};

	const focusLayer = async (entry: GeoDataEntry) => {
		if (!map) return;
		let bbox: [number, number, number, number] | undefined;
		if (entry.format.type === 'fgb' || entry.format.type === 'geojson') {
			try {
				const geojson = GeojsonCache.get(entry.id);
				if (!geojson) return;
				bbox = turfBbox(geojson) as [number, number, number, number];
			} catch (error) {
				console.error(error);
			}
		} else if (entry.metaData.bounds) {
			bbox = entry.metaData.bounds as [number, number, number, number];
		} else if (entry.metaData.location) {
			bbox = getLocationBbox(entry.metaData.location) as [number, number, number, number];
		} else {
			console.warn('フォーカスの処理に対応してません', entry.id);
		}

		if (!bbox) return;

		map.fitBounds(bbox, {
			bearing: map.getBearing(),
			padding: {
				left: 400, // サイドバー分の余白を左に確保
				top: 20,
				right: 20,
				bottom: 20
			},
			duration: 0
		});

		if (entry.metaData.minZoom && map.getZoom() + 1.5 < entry.metaData.minZoom)
			map.setZoom(entry.metaData.minZoom); // ズームを少し下げる
	};

	// フィーチャーをフォーカスするメソッド
	const focusFeature = async (feature: MapGeoJSONFeature) => {
		if (!map) return;
		const bbox = turfBbox(feature.geometry) as [number, number, number, number];

		map.fitBounds(bbox, {
			bearing: map.getBearing(),
			padding: {
				left: 400, // サイドバー分の余白を左に確保
				top: 20,
				right: 20,
				bottom: 20
			},
			duration: 500
		});
	};

	// TODO: サイドバーの分をオフセット
	const getMapBounds = (): [number, number, number, number] => {
		if (!map) {
			console.warn('Map is not ready yet.');
			return [0, 0, 0, 0];
		}

		// 緯度をWebメルカトル（EPSG:3857）の制限範囲内にクランプする関数
		const clampLatitude = (lat: number): number => {
			return Math.max(WEB_MERCATOR_MIN_LAT, Math.min(WEB_MERCATOR_MAX_LAT, lat));
		};

		// 経度を正規化する関数（-180 ~ 180の範囲に収める）
		const normalizeLongitude = (lng: number): number => {
			// 経度を-180から180の範囲に正規化
			lng = lng % 360;
			if (lng > 180) {
				lng -= 360;
			} else if (lng < -180) {
				lng += 360;
			}
			return lng;
		};
		const bounds = map.getBounds();

		// 緯度を制限範囲内にクランプ
		const swLat = clampLatitude(bounds._sw.lat);
		const neLat = clampLatitude(bounds._ne.lat);

		// 経度を正規化
		let swLng = normalizeLongitude(bounds._sw.lng);
		let neLng = normalizeLongitude(bounds._ne.lng);

		// 180度線をまたぐ場合の処理
		if (swLng > neLng) {
			// 地図が180度線をまたいでいる場合は、西側の境界を使用
			swLng = WEB_MERCATOR_MIN_LNG;
			neLng = WEB_MERCATOR_MAX_LNG;
		}

		const bbox = [swLng, swLat, neLng, neLat] as [number, number, number, number];

		return bbox;
	};

	// ソースとレイヤーをすべてリセットするメソッド
	const resetAllSourcesAndLayers = () => {
		if (!map) {
			console.warn('Map is not ready yet.');
			return;
		}

		// 現在のスタイル情報を取得
		const style = map.getStyle();

		// sources と layers を保持
		const sources = { ...style.sources };
		const layers = [...style.layers];

		// レイヤーをすべて削除（ソースに依存しているため先に）
		for (const layer of layers) {
			if (map.getLayer(layer.id)) {
				map.removeLayer(layer.id);
			}
		}

		// ソースをすべて削除
		for (const sourceId in sources) {
			if (map.getSource(sourceId)) {
				map.removeSource(sourceId);
			}
		}

		// ソースを元通り追加
		for (const [sourceId, sourceDef] of Object.entries(sources)) {
			map.addSource(sourceId, sourceDef);
		}

		// レイヤーを元通り追加（元の順番を維持）
		for (const layer of layers) {
			map.addLayer(layer);
		}

		if (get(isTerrain3d)) {
			map.setTerrain({
				source: 'terrain',
				exaggeration: 1.0
			});
		}
	};

	// 地形をリセットするメソッド
	const resetDem = () => {
		// TODO
		if (!map) return;
		map.setTerrain(null);
		map.removeSource('terrain');

		// map.addSource('terrain', {
		// 	type: 'raster-dem',
		// 	tiles: [`${terrain.protocolName}://${demEntry.url}?demType=${demEntry.demType}`],
		// 	tileSize: 256,
		// 	minzoom: demEntry.sourceMinZoom,
		// 	maxzoom: demEntry.sourceMaxZoom,
		// 	attribution: demEntry.attribution,
		// 	bounds: demEntry.bbox
		// });

		map.setTerrain({
			source: 'terrain',
			exaggeration: 1
		});

		// const bbox = demEntry.bbox;
		// if (!bbox) return;

		const bounds = map.getBounds().toArray();

		const zoom = map.getZoom();

		// map.fitBounds(bbox, {
		// 	padding: 100,
		// 	duration: 300,
		// 	bearing: map.getBearing()
		// });

		// if (zoom < demEntry.sourceMinZoom || zoom > demEntry.sourceMaxZoom) {
		// 	map.setZoom(demEntry.sourceMaxZoom - 1.5);
		// }
		resetAllSourcesAndLayers();
		terrainReload();
	};

	const setCursor = (cursor: CSSCursor) => {
		if (!map) return;
		const canvas = map.getCanvas();
		if (canvas) {
			canvas.style.cursor = cursor;
		}
	};

	// インスタンス削除
	const remove = () => {
		if (!map) return;
		map.remove();
		map = null;
		set(null);

		mouseoverEvent.set(null);
		mouseoutEvent.set(null);
		rotateEvent.set(null);
		zoomEvent.set(null);
		setStyleEvent.set(null);
		isLoadingEvent.set(true);
		isStyleLoadEvent.set(null);
		mooveEndEvent.set(null);
		resizeEvent.set(null);
		initEvent.set(null);
		onLoadEvent.set(null);
		lockOnMarker = null;
	};

	const createEventSubscriber = <T>(store: Writable<T | undefined | null>) => {
		return (callback: (event: T) => void) => {
			return store.subscribe((event) => {
				if (event) callback(event);
			});
		};
	};

	return {
		subscribe,
		init,
		remove,
		setStyle,
		setCursor,
		addLockonMarker,
		removeLockonMarker,
		getLockonMarker: () => lockOnMarker,
		getMap: () => map,
		queryRenderedFeatures,
		getZoom: () => map?.getZoom(),
		getCenter: () => map?.getCenter(),
		getPitch: () => map?.getPitch(),
		getBearing: () => map?.getBearing(),
		setBearing: (bearing: number) => map?.setBearing(bearing),
		fitBounds: (bounds: LngLatBoundsLike, options?: maplibregl.FitBoundsOptions) =>
			map?.fitBounds(bounds, options),
		panTo,
		panToPoi,
		easeTo: (options: EaseToOptions) => easeTo(options),
		focusLayer,
		focusFeature,
		getTerrain: () => map?.getTerrain(),
		getMapBounds,
		getCanvas: () => map?.getCanvas(),
		terrainReload: terrainReload, // 地形をリロードするメソッド
		resetDem: resetDem, // 地形をリセットするメソッド
		resetAllSourcesAndLayers: resetAllSourcesAndLayers, // ソースとレイヤーをリセットするメソッド
		getMapContainer: getMapContainer, // マップコンテナを取得するメソッド
		jumpToFac: jumpToFac,
		// リスナー
		onSetStyle: createEventSubscriber(setStyleEvent), // スタイル設定イベントの購読用メソッド
		onResize: createEventSubscriber(resizeEvent), // リサイズイベントの購読用メソッド
		onload: createEventSubscriber(onLoadEvent), // onloadイベントの購読用メソッド
		onClick: createEventSubscriber(clickEvent), // クリックイベント
		onMouseover: createEventSubscriber(mouseoverEvent), // マウスオーバーイベントの購読用メソッド
		onMouseout: createEventSubscriber(mouseoutEvent), // マウスアウトイベントの購読用メソッド
		onRotate: createEventSubscriber(rotateEvent), // 回転イベントの購読用メソッド
		onZoom: createEventSubscriber(zoomEvent), // ズームイベントの購読用メソッド
		onMooveEnd: createEventSubscriber(mooveEndEvent), // マップ移動イベントの購読用メソッド
		onLoading: createEventSubscriber(isLoadingEvent), // ローディングイベントの購読用メソッド
		onInitialized: createEventSubscriber(initEvent), // 初期化イベントの購読用メソッド
		onStyleLoad: createEventSubscriber(isStyleLoadEvent), // スタイルロードイベントの購読用メソッド
		onStateChange: state.subscribe, // マップの状態を購読するメソッド
		getState: () => {
			return get(state);
		}
	};
};

export const mapStore = createMapStore();
