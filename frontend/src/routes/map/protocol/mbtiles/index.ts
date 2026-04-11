/**
 * MBTiles プロトコル
 * sql.jsを使ってブラウザ上でMBTilesファイルを読み込み、
 * MapLibreのaddProtocolでタイルを配信する
 *
 * URL形式: mbtiles://{entryId}/{z}/{x}/{y}
 */
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import { asset } from '$app/paths';

const PROTOCOL_NAME = 'mbtiles';

// エントリIDごとにDBインスタンスを保持
const dbCache = new Map<string, Database>();
let sqlPromise: Promise<SqlJsStatic> | null = null;

const getSql = (): Promise<SqlJsStatic> => {
	if (!sqlPromise) {
		sqlPromise = initSqlJs({
			locateFile: () => asset('/sql-wasm.wasm')
		});
	}
	return sqlPromise;
};

/**
 * MBTilesファイルを登録する
 * @returns メタデータ（name, format, bounds等）
 */
export interface MBTilesVectorLayer {
	id: string;
	fields: Record<string, string>;
	geometryType?: string; // Point, LineString, Polygon, Unknown
	minZoom?: number;
	maxZoom?: number;
}

export interface MBTilesMetadata {
	name: string;
	format: 'pbf' | 'png' | 'jpg' | 'webp' | string;
	bounds?: [number, number, number, number];
	minZoom?: number;
	maxZoom?: number;
	center?: [number, number];
	isVector: boolean;
	vectorLayers: MBTilesVectorLayer[];
	description?: string;
}

export const registerMBTiles = async (entryId: string, file: File): Promise<MBTilesMetadata> => {
	const SQL = await getSql();
	const arrayBuffer = await file.arrayBuffer();
	const db = new SQL.Database(new Uint8Array(arrayBuffer));

	dbCache.set(entryId, db);

	// メタデータを取得
	const meta: Record<string, string> = {};
	try {
		const rows = db.exec('SELECT name, value FROM metadata');
		if (rows.length > 0) {
			for (const row of rows[0].values) {
				meta[row[0] as string] = row[1] as string;
			}
		}
	} catch {
		// メタデータテーブルがない場合
	}

	// boundsをパース
	let bounds: [number, number, number, number] | undefined;
	if (meta.bounds) {
		const parts = meta.bounds.split(',').map((s) => parseFloat(s.trim()));
		if (parts.length === 4 && parts.every((v) => Number.isFinite(v))) {
			bounds = parts as [number, number, number, number];
		}
	}

	// centerをパース
	let center: [number, number] | undefined;
	if (meta.center) {
		const parts = meta.center.split(',').map((s) => parseFloat(s.trim()));
		if (parts.length >= 2 && parts.every((v) => Number.isFinite(v))) {
			center = [parts[0], parts[1]];
		}
	}

	// ベクターレイヤー情報をjsonメタデータから取得
	const isVector = meta.format === 'pbf';
	let vectorLayers: MBTilesVectorLayer[] = [];

	if (isVector && meta.json) {
		try {
			const jsonMeta = JSON.parse(meta.json);

			// vector_layers からレイヤー情報を取得
			if (jsonMeta.vector_layers && Array.isArray(jsonMeta.vector_layers)) {
				vectorLayers = jsonMeta.vector_layers.map((l: any) => ({
					id: l.id,
					fields: l.fields ?? {},
					geometryType: l.geometry_type ?? undefined,
					minZoom: l.minzoom ?? undefined,
					maxZoom: l.maxzoom ?? undefined
				}));
			}

			// tilestats からジオメトリタイプを補完
			if (jsonMeta.tilestats?.layers && Array.isArray(jsonMeta.tilestats.layers)) {
				for (const stat of jsonMeta.tilestats.layers) {
					const layer = vectorLayers.find((l) => l.id === stat.layer);
					if (layer && !layer.geometryType && stat.geometry) {
						layer.geometryType = stat.geometry;
					}
					// vectorLayersにないレイヤーを追加
					if (!layer) {
						vectorLayers.push({
							id: stat.layer,
							fields: {},
							geometryType: stat.geometry ?? undefined
						});
					}
				}
			}
		} catch {
			// JSONパース失敗
		}
	}

	return {
		name: meta.name || file.name.replace(/\.[^.]+$/, ''),
		format: meta.format || 'png',
		bounds,
		minZoom: meta.minzoom ? parseInt(meta.minzoom) : undefined,
		maxZoom: meta.maxzoom ? parseInt(meta.maxzoom) : undefined,
		center,
		isVector,
		vectorLayers,
		description: meta.description ?? undefined
	};
};

/**
 * MBTilesのDBを解放する
 */
export const releaseMBTiles = (entryId: string) => {
	const db = dbCache.get(entryId);
	if (db) {
		db.close();
		dbCache.delete(entryId);
	}
};

/**
 * 全DBを解放する
 */
export const releaseAllMBTiles = () => {
	for (const db of dbCache.values()) {
		db.close();
	}
	dbCache.clear();
};

/**
 * gzip圧縮されたデータを解凍する
 */
const decompressGzip = async (data: Uint8Array): Promise<Uint8Array> => {
	const ds = new DecompressionStream('gzip');
	const writer = ds.writable.getWriter();
	writer.write(data as BufferSource);
	writer.close();
	const reader = ds.readable.getReader();
	const chunks: Uint8Array[] = [];
	let done = false;
	while (!done) {
		const result = await reader.read();
		done = result.done;
		if (result.value) chunks.push(result.value);
	}
	const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
	const result = new Uint8Array(totalLength);
	let offset = 0;
	for (const chunk of chunks) {
		result.set(chunk, offset);
		offset += chunk.length;
	}
	return result;
};

/**
 * gzip圧縮かどうかを判定（マジックナンバー 0x1f 0x8b）
 */
const isGzipped = (data: Uint8Array): boolean =>
	data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;

/**
 * MBTilesプロトコルのリクエストハンドラ
 */
const request = async (
	params: { url: string },
	_abortController: AbortController
): Promise<{ data: Uint8Array }> => {
	const url = params.url.replace(`${PROTOCOL_NAME}://`, '');
	// URL形式: {entryId}/{z}/{x}/{y}
	const parts = url.split('/');
	if (parts.length < 4) {
		return { data: new Uint8Array() };
	}

	const entryId = parts.slice(0, -3).join('/');
	const z = parseInt(parts[parts.length - 3]);
	const x = parseInt(parts[parts.length - 2]);
	const y = parseInt(parts[parts.length - 1]);

	const db = dbCache.get(entryId);
	if (!db) {
		return { data: new Uint8Array() };
	}

	try {
		// MBTilesのY座標はTMS方式（上下反転）
		const tmsY = (1 << z) - 1 - y;

		const result = db.exec(
			'SELECT tile_data FROM tiles WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?',
			[z, x, tmsY]
		);

		if (result.length > 0 && result[0].values.length > 0) {
			let tileData = result[0].values[0][0] as Uint8Array;

			// gzip圧縮されている場合は解凍
			if (isGzipped(tileData)) {
				tileData = await decompressGzip(tileData);
			}

			return { data: tileData };
		}
	} catch (e) {
		console.error('[MBTiles] Tile query error:', e);
	}

	return { data: new Uint8Array() };
};

/**
 * mapStoreから呼ぶ用のプロトコル定義
 */
export const mbtilesProtocol = () => ({
	protocolName: PROTOCOL_NAME,
	request
});
