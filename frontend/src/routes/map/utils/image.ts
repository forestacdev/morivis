import { getImagePmtiles } from '$routes/map/utils/raster';
import { convertTmsToXyz } from '$routes/map/utils/sources';
import { xyzToWMSXYZ } from '$routes/map/utils/tile';

import { IMAGE_TILE_XYZ } from '$routes/constants';
import type { GeoDataEntry, AnyRasterEntry, AnyVectorEntry } from '$routes/map/data/types';

// raster + image タイプの処理
const getRasterImageUrl = async (_layerEntry: AnyRasterEntry): Promise<string> => {
	// xyz タイル情報を取得
	let tile = _layerEntry.metaData.xyzImageTile ?? IMAGE_TILE_XYZ;

	// urlに{-y} が含まれている場合は、タイル座標を WMS タイル座標に変換
	if (_layerEntry.format.url.includes('{-y}')) {
		tile = xyzToWMSXYZ(tile);
	}

	// URLを生成して返す
	return convertTmsToXyz(_layerEntry.format.url)
		.replace('{z}', tile.z.toString())
		.replace('{x}', tile.x.toString())
		.replace('{y}', tile.y.toString());
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
				getCoverImageUrl(_layerEntry);
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
