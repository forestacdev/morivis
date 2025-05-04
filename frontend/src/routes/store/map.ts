// stores/mapStore.js
import { writable } from 'svelte/store';
import maplibregl from 'maplibre-gl';
import type {
	StyleSpecification,
	LngLat,
	AnimationOptions,
	EaseToOptions,
	SourceSpecification,
	LayerSpecification,
	TerrainSpecification,
	Popup,
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
import { propData } from '$routes/data/propData';

import { getLocationBbox } from '$routes/data/locationBbox';

import turfBbox from '@turf/bbox';
import { setMapParams, getMapParams, getParams } from '$routes/utils/params';
import { DEBUG_MODE, isTerrain3d } from '$routes/store';
import type { GeoDataEntry } from '$routes/data/types';
import { GeojsonCache } from '$routes/utils/geojson';
import { get } from 'svelte/store';

import { isBBoxOverlapping } from '$routes/utils/map';

import { demProtocol } from '$routes/protocol/raster';
import { tileIndexProtocol } from '$routes/protocol/vector/tileindex';
import { terrainProtocol } from '$routes/protocol/terrain';

import { downloadImageBitmapAsPNG } from '$routes/utils/image';
import { demEntry, type DemEntry } from '$routes/data/dem';
import { handleStyleImageMissing } from '$routes/utils/icon';

const pmtilesProtocol = new Protocol();
maplibregl.addProtocol('pmtiles', pmtilesProtocol.tile);

const webgl = demProtocol('webgl');
maplibregl.addProtocol(webgl.protocolName, webgl.request);

const terrain = terrainProtocol('terrain');
maplibregl.addProtocol(terrain.protocolName, terrain.request);

const tileIndex = tileIndexProtocol('tile_index');
maplibregl.addProtocol(tileIndex.protocolName, tileIndex.request);

const createMapStore = () => {
	let lockOnMarker: Marker | null = null;
	let map: maplibregl.Map | null = null;
	let popup: Popup | null = null;

	const { subscribe, set } = writable<maplibregl.Map | null>(null);
	const clickEvent = writable<MapMouseEvent | null>(null);
	const mouseoverEvent = writable<MapMouseEvent | null>(null);
	const mouseoutEvent = writable<MapMouseEvent | null>(null);
	const rotateEvent = writable<number | null>(null);
	const zoomEvent = writable<number | null>(null);
	const setStyleEvent = writable<StyleSpecification | null>(null);
	const isLoadingEvent = writable<boolean>(true);
	const mooveEndEvent = writable<MapLibreEvent | null>(null);
	const initEvent = writable<maplibregl.Map | null>(null);

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
			// preserveDrawingBuffer: true, // スクリーンショットを撮るために必要
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
		map.on('mouseover', (e) => {
			mouseoverEvent.set(e);
		});

		// 地図からマウスが離れた時のイベント
		map.on('mouseout', (e) => {
			mouseoutEvent.set(e);
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

		// Process for generating missing icons
		map.on('styleimagemissing', (e) => handleStyleImageMissing(e, map));

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

	const resetDem = () => {
		if (!map) return;
		map.setTerrain(null);
		map.removeSource('terrain');

		terrain.cancelAllRequests();

		map.addSource('terrain', {
			type: 'raster-dem',
			tiles: [`${terrain.protocolName}://${demEntry.url}?demType=${demEntry.demType}`],
			tileSize: 256,
			minzoom: demEntry.sourceMinZoom,
			maxzoom: demEntry.sourceMaxZoom,
			attribution: demEntry.attribution,
			bounds: demEntry.bbox
		});

		map.setTerrain({
			source: 'terrain',
			exaggeration: 1
		});

		const bbox = demEntry.bbox;
		if (!bbox) return;

		const bounds = map.getBounds().toArray();

		const zoom = map.getZoom();

		if (
			!isBBoxOverlapping(demEntry.bbox, [...bounds[0], ...bounds[1]] as [
				number,
				number,
				number,
				number
			])
		) {
			map.fitBounds(bbox, {
				padding: 100,
				duration: 300,
				bearing: map.getBearing()
			});
		}

		// if (zoom < demEntry.sourceMinZoom || zoom > demEntry.sourceMaxZoom) {
		// 	map.setZoom(demEntry.sourceMaxZoom - 1.5);
		// }
		resetAllSourcesAndLayers();
		terrainReload();
	};

	return {
		subscribe,
		init,
		setStyle,
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
		panTo,
		easeTo: (options: EaseToOptions) => easeTo(options),
		addSearchFeature,
		focusLayer,
		focusFeature,
		onSetStyle: setStyleEvent.subscribe,
		getTerrain: () => map?.getTerrain(),
		getBounds: getBounds,
		onClick: clickEvent.subscribe, // クリックイベントの購読用メソッド
		onMouseover: mouseoverEvent.subscribe, // マウスオーバーイベントの購読用メソッド
		onMouseout: mouseoutEvent.subscribe, // マウスアウトイベントの購読用メソッド
		onRotate: rotateEvent.subscribe, // 回転イベントの購読用メソッド
		onZoom: zoomEvent.subscribe, // ズームイベントの購読用メソッド
		onMooveEnd: mooveEndEvent.subscribe, // マップ移動イベントの購読用メソッド
		onLoading: isLoadingEvent.subscribe, // ローディングイベントの購読用メソッド
		onInitialized: initEvent.subscribe, // 初期化イベントの購読用メソッド
		terrainReload: terrainReload, // 地形をリロードするメソッド
		resetDem: resetDem, // 地形をリセットするメソッド
		resetAllSourcesAndLayers: resetAllSourcesAndLayers, // ソースとレイヤーをリセットするメソッド
		getMapContainer: getMapContainer // マップコンテナを取得するメソッド
	};
};

export const mapStore = createMapStore();
