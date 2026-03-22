import { base } from '$app/paths';

import type { RasterBands, BandDataRange } from '$routes/map/utils/file/geotiff';

export interface GeoJSONFeature {
	type: 'Feature';
	geometry: any;
	properties: { [key: string]: any };
	id?: string | number;
}

export interface GeoJSONFeatureCollection {
	type: 'FeatureCollection';
	features: GeoJSONFeature[];
}

export interface GpkgReadOptions {
	tableName?: string;
	includeColumns?: string[];
	excludeColumns?: string[];
	maxFeatures?: number;
	boundingBox?: [number, number, number, number];
}

export interface GpkgInfo {
	featureTables: string[];
	tileTables: string[];
	tableInfo: { [tableName: string]: any };
}

export interface GpkgRasterResult {
	bands: RasterBands;
	width: number;
	height: number;
	bounds: [number, number, number, number];
	epsg: number | null;
	nodata: number | null;
	dataRanges: BandDataRange[];
}

// ---- ワーカー管理 ----

let _worker: Worker | null = null;
let _requestId = 0;
const _pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();

const getWorker = (): Worker => {
	if (!_worker) {
		_worker = new Worker(new URL('./gpkg.worker.ts', import.meta.url), {
			type: 'module'
		});
		_worker.onmessage = (e: MessageEvent) => {
			const { id, result, error } = e.data;
			const p = _pending.get(id);
			if (p) {
				_pending.delete(id);
				if (error) {
					p.reject(new Error(error));
				} else {
					p.resolve(result);
				}
			}
		};
		_worker.onerror = (e) => {
			// すべてのpendingリクエストをreject
			for (const [id, p] of _pending) {
				p.reject(new Error(e.message ?? 'Worker error'));
				_pending.delete(id);
			}
		};
	}
	return _worker;
};

const workerRequest = <T>(
	type: string,
	data: Uint8Array,
	options?: any,
	tableName?: string
): Promise<T> => {
	const worker = getWorker();
	const id = _requestId++;
	const wasmUrl = `${base}/sql-wasm.wasm`;

	return new Promise<T>((resolve, reject) => {
		_pending.set(id, { resolve, reject });
		// コピーしてtransfer（呼び出し元のバッファを無効化しないため）
		const copy = new Uint8Array(data);
		worker.postMessage({ id, type, data: copy, options, tableName, wasmUrl }, [copy.buffer]);
	});
};

// ---- 公開API ----

export const getGpkgInfo = async (filePath: string | Uint8Array): Promise<GpkgInfo> => {
	const data = filePath instanceof Uint8Array ? filePath : new TextEncoder().encode(filePath);
	return workerRequest<GpkgInfo>('getInfo', data);
};

export const gpkgToGeoJson = async (
	filePath: string | Uint8Array,
	options: GpkgReadOptions = {}
): Promise<GeoJSONFeatureCollection> => {
	const data = filePath instanceof Uint8Array ? filePath : new TextEncoder().encode(filePath);
	return workerRequest<GeoJSONFeatureCollection>('toGeoJson', data, options);
};

export const gpkgToRaster = async (
	filePath: string | Uint8Array,
	tableName: string
): Promise<GpkgRasterResult> => {
	const data = filePath instanceof Uint8Array ? filePath : new TextEncoder().encode(filePath);
	const raw = await workerRequest<any>('toRaster', data, undefined, tableName);

	// ワーカーからTransferableで渡されたArrayBufferをTypedArrayに復元
	const bands: RasterBands = raw.bandBuffers.map((buf: ArrayBuffer) => {
		if (raw.numBands === 1) {
			return new Float32Array(buf);
		}
		return new Uint8Array(buf);
	});

	return {
		bands,
		width: raw.width,
		height: raw.height,
		bounds: raw.bounds,
		epsg: raw.epsg,
		nodata: raw.nodata,
		dataRanges: raw.dataRanges
	};
};
