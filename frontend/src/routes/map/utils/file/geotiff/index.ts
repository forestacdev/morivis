import type { TypedArray, ReadRasterResult } from 'geotiff';

import type { RasterTiffStyle } from '$routes/map/data/types/raster';
import { ColorMapManager } from '$routes/map/utils/color_mapping';

export interface ReprojectInfo {
	projDef: string;
	srcBbox: [number, number, number, number];
}

/** バンドごとの min/max データ範囲 */
export interface BandDataRange {
	min: number;
	max: number;
}

/** バンドごとのTypedArray配列 */
export type RasterBands = TypedArray[];

// --- Cache ---

export class GeoTiffCache {
	// Terrarium PNG Blob URL（バンドごと）
	private static terrariumCache: Map<string, string[]> = new Map();
	// バンドごとのデータ範囲（正規化逆変換用）
	private static dataRangeCache: Map<string, BandDataRange[]> = new Map();
	// 画像サイズ
	private static sizeCache: Map<string, { width: number; height: number }> = new Map();
	// bbox (WGS84)
	private static bboxCache: Map<string, [number, number, number, number]> = new Map();
	// バンド数
	private static numBandsCache: Map<string, number> = new Map();
	// 最終レンダリング済み画像
	private static blobCache: Map<string, { blob: Blob; url: string }> = new Map();
	// render worker にテクスチャ転送済みか
	private static textureTransferredSet: Set<string> = new Set();

	// --- Terrarium PNG ---
	static setTerrarium(key: string, urls: string[]) {
		this.terrariumCache.set(key, urls);
	}
	static getTerrarium(key: string): string[] | undefined {
		return this.terrariumCache.get(key);
	}
	static hasTerrarium(key: string): boolean {
		return this.terrariumCache.has(key);
	}
	static revokeTerrarium(key: string): void {
		const urls = this.terrariumCache.get(key);
		if (urls) {
			urls.forEach((u) => URL.revokeObjectURL(u));
			this.terrariumCache.delete(key);
		}
	}

	// --- Data Range ---
	static setDataRanges(key: string, ranges: BandDataRange[]) {
		this.dataRangeCache.set(key, ranges);
	}
	static getDataRanges(key: string): BandDataRange[] | undefined {
		return this.dataRangeCache.get(key);
	}
	static hasDataRanges(key: string): boolean {
		return this.dataRangeCache.has(key);
	}

	// --- Size ---
	static setSize(key: string, width: number, height: number) {
		this.sizeCache.set(key, { width, height });
	}
	static getSize(key: string): { width: number; height: number } | undefined {
		return this.sizeCache.get(key);
	}
	static hasSize(key: string): boolean {
		return this.sizeCache.has(key);
	}

	// --- Bbox ---
	static setBbox(key: string, bbox: [number, number, number, number]) {
		this.bboxCache.set(key, bbox);
	}
	static getBbox(key: string): [number, number, number, number] | undefined {
		return this.bboxCache.get(key);
	}
	static hasBbox(key: string): boolean {
		return this.bboxCache.has(key);
	}

	// --- NumBands ---
	static setNumBands(key: string, numBands: number) {
		this.numBandsCache.set(key, numBands);
	}
	static getNumBands(key: string): number | undefined {
		return this.numBandsCache.get(key);
	}
	static hasNumBands(key: string): boolean {
		return this.numBandsCache.has(key);
	}

	// --- Blob (rendered image) ---
	static setBlob(key: string, blob: Blob, url: string) {
		this.blobCache.set(key, { blob, url });
	}
	static getBlobUrl(id: string): string | undefined {
		return this.blobCache.get(id)?.url;
	}
	static revokeBlob(id: string): void {
		const entry = this.blobCache.get(id);
		if (entry) {
			URL.revokeObjectURL(entry.url);
			this.blobCache.delete(id);
		}
	}

	// --- Texture transfer tracking ---
	static markTextureTransferred(key: string) {
		this.textureTransferredSet.add(key);
	}
	static isTextureTransferred(key: string): boolean {
		return this.textureTransferredSet.has(key);
	}

	// --- Clear ---
	static clear(): void {
		// Terrarium blob URL を revoke
		for (const urls of this.terrariumCache.values()) {
			urls.forEach((u) => URL.revokeObjectURL(u));
		}
		this.terrariumCache.clear();
		this.dataRangeCache.clear();
		this.sizeCache.clear();
		this.bboxCache.clear();
		this.numBandsCache.clear();
		// Rendered blob URL を revoke
		for (const entry of this.blobCache.values()) {
			URL.revokeObjectURL(entry.url);
		}
		this.blobCache.clear();
		this.textureTransferredSet.clear();
		// render worker にテクスチャ解放を通知
		terrariumRenderWorker.postMessage({ action: 'release', entryId: '__all__' });
	}

	static release(key: string): void {
		this.revokeTerrarium(key);
		this.dataRangeCache.delete(key);
		this.sizeCache.delete(key);
		this.bboxCache.delete(key);
		this.numBandsCache.delete(key);
		this.revokeBlob(key);
		this.textureTransferredSet.delete(key);
		terrariumRenderWorker.postMessage({ action: 'release', entryId: key });
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

// --- Utilities ---

export const getMinMax = (
	band: TypedArray,
	nodata: number | null
): { min: number; max: number } => {
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

	if (!Number.isFinite(min)) min = 0;
	if (!Number.isFinite(max)) max = 255;

	return { min, max };
};

export const parseRasterBands = (rasterData: ReadRasterResult): RasterBands => {
	if (Array.isArray(rasterData)) {
		return rasterData as RasterBands;
	}
	return [rasterData as TypedArray];
};

// --- Workers ---

const terrariumEncodeWorker = new Worker(
	new URL('./terrarium_encode.worker.ts', import.meta.url),
	{ type: 'module' }
);

const terrariumRenderWorker = new Worker(
	new URL('./terrarium_render.worker.ts', import.meta.url),
	{ type: 'module' }
);

const colorMapManager = new ColorMapManager();

// --- Terrarium encoding ---

/**
 * 1バンドを Terrarium PNG にエンコードする
 */
export const encodeBandToTerrarium = (
	band: TypedArray,
	width: number,
	height: number,
	nodata: number | null,
	dataMin: number,
	dataMax: number
): Promise<Blob> =>
	new Promise((resolve, reject) => {
		terrariumEncodeWorker.postMessage({
			band,
			width,
			height,
			nodata,
			dataMin,
			dataMax
		});

		terrariumEncodeWorker.onmessage = (e) => {
			const { blob, error } = e.data;
			if (error) {
				reject(new Error(`Encode error: ${error}`));
				return;
			}
			resolve(blob);
		};

		terrariumEncodeWorker.onerror = (error) => {
			reject(new Error(`Encode worker error: ${error.message}`));
		};
	});

/**
 * 全バンドを Terrarium PNG にエンコードしてキャッシュする
 */
export const encodeAllBandsToTerrarium = async (
	id: string,
	bands: RasterBands,
	width: number,
	height: number,
	nodata: number | null,
	dataRanges: BandDataRange[]
): Promise<void> => {
	const urls: string[] = [];

	for (let i = 0; i < bands.length; i++) {
		const blob = await encodeBandToTerrarium(
			bands[i],
			width,
			height,
			nodata,
			dataRanges[i].min,
			dataRanges[i].max
		);
		urls.push(URL.createObjectURL(blob));
	}

	GeoTiffCache.setTerrarium(id, urls);
	GeoTiffCache.setDataRanges(id, dataRanges);
	GeoTiffCache.setSize(id, width, height);
	GeoTiffCache.setNumBands(id, bands.length);
};

// --- Rendering ---

/**
 * Terrarium PNG からレンダリングした最終画像を生成する。
 * 初回はキャッシュの Terrarium PNG を ImageBitmap に変換して Worker に転送。
 * 以降はユニフォーム値のみ送信。
 */
export const loadRasterData = async (
	id: string,
	visualization: RasterTiffStyle['visualization']
): Promise<string | undefined> => {
	try {
		if (!GeoTiffCache.hasTerrarium(id)) {
			throw new Error('Terrarium data not found in cache');
		}

		const size = GeoTiffCache.getSize(id);
		if (!size) throw new Error('Size not found in cache');

		const dataRanges = GeoTiffCache.getDataRanges(id);
		if (!dataRanges) throw new Error('Data ranges not found in cache');

		const mode = visualization.mode;
		const uniformsData = visualization.uniformsData;
		const colorArray = colorMapManager.createColorArray(uniformsData.single.colorMap || 'bone');

		// Worker メッセージ構築
		const workerMessage: Record<string, unknown> = {
			entryId: id,
			type: mode,
			width: size.width,
			height: size.height
		};

		// 初回: ImageBitmap を転送
		if (!GeoTiffCache.isTextureTransferred(id)) {
			const terrariumUrls = GeoTiffCache.getTerrarium(id)!;
			const images = await Promise.all(
				terrariumUrls.map(async (url) => {
					const response = await fetch(url);
					const blob = await response.blob();
					return createImageBitmap(blob);
				})
			);
			workerMessage.images = images;
			GeoTiffCache.markTextureTransferred(id);
		}

		// ユニフォーム値
		if (mode === 'single') {
			workerMessage.bandIndex = uniformsData.single.index;
			workerMessage.dataMin = dataRanges[uniformsData.single.index]?.min ?? 0;
			workerMessage.dataMax = dataRanges[uniformsData.single.index]?.max ?? 1;
			workerMessage.min = uniformsData.single.min;
			workerMessage.max = uniformsData.single.max;
			workerMessage.colorArray = new Uint8Array(colorArray);
		} else if (mode === 'multi') {
			const rIdx = uniformsData.multi.r.index;
			const gIdx = uniformsData.multi.g.index;
			const bIdx = uniformsData.multi.b.index;

			workerMessage.redIndex = rIdx;
			workerMessage.greenIndex = gIdx;
			workerMessage.blueIndex = bIdx;

			workerMessage.redDataMin = dataRanges[rIdx]?.min ?? 0;
			workerMessage.redDataMax = dataRanges[rIdx]?.max ?? 255;
			workerMessage.greenDataMin = dataRanges[gIdx]?.min ?? 0;
			workerMessage.greenDataMax = dataRanges[gIdx]?.max ?? 255;
			workerMessage.blueDataMin = dataRanges[bIdx]?.min ?? 0;
			workerMessage.blueDataMax = dataRanges[bIdx]?.max ?? 255;

			workerMessage.redMin = uniformsData.multi.r.min;
			workerMessage.redMax = uniformsData.multi.r.max;
			workerMessage.greenMin = uniformsData.multi.g.min;
			workerMessage.greenMax = uniformsData.multi.g.max;
			workerMessage.blueMin = uniformsData.multi.b.min;
			workerMessage.blueMax = uniformsData.multi.b.max;
		}

		return new Promise((resolve, reject) => {
			terrariumRenderWorker.postMessage(workerMessage);

			terrariumRenderWorker.onmessage = async (e) => {
				const { blob, error } = e.data;
				if (error) {
					reject(new Error(`Render worker error: ${error}`));
					return;
				}
				const url = URL.createObjectURL(blob);
				GeoTiffCache.setBlob(id, blob, url);
				resolve(url);
			};

			terrariumRenderWorker.onerror = (error) => {
				console.error('Render worker error:', error);
				reject(new Error(`Render worker error: ${error.message}`));
			};
		});
	} catch (error) {
		console.error('Error rendering raster data', error);
	}
};
