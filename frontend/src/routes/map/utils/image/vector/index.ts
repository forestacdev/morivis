import { MAP_SPRITE_DATA_PATH, MAP_FONT_DATA_PATH } from '$routes/constants';
import type { GeoDataEntry } from '$routes/map/data/types';
import type { TileXYZ } from '$routes/map/data/types/raster';
import * as tilebelt from '@mapbox/tilebelt';
import maplibregl from 'maplibre-gl';
import { createLayersItems } from '$routes/map/utils/layers';
import { createSourcesItems } from '$routes/map/utils/sources';
import { CoverImageManager } from '../index';
import { WEB_MERCATOR_WORLD_BBOX } from '$routes/map/data/location_bbox';

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
				attributionControl: false
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
const mapPool = new MapInstancePool(1); // 2つのMapインスタンス
const parallelQueue = new ParallelQueue(1); // 最大2つの並列処理

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
	const map = await mapPool.acquireInstance();

	return new Promise((resolve, reject) => {
		const mapBounds = xyz
			? tilebelt.tileToBBOX(Object.values(xyz) as [number, number, number])
			: bounds;

		map.setBearing(bearing);
		map.setPitch(pitch);
		map.fitBounds(mapBounds, {
			duration: 0
		});

		// Mapの設定
		map.setStyle(style);
		map.resize();

		// エラーハンドリング
		const errorHandler = (error: any) => {
			cleanup();
			mapPool.releaseInstance(map); // インスタンスを解放
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
						mapPool.releaseInstance(map); // インスタンスを解放

						if (!blob) {
							reject(new Error('Failed to generate blob'));
							return;
						}

						const fileName = `${name}.jpg`;
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
					'image/jpeg',
					1.0
				);
			} catch (error) {
				cleanup();
				mapPool.releaseInstance(map); // インスタンスを解放
				reject(error);
			}
		};

		const styledataHandler = () => {
			try {
				map.setBearing(bearing);
				map.setPitch(pitch);
				map.fitBounds(mapBounds, {
					duration: 0
				});

				// idle イベントで画像生成
				map.on('idle', generateImage);
			} catch (error) {
				cleanup();
				mapPool.releaseInstance(map); // インスタンスを解放
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

export const generateVectorImageUrl = async (_layerEntry: GeoDataEntry) => {
	const url = CoverImageManager.get(_layerEntry.id);
	if (url) return url;

	if (_layerEntry.metaData.xyzImageTile && _layerEntry.format.type === 'mvt') {
		const checkUrl = _layerEntry.format.url
			.replace('{z}', _layerEntry.metaData.xyzImageTile.z.toString())
			.replace('{x}', _layerEntry.metaData.xyzImageTile.x.toString())
			.replace('{y}', _layerEntry.metaData.xyzImageTile.y.toString());

		try {
			if (checkUrl) {
				const response = await fetch(checkUrl, {
					method: 'HEAD',
					mode: 'cors', // 明示的にCORSモードを指定
					headers: {
						Accept: '*/*'
					}
				});

				if (!response.ok) {
					throw new Error(`Tile URL fetch failed: ${response.status} - ${checkUrl}`);
				}
			} else {
				throw new Error('Invalid tile URL');
			}
		} catch (error) {
			console.error('Tile URL fetch failed:', error);
			// CORSエラーの場合は、タイルが存在すると仮定するか、
			// 別の検証方法を使用することを検討
			if (error.name === 'TypeError' && error.message.includes('CORS')) {
				console.warn('CORS error detected, skipping tile validation');
				// 必要に応じてここで代替処理
			} else {
				throw new Error(`Tile URL fetch failed: ${checkUrl} - ${error.message}`);
			}
		}
	}

	const minimumEntry = {
		..._layerEntry,
		metaData: {
			..._layerEntry.metaData,
			bounds: _layerEntry.metaData.xyzImageTile
				? tilebelt.tileToBBOX(
						Object.values(_layerEntry.metaData.xyzImageTile) as [number, number, number]
					)
				: _layerEntry.metaData.bounds,
			maxZoom: _layerEntry.metaData.xyzImageTile?.z ?? _layerEntry.metaData.maxZoom
		}
	} as GeoDataEntry;

	let sources = await createSourcesItems([minimumEntry], 'preview');
	const layers = await createLayersItems([minimumEntry], 'preview');

	const style: maplibregl.StyleSpecification = {
		version: 8,
		sprite: MAP_SPRITE_DATA_PATH,
		glyphs: MAP_FONT_DATA_PATH,
		sources: {
			// TODO 背景地図のみ処理を分離
			mierune_mono: {
				type: 'raster',
				tiles: ['https://tile.mierune.co.jp/mierune_mono/{z}/{x}/{y}.png'],
				tileSize: 256,
				minzoom: 0,
				maxzoom: minimumEntry.metaData.maxZoom ?? 18,
				bounds: _layerEntry.metaData.xyzImageTile
					? minimumEntry.metaData.bounds
					: WEB_MERCATOR_WORLD_BBOX,
				attribution:
					'<a href="https://mierune.co.jp">MIERUNE Inc.</a> <a href="https://www.openmaptiles.org/" target="_blank">&copy; OpenStreetMap contributors</a>'
			},
			...sources
		},
		layers: [
			{
				id: 'mierune_mono',
				type: 'raster',
				source: 'mierune_mono'
			},
			...layers
		]
	};

	const options: MapImageOptions = {
		name: _layerEntry.id,
		width: 512,
		height: 512,
		bearing: 0,
		pitch: 0,
		bounds: _layerEntry.metaData.bounds,
		timeout: 5000
	};

	if (_layerEntry.metaData.xyzImageTile) {
		options.xyz = _layerEntry.metaData.xyzImageTile;
	}

	const result = await generateMapImageDOM(style, options);

	CoverImageManager.add(_layerEntry.id, result.blobUrl);

	return result.blobUrl;
};

// クリーンアップ関数（必要に応じて呼び出す）
export function destroyMapPool() {
	mapPool.destroy();
}
