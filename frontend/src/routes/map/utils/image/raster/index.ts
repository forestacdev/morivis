import { getImagePmtiles } from '$routes/map/utils/raster';
import { convertTmsToXyz } from '$routes/map/utils/sources';
import { xyzToWMSXYZ } from '$routes/map/utils/tile';

import { CoverImageManager } from '../index';
import { IMAGE_TILE_XYZ } from '$routes/constants';
import type { AnyRasterEntry } from '$routes/map/data/types';
import {
	DEM_DATA_TYPE,
	type DemDataTypeKey,
	type RasterDemEntry
} from '$routes/map/data/types/raster';
import { TileProxy } from '$routes/map/utils/image';
import {
	type RasterCadEntry,
	DEM_STYLE_TYPE,
	type DemStyleMode
} from '$routes/map/data/types/raster';
import { ColorMapManager } from '$routes/map/utils/color_mapping';
import type { TileImageManager } from '$routes/map/protocol/image';
import { PMTiles } from 'pmtiles';

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
			const convertUrl = await generateDemCoverImage(url, _layerEntry as RasterDemEntry);

			return convertUrl;
		}
	} else {
		return url;
	}
};

// TODO 条件分岐効率化
export const generatePmtilesImageUrl = async (
	_layerEntry: AnyRasterEntry
): Promise<string | undefined> => {
	const url = CoverImageManager.get(_layerEntry.id);
	if (url) return url;

	let convertUrl;

	// URLを生成して返す
	if (_layerEntry.style.type === 'dem') {
		const demType = _layerEntry.style.visualization.demType as DemDataTypeKey;

		if (demType) {
			convertUrl = await generateDemCoverImage('none', _layerEntry as RasterDemEntry);
		}
	} else if (_layerEntry.style.type === 'cad') {
		convertUrl = await replaceColorInImage(_layerEntry.format.url, _layerEntry as RasterCadEntry);
	} else {
		const tile = _layerEntry.metaData.xyzImageTile ?? IMAGE_TILE_XYZ;
		convertUrl = await getImagePmtiles(_layerEntry.format.url, tile);
	}

	if (convertUrl) {
		CoverImageManager.add(_layerEntry.id, convertUrl);
	}

	return convertUrl;
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

const loadImagePmtiles = async (
	src: string,
	tile: { x: number; y: number; z: number }
): Promise<ImageBitmap> => {
	try {
		const pmtiles = new PMTiles(src);

		// タイルデータを取得
		const tileData = await pmtiles.getZxy(tile.z, tile.x, tile.y);
		if (!tileData || !tileData.data) {
			throw new Error('Tile data not found');
		}

		// Blob を生成
		const blob = new Blob([tileData.data], { type: 'image/png' });

		// ImageBitmap に変換して返す
		return await createImageBitmap(blob);
	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError') {
			// リクエストがキャンセルされた場合はエラーをスロー
			throw error;
		} else {
			// 他のエラー時には空の画像を返す
			return await createImageBitmap(new ImageData(1, 1));
		}
	}
};

// 空のbitmapを生成する関数
const createEmptyBitmap = async (): Promise<ImageBitmap> => {
	return await createImageBitmap(new ImageData(1, 1));
};

const colorMapCache = new ColorMapManager();

/**  demデータ用のカバー画像を作成 */
// TODO 共通化
export const generateDemCoverImage = async (
	imageUrl: string,
	_entry: RasterDemEntry
): Promise<string> => {
	const { style, metaData } = _entry;
	const visualization = style.visualization;
	const { x, y, z } = metaData.xyzImageTile ?? IMAGE_TILE_XYZ;

	const mode = visualization.mode as DemStyleMode;
	const tileId = crypto.randomUUID();
	const demType = visualization.demType as DemDataTypeKey;
	const demTypeNumber = DEM_DATA_TYPE[demType];
	const modeNumber = DEM_STYLE_TYPE[mode as keyof typeof DEM_STYLE_TYPE];
	const baseUrl = _entry.format.url;
	const encodeType: 'blob' | 'buffar' = 'blob';

	try {
		let image;

		if (_entry.format.type === 'image') {
			image = await loadImageToBitmap(imageUrl);
		} else if (_entry.format.type === 'pmtiles') {
			image = await loadImagePmtiles(baseUrl, { x, y, z });
		} else {
			image = await createEmptyBitmap();
		}

		const worker = new Worker(
			new URL('../../../protocol/raster/protocol_dem.worker.ts', import.meta.url),
			{
				type: 'module'
			}
		);

		if (mode === 'relief') {
			const elevationColorArray = colorMapCache.createColorArray(
				visualization.uniformsData.relief.colorMap || 'bone'
			);
			const max = visualization.uniformsData.relief.max;
			const min = visualization.uniformsData.relief.min;
			return new Promise((resolve, reject) => {
				worker.postMessage({
					tileId,
					center: image,
					demTypeNumber,
					modeNumber,
					mode,
					elevationColorArray,
					max,
					min,
					encodeType
				});

				worker.onmessage = (e) => {
					const { id, blob, error } = e.data;
					if (id === tileId) {
						if (error) {
							reject(new Error(error));
						} else {
							resolve(URL.createObjectURL(blob));
						}
					}

					worker.terminate(); // Workerを終了
				};
			});
		} else if (mode === 'slope' || mode === 'aspect') {
			const elevationColorArray = colorMapCache.createColorArray(
				visualization.uniformsData[mode]?.colorMap || 'bone'
			);

			let min = 0;
			let max = 0;

			const emptyImage = await createImageBitmap(new ImageData(1, 1));

			if (mode === 'slope' && visualization.uniformsData.slope) {
				min = visualization.uniformsData.slope.min;
				max = visualization.uniformsData.slope.max;
			}

			return new Promise((resolve, reject) => {
				worker.postMessage({
					tileId,
					center: image,
					left: emptyImage,
					right: emptyImage,
					top: emptyImage,
					bottom: emptyImage,
					demTypeNumber,
					modeNumber,
					mode,
					elevationColorArray,
					max,
					min,
					tile: { x, y, z },
					encodeType
				});

				worker.onmessage = (e) => {
					const { id, blob, error } = e.data;

					if (id === tileId) {
						if (error) {
							reject(new Error(error));
						} else {
							resolve(URL.createObjectURL(blob));
						}
					}

					worker.terminate(); // Workerを終了
				};
			});
		} else {
			return new Promise((resolve, reject) => {
				worker.postMessage({
					tileId,
					center: image,
					z,
					demTypeNumber
				});

				worker.onmessage = (e) => {
					const { id, blob, error } = e.data;
					if (id === tileId) {
						if (error) {
							reject(new Error(error));
						} else {
							resolve(URL.createObjectURL(blob));
						}
					}

					worker.terminate(); // Workerを終了
				};
			});
		}

		// return new Promise((resolve, reject) => {
		// 	worker.postMessage({
		// 		id,
		// 		image, // ← 今度はImageBitmapオブジェクト
		// 		demTypeNumber
		// 	});

		// 	worker.onmessage = (e) => {
		// 		const { responseId, blob, error } = e.data;
		// 		if (responseId === id) {
		// 			if (error) {
		// 				reject(new Error(error));
		// 			} else {
		// 				resolve(URL.createObjectURL(blob));
		// 			}
		// 		}

		// 		worker.terminate(); // Workerを終了
		// 	};
		// });
	} catch (error) {
		throw new Error(`Failed to load image: ${error}`);
	}
};

// 色と画像urlを引数に画像の特定の色を変える関数
const replaceColorInImage = async (imageUrl: string, _entry: RasterCadEntry): Promise<string> => {
	const tileId = crypto.randomUUID();
	const worker = new Worker(new URL('./image_replacement_color.worker.ts', import.meta.url), {
		type: 'module'
	});
	const { metaData } = _entry;
	const { x, y, z } = metaData.xyzImageTile ?? IMAGE_TILE_XYZ;
	const baseUrl = _entry.format.url;
	const encodeType: 'blob' | 'buffar' = 'blob';

	let image;

	if (_entry.format.type === 'image') {
		image = await loadImageToBitmap(imageUrl);
	} else if (_entry.format.type === 'pmtiles') {
		image = await loadImagePmtiles(baseUrl, { x, y, z });
	} else {
		image = await createEmptyBitmap();
	}

	const targetColor = '#ff0000';
	const replacementColor = _entry.style.color;

	return new Promise((resolve, reject) => {
		worker.postMessage({
			tileId,
			image,
			targetColor,
			replacementColor,
			encodeType
		});

		worker.onmessage = (e) => {
			const { id, blob, error } = e.data;
			if (id === tileId) {
				if (error) {
					reject(new Error(error));
				} else {
					resolve(URL.createObjectURL(blob));
				}
			}

			worker.terminate(); // Workerを終了
		};
	});
};
