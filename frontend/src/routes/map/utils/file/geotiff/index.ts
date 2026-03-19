import { fromArrayBuffer } from 'geotiff';
import type { ReadRasterResult } from 'geotiff';

import type { RasterTiffStyle } from '$routes/map/data/types/raster';
import { ColorMapManager } from '$routes/map/utils/color_mapping';

export interface ReprojectInfo {
	projDef: string;
	srcBbox: [number, number, number, number];
}

export class GeoTiffCache {
	private static dataUrlCache: Map<string, string> = new Map();
	private static rastersCache: Map<string, Float32Array[]> = new Map();
	private static bboxCache: Map<string, [number, number, number, number]> = new Map();
	private static numBandsCache: Map<string, number> = new Map();
	private static reprojectCache: Map<string, ReprojectInfo> = new Map();

	private static sizeCache: Map<
		string,
		{
			width: number;
			height: number;
		}
	> = new Map();
	private static blobCache: Map<
		string,
		{
			blob: Blob;
			url: string;
		}
	> = new Map();

	static setDataUrl(key: string, url: string) {
		this.dataUrlCache.set(key, url);
	}

	static setRasters(key: string, rasters: Float32Array[]) {
		this.rastersCache.set(key, rasters);
	}

	static setBbox(key: string, bbox: [number, number, number, number]) {
		this.bboxCache.set(key, bbox);
	}

	static setSize(key: string, width: number, height: number) {
		this.sizeCache.set(key, { width, height });
	}

	static setNumBands(key: string, numBands: number) {
		this.numBandsCache.set(key, numBands);
	}

	static setBlob(key: string, blob: Blob, url: string) {
		this.blobCache.set(key, { blob, url });
	}

	static getDataUrl(key: string): string | undefined {
		return this.dataUrlCache.get(key);
	}

	static getRasters(key: string): Float32Array[] | undefined {
		return this.rastersCache.get(key);
	}

	static getBbox(key: string): [number, number, number, number] | undefined {
		return this.bboxCache.get(key);
	}

	static getSize(key: string): { width: number; height: number } | undefined {
		return this.sizeCache.get(key);
	}

	static getNumBands(key: string): number | undefined {
		return this.numBandsCache.get(key);
	}

	static getBlobUrl(id: string): string | undefined {
		return this.blobCache.get(id)?.url;
	}

	static removeDataUrl(key: string): void {
		this.dataUrlCache.delete(key);
	}
	static removeRasters(key: string): void {
		this.rastersCache.delete(key);
	}
	static removeBbox(key: string): void {
		this.bboxCache.delete(key);
	}

	static removeSize(key: string): void {
		this.sizeCache.delete(key);
	}

	static removeNumBands(key: string): void {
		this.numBandsCache.delete(key);
	}

	static setReproject(key: string, info: ReprojectInfo) {
		this.reprojectCache.set(key, info);
	}

	static getReproject(key: string): ReprojectInfo | undefined {
		return this.reprojectCache.get(key);
	}

	static hasReproject(key: string): boolean {
		return this.reprojectCache.has(key);
	}

	static removeReproject(key: string): void {
		this.reprojectCache.delete(key);
	}

	static revokeBlob(id: string): void {
		const entry = this.blobCache.get(id);
		if (entry) {
			URL.revokeObjectURL(entry.url);
			this.blobCache.delete(id);
		}
	}

	static clear(): void {
		this.dataUrlCache.clear();
		this.rastersCache.clear();
		this.bboxCache.clear();
		this.sizeCache.clear();
		this.numBandsCache.clear();
		this.blobCache.clear();
		this.reprojectCache.clear();
	}
	static hasDataUrl(key: string): boolean {
		return this.dataUrlCache.has(key);
	}
	static hasRasters(key: string): boolean {
		return this.rastersCache.has(key);
	}
	static hasBbox(key: string): boolean {
		return this.bboxCache.has(key);
	}
	static hasSize(key: string): boolean {
		return this.sizeCache.has(key);
	}
	static hasNumBands(key: string): boolean {
		return this.numBandsCache.has(key);
	}
	static hasBlob(key: string): boolean {
		return this.blobCache.has(key);
	}
}

export class GeoTiffImageCache {
	private static cache = new Map<string, string>();

	static set(key: string, url: string) {
		this.cache.set(key, url);
	}
	static get(key: string): string | undefined {
		return this.cache.get(key);
	}
	static has(key: string): boolean {
		return this.cache.has(key);
	}
	static remove(key: string): void {
		this.cache.delete(key);
	}
	static clear(): void {
		this.cache.clear();
	}

	/**
	 * 指定されたエントリIDに関連する古いキャッシュエントリを削除し、blob URLを解放する。
	 * 現在のstyleIDのエントリは保持する。
	 */
	static revokeOldEntries(entryId: string, currentStyleID: string): void {
		for (const [key, url] of this.cache.entries()) {
			if (key.startsWith(entryId) && key !== currentStyleID) {
				if (url.startsWith('blob:')) {
					URL.revokeObjectURL(url);
				}
				this.cache.delete(key);
			}
		}
	}
}

export const getMinMax = (band: Float32Array, nodata: any): { min: number; max: number } => {
	let min = Infinity;
	let max = -Infinity;

	for (let i = 0; i < band.length; i++) {
		const value = band[i];

		const isValid =
			Number.isFinite(value) &&
			(nodata === null ||
				(!Number.isNaN(nodata) && value !== nodata) ||
				(Number.isNaN(nodata) && !Number.isNaN(value)));

		if (isValid) {
			min = Math.min(min, value);
			max = Math.max(max, value);
		}
	}

	return { min, max };
};

export const getRasters = async (
	rasters: ReadRasterResult,
	width: number,
	height: number
): Promise<
	| {
			rastersData: Float32Array[];
			size: number;
	  }
	| undefined
> => {
	const worker = new Worker(new URL('./convert.worker.ts', import.meta.url), {
		type: 'module'
	});
	try {
		return new Promise((resolve, reject) => {
			if (rasters.length === 1) {
				return resolve({
					rastersData: rasters[0] as unknown as Float32Array[],
					size: 1
				});
			}

			worker.postMessage({
				rasters,
				width,
				height
			});

			// Define message handler once
			worker.onmessage = async (e) => {
				const { result } = e.data;

				resolve({
					rastersData: result,
					size: rasters.length
				});

				worker.terminate(); // Workerを終了
			};

			// Added error handling
			worker.onerror = (error) => {
				console.error('Worker error:', error);
				worker.terminate();
				reject(new Error(`Worker error: ${error.message}`));
			};
		});
	} catch (error) {
		console.error(`Error processing image`, error);
	}
};

const rebderWorker = new Worker(new URL('./geotiff_render.worker.ts', import.meta.url), {
	type: 'module'
});

const colorMapManager = new ColorMapManager();

export const loadToGeotiffFile = async (id: string, file: File): Promise<void> => {
	const arrayBuffer = await file.arrayBuffer();
	const tiff = await fromArrayBuffer(arrayBuffer);
	const image = await tiff.getImage();

	const width = image.getWidth();
	const height = image.getHeight();
	const rasterData = await image.readRasters({ interleave: false });
	// const rgb = await image.readRGB();
	const result = await getRasters(rasterData, width, height);
	if (!result) {
		throw new Error('Failed to process raster data');
	}
	const { rastersData, size } = result;

	GeoTiffCache.setRasters(id, rastersData);
	GeoTiffCache.setSize(id, width, height);
	GeoTiffCache.setNumBands(id, size);
};

const reprojectWorker = new Worker(new URL('./reproject.worker.ts', import.meta.url), {
	type: 'module'
});

/**
 * 再投影付きラスターデータの読み込み
 * ソース座標系のラスターをWGS84上にリサンプリングしてレンダリングする
 */
export const loadRasterDataReprojected = async (
	id: string,
	visualization: RasterTiffStyle['visualization'],
	reprojectInfo: ReprojectInfo,
	dstBbox: [number, number, number, number]
): Promise<string | undefined> => {
	try {
		if (!GeoTiffCache.hasRasters(id)) {
			throw new Error('Raster data not found in cache');
		}

		const rasters = GeoTiffCache.getRasters(id) as Float32Array[];
		const srcWidth = GeoTiffCache.getSize(id)?.width ?? 0;
		const srcHeight = GeoTiffCache.getSize(id)?.height ?? 0;
		const bandCount = GeoTiffCache.getNumBands(id) ?? 1;

		const mode = visualization.mode;
		const uniformsData = visualization.uniformsData;
		const colorArray = colorMapManager.createColorArray(uniformsData.single.colorMap || 'bone');

		// ラスターをフラット化（postMessageでの転送用にコピーを作成）
		let flatRasters: Float32Array;
		if (bandCount === 1) {
			const src = rasters as unknown as Float32Array;
			flatRasters = new Float32Array(src);
		} else {
			flatRasters = new Float32Array(srcWidth * srcHeight * bandCount);
			for (let i = 0; i < bandCount; i++) {
				flatRasters.set(rasters[i], i * srcWidth * srcHeight);
			}
		}

		// 出力サイズはソースと同じ
		const dstWidth = srcWidth;
		const dstHeight = srcHeight;

		const workerMessage: Record<string, unknown> = {
			rasters: flatRasters,
			size: bandCount,
			type: mode,
			srcWidth,
			srcHeight,
			srcBbox: Array.from(reprojectInfo.srcBbox),
			dstWidth,
			dstHeight,
			dstBbox: Array.from(dstBbox),
			projDef: reprojectInfo.projDef,
			colorArray: new Uint8Array(colorArray)
		};

		if (mode === 'single') {
			workerMessage.min = uniformsData.single.min;
			workerMessage.max = uniformsData.single.max;
			workerMessage.bandIndex = uniformsData.single.index;
		} else if (mode === 'multi') {
			workerMessage.min = 0;
			workerMessage.max = 255;
			workerMessage.redIndex = uniformsData.multi.r.index;
			workerMessage.greenIndex = uniformsData.multi.g.index;
			workerMessage.blueIndex = uniformsData.multi.b.index;
			workerMessage.redMin = uniformsData.multi.r.min;
			workerMessage.redMax = uniformsData.multi.r.max;
			workerMessage.greenMin = uniformsData.multi.g.min;
			workerMessage.greenMax = uniformsData.multi.g.max;
			workerMessage.blueMin = uniformsData.multi.b.min;
			workerMessage.blueMax = uniformsData.multi.b.max;
		}

		return new Promise((resolve, reject) => {
			reprojectWorker.postMessage(workerMessage);

			reprojectWorker.onmessage = async (e) => {
				const { blob, error } = e.data;
				if (error) {
					reject(new Error(`Reproject worker error: ${error}`));
					return;
				}
				const url = URL.createObjectURL(blob);
				GeoTiffCache.setBlob(id, blob, url);
				resolve(url);
			};

			reprojectWorker.onerror = (error) => {
				console.error('Reproject worker error:', error);
				reject(new Error(`Reproject worker error: ${error.message}`));
			};
		});
	} catch (error) {
		console.error('Error in reprojected rendering', error);
	}
};

// ラスターデータの読み込み
export const loadRasterData = async (
	id: string,
	url: string,
	visualization: RasterTiffStyle['visualization']
): Promise<string | undefined> => {
	try {
		let width;
		let height;
		let rasters: Float32Array[] = [];
		let bandCount = 1;
		if (GeoTiffCache.hasRasters(id)) {
			rasters = GeoTiffCache.getRasters(id) as Float32Array[];
			width = GeoTiffCache.getSize(id)?.width ?? 0;
			height = GeoTiffCache.getSize(id)?.height ?? 0;
			bandCount = GeoTiffCache.getNumBands(id) ?? 1;
		} else {
			const response = await fetch(url);
			const arrayBuffer = await response.arrayBuffer();

			const tiff = await fromArrayBuffer(arrayBuffer);
			const image = await tiff.getImage();
			width = image.getWidth();
			height = image.getHeight();
			const rasterData = await image.readRasters({ interleave: false });
			// const rgb = await image.readRGB();
			const result = await getRasters(rasterData, width, height);
			if (!result) {
				throw new Error('Failed to process raster data');
			}
			rasters = result.rastersData as Float32Array[];
			bandCount = result.size;
			GeoTiffCache.setRasters(id, rasters);
			GeoTiffCache.setSize(id, width, height);
			GeoTiffCache.setNumBands(id, bandCount);
		}

		// nodataの取得
		// const nodata =
		// 	image.fileDirectory.GDAL_NODATA !== undefined
		// 		? parseFloat(image.fileDirectory.GDAL_NODATA)
		// 		: null;

		// const min = UniformsData.min ?? getMinMax(rasters[UniformsData.index], nodata).min;
		// const max = UniformsData.max ?? getMinMax(rasters[UniformsData.index], nodata).max;

		const mode = visualization.mode;
		const uniformsData = visualization.uniformsData;
		const colorArray = colorMapManager.createColorArray(uniformsData.single.colorMap || 'bone');

		// rasters をフラット化してワーカーに渡す
		// texImage3D は連続した Float32Array を要求するため
		let flatRasters: Float32Array;
		if (bandCount === 1) {
			// シングルバンド: rasters は実質 Float32Array（配列ではない）
			flatRasters = rasters as unknown as Float32Array;
		} else {
			flatRasters = new Float32Array(width * height * bandCount);
			for (let i = 0; i < bandCount; i++) {
				flatRasters.set(rasters[i], i * width * height);
			}
		}

		// モードに応じたワーカーメッセージを構築
		const workerMessage: Record<string, unknown> = {
			rasters: flatRasters,
			size: bandCount,
			type: mode,
			width,
			height,
			colorArray
		};

		if (mode === 'single') {
			workerMessage.min = uniformsData.single.min;
			workerMessage.max = uniformsData.single.max;
			workerMessage.bandIndex = uniformsData.single.index;
		} else if (mode === 'multi') {
			workerMessage.min = 0;
			workerMessage.max = 255;
			workerMessage.redIndex = uniformsData.multi.r.index;
			workerMessage.greenIndex = uniformsData.multi.g.index;
			workerMessage.blueIndex = uniformsData.multi.b.index;
			workerMessage.redMin = uniformsData.multi.r.min;
			workerMessage.redMax = uniformsData.multi.r.max;
			workerMessage.greenMin = uniformsData.multi.g.min;
			workerMessage.greenMax = uniformsData.multi.g.max;
			workerMessage.blueMin = uniformsData.multi.b.min;
			workerMessage.blueMax = uniformsData.multi.b.max;
		}

		return new Promise((resolve, reject) => {
			rebderWorker.postMessage(workerMessage);

			// Define message handler once
			rebderWorker.onmessage = async (e) => {
				const { blob, error } = e.data;

				if (error) {
					reject(new Error(`Render worker error: ${error}`));
					return;
				}

				const url = URL.createObjectURL(blob);
				GeoTiffCache.setBlob(id, blob, url);

				resolve(url);
			};

			// Added error handling
			rebderWorker.onerror = (error) => {
				console.error('Worker error:', error);
				reject(new Error(`Worker error: ${error.message}`));
			};
		});
	} catch (error) {
		console.error(`Error processing image`, error);
	}
};
