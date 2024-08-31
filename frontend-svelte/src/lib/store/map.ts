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
import Worker from './worker?worker';

import { webglToPng } from '$lib/utils/image';
import { imageToIcon } from '$lib/utils/icon/index';

async function createRedSquareImageBitmap(size: number = 64): Promise<ImageBitmap> {
	const fileHeaderSize = 14;
	const infoHeaderSize = 40;
	const bytesPerPixel = 3; // 24-bit bitmap (3 bytes per pixel)
	const paddingPerRow = (4 - ((size * bytesPerPixel) % 4)) % 4;
	const imageSize = size * (bytesPerPixel + paddingPerRow) * size;
	const fileSize = fileHeaderSize + infoHeaderSize + imageSize;

	const buffer = new ArrayBuffer(fileSize);
	const view = new DataView(buffer);

	// Bitmap file header
	view.setUint16(0, 0x4d42, true); // Signature 'BM'
	view.setUint32(2, fileSize, true); // File size
	view.setUint32(6, 0, true); // Reserved
	view.setUint32(10, fileHeaderSize + infoHeaderSize, true); // Pixel data offset

	// Bitmap info header
	view.setUint32(14, infoHeaderSize, true); // Header size
	view.setInt32(18, size, true); // Image width
	view.setInt32(22, -size, true); // Image height (negative to indicate top-down bitmap)
	view.setUint16(26, 1, true); // Planes
	view.setUint16(28, bytesPerPixel * 8, true); // Bits per pixel
	view.setUint32(30, 0, true); // Compression (none)
	view.setUint32(34, imageSize, true); // Image size
	view.setInt32(38, 0, true); // Horizontal resolution (pixels per meter)
	view.setInt32(42, 0, true); // Vertical resolution (pixels per meter)
	view.setUint32(46, 0, true); // Colors in color table
	view.setUint32(50, 0, true); // Important color count

	// Bitmap pixel data (red square)
	let offset = fileHeaderSize + infoHeaderSize;
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			view.setUint8(offset, 0x00); // Blue component
			view.setUint8(offset + 1, 0x00); // Green component
			view.setUint8(offset + 2, 0xff); // Red component
			offset += bytesPerPixel;
		}
		offset += paddingPerRow; // Add padding bytes
	}

	// Convert ArrayBuffer to Blob
	const blob = new Blob([buffer], { type: 'image/bmp' });

	// Create an ImageBitmap from the Blob
	const imageBitmap = await createImageBitmap(blob);
	return imageBitmap;
}

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
