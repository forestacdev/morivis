import { fromArrayBuffer } from 'geotiff';
import type { ReadRasterResult } from 'geotiff';
import { proj4Dict, citationDict } from '$routes/utils/proj/dict';
import { transformBbox } from '$routes/utils/proj';
import type { BandTypeKey, ShingleBandData, MultiBandData } from '$routes/data/types/raster';

export class GeoTiffCache {
	private static dataUrlCache: Map<string, string> = new Map();
	private static rasterCache: Map<string, Float32Array[]> = new Map();
	private static bboxCache: Map<string, [number, number, number, number]> = new Map();

	static setDataUrl(key: string, url: string) {
		this.dataUrlCache.set(key, url);
	}

	static setRasters(key: string, rasters: Float32Array[]) {
		this.rasterCache.set(key, rasters);
	}

	static setBbox(key: string, bbox: [number, number, number, number]) {
		this.bboxCache.set(key, bbox);
	}

	static getDataUrl(key: string): string | undefined {
		return this.dataUrlCache.get(key);
	}

	static getRasters(key: string): Float32Array[] | undefined {
		return this.rasterCache.get(key);
	}

	static getBbox(key: string): [number, number, number, number] | undefined {
		return this.bboxCache.get(key);
	}

	static removeDataUrl(key: string): void {
		this.dataUrlCache.delete(key);
	}
	static removeRasters(key: string): void {
		this.rasterCache.delete(key);
	}
	static removeBbox(key: string): void {
		this.bboxCache.delete(key);
	}
	static clear(): void {
		this.dataUrlCache.clear();
		this.rasterCache.clear();
		this.bboxCache.clear();
	}
	static hasDataUrl(key: string): boolean {
		return this.dataUrlCache.has(key);
	}
	static hasRasters(key: string): boolean {
		return this.rasterCache.has(key);
	}
	static hasBbox(key: string): boolean {
		return this.bboxCache.has(key);
	}
	static keysDataUrl(): IterableIterator<string> {
		return this.dataUrlCache.keys();
	}
	static keysRasters(): IterableIterator<string> {
		return this.rasterCache.keys();
	}
	static keysBbox(): IterableIterator<string> {
		return this.bboxCache.keys();
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
	try {
		return new Promise((resolve, reject) => {
			if (rasters.length === 1) {
				return resolve({
					rastersData: rasters[0] as Float32Array[],
					size: 1
				});
			}

			const worker = new Worker(new URL('./convert-worker.ts', import.meta.url), {
				type: 'module'
			});

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
				worker.terminate(); // Workerを終了
			};
		});
	} catch (error) {
		console.error(`Error processing image`, error);
	}
};

// ラスターデータの読み込み
export const loadRasterData = async (
	id: string,
	url: string,
	mode: BandTypeKey,
	UniformsData: ShingleBandData | MultiBandData
): Promise<
	| {
			url: string;
			bbox: [number, number, number, number];
	  }
	| undefined
> => {
	try {
		const response = await fetch(url);
		const arrayBuffer = await response.arrayBuffer();
		const tiff = await fromArrayBuffer(arrayBuffer);
		const image = await tiff.getImage();
		const width = image.getWidth();
		const height = image.getHeight();

		const geoKeys = image.geoKeys;
		let epsgCode: string | number | null = null;
		if (geoKeys) {
			// ① 明示的な EPSG コードがあるか確認
			if (geoKeys.ProjectedCSTypeGeoKey && geoKeys.ProjectedCSTypeGeoKey !== 32767) {
				epsgCode = geoKeys.ProjectedCSTypeGeoKey;
			} else if (geoKeys.GeographicTypeGeoKey && geoKeys.GeographicTypeGeoKey !== 32767) {
				epsgCode = geoKeys.GeographicTypeGeoKey;
			}
			// ② EPSGコードがなく、GTCitationGeoKey から判別できる場合
			else if (geoKeys.GTCitationGeoKey) {
				const citation = geoKeys.GTCitationGeoKey.trim();

				if (citationDict[citation]) {
					epsgCode = citationDict[citation];
				} else {
					console.warn(`Unknown citation string: "${citation}"`);
				}
			}
		} else {
			console.warn('No geoKeys found in the image.');
		}

		let extent;
		if (!GeoTiffCache.hasBbox(id)) {
			if (epsgCode === '4326' || epsgCode === 4326 || epsgCode === null) {
				extent = image.getBoundingBox();
			} else {
				const prjContent = proj4Dict[epsgCode];
				extent = transformBbox(image.getBoundingBox(), prjContent); // EPSG:4326に変換
			}

			GeoTiffCache.setBbox(id, extent as [number, number, number, number]);
		}

		let rasters: Float32Array[] = [];
		let bandCount = 1;
		if (GeoTiffCache.hasRasters(id)) {
			const cachedRasters = GeoTiffCache.getRasters(id);
			if (cachedRasters) {
				rasters = cachedRasters;
			}
		} else {
			const rasterData = await image.readRasters({ interleave: false });
			const { rastersData, size } = await getRasters(rasterData, width, height);
			rasters = rastersData as Float32Array[];
			bandCount = size;
		}

		// nodataの取得
		const nodata =
			image.fileDirectory.GDAL_NODATA !== undefined
				? parseFloat(image.fileDirectory.GDAL_NODATA)
				: null;

		const min = 0;
		const max = 255;

		return new Promise((resolve, reject) => {
			const worker = new Worker(new URL('./render-worker.ts', import.meta.url), {
				type: 'module'
			});

			worker.postMessage({
				rasters,
				size: bandCount,
				type: mode,
				min,
				max,
				width,
				height
			});

			// Define message handler once
			worker.onmessage = async (e) => {
				const { blob } = e.data;

				resolve({
					url: URL.createObjectURL(blob),
					bbox: extent
				});

				worker.terminate(); // Workerを終了
			};

			// Added error handling
			worker.onerror = (error) => {
				console.error('Worker error:', error);
				reject(new Error(`Worker error: ${error.message}`));
				worker.terminate(); // Workerを終了
			};
		});
	} catch (error) {
		console.error(`Error processing image`, error);
	}
};
