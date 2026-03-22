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
			for (const [, p] of _pending) {
				p.reject(new Error(e.message ?? 'Worker error'));
			}
			_pending.clear();
		};
	}
	return _worker;
};

const sendCommand = <T>(msg: Record<string, any>, transfer?: Transferable[]): Promise<T> => {
	const worker = getWorker();
	const id = _requestId++;
	msg.id = id;

	return new Promise<T>((resolve, reject) => {
		_pending.set(id, { resolve, reject });
		if (transfer) {
			worker.postMessage(msg, transfer);
		} else {
			worker.postMessage(msg);
		}
	});
};

// ---- 公開API ----

/**
 * GPKGファイルをワーカーで開く（DBをワーカー側で保持）
 * 以降の getGpkgInfoFromOpen / gpkgToGeoJsonFromOpen 等はデータ転送なしで高速
 */
export const openGpkg = async (data: Uint8Array): Promise<void> => {
	const wasmUrl = `${base}/sql-wasm.wasm`;
	const copy = new Uint8Array(data);
	await sendCommand<boolean>(
		{ type: 'open', data: copy, wasmUrl },
		[copy.buffer]
	);
};

/**
 * ワーカーで開いているDBを閉じ、ワーカーを終了してメモリを解放する
 */
export const closeGpkg = (): void => {
	if (_worker) {
		_worker.terminate();
		_worker = null;
		_pending.clear();
	}
};

/**
 * 開いているDBからGpkgInfoを取得（データ転送なし）
 */
export const getGpkgInfo = async (filePath: string | Uint8Array): Promise<GpkgInfo> => {
	// 後方互換: データを渡された場合はopen→getInfo
	const data = filePath instanceof Uint8Array ? filePath : new TextEncoder().encode(filePath);
	await openGpkg(data);
	return sendCommand<GpkgInfo>({ type: 'getInfo' });
};

/**
 * 開いているDBからGeoJSONを取得（データ転送なし）
 */
export const gpkgToGeoJson = async (
	_filePath: string | Uint8Array,
	options: GpkgReadOptions = {}
): Promise<GeoJSONFeatureCollection> =>
	sendCommand<GeoJSONFeatureCollection>({ type: 'toGeoJson', options });

/**
 * 開いているDBからラスターデータを取得（データ転送なし）
 */
export const gpkgToRaster = async (
	_filePath: string | Uint8Array,
	tableName: string
): Promise<GpkgRasterResult> => {
	const raw = await sendCommand<any>({ type: 'toRaster', tableName });

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

/**
 * 開いているDBに対して任意のSQLクエリを実行
 */
export const gpkgQuery = async (
	sql: string
): Promise<{ columns: string[]; values: any[][] }> =>
	sendCommand<{ columns: string[]; values: any[][] }>({ type: 'query', sql });

/**
 * GPKGからスタイル情報を取得（QGIS layer_styles テーブル）
 * QGISでGPKGにスタイルを保存するとlayer_stylesテーブルが作られる
 */
export interface GpkgStyleInfo {
	tableName: string;
	styleName: string;
	styleQML: string | null;
	styleSLD: string | null;
}

export const getGpkgStyles = async (): Promise<GpkgStyleInfo[]> => {
	try {
		// layer_stylesテーブルの存在チェック
		const tableCheck = await gpkgQuery(
			"SELECT name FROM sqlite_master WHERE type='table' AND name='layer_styles'"
		);
		if (tableCheck.values.length === 0) return [];

		const result = await gpkgQuery(
			'SELECT f_table_name, styleName, styleQML, styleSLD FROM layer_styles'
		);

		return result.values.map((row) => ({
			tableName: row[0] as string,
			styleName: (row[1] as string) ?? '',
			styleQML: row[2] as string | null,
			styleSLD: row[3] as string | null
		}));
	} catch {
		return [];
	}
};
