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
import type { CSSCursor } from '$routes/types';

import { getLocationBbox } from '$routes/data/locationBbox';

import turfBbox, { bbox } from '@turf/bbox';
import { setMapParams, getMapParams, getParams } from '$routes/utils/params';
import { DEBUG_MODE, isTerrain3d } from '$routes/store';
import type { GeoDataEntry } from '$routes/data/types';
import { GeojsonCache } from '$routes/utils/file/geojson';
import { get } from 'svelte/store';

import { demProtocol } from '$routes/protocol/raster';
import { tileIndexProtocol } from '$routes/protocol/vector/tileindex';
import { terrainProtocol } from '$routes/protocol/terrain';

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

const createMapStore = () => {
	let lockOnMarker: Marker | null = null;
	let map: maplibregl.Map | null = null;

	const { subscribe, set } = writable<maplibregl.Map | null>(null);

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
		const params = getParams(location.search);

		if (params) {
			if (params.debug && params.debug === '1') {
				DEBUG_MODE.set(true);
			}
		}

		const mapPosition = getMapParams();

		map = new maplibregl.Map({
			...mapPosition,
			container: mapContainer,
			style: mapStyle,
			fadeDuration: 50, // フェードアニメーションの時間
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
		});

		if (get(DEBUG_MODE)) {
			map.showTileBoundaries = true; // タイルの境界を表示
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

			// mapページのときに有効
			if (url.startsWith(`${origin}/map`)) {
				const center = map.getCenter();
				setMapParams({
					center: [center.lng, center.lat],
					zoom: map.getZoom(),
					pitch: map.getPitch(),
					bearing: map.getBearing()
				});
			}
			mooveEndEvent.set(e);

			// const zoom = map.getZoom();

			// if (zoom < 11) {
			// 	map.setProjection({ type: 'globe' });
			// } else {
			// 	map.setProjection({ type: 'mercator' });
			// }
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
			duration: 500
		});
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

	const getMapBounds = (): [number, number, number, number] => {
		if (!map) {
			console.warn('Map is not ready yet.');
			return [0, 0, 0, 0];
		}
		const { _sw, _ne } = map.getBounds();
		return [_sw.lng, _sw.lat, _ne.lng, _ne.lat];
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
		easeTo: (options: EaseToOptions) => easeTo(options),
		focusLayer,
		focusFeature,
		getTerrain: () => map?.getTerrain(),
		getMapBounds: getMapBounds,
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
		onStyleLoad: createEventSubscriber(isStyleLoadEvent) // スタイルロードイベントの購読用メソッド
	};
};

export const mapStore = createMapStore();
