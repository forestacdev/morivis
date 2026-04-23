import type { TypedArray, ReadRasterResult } from 'geotiff';
import JSZip from 'jszip';

import type { RasterTiffStyle } from '$routes/map/data/types/raster';
import { ColorMapManager } from '$routes/map/utils/style/color-mapping';
import {
	calculateGeoTransformFromBbox,
	buildAuxXml,
	calculateBandStatsFromBlob,
	lngToMercX,
	latToMercY
} from '$routes/map/utils/formats/aux.xml';

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

	// --- 4326 再投影 ---
	private static is4326Set: Set<string> = new Set();
	private static rawBboxCache: Map<string, [number, number, number, number]> = new Map();

	static markAs4326(key: string) {
		this.is4326Set.add(key);
	}
	static is4326(key: string): boolean {
		return this.is4326Set.has(key);
	}
	static setRawBbox(key: string, bbox: [number, number, number, number]) {
		this.rawBboxCache.set(key, bbox);
	}
	static getRawBbox(key: string): [number, number, number, number] | undefined {
		return this.rawBboxCache.get(key);
	}

	// --- エクスポート ---

	/**
	 * レンダリング済み画像 + aux.xml を zip にまとめてダウンロードする
	 */
	static async exportRenderedPng(key: string): Promise<void> {
		const entry = this.blobCache.get(key);
		if (!entry) return;

		const bbox = this.bboxCache.get(key);
		const filename = `rendered_${key}.png`;

		const zip = new JSZip();
		zip.file(filename, entry.blob);

		// aux.xml 生成（メルカトル座標 EPSG:3857、統計情報付き）
		if (bbox) {
			const bitmap = await createImageBitmap(entry.blob);
			const actualWidth = bitmap.width;
			const actualHeight = bitmap.height;
			bitmap.close();

			// WGS84 bbox → Web Mercator (EPSG:3857) に変換
			const mercBbox: [number, number, number, number] = [
				lngToMercX(bbox[0]),
				latToMercY(bbox[1]),
				lngToMercX(bbox[2]),
				latToMercY(bbox[3])
			];

			const geoTransform = calculateGeoTransformFromBbox(mercBbox, actualWidth, actualHeight);
			const bandStats = await calculateBandStatsFromBlob(entry.blob);
			const xml = buildAuxXml(geoTransform, 3857, bandStats);
			zip.file(`${filename}.aux.xml`, xml);
		}

		const zipBlob = await zip.generateAsync({ type: 'blob' });
		const url = URL.createObjectURL(zipBlob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `rendered_${key}.zip`;
		a.click();
		URL.revokeObjectURL(url);
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
		this.is4326Set.clear();
		this.rawBboxCache.clear();
		// Workerを停止（テクスチャも解放される）
		terminateEncodeWorker();
		terminateRenderWorker();
	}

	static release(key: string): void {
		this.revokeTerrarium(key);
		this.dataRangeCache.delete(key);
		this.sizeCache.delete(key);
		this.bboxCache.delete(key);
		this.numBandsCache.delete(key);
		this.revokeBlob(key);
		this.textureTransferredSet.delete(key);
		this.is4326Set.delete(key);
		this.rawBboxCache.delete(key);
		// Workerが存在する場合のみテクスチャ解放を通知
		if (_renderWorker) {
			_renderWorker.postMessage({ action: 'release', entryId: key });
			// キャッシュが空になったらWorkerを停止
			if (this.terrariumCache.size === 0) {
				terminateRenderWorker();
			}
		}
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

// --- Workers (遅延初期化) ---

let _encodeWorker: Worker | null = null;
let _renderWorker: Worker | null = null;

const getEncodeWorker = (): Worker => {
	if (!_encodeWorker) {
		_encodeWorker = new Worker(new URL('./terrarium_encode.worker.ts', import.meta.url), {
			type: 'module'
		});
	}
	return _encodeWorker;
};

const getRenderWorker = (): Worker => {
	if (!_renderWorker) {
		_renderWorker = new Worker(new URL('./terrarium_render.worker.ts', import.meta.url), {
			type: 'module'
		});
	}
	return _renderWorker;
};

/** エンコードWorkerを停止する（全エンコード完了後に呼ぶ） */
export const terminateEncodeWorker = () => {
	if (_encodeWorker) {
		_encodeWorker.terminate();
		_encodeWorker = null;
	}
};

/** レンダーWorkerを停止する（全TIFFエントリ解放後に呼ぶ） */
export const terminateRenderWorker = () => {
	if (_renderWorker) {
		_renderWorker.terminate();
		_renderWorker = null;
	}
};

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
		getEncodeWorker().postMessage({
			band,
			width,
			height,
			nodata,
			dataMin,
			dataMax
		});

		getEncodeWorker().onmessage = (e) => {
			const { blob, error } = e.data;
			if (error) {
				reject(new Error(`Encode error: ${error}`));
				return;
			}
			resolve(blob);
		};

		getEncodeWorker().onerror = (error) => {
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

	// エンコード完了後にWorkerを停止
	terminateEncodeWorker();
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

		// 4326→メルカトル再投影
		if (GeoTiffCache.is4326(id)) {
			const bbox = GeoTiffCache.getBbox(id); // クリップ済み（表示用）
			const rawBbox = GeoTiffCache.getRawBbox(id); // 元の範囲（テクスチャUV計算用）
			if (bbox && rawBbox) {
				workerMessage.reproject4326 = true;
				workerMessage.bboxDisplay = [bbox[0], bbox[1], bbox[2], bbox[3]];
				workerMessage.bboxSource = [rawBbox[0], rawBbox[1], rawBbox[2], rawBbox[3]];

				// メルカトルのアスペクト比で出力画像サイズを計算
				const DEG2RAD = Math.PI / 180;
				const latToMercY = (lat: number) => Math.log(Math.tan(lat * DEG2RAD * 0.5 + Math.PI / 4));
				const mercYMax = latToMercY(bbox[3]);
				const mercYMin = latToMercY(bbox[1]);
				const lngRange = bbox[2] - bbox[0];
				const mercYRange = mercYMax - mercYMin;

				// 幅は元画像と同じ、高さはメルカトルのアスペクト比に合わせる
				// WebGLの最大テクスチャサイズを超えないよう制限
				const MAX_SIZE = 4096;
				let outputWidth = size.width;
				let outputHeight = Math.round(outputWidth * (mercYRange / (lngRange * DEG2RAD)));

				if (outputWidth > MAX_SIZE || outputHeight > MAX_SIZE) {
					const scale = MAX_SIZE / Math.max(outputWidth, outputHeight);
					outputWidth = Math.round(outputWidth * scale);
					outputHeight = Math.round(outputHeight * scale);
				}

				workerMessage.outputWidth = outputWidth;
				workerMessage.outputHeight = outputHeight;
			}
		}

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

		// ユニフォーム値（min/max を CPU側で正規化: 0〜1）
		if (mode === 'single') {
			const range = dataRanges[uniformsData.single.index];
			const dMin = range?.min ?? 0;
			const dMax = range?.max ?? 1;
			const invRange = dMax !== dMin ? 1 / (dMax - dMin) : 0;

			workerMessage.bandIndex = uniformsData.single.index;
			workerMessage.min = (uniformsData.single.min - dMin) * invRange;
			workerMessage.max = (uniformsData.single.max - dMin) * invRange;
			workerMessage.colorArray = new Uint8Array(colorArray);
		} else if (mode === 'multi') {
			const normalize = (val: number, dMin: number, dMax: number) =>
				dMax !== dMin ? (val - dMin) / (dMax - dMin) : 0;

			const rRange = dataRanges[uniformsData.multi.r.index];
			const gRange = dataRanges[uniformsData.multi.g.index];
			const bRange = dataRanges[uniformsData.multi.b.index];

			workerMessage.redIndex = uniformsData.multi.r.index;
			workerMessage.greenIndex = uniformsData.multi.g.index;
			workerMessage.blueIndex = uniformsData.multi.b.index;

			workerMessage.redMin = normalize(uniformsData.multi.r.min, rRange.min, rRange.max);
			workerMessage.redMax = normalize(uniformsData.multi.r.max, rRange.min, rRange.max);
			workerMessage.greenMin = normalize(uniformsData.multi.g.min, gRange.min, gRange.max);
			workerMessage.greenMax = normalize(uniformsData.multi.g.max, gRange.min, gRange.max);
			workerMessage.blueMin = normalize(uniformsData.multi.b.min, bRange.min, bRange.max);
			workerMessage.blueMax = normalize(uniformsData.multi.b.max, bRange.min, bRange.max);
		}

		return new Promise((resolve, reject) => {
			getRenderWorker().postMessage(workerMessage);

			getRenderWorker().onmessage = async (e) => {
				const { blob, error } = e.data;
				if (error) {
					reject(new Error(`Render worker error: ${error}`));
					return;
				}
				const url = URL.createObjectURL(blob);
				GeoTiffCache.setBlob(id, blob, url);
				resolve(url);
			};

			getRenderWorker().onerror = (error) => {
				console.error('Render worker error:', error);
				reject(new Error(`Render worker error: ${error.message}`));
			};
		});
	} catch (error) {
		console.error('Error rendering raster data', error);
	}
};
