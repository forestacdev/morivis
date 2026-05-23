import { getImagePmtiles } from '$routes/map/utils/raster/tile-query';
import { convertTmsToXyz } from '$routes/map/utils/sources';
import { xyzToWMSXYZ } from '$routes/map/utils/map/tile-coordinate';

import { CoverImageManager } from '../index';
import { IMAGE_TILE_XYZ } from '$routes/constants';
import type { AnyRasterEntry } from '$routes/map/data/types';
import {
	DEM_DATA_TYPE,
	type DemDataTypeKey,
	type RasterDemEntry,
	type RasterDemStyle
} from '$routes/map/data/types/raster';
import { TileProxy } from '$routes/map/utils/image';
import {
	type RasterCadEntry,
	DEM_STYLE_TYPE,
	type DemStyleMode
} from '$routes/map/data/types/raster';
import { ColorMapManager } from '$routes/map/utils/style/color-mapping';
import { PMTiles } from 'pmtiles';
import { getRasterDimensionValue } from '$routes/map/utils/raster/dimension-runtime';
import { replaceDimensionPlaceholder } from '$routes/map/utils/dimension';
import { resolveRequestUrl } from '$routes/map/utils/platform/request';
import { createClientId } from '$routes/utils/id';

/** Worker応答からObject URLを生成する（ImageBitmap / Blob 両対応） */
const createObjectURLFromWorkerResult = async (data: {
	blob?: Blob;
	imageBitmap?: ImageBitmap;
}): Promise<string> => {
	if (data.imageBitmap) {
		// farbling回避パス: ImageBitmapをcanvas経由でBlob化
		const canvas = new OffscreenCanvas(data.imageBitmap.width, data.imageBitmap.height);
		const ctx = canvas.getContext('2d')!;
		ctx.drawImage(data.imageBitmap, 0, 0);
		data.imageBitmap.close();
		const blob = await canvas.convertToBlob();
		return URL.createObjectURL(blob);
	}
	if (data.blob) {
		return URL.createObjectURL(data.blob);
	}
	throw new Error('No blob or imageBitmap in worker response');
};

const shouldInspectRasterPreview = (imageUrl: string): boolean => {
	if (imageUrl.startsWith('blob:')) return true;

	try {
		const resolvedUrl = new URL(imageUrl, window.location.href);
		return resolvedUrl.origin === window.location.origin;
	} catch {
		return false;
	}
};

const isRasterPreviewReadable = async (imageUrl: string): Promise<boolean> => {
	try {
		const response = await fetch(TileProxy.toProxyUrl(imageUrl));
		if (!response.ok) return false;

		const blob = await response.blob();
		const bitmap = await createImageBitmap(blob);
		const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			bitmap.close();
			return false;
		}

		ctx.drawImage(bitmap, 0, 0);
		bitmap.close();

		const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
		const stepX = Math.max(1, Math.floor(width / 32));
		const stepY = Math.max(1, Math.floor(height / 32));

		let hasVisiblePixel = false;
		let hasNonBlackPixel = false;

		for (let y = 0; y < height; y += stepY) {
			for (let x = 0; x < width; x += stepX) {
				const index = (y * width + x) * 4;
				const alpha = data[index + 3];
				if (alpha === 0) continue;

				hasVisiblePixel = true;
				const r = data[index];
				const g = data[index + 1];
				const b = data[index + 2];

				if (r > 10 || g > 10 || b > 10) {
					hasNonBlackPixel = true;
					return true;
				}
			}
		}

		return hasVisiblePixel && hasNonBlackPixel;
	} catch (error) {
		console.warn('Failed to inspect raster preview image:', error);
		return false;
	}
};

const validateRasterPreviewUrl = async (imageUrl?: string): Promise<string | undefined> => {
	if (!imageUrl) return undefined;
	if (!shouldInspectRasterPreview(imageUrl)) return imageUrl;
	return (await isRasterPreviewReadable(imageUrl)) ? imageUrl : undefined;
};

/**
 * XYZタイル座標からEPSG:3857のbboxを計算する
 */
const tileToBbox3857 = (x: number, y: number, z: number): string => {
	const EXTENT = 20037508.342789244;
	const tileCount = Math.pow(2, z);
	const tileSize = (2 * EXTENT) / tileCount;

	const minX = -EXTENT + x * tileSize;
	const maxX = -EXTENT + (x + 1) * tileSize;
	const maxY = EXTENT - y * tileSize;
	const minY = EXTENT - (y + 1) * tileSize;

	return `${minX},${minY},${maxX},${maxY}`;
};

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

	// {morivis:dimension}プレースホルダーを現在の選択値で置換
	const resolveTime = (u: string): string => {
		const dimensionValue = getRasterDimensionValue(_layerEntry);
		return replaceDimensionPlaceholder(u, dimensionValue);
	};

	// WMS URL（{bbox-epsg-3857}を含む）の場合はbboxを計算して置換
	if (_layerEntry.format.url.includes('{bbox-epsg-3857}')) {
		const bbox = tileToBbox3857(tile.x, tile.y, tile.z);
		const url = resolveTime(_layerEntry.format.url.replace('{bbox-epsg-3857}', bbox));
		return url;
	}

	// URLを生成
	const url = resolveTime(
		convertTmsToXyz(_layerEntry.format.url)
			.replace('{z}', tile.z.toString())
			.replace('{x}', tile.x.toString())
			.replace('{y}', tile.y.toString())
	);

	if (_layerEntry.style.type === 'dem') {
		const demType = _layerEntry.style.visualization.demType as DemDataTypeKey;

		if (demType) {
			const cacheKey = getRasterCoverCacheKey(_layerEntry, url);
			const convertUrl = await getOrCreateRasterCoverImage(cacheKey, async () => {
				return await generateDemCoverImage(url, _layerEntry as RasterDemEntry);
			});
			return await validateRasterPreviewUrl(convertUrl);
		}
	} else {
		return await validateRasterPreviewUrl(url);
	}
};

const getPmtilesCoverCacheKey = (_layerEntry: AnyRasterEntry): string => {
	const normalizedStyle =
		_layerEntry.style.type === 'dem'
			? normalizeDemStyleForCoverCache(_layerEntry.style as RasterDemStyle)
			: _layerEntry.style;

	return JSON.stringify({
		id: _layerEntry.id,
		url: _layerEntry.format.url,
		xyz: _layerEntry.metaData.xyzImageTile ?? IMAGE_TILE_XYZ,
		tileSize: _layerEntry.metaData.tileSize,
		style: normalizedStyle
	});
};

const normalizeDemStyleForCoverCache = (style: RasterDemStyle): RasterDemStyle => {
	return {
		...style,
		visualization: {
			...style.visualization,
			uniformsData: {
				...style.visualization.uniformsData,
				relief: {
					...style.visualization.uniformsData.relief,
					min: 0,
					max: 0
				},
				slope: style.visualization.uniformsData.slope
					? {
							...style.visualization.uniformsData.slope,
							min: 0,
							max: 0
						}
					: undefined
			}
		}
	};
};

const getRasterCoverCacheKey = (_layerEntry: AnyRasterEntry, imageUrl?: string): string => {
	const normalizedStyle =
		_layerEntry.style.type === 'dem'
			? normalizeDemStyleForCoverCache(_layerEntry.style as RasterDemStyle)
			: _layerEntry.style;

	return JSON.stringify({
		id: _layerEntry.id,
		url: imageUrl ?? _layerEntry.format.url,
		xyz: _layerEntry.metaData.xyzImageTile ?? IMAGE_TILE_XYZ,
		tileSize: _layerEntry.metaData.tileSize,
		style: normalizedStyle
	});
};

const pendingRasterCoverImages = new Map<string, Promise<string | undefined>>();

const getOrCreateRasterCoverImage = async (
	cacheKey: string,
	generator: () => Promise<string | undefined>
): Promise<string | undefined> => {
	const cachedUrl = CoverImageManager.get(cacheKey);
	if (cachedUrl) return cachedUrl;

	const pendingUrl = pendingRasterCoverImages.get(cacheKey);
	if (pendingUrl) {
		return await pendingUrl;
	}

	const generationPromise = (async () => {
		const generatedUrl = await generator();

		if (generatedUrl && !CoverImageManager.has(cacheKey)) {
			CoverImageManager.add(cacheKey, generatedUrl);
		}

		return generatedUrl;
	})();

	pendingRasterCoverImages.set(cacheKey, generationPromise);

	try {
		return await generationPromise;
	} finally {
		pendingRasterCoverImages.delete(cacheKey);
	}
};

// TODO 条件分岐効率化
export const generatePmtilesImageUrl = async (
	_layerEntry: AnyRasterEntry
): Promise<string | undefined> => {
	const cacheKey = getPmtilesCoverCacheKey(_layerEntry);
	return await getOrCreateRasterCoverImage(cacheKey, async () => {
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

		return await validateRasterPreviewUrl(convertUrl);
	});
};

const loadImageToBitmap = async (
	imageUrl: string,
	context?: {
		layerId?: string;
		layerName?: string;
		xyz?: { x: number; y: number; z: number };
	}
): Promise<ImageBitmap> => {
	try {
		const finalUrl = TileProxy.toProxyUrl(imageUrl);
		const response = await fetch(finalUrl);

		if (!response.ok) {
			console.error('Raster preview fetch failed', {
				imageUrl,
				finalUrl,
				status: response.status,
				statusText: response.statusText,
				...context
			});
			throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
		}
		const blob = await response.blob();
		return await createImageBitmap(blob);
	} catch (error) {
		console.error('Error loading image to bitmap:', {
			error,
			imageUrl,
			finalUrl: TileProxy.toProxyUrl(imageUrl),
			...context
		});
		throw error; // エラーを再投げして呼び出し元で処
	}
};

const loadImagePmtiles = async (
	src: string,
	tile: { x: number; y: number; z: number }
): Promise<ImageBitmap> => {
	try {
		const pmtiles = new PMTiles(resolveRequestUrl(src));

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

// カバー画像生成用の共有Worker（毎回生成を避ける）
let sharedDemWorker: Worker | null = null;
const getSharedDemWorker = (): Worker => {
	if (!sharedDemWorker) {
		sharedDemWorker = new Worker(
			new URL('../../../protocol/raster/protocol_dem.worker.ts', import.meta.url),
			{ type: 'module' }
		);
	}
	return sharedDemWorker;
};

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
	const tileId = createClientId();
	const demType = visualization.demType as DemDataTypeKey;
	const demTypeNumber = DEM_DATA_TYPE[demType];
	const modeNumber = DEM_STYLE_TYPE[mode as keyof typeof DEM_STYLE_TYPE];
	const baseUrl = _entry.format.url;
	const tileSize = metaData.tileSize;
	const encodeType: 'blob' | 'buffar' = 'blob';

	try {
		let image;
		const previewContext = {
			layerId: _entry.id,
			layerName: _entry.metaData.name,
			xyz: { x, y, z }
		};

		if (_entry.format.type === 'image') {
			image = await loadImageToBitmap(imageUrl, previewContext);
		} else if (_entry.format.type === 'pmtiles') {
			image = await loadImagePmtiles(baseUrl, { x, y, z });
		} else {
			image = await createEmptyBitmap();
		}

		const worker = getSharedDemWorker();

		// tileIdで応答を振り分けるヘルパー（共有Workerなので onmessage 上書きはNG）
		const waitForResult = (message: Record<string, unknown>): Promise<string> => {
			return new Promise((resolve, reject) => {
				const handler = async (e: MessageEvent) => {
					const { id, blob, imageBitmap, error } = e.data;
					if (id !== tileId) return;
					worker.removeEventListener('message', handler);
					if (error) {
						reject(new Error(error));
					} else {
						resolve(await createObjectURLFromWorkerResult({ blob, imageBitmap }));
					}
				};
				worker.addEventListener('message', handler);
				worker.postMessage(message);
			});
		};

		if (mode === 'relief') {
			const elevationColorArray = colorMapCache.createColorArray(
				visualization.uniformsData.relief.colorMap || 'bone'
			);
			const max = visualization.uniformsData.relief.max;
			const min = visualization.uniformsData.relief.min;
			return waitForResult({
				tileId,
				center: image,
				demTypeNumber,
				modeNumber,
				mode,
				elevationColorArray,
				max,
				min,
				tileSize,
				encodeType
			});
		} else if (mode === 'slope' || mode === 'aspect' || mode === 'curvature') {
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

			return waitForResult({
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
				tileSize,
				encodeType
			});
		} else {
			return waitForResult({
				tileId,
				center: image,
				z,
				demTypeNumber,
				tileSize
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
	const tileId = createClientId();
	const worker = new Worker(new URL('./image_replacement_color.worker.ts', import.meta.url), {
		type: 'module'
	});
	const { metaData } = _entry;
	const { x, y, z } = metaData.xyzImageTile ?? IMAGE_TILE_XYZ;
	const baseUrl = _entry.format.url;
	const encodeType: 'blob' | 'buffar' = 'blob';

	let image;
	const previewContext = {
		layerId: _entry.id,
		layerName: _entry.metaData.name,
		xyz: { x, y, z }
	};

	if (_entry.format.type === 'image') {
		image = await loadImageToBitmap(imageUrl, previewContext);
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

		worker.onmessage = async (e) => {
			const { id, blob, imageBitmap, error } = e.data;
			if (id === tileId) {
				if (error) {
					reject(new Error(error));
				} else {
					resolve(await createObjectURLFromWorkerResult({ blob, imageBitmap }));
				}
			}

			worker.terminate(); // Workerを終了
		};
	});
};
