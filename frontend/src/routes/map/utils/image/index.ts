import { createSourcesItems } from '$routes/map/utils/sources';

import type { GeoDataEntry } from '$routes/map/data/types';

import { createLayersItems } from '$routes/map/utils/layers';
import { generateMapImageDOM, generateMapImageOptimized, type MapImageOptions } from './vector';
import { getRasterImageUrl, generatePmtilesImageUrl } from './raster';
import * as tilebelt from '@mapbox/tilebelt';
import { MAP_FONT_DATA_PATH, MAP_SPRITE_DATA_PATH } from '$routes/constants';
/**   画像の管理クラス */
class CoverImageManager {
	private static readonly MAX_SIZE = 100;
	private static images: Map<string, string> = new Map();

	static add(id: string, url: string): void {
		if (this.images.has(id)) {
			console.warn(`Image with id ${id} already exists. Overwriting.`);
			// 既存のエントリを削除して最新の位置に移動
			this.images.delete(id);
		}

		// サイズ制限チェック
		if (this.images.size >= this.MAX_SIZE) {
			// 最も古いエントリ（最初のエントリ）を削除
			const oldestKey = this.images.keys().next().value;
			if (oldestKey) {
				const oldestUrl = this.images.get(oldestKey); // 先に取得
				this.images.delete(oldestKey); // 削除
				if (oldestUrl) {
					URL.revokeObjectURL(oldestUrl); // クリーンアップ
				}
			}
		}

		this.images.set(id, url);
	}

	static get(id: string): string | undefined {
		const url = this.images.get(id);
		if (url) {
			// LRU: アクセスされたアイテムを最新位置に移動
			this.images.delete(id);
			this.images.set(id, url);
		}
		return url;
	}

	static has(id: string): boolean {
		return this.images.has(id);
	}

	static remove(id: string): void {
		if (this.images.has(id)) {
			this.images.delete(id);
		} else {
			console.warn(`Image with id ${id} does not exist.`);
		}
	}

	static clear(): void {
		// 全てのBlobURLをクリーンアップ
		this.images.forEach((url) => {
			URL.revokeObjectURL(url);
		});
		this.images.clear();
	}

	// 追加のユーティリティメソッド
	static size(): number {
		return this.images.size;
	}

	static getAll(): Map<string, string> {
		return new Map(this.images);
	}
}

export class TileProxy {
	static toProxyUrl(originalUrl: string): string {
		if (import.meta.env.PROD) return originalUrl;

		try {
			const url = new URL(originalUrl);
			if (url.hostname === 'tiles.gsj.jp') {
				return `/api/gsj${url.pathname}`;
			}
		} catch (error) {
			console.warn('Invalid URL:', originalUrl);
		}
		return originalUrl;
	}
}

const getCoverImageUrl = (_layerEntry: GeoDataEntry): string | undefined => {
	return _layerEntry.metaData.coverImage ?? undefined;
};

// getLayerImage関数
// TODO: クリーンアップ関数不要？
export interface ImageResult {
	url: string;
	cleanup?: () => void;
}

/**
 * レイヤーの画像URLを取得する関数
 * @param _layerEntry - レイヤーエントリ
 * @returns 画像URLまたはundefined
 */
export const getLayerImage = async (
	_layerEntry: GeoDataEntry
): Promise<ImageResult | undefined> => {
	try {
		if (_layerEntry.metaData.coverImage) {
			// カバー画像が指定されている場合はそれを使用
			const url = getCoverImageUrl(_layerEntry);
			return url ? { url } : undefined;
		} else if (_layerEntry.type === 'raster') {
			// タイプとフォーマットによる分岐
			if (_layerEntry.format.type === 'image') {
				// TODO クリーンアップ
				const url = await getRasterImageUrl(_layerEntry);
				return url ? { url } : undefined;
			} else if (_layerEntry.format.type === 'pmtiles') {
				// TODO クリーンアップ
				const url = await generatePmtilesImageUrl(_layerEntry);
				return url ? { url } : undefined;
			}
		} else if (_layerEntry.type === 'vector') {
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
						// bounds: minimumEntry.metaData.bounds,
						attribution:
							'<a href="https://mierune.co.jp">MIERUNE Inc.</a> <a href="https://www.openmaptiles.org/" target="_blank">&copy; OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>'
					},
					...sources
				},
				layers: [
					{
						id: 'mierune_mono',
						type: 'raster',
						source: 'mierune_mono',
						paint: {
							'raster-opacity': 0.6
						}
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

			const result = await generateMapImageOptimized(style, options);

			CoverImageManager.add(_layerEntry.id, result.blobUrl);

			// Blob URLとクリーンアップ関数を返す
			return {
				url: result.blobUrl
			};
		} else {
			// それ以外のタイプは未対応
			console.warn(`Unsupported layer type: ${_layerEntry.type}`);
			return undefined;
		}
	} catch (error) {
		console.error('Error getting layer image:', error);
		throw error;
	}
};

// ImageBitmapをPNG形式でダウンロードする関数 ImageBitmap
export const downloadImageBitmapAsPNG = (imageBitmap: ImageBitmap, filename: string) => {
	// 1. canvasに描画
	const canvas = document.createElement('canvas');
	canvas.width = imageBitmap.width;
	canvas.height = imageBitmap.height;

	const ctx = canvas.getContext('2d');
	if (!ctx) return;

	ctx.drawImage(imageBitmap, 0, 0);

	// 2. PNGとしてBlob化して保存
	canvas.toBlob((blob) => {
		if (!blob) return;

		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();

		// クリーンアップ
		URL.revokeObjectURL(url);
	}, 'image/png');
};
