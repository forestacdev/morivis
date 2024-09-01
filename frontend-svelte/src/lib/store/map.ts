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
	CircleLayerSpecification
} from 'maplibre-gl';
import * as pmtiles from 'pmtiles';
import Worker from './worker?worker';

import { webglToPng } from '$lib/utils/image';
import { imageToIcon } from '$lib/utils/icon/index';

const protocol = new pmtiles.Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile);

const createMapStore = () => {
	let map: Map | null = null;
	let lockOnMarker: Marker | null = null;

	const { subscribe, set } = writable<Map | null>(null);
	const clickEvent = writable<MapMouseEvent | null>(null);
	const rotateEvent = writable<MapLibreEvent | null>(null);

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

		map.on('click', (e) => {
			clickEvent.set(e);
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

	return {
		subscribe,
		init,
		setStyle,
		addLockonMarker,
		removeLockonMarker,
		queryRenderedFeatures,
		panTo,
		easeTo,
		onClick: clickEvent.subscribe, // クリックイベントの購読用メソッド
		onRotate: rotateEvent.subscribe // 回転イベントの購読用メソッド
	};
};

export const mapStore = createMapStore();
