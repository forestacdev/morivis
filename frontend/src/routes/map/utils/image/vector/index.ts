import { MAP_SPRITE_DATA_PATH, MAP_FONT_DATA_PATH } from '$routes/constants';
import type { GeoDataEntry } from '$routes/map/data/types';
import type { TileXYZ } from '$routes/map/data/types/raster';
import * as tilebelt from '@mapbox/tilebelt';
import maplibregl from 'maplibre-gl';
import { createLayersItems } from '$routes/map/utils/layers';
import { createSourcesItems } from '$routes/map/utils/sources';
import { CoverImageManager } from '../index';

export const generateVectorImageUrl = async (_layerEntry: GeoDataEntry) => {
	const url = CoverImageManager.get(_layerEntry.id);
	if (url) {
		return { url };
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
	// Blob URL生成（クリーンアップが必要）
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
					'<a href="https://mierune.co.jp">MIERUNE Inc.</a> <a href="https://www.openmaptiles.org/" target="_blank">&copy; OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>'
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

	// Blob URLとクリーンアップ関数を返す
	return {
		url: result.blobUrl
	};
};

export interface MapImageOptions {
	name: string;
	width?: number;
	height?: number;
	center?: [number, number];
	zoom?: number;
	bearing?: number;
	pitch?: number;
	bounds?: maplibregl.LngLatBoundsLike; // nullを許容
	xyz?: TileXYZ;
	timeout?: number;
}

export interface MapImageResult {
	blobUrl: string;
	fileName: string;
	revokeBlobUrl: () => void;
}

const container = document.createElement('div');
container.style.width = `512px`;
container.style.height = `512px`;
container.style.position = 'absolute';
container.style.top = '-9999px';
container.style.left = '-9999px';
container.style.top = '0px';
container.style.left = '0px';
container.style.zIndex = '1000'; // 背景に配置
container.style.pointerEvents = 'none'; // クリックイベントを無視
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

// TODO : OffscreenCanvasを使用したMapLibre画像生成関数の実装
/**
 * DOM使用のMapLibre画像生成関数
 */
export async function generateMapImageDOM(
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
		// タイムアウト設定

		const mapBounds = xyz
			? tilebelt.tileToBBOX(Object.values(xyz) as [number, number, number])
			: bounds;

		map.setBearing(bearing);

		map.setPitch(pitch);

		map.fitBounds(mapBounds, {
			duration: 0 // アニメーションなし
		});

		// Mapの設定
		map.setStyle(style);
		map.resize();

		// エラーハンドリング
		const errorHandler = (error: any) => {
			reject(new Error(`Map error: ${error.error?.message || 'Unknown error'}`));
		};

		// エラーハンドリング
		map.on('error', (error) => {
			reject(new Error(`Map error: ${error.error?.message || 'Unknown error'}`));
		});

		// マップが完全に読み込まれたら画像を生成
		map.on('styledata', () => {
			try {
				map.setBearing(bearing);
				map.setPitch(pitch);
				map.fitBounds(mapBounds, {
					duration: 0
				});

				// idle イベントで画像生成（すべてのタイルが読み込まれるまで待つ）
				const generateImage = () => {
					try {
						const canvas = map.getCanvas();
						if (!canvas) {
							throw new Error('Canvas not found');
						}

						// 直接キャンバスから画像を生成
						canvas.toBlob(
							(blob) => {
								map.off('error', errorHandler);
								map.off('idle', generateImage);

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
						map.off('error', errorHandler);
						map.off('idle', generateImage);
						reject(error);
					}
				};

				// idle イベントで画像生成をトリガー
				map.on('idle', generateImage);
			} catch (error) {
				reject(error);
			}
		});

		// Maplibre GL JS のレンダリングをトリガー
		map.triggerRepaint();
	});
}
