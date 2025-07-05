import { getImagePmtiles } from '$routes/map/utils/raster';
import { convertTmsToXyz } from '$routes/map/utils/sources';
import { xyzToWMSXYZ } from '$routes/map/utils/tile';

import { IMAGE_TILE_XYZ } from '$routes/constants';
import type { GeoDataEntry, AnyRasterEntry, AnyVectorEntry } from '$routes/map/data/types';
import { DEM_DATA_TYPE, type DemDataTypeKey } from '$routes/map/data/dem';

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

const getCoverImageUrl = async (_layerEntry: GeoDataEntry): Promise<string | undefined> => {
	return _layerEntry.metaData.coverImage;
};

/**
 * レイヤーの画像URLを取得する関数
 * @param _layerEntry - レイヤーエントリ
 * @returns 画像URLまたはundefined
 */
export const getLayerImage = async (_layerEntry: GeoDataEntry): Promise<string | undefined> => {
	try {
		// タイプとフォーマットによる分岐
		if (_layerEntry.type === 'raster') {
			if (_layerEntry.metaData.coverImage) {
				return getCoverImageUrl(_layerEntry);
			} else if (_layerEntry.format.type === 'image') {
				return await getRasterImageUrl(_layerEntry);
			} else if (_layerEntry.format.type === 'pmtiles') {
				return await generatePmtilesImageUrl(_layerEntry);
			}
		} else if (_layerEntry.type === 'vector') {
			return await getCoverImageUrl(_layerEntry);
		}

		return undefined;
	} catch (error) {
		console.error('Error getting layer image:', error);
		throw error; // エラーを再投げして呼び出し元で処理
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
