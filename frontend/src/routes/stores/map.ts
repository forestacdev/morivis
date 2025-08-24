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
	LngLatBoundsLike,
	GeoJSONSource,
	FilterSpecification,
	StyleSetterOptions,
	FeatureIdentifier
} from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import type { CSSCursor } from '$routes/map/types';

import turfBbox, { bbox } from '@turf/bbox';
import { setMapParams, getMapParams, getParams, set3dParams } from '$routes/map/utils/params';
import { isDebugMode } from '$routes/stores';
import type { GeoDataEntry } from '$routes/map/data/types';
import { GeojsonCache } from '$routes/map/utils/file/geojson';
import { get } from 'svelte/store';

import { demProtocol } from '$routes/map/protocol/raster';
import { tileIndexProtocol } from '$routes/map/protocol/vector/tileindex';
import { terrainProtocol } from '$routes/map/protocol/terrain';
import markerPngIcon from '$lib/icons/marker.png';

import {
	WEB_MERCATOR_MIN_LAT,
	WEB_MERCATOR_MAX_LAT,
	WEB_MERCATOR_MIN_LNG,
	WEB_MERCATOR_MAX_LNG
} from '$routes/map/data/location_bbox';
import type { FeatureCollection, Feature, GeoJsonProperties, Geometry } from 'geojson';
import { checkMobile, checkPc } from '$routes/map/utils/ui';

const pmtilesProtocol = new Protocol();
maplibregl.addProtocol('pmtiles', pmtilesProtocol.tile);

const webgl = demProtocol('webgl');
maplibregl.addProtocol(webgl.protocolName, webgl.request);

const terrain = terrainProtocol('terrain');
maplibregl.addProtocol(terrain.protocolName, terrain.request);

if (import.meta.env.DEV) {
	const tileIndex = tileIndexProtocol('tile_index');
	maplibregl.addProtocol(tileIndex.protocolName, tileIndex.request);
}

export const isHoverPoiMarker = writable<boolean>(false); // POIマーカーにホバーしているかどうか

export const isLoadingEvent = writable<boolean>(true); // マップの読み込み状態を管理するストア

export const displayingArea = writable<string | null>(null); // 現在のエリア名を管理するストア

/**  3D地形 */
export const isTerrain3d = writable<boolean>(false); // 3D地形の表示状態を管理するストア

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
	const mousemoveEvent = writable<MapMouseEvent | null>(null);
	const mousedownEvent = writable<MapMouseEvent | null>(null);
	const mouseupEvent = writable<MapMouseEvent | null>(null);
	const rotateEvent = writable<number | null>(null);
	const zoomEvent = writable<number | null>(null);
	const setStyleEvent = writable<StyleSpecification | null>(null);
	const isStyleLoadEvent = writable<maplibregl.Map | null>(null);
	const onStyleDataEvent = writable<MapLibreEvent | null>(null);
	const mooveEndEvent = writable<MapLibreEvent | null>(null);
	const resizeEvent = writable<MapLibreEvent | null>(null);
	const initEvent = writable<maplibregl.Map | null>(null);
	const onLoadEvent = writable<MapLibreEvent | null>(null);

	const init = (mapContainer: HTMLElement, mapStyle: StyleSpecification) => {
		const mapPosition = getMapParams();

		map = new maplibregl.Map({
			...mapPosition,
			minZoom: checkPc() ? 2 : 1, // 最小ズームレベル
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
			// fadeDuration: 0, // フェードアニメーションの時間 シンボル
			attributionControl: false, // デフォルトの出典を非表示
			localIdeographFontFamily: false, // ローカルのフォントを使う
			maxPitch: 85 // 最大ピッチ角度
			// maplibreLogo: true // MapLibreのロゴを表示
			// logoPosition: 'bottom-right' // ロゴの位置を指定
			// maxZoom: 20
			// renderWorldCopies: false // 世界地図を繰り返し表示しない
			// transformCameraUpdate: true // カメラの変更をトランスフォームに反映
			// maxZoom: 18,
			// maxBounds: [135.120849, 33.93533, 139.031982, 37.694841]
			// transformRequest: (url, resourceType) => {
			// 	if (import.meta.env.PROD) return { url };

			// 	// 兵庫県森林情報のURLを変換
			// 	if (url.includes('rinya-hyogo.geospatial.jp')) {
			// 		const newUrl = url.replace('https://rinya-hyogo.geospatial.jp', '/api/rinya');
			// 		console.log('Transformed URL:', newUrl);
			// 		return { url: newUrl };
			// 	}
			// }

			// collectResourceTiming: true // リソースのタイミングを収集する Vector TileとGeoJSON(デバッグ用)
		});

		if (get(isDebugMode)) {
			// map.showTileBoundaries = true; // タイルの境界を表示
			// データ読み込みイベントを監視
			map.on('data', (e) => {
				// resourceTimingプロパティにタイミング情報が含まれる
			});
		}
		// map.scrollZoom.setWheelZoomRate(1 / 800);

		// map.setBearing(mapPosition.bearing);
		// map.setZoom(mapPosition.zoom);

		setStyleEvent.set(mapStyle);

		if (!map) return;

		map.on('styleimagemissing', (e) => {
			if (!map) return;

			const id = e.id;
			if (id === 'marker_png') {
				// 検索用のマーカーアイコンを追加
				fetch(markerPngIcon).then(async (response) => {
					if (!response.ok) {
						throw new Error(`Failed to fetch image: ${response.statusText}`);
					}
					const image = await createImageBitmap(await response.blob());
					if (!map) return;
					map.addImage('marker_png', image);
				});
			} else if (id === 'poi-icon') {
				// poi用の透明アイコンを追加
				const width = 16;
				const bytesPerPixel = 4;
				const data = new Uint8Array(width * width * bytesPerPixel);
				map.addImage('poi-icon', { width, height: width, data });
			}
		});

		map.once('style.load', () => {
			isStyleLoadEvent.set(map);
		});

		map.on('styledata', (e) => {
			if (!map) return;
			state.set({
				bbox: getMapBounds(),
				zoom: map.getZoom(),
				center: [map.getCenter().lng, map.getCenter().lat],
				pitch: map.getPitch(),
				bearing: map.getBearing()
			});
			onStyleDataEvent.set(e);
		});

		map.on('load', (e: MapLibreEvent) => {
			onLoadEvent.set(e);
		});

		// より詳細なエラー情報を取得
		// map.on('error', (e) => {
		// 	console.error('Map error details:', e);
		// 	console.error('Error source:', e.error);
		// 	console.error('Error stack:', e.error?.stack);
		// });

		// map.on('sourcedata', (e) => {
		// 	if (e.sourceId === 'hiroshima-trees') {
		// 		console.log('Source data event:', e);
		// 		if (e.dataType === 'source' && e.isSourceLoaded) {
		// 			console.log('Source loaded successfully');
		// 		}
		// 	}
		// });

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
		map.on('mousemove', (e: MapMouseEvent) => {
			mousemoveEvent.set(e);
		});

		// 地図上でマウスクリックを押した時のイベント
		map.on('mousedown', (e: MapMouseEvent) => {
			mousedownEvent.set(e);
		});

		// 地図上でマウスクリックを離した時のイベント
		map.on('mouseup', (e: MapMouseEvent) => {
			mouseupEvent.set(e);
		});

		// 地図にマウスが乗った時のイベント
		map.on('mouseover', (e: MapMouseEvent) => {
			mouseoverEvent.set(e);
		});

		// 地図からマウスが離れた時のイベント
		map.on('mouseout', (e: MapMouseEvent) => {
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

			if (import.meta.env.DEV) {
				console.log(getMapBounds());
			}
		});

		map.on('zoom', (e: MouseEvent) => {
			if (!map) return;
			const zoom = map.getZoom();
			zoomEvent.set(zoom);
		});

		initEvent.set(map);
	};

	// TODO
	const setStylePreservation = (style: StyleSpecification) => {
		if (!map) {
			console.warn('Map is not initialized');
			return;
		}

		if (!style) {
			map.setStyle(null);
			return;
		}

		// 即座にsetStyleを実行（MapLibre GLが前回の処理を自動キャンセル）
		map.setStyle(style, {
			transformStyle: (previous, next) => {
				// ベーススタイルの情報を保存
				const baseLight = next.light;
				const baseProjection = next.projection;
				const baseSky = next.sky;
				const baseTerrain = next.terrain;

				return {
					...next,
					light: baseLight,
					projection: baseProjection,
					sky: baseSky,
					terrain: baseTerrain
				};
			}
		});

		// スタイル変更イベントを発火
		setStyleEvent.set(style);
	};

	// マップの初期化判定
	const isMapValid = (_map: any): boolean => {
		return (
			_map &&
			typeof _map === 'object' &&
			typeof _map.getLayer === 'function' &&
			typeof _map.setLayoutProperty === 'function' &&
			!_map._removed
		); // マップが削除されていないかチェック
	};

	// Method for setting map style
	const setStyle = (style: StyleSpecification) => {
		if (!map || !isMapValid(map)) return;
		setStyleEvent.set(style);
		map.setStyle(style);
	};

	const setFilter = (layerId: string, filter: FilterSpecification) => {
		if (!map || !isMapValid(map)) return;
		const layer = map.getLayer(layerId);
		if (layer) {
			map.setFilter(layerId, filter);
		} else {
			console.warn(`Layer with ID ${layerId} does not exist.`);
		}
	};

	// クリックマーカーを追加するメソッド
	const addLockonMarker = (element: HTMLElement, lngLat: LngLat) => {
		if (!map || !isMapValid(map)) return;
		lockOnMarker = new maplibregl.Marker({ element }).setLngLat(lngLat).addTo(map);
	};

	// 森林文化アカデミーへジャンプするメソッド
	const jumpToFac = () => {
		if (!map || !isMapValid(map)) return;
		// const bounds = [136.91278, 35.543576, 136.92986, 35.556704] as LngLatBoundsLike;
		const bounds = [136.91917, 35.54692, 136.926817, 35.555122] as LngLatBoundsLike;
		map.fitBounds(bounds, {
			padding: 20,
			bearing: map.getBearing(),
			duration: 1000,
			animate: true
		});
	};

	const getMapContainer = async () => {
		if (!map || !isMapValid(map)) return;
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
		if (!map || !isMapValid(map)) return;
		if (!lockOnMarker) return;
		lockOnMarker.remove();
	};

	// 地形をリロードするメソッド
	// https://github.com/maplibre/maplibre-gl-js/issues/3001
	const terrainReload = () => {
		if (!map || !isMapValid(map)) return;
		if (!map.getTerrain()) return;
		setTimeout(() => {
			if (map) map.terrain.sourceCache.sourceCache.reload();
		}, 200);
	};

	const toggleTerrain = (is3d: boolean) => {
		if (!map || !isMapValid(map)) return;

		try {
			if (is3d) {
				if (map.getSource('terrain')) {
					map.setTerrain({
						source: 'terrain',
						exaggeration: 1.0
					});
					set3dParams('1');
					// map.easeTo({ pitch: 60 });
				}
			} else {
				if (map.getTerrain()) {
					map.setTerrain(null);
				}
				set3dParams('0');
				// map.easeTo({ pitch: 0 });
			}
		} catch (error) {
			console.error('Terrain control error:', error);
		}
	};

	const queryRenderedFeatures = (
		geometryOrOptions?: PointLike | [PointLike, PointLike] | QueryRenderedFeaturesOptions,
		options?: QueryRenderedFeaturesOptions
	): MapGeoJSONFeature[] => {
		if (!map) {
			return [];
		}

		return map.queryRenderedFeatures(geometryOrOptions, options);
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
		if (!map || !isMapValid(map)) return;
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
		if (!map || !isMapValid(map)) return;

		if (checkPc()) {
			// TODO
			//github.com/maplibre/maplibre-gl-js/issues/4891
			map.panTo(lngLat, {
				duration: 300
			});
		}

		if (checkMobile()) {
			const container = map.getContainer();
			const containerHeight = container.clientHeight;

			// シンプルに固定オフセットを使用
			const offsetY = containerHeight / 4;

			map.panTo(lngLat, {
				offset: [0, -offsetY],
				duration: 300
			});
		}
	};

	const easeTo = (options: EaseToOptions) => {
		if (!map || !isMapValid(map)) return;
		map.easeTo(options);
	};

	const focusLayer = async (_entry: GeoDataEntry) => {
		if (!map || !isMapValid(map)) return;

		const padding = checkPc() ? 20 : 0;

		if (_entry.metaData.center) {
			// 中心座標が指定されている場合は、中心にズーム
			map.easeTo({
				center: _entry.metaData.center,
				zoom: _entry.metaData.minZoom + 1.5, // 最小ズームレベルに1.5を加える
				bearing: map.getBearing(),
				pitch: map.getPitch(),
				// padding: padding,
				duration: 500
			});
			return;
		} else {
			map.fitBounds(_entry.metaData.bounds, {
				bearing: map.getBearing(),
				// padding: padding,
				duration: 500
			});
		}
	};

	// フィーチャーをフォーカスするメソッド
	const focusFeature = async (feature: MapGeoJSONFeature) => {
		if (!map || !isMapValid(map)) return;
		const bbox = turfBbox(feature.geometry) as [number, number, number, number];

		map.fitBounds(bbox, {
			bearing: map.getBearing(),
			padding: 20,
			duration: 500
		});
	};

	const getSpriteUrl = (id: string): string | undefined => {
		if (!map || !isMapValid(map)) return;
		undefined;
		const sprite = map.getSprite();

		if (!sprite) {
			console.warn('Sprite is not available yet.');
			undefined;
		}

		const target = sprite.find((s) => s.id === id);

		if (target) {
			const url = target.url;
			return url;
		} else {
			console.warn(`Sprite with id ${id} not found.`);
			return undefined;
		}
	};

	// TODO: サイドバーの分をオフセット
	const getMapBounds = (): [number, number, number, number] => {
		if (!map || !isMapValid(map)) {
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
		if (!map || !isMapValid(map)) {
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
		if (!map || !isMapValid(map)) return;
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
		if (!map || !isMapValid(map)) return;
		const canvas = map.getCanvas();
		if (canvas) {
			canvas.style.cursor = cursor;
		}
	};

	const createEventSubscriber = <T>(store: Writable<T | undefined | null>) => {
		return (callback: (event: T) => void) => {
			return store.subscribe((event) => {
				if (event) callback(event);
			});
		};
	};

	const setData = (
		sourceId: string,
		geojsonData:
			| Feature<Geometry, GeoJsonProperties>
			| FeatureCollection<Geometry, GeoJsonProperties>
	) => {
		if (!map || !isMapValid(map)) return;
		const source = map.getSource(sourceId) as GeoJSONSource;
		if (source) {
			source.setData(geojsonData);
		} else {
			console.warn(`Source with ID ${sourceId} does not exist.`);
		}
	};

	const fitBounds = (bounds: LngLatBoundsLike, options?: maplibregl.FitBoundsOptions) => {
		if (!map || !isMapValid(map)) return;
		map.fitBounds(bounds, options);
	};

	const flyTo = (lngLat: LngLat, options?: AnimationOptions) => {
		if (!map || !isMapValid(map)) return;
		map.flyTo({ center: lngLat, ...options });
	};

	// インスタンス削除
	const remove = () => {
		if (!map || !isMapValid(map)) return;
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

	const setLayoutProperty = (
		layerId: string,
		name: string,
		value: any,
		options?: StyleSetterOptions
	) => {
		if (!map || !isMapValid(map)) return;
		try {
			if (map.getLayer(layerId)) {
				map.setLayoutProperty(layerId, name, value, options);
			} else {
				console.warn(`Layer with ID ${layerId} does not exist.`);
			}
		} catch (error) {
			console.error(`Error setting layout property for layer ${layerId}:`, error);
		}
	};

	const getLayer = (layerId: string) => {
		if (!map || !isMapValid(map)) return undefined;
		return map.getLayer(layerId);
	};

	const setCamera = (lngLat: maplibregl.LngLat) => {
		if (!map) return;

		// https://github.com/maplibre/maplibre-gl-js/issues/4688
		const elevation = map.queryTerrainElevation(lngLat);

		map.setCenterClampedToGround(false);
		map.setCenterElevation(elevation ?? 0);

		map._elevationStart = map._elevationTarget;
	};

	const resetCamera = () => {
		if (!map) return;

		map.setCenterClampedToGround(true); // 地形に中心点を吸着させる
		map.setCenterElevation(0);
		map._elevationStart = map._elevationTarget;
	};

	const setFeatureState = (feature: FeatureIdentifier, state: any) => {
		if (!map) return;
		map.setFeatureState(feature, state);
	};

	return {
		subscribe,
		// 処理
		init,
		isInitialized: () => get(initEvent),
		remove,
		addLockonMarker,
		removeLockonMarker,
		queryRenderedFeatures,
		setCursor,
		setData,
		setStyle,
		setFilter,
		setFeatureState,
		setLayoutProperty,
		setBearing: (bearing: number) => map?.setBearing(bearing),
		setPitch: (pitch: number) => map?.setPitch(pitch),
		setZoom: (zoom: number) => map?.setZoom(zoom),
		setCamera,
		resetCamera,
		fitBounds,
		panTo,
		panToPoi,
		flyTo,
		easeTo: (options: EaseToOptions) => easeTo(options),
		focusLayer,
		focusFeature,
		jumpToFac: jumpToFac,
		terrainReload: terrainReload, // 地形をリロードするメソッド
		toggleTerrain,
		resetDem: resetDem, // 地形をリセットするメソッド
		resetAllSourcesAndLayers: resetAllSourcesAndLayers, // ソースとレイヤーをリセットするメソッド

		// 取得
		getLockonMarker: () => lockOnMarker,
		getMap: () => map,
		getZoom: () => map?.getZoom(),
		getCenter: () => map?.getCenter(),
		getPitch: () => map?.getPitch(),
		getBearing: () => map?.getBearing(),
		getTerrain: () => map?.getTerrain(),
		getLayer,
		getState: () => get(state),
		getImage: (id: string) => map?.getImage(id),
		getMapBounds,
		getSpriteUrl,
		getCanvas: () => map?.getCanvas(),
		getMapContainer: getMapContainer, // マップコンテナを取得するメソッド

		// リスナー
		onSetStyle: createEventSubscriber(setStyleEvent), // スタイル設定イベントの購読用メソッド
		onResize: createEventSubscriber(resizeEvent), // リサイズイベントの購読用メソッド
		onload: createEventSubscriber(onLoadEvent), // onloadイベントの購読用メソッド
		onClick: createEventSubscriber(clickEvent), // クリックイベント
		onMouseover: createEventSubscriber(mouseoverEvent), // マウスオーバーイベントの購読用メソッド
		onMouseout: createEventSubscriber(mouseoutEvent), // マウスアウトイベントの購読用メソッド
		onMousemove: createEventSubscriber(mousemoveEvent), // マウスムーブイベントの購読用メソッド
		onMouseDown: createEventSubscriber(mousedownEvent), // マウスダウンイベントの購読用メソッド
		onMouseUp: createEventSubscriber(mouseupEvent), // マウスアップイベントの購読用メソッド
		onRotate: createEventSubscriber(rotateEvent), // 回転イベントの購読用メソッド
		onZoom: createEventSubscriber(zoomEvent), // ズームイベントの購読用メソッド
		onMooveEnd: createEventSubscriber(mooveEndEvent), // マップ移動イベントの購読用メソッド
		onLoading: createEventSubscriber(isLoadingEvent), // ローディングイベントの購読用メソッド
		onInitialized: createEventSubscriber(initEvent), // 初期化イベントの購読用メソッド
		onStyleLoad: createEventSubscriber(isStyleLoadEvent), // スタイルロードイベントの購読用メソッド
		onStateChange: state.subscribe // マップの状態を購読するメソッド
	};
};

export const mapStore = createMapStore();
