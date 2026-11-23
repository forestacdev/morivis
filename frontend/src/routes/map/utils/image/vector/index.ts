import { MAP_FONT_DATA_PATH, MAP_SPRITE_DATA_PATH } from '$routes/constants';
import type { MorivisLayerEntry } from '$routes/map/data/types';
import type { TileXYZ } from '$routes/map/data/types/raster';
import { mbtilesProtocol } from '$routes/map/protocol/mbtiles';
import { esriFeatureProtocol } from '$routes/map/protocol/vector/esri-feature';
import { geojsonProtocol } from '$routes/map/protocol/vector/geojson';
import { ogcFeatureProtocol } from '$routes/map/protocol/vector/ogc-feature';
import { wfsFeatureProtocol } from '$routes/map/protocol/vector/wfs-feature';
import { createLayersItems } from '$routes/map/utils/layers';
import maplibregl from '$routes/map/utils/maplibre';
import { resolveAbsoluteRequestUrl, resolveRequestUrl } from '$routes/map/utils/platform/request';
import { createSourcesItems } from '$routes/map/utils/sources';
import { prepareSourceData } from '$routes/map/utils/sources/prepare';
import * as tilebelt from '@mapbox/tilebelt';
import { Protocol } from 'pmtiles';
import { CoverImageManager } from '../index';
import { generateVectorThumbnail } from './thumbnail-client';

export interface MapImageOptions {
	name: string;
	width?: number;
	height?: number;
	center?: [number, number];
	zoom?: number;
	bearing?: number;
	pitch?: number;
	bounds?: maplibregl.LngLatBoundsLike;
	xyz?: TileXYZ;
	timeout?: number;
}

export interface MapImageResult {
	blobUrl: string;
	fileName: string;
	revokeBlobUrl: () => void;
}

const previewPmtilesProtocol = new Protocol();
const previewMbtilesProtocol = mbtilesProtocol();
const previewGeojsonProtocol = geojsonProtocol('geojson');
const previewEsriFeatureProtocol = esriFeatureProtocol('esri-feature');
const previewOgcFeatureProtocol = ogcFeatureProtocol('ogc-feature');
const previewWfsFeatureProtocol = wfsFeatureProtocol('wfs-feature');
let previewProtocolsRegistered = false;

const ensurePreviewProtocols = () => {
	if (previewProtocolsRegistered) return;
	maplibregl.addProtocol('pmtiles', previewPmtilesProtocol.tile);
	maplibregl.addProtocol(previewMbtilesProtocol.protocolName, previewMbtilesProtocol.request);
	maplibregl.addProtocol(previewGeojsonProtocol.protocolName, previewGeojsonProtocol.request);
	maplibregl.addProtocol(
		previewEsriFeatureProtocol.protocolName,
		previewEsriFeatureProtocol.request
	);
	maplibregl.addProtocol(
		previewOgcFeatureProtocol.protocolName,
		previewOgcFeatureProtocol.request
	);
	maplibregl.addProtocol(
		previewWfsFeatureProtocol.protocolName,
		previewWfsFeatureProtocol.request
	);
	previewProtocolsRegistered = true;
};

// 複数のMapインスタンスを管理するクラス
class MapInstancePool {
	private instances: maplibregl.Map[] = [];
	private availableInstances: maplibregl.Map[] = [];
	private readonly maxInstances: number;

	constructor(maxInstances: number = 2) {
		this.maxInstances = maxInstances;
		this.initializeInstances();
	}

	private initializeInstances() {
		ensurePreviewProtocols();

		for (let i = 0; i < this.maxInstances; i++) {
			const container = document.createElement('div');
			container.style.width = '512px';
			container.style.height = '512px';
			container.style.position = 'absolute';

			container.style.top = '-9999px';
			container.style.left = '-9999px';
			container.style.visibility = 'hidden';

			container.id = `map-instance-${i}`;
			document.body.appendChild(container);

			const map = new maplibregl.Map({
				container,
				style: {
					version: 8,
					sources: {},
					layers: []
				},
				zoom: 0,
				interactive: false,
				attributionControl: false,
				transformRequest: (url) => {
					return { url: resolveRequestUrl(url) };
				}
			});

			this.instances.push(map);
			this.availableInstances.push(map);
		}
	}

	async acquireInstance(): Promise<maplibregl.Map> {
		return new Promise((resolve) => {
			const checkAvailable = () => {
				if (this.availableInstances.length > 0) {
					const instance = this.availableInstances.pop()!;
					resolve(instance);
				} else {
					// 100ms後に再チェック
					setTimeout(checkAvailable, 100);
				}
			};
			checkAvailable();
		});
	}

	releaseInstance(instance: maplibregl.Map) {
		this.availableInstances.push(instance);
	}

	destroy() {
		this.instances.forEach((instance) => {
			const container = instance.getContainer();
			instance.remove();
			container.remove();
		});
		this.instances = [];
		this.availableInstances = [];
	}
}

// 並列処理対応のキュー管理
class ParallelQueue {
	private queue: (() => Promise<any>)[] = [];
	private activeCount = 0;
	private readonly maxConcurrency: number;

	constructor(maxConcurrency: number = 1) {
		this.maxConcurrency = maxConcurrency;
	}

	async add<T>(task: () => Promise<T>): Promise<T> {
		return new Promise((resolve, reject) => {
			this.queue.push(async () => {
				try {
					const result = await task();
					resolve(result);
				} catch (error) {
					reject(error);
				}
			});
			this.processNext();
		});
	}

	private async processNext() {
		if (this.activeCount >= this.maxConcurrency || this.queue.length === 0) {
			return;
		}

		this.activeCount++;
		const task = this.queue.shift()!;

		try {
			await task();
		} catch (error) {
			console.error('Queue task error:', error);
		}

		this.activeCount--;
		this.processNext(); // 次のタスクを処理
	}
}

// インスタンスプールとキューを初期化
// 独自プロトコルやMLTの画像が必要になるまでWebGLコンテキストを作らない。
let mapPool: MapInstancePool | undefined;
const parallelQueue = new ParallelQueue(1);

/**
 * 並列処理対応のMapLibre画像生成関数（内部実装）
 */
async function _generateMapImageParallel(
	style: maplibregl.StyleSpecification | string,
	options = {} as MapImageOptions
): Promise<MapImageResult> {
	if (import.meta.env.DEV) {
		console.log('Generating map image with options:', options);
	}

	const {
		name,
		width = 512,
		height = 512,
		center,
		bearing = 0,
		pitch = 0,
		bounds,
		xyz,
		timeout = 10000
	} = options;

	// プールからMapインスタンスを取得
	const pool = mapPool ??= new MapInstancePool(1);
	const map = await pool.acquireInstance();

	return new Promise((resolve, reject) => {
		const mapBounds = xyz
			? tilebelt.tileToBBOX(Object.values(xyz) as [number, number, number])
			: bounds;

		map.setBearing(bearing);
		map.setPitch(pitch);
		map.fitBounds(mapBounds as [number, number, number, number], {
			duration: 0,
			animate: false
		});

		// Mapの設定
		map.setStyle(style);
		map.resize();

		// エラーハンドリング
		const errorHandler = (error: any) => {
			cleanup();
			pool.releaseInstance(map); // インスタンスを解放
			reject(new Error(`Map error: ${error.error?.message || 'Unknown error'}`));
		};

		// イベントリスナーをクリーンアップする関数
		const cleanup = () => {
			map.off('error', errorHandler);
			map.off('styledata', styledataHandler);
			map.off('idle', generateImage);
		};

		const generateImage = () => {
			try {
				const canvas = map.getCanvas();
				if (!canvas) {
					throw new Error('Canvas not found');
				}

				canvas.toBlob(
					(blob) => {
						cleanup();
						pool.releaseInstance(map); // インスタンスを解放

						if (!blob) {
							reject(new Error('Failed to generate blob'));
							return;
						}

						const fileName = `${name}.webp`;
						const blobUrl = URL.createObjectURL(blob);

						const revokeBlobUrl = () => {
							URL.revokeObjectURL(blobUrl);
						};

						const result: MapImageResult = {
							blobUrl,
							fileName,
							revokeBlobUrl
						};

						resolve(result);
					},
					'image/webp',
					1.0
				);
			} catch (error) {
				cleanup();
				pool.releaseInstance(map); // インスタンスを解放
				reject(error);
			}
		};

		const styledataHandler = () => {
			try {
				map.setBearing(bearing);
				map.setPitch(pitch);
				map.fitBounds(mapBounds as [number, number, number, number], {
					duration: 0,
					animate: false
				});

				// idle イベントで画像生成
				map.on('idle', generateImage);
			} catch (error) {
				cleanup();
				pool.releaseInstance(map); // インスタンスを解放
				reject(error);
			}
		};

		map.on('error', errorHandler);
		map.on('styledata', styledataHandler);

		map.triggerRepaint();
	});
}

/**
 * 並列処理対応のMapLibre画像生成関数
 */
export async function generateMapImageDOM(
	style: maplibregl.StyleSpecification | string,
	options = {} as MapImageOptions
): Promise<MapImageResult> {
	return parallelQueue.add(() => _generateMapImageParallel(style, options));
}

const pendingImages = new Map<string, Promise<string>>();

const renderVectorImage = async (_layerEntry: MorivisLayerEntry): Promise<string> => {
	const minimumEntry = {
		..._layerEntry,
		style: {
			..._layerEntry.style,
			opacity: 1.0
		},
		metaData: {
			..._layerEntry.metaData,
			bounds: _layerEntry.metaData.xyzImageTile
				? tilebelt.tileToBBOX(
					[
						_layerEntry.metaData.xyzImageTile.x,
						_layerEntry.metaData.xyzImageTile.y,
						_layerEntry.metaData.xyzImageTile.z
					]
				)
				: _layerEntry.metaData.bounds,
			maxZoom: _layerEntry.metaData.xyzImageTile?.z ?? _layerEntry.metaData.maxZoom
		}
	} as MorivisLayerEntry;

	const generationInput = {
		entries: [minimumEntry] as MorivisLayerEntry[],
		mode: 'preview',
		baseMap: null,
		showHillshade: false,
		showStreetView: false
	} as const;
	const prepared = await prepareSourceData(generationInput.entries);
	const sources = createSourcesItems({ ...generationInput, prepared });
	const { layers } = createLayersItems(generationInput);

	const style: maplibregl.StyleSpecification = {
		version: 8,
		sprite: resolveAbsoluteRequestUrl(MAP_SPRITE_DATA_PATH),
		glyphs: resolveAbsoluteRequestUrl(MAP_FONT_DATA_PATH),
		sources,
		layers: layers.filter((layer) => layer.type !== 'symbol')
	};

	if (
		[
			'geojson',
			'fgb',
			'mvt',
			'mlt',
			'pmtiles',
			'mbtiles',
			'geojsontile',
			'wfs-feature',
			'ogc-feature',
			'esri-feature'
		].includes(_layerEntry.format.type)
	) {
		return generateVectorThumbnail(style, minimumEntry.metaData.bounds);
	}

	const options: MapImageOptions = {
		name: _layerEntry.id,
		width: 512,
		height: 512,
		bearing: 0,
		pitch: 0,
		bounds: _layerEntry.metaData.bounds,
		timeout: 10000
	};

	if (_layerEntry.metaData.xyzImageTile) {
		options.xyz = _layerEntry.metaData.xyzImageTile;
	}

	const result = await generateMapImageDOM(style, options);

	return result.blobUrl;
};

export const generateVectorImageUrl = (_layerEntry: MorivisLayerEntry): Promise<string> => {
	const cachedUrl = CoverImageManager.get(_layerEntry.id);
	if (cachedUrl) return Promise.resolve(cachedUrl);
	const pending = pendingImages.get(_layerEntry.id);
	if (pending) return pending;

	const result = renderVectorImage(_layerEntry).then(url => {
		CoverImageManager.add(_layerEntry.id, url);
		return url;
	}).finally(() => pendingImages.delete(_layerEntry.id));
	pendingImages.set(_layerEntry.id, result);
	return result;
};

/** クリーンアップ関数（必要に応じて呼び出す） */
export const destroyMapPool = () => {
	mapPool?.destroy();
	mapPool = undefined;
};

/** 背景用画像のURLを取得 */
export const getBaseMapImageUrl = (_xyzImageTile: { x: number; y: number; z: number; }) => {
	return 'https://tile.openstreetmap.jp/styles/maptiler-toner-ja/512/{z}/{x}/{y}.png'
		.replace('{z}', _xyzImageTile.z.toString())
		.replace('{x}', _xyzImageTile.x.toString())
		.replace('{y}', _xyzImageTile.y.toString());
};
