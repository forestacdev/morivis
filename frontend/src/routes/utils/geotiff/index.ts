import { fromArrayBuffer } from 'geotiff';
import type { ReadRasterResult } from 'geotiff';
import { proj4Dict, citationDict } from '$routes/utils/proj/dict';
import { transformBbox } from '$routes/utils/proj';
import type {
	BandTypeKey,
	ShingleBandData,
	MultiBandData,
	RasterTiffStyle
} from '$routes/data/types/raster';
import { ColorMapManager } from '$routes/utils/colorMapping';

export class GeoTiffCache {
	private static dataUrlCache: Map<string, string> = new Map();
	private static rastersCache: Map<string, Float32Array[]> = new Map();
	private static bboxCache: Map<string, [number, number, number, number]> = new Map();
	private static numBandsCache: Map<string, number> = new Map();

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

export class ImageCache {
	private static cache = new Map<string, Blob>();

	static set(key: string, blob: Blob) {
		this.cache.set(key, blob);
	}
	static get(key: string): Blob | undefined {
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
const worker = new Worker(new URL('./convert-worker.ts', import.meta.url), {
	type: 'module'
});
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
	try {
		return new Promise((resolve, reject) => {
			if (rasters.length === 1) {
				return resolve({
					rastersData: rasters[0] as Float32Array[],
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
				reject(new Error(`Worker error: ${error.message}`));
			};

			worker.terminate(); // Workerを終了
		});
	} catch (error) {
		console.error(`Error processing image`, error);
	}
};

const rebderWorker = new Worker(new URL('./render-worker.ts', import.meta.url), {
	type: 'module'
});

const colorMapManager = new ColorMapManager();

// ラスターデータの読み込み
export const loadRasterData = async (
	id: string,
	url: string,
	visualization: RasterTiffStyle['visualization']
): Promise<string | undefined> => {
	try {
		// const geoKeys = image.geoKeys;
		// let epsgCode: string | number | null = null;
		// if (geoKeys) {
		// 	// ① 明示的な EPSG コードがあるか確認
		// 	if (geoKeys.ProjectedCSTypeGeoKey && geoKeys.ProjectedCSTypeGeoKey !== 32767) {
		// 		epsgCode = geoKeys.ProjectedCSTypeGeoKey;
		// 	} else if (geoKeys.GeographicTypeGeoKey && geoKeys.GeographicTypeGeoKey !== 32767) {
		// 		epsgCode = geoKeys.GeographicTypeGeoKey;
		// 	}
		// 	// ② EPSGコードがなく、GTCitationGeoKey から判別できる場合
		// 	else if (geoKeys.GTCitationGeoKey) {
		// 		const citation = geoKeys.GTCitationGeoKey.trim();

		// 		if (citationDict[citation]) {
		// 			epsgCode = citationDict[citation];
		// 		} else {
		// 			console.warn(`Unknown citation string: "${citation}"`);
		// 		}
		// 	}
		// } else {
		// 	console.warn('No geoKeys found in the image.');
		// }

		// let extent;
		// if (!GeoTiffCache.hasBbox(id)) {
		// 	if (epsgCode === '4326' || epsgCode === 4326 || epsgCode === null) {
		// 		extent = image.getBoundingBox();
		// 	} else {
		// 		const prjContent = proj4Dict[epsgCode];
		// 		extent = transformBbox(image.getBoundingBox(), prjContent); // EPSG:4326に変換
		// 	}

		// 	GeoTiffCache.setBbox(id, extent as [number, number, number, number]);
		// }

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
			const { rastersData, size } = await getRasters(rasterData, width, height);
			rasters = rastersData as Float32Array[];
			bandCount = size;
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

		return new Promise((resolve, reject) => {
			rebderWorker.postMessage({
				rasters,
				size: bandCount,
				type: mode,
				min: uniformsData.single.min,
				max: uniformsData.single.max,
				width,
				height,
				colorArray
			});

			// Define message handler once
			rebderWorker.onmessage = async (e) => {
				const { blob } = e.data;

				const existingUrl = GeoTiffCache.getBlobUrl(id);
				if (existingUrl) {
					URL.revokeObjectURL(existingUrl); // ✅ 古いURLを明示的に解放
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
