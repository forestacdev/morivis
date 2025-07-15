import { MAP_SPRITE_DATA_PATH, MAP_FONT_DATA_PATH } from '$routes/constants';
import type { GeoDataEntry } from '$routes/map/data/types';
import type { TileXYZ } from '$routes/map/data/types/raster';
import * as tilebelt from '@mapbox/tilebelt';
import maplibregl from 'maplibre-gl';
import { createLayersItems } from '$routes/map/utils/layers';
import { createSourcesItems } from '$routes/map/utils/sources';
import { CoverImageManager } from '../index';

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

// シンプルなキュー管理
class SimpleQueue {
	private queue: (() => Promise<any>)[] = [];
	private isProcessing = false;

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
		if (this.isProcessing || this.queue.length === 0) {
			return;
		}

		this.isProcessing = true;
		const task = this.queue.shift()!;

		try {
			await task();
		} catch (error) {
			console.error('Queue task error:', error);
		}

		this.isProcessing = false;
		this.processNext(); // 次のタスクを処理
	}
}

// キューインスタンス
const imageQueue = new SimpleQueue();

const container = document.createElement('div');
container.style.width = `512px`;
container.style.height = `512px`;
container.style.position = 'absolute';
container.style.top = '-9999px';
container.style.left = '-9999px';
// container.style.top = '0px';
// container.style.left = '0px';
// container.style.zIndex = '1000';
// container.style.pointerEvents = 'none';
document.body.appendChild(container);

// Mapインスタンスを作成
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

/**
 * DOM使用のMapLibre画像生成関数（内部実装）
 */
async function _generateMapImageDOM(
	style: maplibregl.StyleSpecification | string,
	options = {} as MapImageOptions
): Promise<MapImageResult> {
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
				reject(error);
			}
		};

		map.on('error', errorHandler);
		map.on('styledata', styledataHandler);

		map.triggerRepaint();
	});
}

/**
 * キュー管理付きのDOM使用MapLibre画像生成関数
 */
export async function generateMapImageDOM(
	style: maplibregl.StyleSpecification | string,
	options = {} as MapImageOptions
): Promise<MapImageResult> {
	return imageQueue.add(() => _generateMapImageDOM(style, options));
}

export const generateVectorImageUrl = async (_layerEntry: GeoDataEntry) => {
	const url = CoverImageManager.get(_layerEntry.id);
	if (url) return url;

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
			mierune_mono: {
				type: 'raster',
				tiles: ['https://tile.mierune.co.jp/mierune_mono/{z}/{x}/{y}.png'],
				tileSize: 256,
				minzoom: 0,
				maxzoom: minimumEntry.metaData.maxZoom ?? 18,
				bounds: minimumEntry.metaData.bounds,
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
