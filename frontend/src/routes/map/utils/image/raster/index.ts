import { getImagePmtiles } from '$routes/map/utils/raster';
import { convertTmsToXyz } from '$routes/map/utils/sources';
import { xyzToWMSXYZ } from '$routes/map/utils/tile';

import { IMAGE_TILE_XYZ } from '$routes/constants';
import type { AnyRasterEntry, AnyVectorEntry } from '$routes/map/data/types';
import { DEM_DATA_TYPE, type DemDataTypeKey } from '$routes/map/data/dem';
import { TileProxy } from '$routes/map/utils/image';

// TODO クリーンアップ
// raster + image タイプの処理
export const getRasterImageUrl = async (
	_layerEntry: AnyRasterEntry
): Promise<string | undefined> => {
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

export const generatePmtilesImageUrl = async (
	_layerEntry: AnyRasterEntry
): Promise<string | undefined> => {
	const tile = _layerEntry.metaData.xyzImageTile ?? IMAGE_TILE_XYZ;
	return await getImagePmtiles(_layerEntry.format.url, tile);
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

/**  demデータ用のカバー画像を作成 */
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
