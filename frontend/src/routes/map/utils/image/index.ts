import { getImagePmtiles } from '$routes/map/utils/raster';
import { convertTmsToXyz, createSourcesItems } from '$routes/map/utils/sources';
import { xyzToWMSXYZ } from '$routes/map/utils/tile';

import { IMAGE_TILE_XYZ } from '$routes/constants';
import type { GeoDataEntry, AnyRasterEntry, AnyVectorEntry } from '$routes/map/data/types';
import { DEM_DATA_TYPE, type DemDataTypeKey } from '$routes/map/data/dem';
import { createLayersItems } from '$routes/map/utils/layers';
import { generateMapImageDOM, type MapImageOptions, type MapImageResult } from './vector';

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

// TODO クリーンアップ
// raster + image タイプの処理
const getRasterImageUrl = async (_layerEntry: AnyRasterEntry): Promise<string | undefined> => {
	// xyz タイル情報を取得
	let tile = _layerEntry.metaData.xyzImageTile ?? IMAGE_TILE_XYZ;

	// urlに{-y} が含まれている場合は、タイル座標を WMS タイル座標に変換
	if (_layerEntry.format.url.includes('{-y}')) {
		tile = xyzToWMSXYZ(tile);
	}

	// URLを生成
	const url = convertTmsToXyz(_layerEntry.format.url)
		.replace('{z}', tile.z.toString())
		.replace('{x}', tile.x.toString())
		.replace('{y}', tile.y.toString());

	// URLを生成して返す

	if (_layerEntry.style.type === 'dem') {
		const demType = _layerEntry.style.visualization.demType as DemDataTypeKey;

		if (demType) {
			const convertUrl = await generateDemCoverImage(url, demType);

			return convertUrl;
		}
	} else {
		return url;
	}
};

const generatePmtilesImageUrl = async (
	_layerEntry: AnyRasterEntry
): Promise<string | undefined> => {
	const tile = _layerEntry.metaData.xyzImageTile ?? IMAGE_TILE_XYZ;
	return await getImagePmtiles(_layerEntry.format.url, tile);
};

const getCoverImageUrl = (_layerEntry: GeoDataEntry): string | undefined => {
	return _layerEntry.metaData.coverImage ?? undefined;
};

// getLayerImage関数の修正版
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
			// Blob URL生成（クリーンアップが必要）
			const sources = await createSourcesItems([_layerEntry], 'preview');
			const layers = await createLayersItems([_layerEntry], 'preview');

			const style: maplibregl.StyleSpecification = {
				version: 8,
				sprite: 'https://gsi-cyberjapan.github.io/optimal_bvmap/sprite/std',
				glyphs: 'https://tile.openstreetmap.jp/fonts/{fontstack}/{range}.pbf',
				sources: {
					mierune_mono: {
						type: 'raster',
						tiles: ['https://tile.mierune.co.jp/mierune_mono/{z}/{x}/{y}.png'],
						tileSize: 256,
						minzoom: 0,
						maxzoom: 18,
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
				timeout: 5000
			};

			if (_layerEntry.metaData.center) {
				options.center = _layerEntry.metaData.center;
				options.zoom = _layerEntry.metaData.minZoom;
			} else {
				options.bounds = _layerEntry.metaData.bounds;
			}

			const result = await generateMapImageDOM(style, options);

			// Blob URLとクリーンアップ関数を返す
			return {
				url: result.blobUrl,
				cleanup: result.revokeBlobUrl
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

const loadImageToBitmap = async (imageUrl: string): Promise<ImageBitmap> => {
	try {
		const finalUrl = TileProxy.toProxyUrl(imageUrl);
		const response = await fetch(finalUrl);

		if (!response.ok) {
			throw new Error(`Failed to fetch image: ${response.statusText}`);
		}
		const blob = await response.blob();
		return await createImageBitmap(blob);
	} catch (error) {
		console.error('Error loading image to bitmap:', error);
		throw error; // エラーを再投げして呼び出し元で処
	}
};

// demデータ用のカバー画像を作成
export const generateDemCoverImage = async (
	imageUrl: string,
	demType: DemDataTypeKey
): Promise<string> => {
	const demTypeNumber = DEM_DATA_TYPE[demType as DemDataTypeKey];
	const id = crypto.randomUUID();

	try {
		// Promiseを解決してからWorkerに送信
		const image = await loadImageToBitmap(imageUrl);
		const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

		return new Promise((resolve, reject) => {
			worker.postMessage({
				id,
				image, // ← 今度はImageBitmapオブジェクト
				demTypeNumber
			});

			worker.onmessage = (e) => {
				const { responseId, blob, error } = e.data;
				if (responseId === id) {
					if (error) {
						reject(new Error(error));
					} else {
						resolve(URL.createObjectURL(blob));
					}
				}

				worker.terminate(); // Workerを終了
			};
		});
	} catch (error) {
		throw new Error(`Failed to load image: ${error}`);
	}
};
