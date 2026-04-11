import type { GeoDataEntry } from '$routes/map/data/types';

import { generateVectorImageUrl } from './vector';
import { getRasterImageUrl, generatePmtilesImageUrl } from './raster';

/** BlobURLかどうかを判定 */
const isBlobUrl = (url: string): boolean => url.startsWith('blob:');

/**   画像の管理クラス */
export class CoverImageManager {
	private static readonly MAX_SIZE = 100;
	private static images: Map<string, string> = new Map();

	private static revokeIfBlob(url: string): void {
		if (isBlobUrl(url)) {
			URL.revokeObjectURL(url);
		}
	}

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
				const oldestUrl = this.images.get(oldestKey);
				this.images.delete(oldestKey);
				if (oldestUrl) {
					this.revokeIfBlob(oldestUrl);
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
		const url = this.images.get(id);
		if (url) {
			this.revokeIfBlob(url);
			this.images.delete(id);
		} else {
			console.warn(`Image with id ${id} does not exist.`);
		}
	}

	static clear(): void {
		this.images.forEach((url) => {
			this.revokeIfBlob(url);
		});
		this.images.clear();
	}

	static export(id: string): void {
		const url = this.get(id);
		if (url) {
			const a = document.createElement('a');
			a.href = url;
			a.download = `${id}.webp`;
			a.click();
		}
	}

	// 追加のユーティリティメソッド
	static size(): number {
		return this.images.size;
	}

	static getAll(): Map<string, string> {
		return new Map(this.images);
	}
}

// TODO 不要になる可能性あり
export class TileProxy {
	static toProxyUrl(originalUrl: string): string {
		if (import.meta.env.PROD) return originalUrl;

		try {
			// const url = new URL(originalUrl);
			// if (url.hostname === 'tiles.gsj.jp') {
			// 	return `/api/gsj${url.pathname}`;
			// }
		} catch (error) {
			console.warn('Invalid URL:', originalUrl);
		}
		return originalUrl;
	}
}

/** カバー画像のURLを取得する関数 */
export const getCoverImageUrl = (_layerEntry: GeoDataEntry): string | undefined => {
	return _layerEntry.metaData.coverImage ?? undefined;
};

/** 地図画像のURLを取得する関数 */
export const getMapImageUrl = (_layerEntry: GeoDataEntry): string | undefined => {
	return _layerEntry.metaData.mapImage ?? undefined;
};

// getLayerImage関数
// TODO: クリーンアップ関数不要？
export interface ImageResult {
	url: string;
	cleanup?: () => void;
}

/**
 * ダミーのプレースホルダー画像を生成する
 */
const generatePlaceholderImage = (label: string, color = '#495a54'): string => {
	const size = 128;
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext('2d');
	if (!ctx) return '';

	ctx.fillStyle = color;
	ctx.fillRect(0, 0, size, size);

	ctx.fillStyle = '#ffffff';
	ctx.font = 'bold 14px sans-serif';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText(label, size / 2, size / 2);

	return canvas.toDataURL('image/png');
};

const getMbtilesPreviewLabel = (_layerEntry: GeoDataEntry): string => {
	if (_layerEntry.type === 'vector') {
		const geometryType = _layerEntry.format.geometryType;
		if (geometryType === 'Point') return 'MBT Pt';
		if (geometryType === 'LineString') return 'MBT Ln';
		if (geometryType === 'Polygon') return 'MBT Pg';
		return 'MBTiles';
	}
	return 'MBTiles';
};

/**
 * レイヤーの画像URLを取得する関数
 * @param _layerEntry - レイヤーエントリ
 * @returns 画像URLまたはundefined
 */
export const getLayerImage = async (
	_layerEntry: GeoDataEntry
): Promise<ImageResult | undefined> => {
	try {
		if (_layerEntry.metaData.mapImage) {
			const url = getMapImageUrl(_layerEntry);
			return url ? { url } : undefined;
		} else if ('format' in _layerEntry && _layerEntry.format.type === 'mbtiles') {
			return { url: generatePlaceholderImage(getMbtilesPreviewLabel(_layerEntry), '#3d5a4f') };
		} else if (_layerEntry.type === 'raster') {
			if (_layerEntry.format.type === 'image') {
				const url = await getRasterImageUrl(_layerEntry);
				if (url) return { url };
				return { url: generatePlaceholderImage('Raster') };
			} else if (_layerEntry.format.type === 'pmtiles') {
				const url = await generatePmtilesImageUrl(_layerEntry);
				if (url) return { url };
				return { url: generatePlaceholderImage('PMTiles') };
			}
		} else if (_layerEntry.type === 'vector') {
			const url = await generateVectorImageUrl(_layerEntry);
			if (url) return { url };
			return { url: generatePlaceholderImage('Vector') };
		} else if (_layerEntry.type === 'model') {
			return { url: generatePlaceholderImage('3D', '#2a4a3a') };
		}

		return undefined;
	} catch (error) {
		console.error('Error getting layer image:', error);
		const label =
			_layerEntry.type === 'raster'
				? 'Raster'
				: _layerEntry.type === 'vector'
					? 'Vector'
					: _layerEntry.type === 'model'
						? '3D'
						: 'Data';
		return { url: generatePlaceholderImage(label) };
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
