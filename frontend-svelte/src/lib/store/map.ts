// stores/mapStore.js
import { writable } from 'svelte/store';
import maplibregl from 'maplibre-gl';
import type {
	Map,
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
	SymbolLayerSpecification
} from 'maplibre-gl';
import * as pmtiles from 'pmtiles';
import Worker from './worker?worker';

import { webglToPng } from '$lib/utils/image';
import { imageToIcon } from '$lib/utils/icon/index';
import type { LayerEntry } from '$lib/data/types';
import { lineEntries } from '../data/vecter/line';
import { onLog } from 'firebase/app';

const protocol = new pmtiles.Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile);

const createMapStore = () => {
	let map: Map | null = null;
	let lockOnMarker: Marker | null = null;

	const { subscribe, set } = writable<Map | null>(null);
	const clickEvent = writable<MapMouseEvent | null>(null);
	const rotateEvent = writable<MapLibreEvent | null>(null);
	const isLoadingEvent = writable<boolean>(true);

	const init = (mapContainer: HTMLElement, mapStyle: StyleSpecification) => {
		map = new maplibregl.Map({
			container: mapContainer,
			style: mapStyle,
			center: [136.923004009, 35.5509525769706],
			zoom: 14.5,
			// maxZoom: 18,
			maxBounds: [135.120849, 33.93533, 139.031982, 37.694841]
		});

		if (!map) return;
		set(map);

		map.addControl(new maplibregl.NavigationControl(), 'top-right');
		// 3D地形コントロール
		map.addControl(
			new maplibregl.TerrainControl({
				source: 'terrain',
				exaggeration: 1
			}),
			'top-right'
		);

		map.addControl(new maplibregl.ScaleControl(), 'bottom-right');

		map.on('click', (e) => {
			clickEvent.set(e);
		});

		map.on('data', function (e) {
			//your code here
			isLoadingEvent.set(true);
			console.log(e);
		});

		map.on('idle', function (e) {
			//your code here
			isLoadingEvent.set(false);
			console.log(e);
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

		map.on('styleimagemissing', async (e) => {
			if (!map) return;
			const id = e.id;

			try {
				const pattern = id;
				const parts = pattern.split('-');

				if (parts[0] === 'pattern') {
					// const number = parseInt(parts[1], 10);
					// try {
					// 	const webglImage = await webglToPng(number);
					// 	const image = await map.loadImage(webglImage);
					// 	console.log(image);
					// 	if (!map.hasImage(id)) {
					// 		map.addImage(id, image.data);
					// 	}
					// } catch (error) {
					// 	console.error(`Error loading image for category ${id}:`, error);
					// }
				} else {
					const imageSrc = id;
					const webglImage = await imageToIcon(imageSrc);
					if (!map.hasImage(id)) {
						map.addImage(id, webglImage, { pixelRatio: 1 });
					}
				}
			} catch (error) {
				console.error(`Error loading image for category ${id}:`, error);
			}
		});

		// const worker = new Worker();
		// maplibregl.addProtocol('gsidem', async (params, abortController) => {
		// 	const imageUrl = params.url.replace('gsidem://', '');
		// 	return new Promise((resolve, reject) => {
		// 		const handleMessage = (e: MessageEvent) => {
		// 			if (e.data.id === imageUrl) {
		// 				if (e.data.buffer.byteLength === 0) {
		// 					reject({
		// 						data: new Uint8Array(0)
		// 					});
		// 				} else {
		// 					const arrayBuffer = e.data.buffer;
		// 					resolve({
		// 						data: new Uint8Array(arrayBuffer)
		// 					});
		// 				}
		// 				cleanup();
		// 			}
		// 		};

		// 		const handleError = (e: ErrorEvent) => {
		// 			console.error(e);
		// 			abortController.abort();
		// 			reject({
		// 				data: new Uint8Array(0)
		// 			});
		// 			cleanup();
		// 		};

		// 		const cleanup = () => {
		// 			worker.removeEventListener('message', handleMessage);
		// 			worker.removeEventListener('error', handleError);
		// 		};

		// 		worker.addEventListener('message', handleMessage);
		// 		worker.addEventListener('error', handleError);
		// 		worker.postMessage({ url: imageUrl });
		// 	});
		// });
	};

	// マップスタイルを設定するメソッド
	const setStyle = (style: StyleSpecification) => {
		if (!map) return;
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

	// プレビューレイヤーを追加するメソッド
	const addPreviewLayer = (layerEntry: LayerEntry) => {
		if (!map) return;
		const sourceId = `preview_source`;
		const sourceItems: Record<string, SourceSpecification> = {};

		if (layerEntry.type === 'raster') {
			sourceItems[sourceId] = {
				type: 'raster',
				tiles: [layerEntry.path],
				maxzoom: layerEntry.source_maxzoom ? layerEntry.source_maxzoom : 24,
				minzoom: layerEntry.source_minzoom ? layerEntry.source_minzoom : 0,
				tileSize: 256,
				attribution: layerEntry.attribution
			};
		} else if (
			layerEntry.type === 'vector-polygon' ||
			layerEntry.type === 'vector-line' ||
			layerEntry.type === 'vector-point' ||
			layerEntry.type === 'vector-label'
		) {
			sourceItems[sourceId] = {
				type: 'vector',
				tiles: [layerEntry.path],
				maxzoom: layerEntry.source_maxzoom ? layerEntry.source_maxzoom : 24,
				minzoom: layerEntry.source_minzoom ? layerEntry.source_minzoom : 0,
				attribution: layerEntry.attribution,
				promoteId: layerEntry.id_field ?? undefined
			};
		} else if (
			layerEntry.type === 'geojson-polygon' ||
			layerEntry.type === 'geojson-line' ||
			layerEntry.type === 'geojson-point' ||
			layerEntry.type === 'geojson-label'
		) {
			sourceItems[sourceId] = {
				type: 'geojson',
				data: layerEntry.path,
				generateId: true,
				attribution: layerEntry.attribution
			};
		} else {
			console.warn(`Unknown layer type: ${layerEntry.type}`);
		}
		if (map.getLayer('preview_layer')) map.removeLayer('preview_layer');
		if (map.getSource(sourceId)) map.removeSource(sourceId);
		map.addSource(sourceId, sourceItems[sourceId]);

		const layerId = `preview_layer`;

		const layerItems: LayerSpecification[] = [];

		switch (layerEntry.type) {
			// ラスターレイヤー
			case 'raster': {
				layerItems.push({
					id: layerId,
					type: 'raster',
					source: sourceId,
					maxzoom: layerEntry.layer_maxzoom ? layerEntry.layer_maxzoom : 24,
					minzoom: layerEntry.layer_minzoom ? layerEntry.layer_minzoom : 0,
					paint: {
						'raster-opacity': layerEntry.opacity,
						...(layerEntry.style?.raster?.[0]?.paint ?? {})
					}
				});
				break;
			}
			// ベクトルタイル ポリゴンレイヤー
			case 'vector-polygon': {
				const styleKey = layerEntry.style_key;
				const setStyele = layerEntry.style?.fill?.find((item) => item.name === styleKey);
				const layer = {
					id: layerId,
					type: 'fill',
					source: sourceId,
					'source-layer': layerEntry.source_layer,
					maxzoom: 24,
					minzoom: 0,
					paint: {
						'fill-opacity': layerEntry.show_fill ? layerEntry.opacity : 0,
						'fill-outline-color': '#00000000',
						...setStyele?.paint
					},
					layout: {
						...(setStyele?.layout ?? {})
					}
				} as LayerSpecification;

				layerItems.push(layer);

				break;
			}
			// ベクトルタイル ラインレイヤー
			case 'vector-line': {
				const setStyele = layerEntry.style?.line?.find(
					(item) => item.name === layerEntry.style_key
				);

				const layer = {
					id: layerId,
					type: 'line',
					source: sourceId,
					'source-layer': layerEntry.source_layer,
					maxzoom: 24,
					minzoom: 0,
					paint: {
						'line-opacity': layerEntry.opacity,
						...(layerEntry.style?.line?.[0]?.paint ?? {})
					},
					layout: {
						...(layerEntry.style?.line?.[0]?.layout ?? {})
					}
				} as LayerSpecification;

				layerItems.push(layer);

				break;
			}
			// ベクトルタイル ポイントレイヤー
			case 'vector-point': {
				const setStyele = layerEntry.style?.circle?.find(
					(item) => item.name === layerEntry.style_key
				);

				const layer = {
					id: layerId,
					type: 'circle',
					source: sourceId,
					'source-layer': layerEntry.source_layer,
					maxzoom: 24,
					minzoom: 0,
					paint: {
						'circle-opacity': layerEntry.opacity,
						...(layerEntry.style?.circle?.[0]?.paint ?? {})
					},
					layout: {
						...(layerEntry.style?.circle?.[0]?.layout ?? {})
					}
				} as CircleLayerSpecification;

				layerItems.push(layer);
				// layerIdNameDict[layerId] = layerEntry.name;

				break;
			}

			// GeoJSON ポリゴンレイヤー
			case 'geojson-polygon': {
				const styleKey = layerEntry.style_key;
				const setStyele = layerEntry.style?.fill?.find((item) => item.name === styleKey);

				const layer = {
					id: layerId,
					type: 'fill',
					source: sourceId,
					paint: {
						'fill-opacity': layerEntry.show_fill ? layerEntry.opacity : 0,
						'fill-outline-color': '#00000000',
						...setStyele?.paint
					},
					layout: {
						...(setStyele?.layout ?? {})
					}
					// filter: ['==', ['id'], 1]
				} as FillLayerSpecification;

				if (layerEntry.filter) layer.filter = layerEntry.filter;

				layerItems.push(layer);
				// layerIdNameDict[layerId] = layerEntry.name;
				const index = layerEntry.style?.line?.findIndex(
					(item) => item.name === styleKey
				) as number;

				break;
			}
			// GeoJSON ラインレイヤー
			case 'geojson-line': {
				layerItems.push({
					id: layerId,
					type: 'line',
					source: sourceId,
					paint: {
						'line-opacity': layerEntry.opacity,
						...(layerEntry.style?.line?.[0]?.paint ?? {})
					},
					layout: {
						...(layerEntry.style?.line?.[0]?.layout ?? {})
					}
				});

				break;
			}
			// GeoJSON ポイントレイヤー
			case 'geojson-point': {
				layerItems.push({
					id: layerId,
					type: 'circle',
					source: sourceId,
					paint: {
						'circle-opacity': layerEntry.opacity,
						...(layerEntry.style?.circle?.[0]?.paint ?? {})
					},
					layout: {
						...(layerEntry.style?.circle?.[0]?.layout ?? {})
					}
				});

				break;
			}
			// GeoJSON ラベルレイヤー
			case 'geojson-label': {
				layerItems.push({
					id: layerId,
					type: 'symbol',
					source: sourceId,
					paint: {
						'text-opacity': layerEntry.opacity,
						'icon-opacity': layerEntry.opacity,
						...(layerEntry.style?.symbol?.[0]?.paint ?? {})
					},
					layout: {
						...(layerEntry.style?.symbol?.[0]?.layout ?? {})
					}
				});

				break;
			}

			default:
				console.warn(`Unknown layer type: ${layerEntry.type}`);
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

	return {
		subscribe,
		init,
		setStyle,
		addLockonMarker,
		removeLockonMarker,
		queryRenderedFeatures,
		panTo,
		easeTo,
		addPreviewLayer,
		onClick: clickEvent.subscribe, // クリックイベントの購読用メソッド
		onRotate: rotateEvent.subscribe, // 回転イベントの購読用メソッド
		onLoading: isLoadingEvent.subscribe // ローディングイベントの購読用メソッド
	};
};

export const mapStore = createMapStore();
