import JSZip from 'jszip';

import {
	buildAuxXml,
	calculateBandStatsFromBlob,
	calculateGeoTransformFromBbox,
	latToMercY,
	lngToMercX
} from '$routes/map/utils/formats/raster/aux-xml';
import { terminateEncodeWorker } from '$routes/map/utils/formats/raster/terrarium';
import {
	releaseRenderTexture,
	terminateRenderWorker
} from '$routes/map/utils/formats/raster/terrarium-render';

/** バンドごとの min/max データ範囲 */
export interface BandDataRange {
	min: number;
	max: number;
}

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
		if (releaseRenderTexture(key)) {
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
