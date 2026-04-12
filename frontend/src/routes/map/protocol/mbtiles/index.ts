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

const setCachedDb = (entryId: string, db: Database) => {
	const currentDb = dbCache.get(entryId);
	if (currentDb && currentDb !== db) currentDb.close();
	dbCache.set(entryId, db);
};

const getCachedDb = (entryId: string): Database | undefined => {
	const db = dbCache.get(entryId);
	if (!db) return undefined;
	dbCache.delete(entryId);
	dbCache.set(entryId, db);
	return db;
};

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
	geometryType?: string;
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

type MetadataWorkerRequest = {
	id: string;
	type: 'extractMetadata';
	fileName: string;
	buffer: ArrayBuffer;
};

type MetadataWorkerResponse = {
	id: string;
	metadata?: MBTilesMetadata;
	error?: string;
};

class MBTilesMetadataWorkerClient {
	private worker: Worker;
	private pendingRequests = new Map<
		string,
		{
			resolve: (value: MBTilesMetadata) => void;
			reject: (reason?: Error) => void;
		}
	>();
	private requestCounter = 0;

	constructor(worker: Worker) {
		this.worker = worker;
		this.worker.addEventListener('message', this.handleMessage);
		this.worker.addEventListener('error', this.handleError);
	}

	extractMetadata = async (fileName: string, buffer: ArrayBuffer): Promise<MBTilesMetadata> => {
		const id = `metadata_${this.requestCounter++}`;

		return new Promise((resolve, reject) => {
			this.pendingRequests.set(id, { resolve, reject });
			const message: MetadataWorkerRequest = {
				id,
				type: 'extractMetadata',
				fileName,
				buffer
			};
			this.worker.postMessage(message, { transfer: [buffer] });
		});
	};

	private handleMessage = (event: MessageEvent<MetadataWorkerResponse>) => {
		const { id, metadata, error } = event.data;
		const request = this.pendingRequests.get(id);
		if (!request) return;

		this.pendingRequests.delete(id);
		if (error) {
			request.reject(new Error(error));
			return;
		}
		if (!metadata) {
			request.reject(new Error('MBTiles metadata missing'));
			return;
		}
		request.resolve(metadata);
	};

	private handleError = (event: ErrorEvent) => {
		console.error('[MBTiles] Metadata worker error:', event);
		for (const request of this.pendingRequests.values()) {
			request.reject(new Error('Metadata worker error occurred'));
		}
		this.pendingRequests.clear();
	};
}

let metadataWorkerClient: MBTilesMetadataWorkerClient | null = null;

const getMetadataWorkerClient = (): MBTilesMetadataWorkerClient => {
	if (!metadataWorkerClient) {
		const worker = new Worker(new URL('./protocol_mbtiles_meta.worker.ts', import.meta.url), {
			type: 'module'
		});
		metadataWorkerClient = new MBTilesMetadataWorkerClient(worker);
	}
	return metadataWorkerClient;
};

export const registerMBTiles = async (entryId: string, file: File): Promise<MBTilesMetadata> => {
	const SQL = await getSql();
	const arrayBuffer = await file.arrayBuffer();
	const db = new SQL.Database(new Uint8Array(arrayBuffer));

	setCachedDb(entryId, db);
	const metadataBuffer = arrayBuffer.slice(0);
	return getMetadataWorkerClient().extractMetadata(file.name, metadataBuffer);
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
	const parts = url.split('/');
	if (parts.length < 4) {
		return { data: new Uint8Array() };
	}

	const entryId = parts.slice(0, -3).join('/');
	const z = parseInt(parts[parts.length - 3], 10);
	const x = parseInt(parts[parts.length - 2], 10);
	const y = parseInt(parts[parts.length - 1], 10);

	const db = getCachedDb(entryId);
	if (!db) {
		return { data: new Uint8Array() };
	}

	try {
		const tmsY = (1 << z) - 1 - y;
		const stmt = db.prepare(
			'SELECT tile_data FROM tiles WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?'
		);
		try {
			stmt.bind([z, x, tmsY]);
			if (stmt.step()) {
				let tileData = stmt.get()[0] as Uint8Array;
				if (isGzipped(tileData)) {
					tileData = await decompressGzip(tileData);
				}
				return { data: tileData };
			}
		} finally {
			stmt.free();
		}
	} catch (e) {
		console.error('[MBTiles] Tile query error:', e);
	}

	return { data: new Uint8Array() };
};

export const mbtilesProtocol = () => ({
	protocolName: PROTOCOL_NAME,
	request
});
