import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import { asset } from '$app/paths';
import type { MBTilesMetadata, MBTilesVectorLayer } from './index';

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

let sqlPromise: Promise<SqlJsStatic> | null = null;

const getSql = (): Promise<SqlJsStatic> => {
	if (!sqlPromise) {
		sqlPromise = initSqlJs({
			locateFile: () => asset('/sql-wasm.wasm')
		});
	}
	return sqlPromise;
};

const parseBounds = (value?: string): [number, number, number, number] | undefined => {
	if (!value) return undefined;
	const parts = value.split(',').map((v) => parseFloat(v.trim()));
	if (parts.length !== 4 || parts.some((v) => !Number.isFinite(v))) return undefined;
	return parts as [number, number, number, number];
};

const parseCenter = (value?: string): [number, number] | undefined => {
	if (!value) return undefined;
	const parts = value.split(',').map((v) => parseFloat(v.trim()));
	if (parts.length < 2 || parts.some((v) => !Number.isFinite(v))) return undefined;
	return [parts[0], parts[1]];
};

const tileXToLng = (x: number, z: number): number => (x / 2 ** z) * 360 - 180;

const tileYToLat = (y: number, z: number): number => {
	const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
	return (180 / Math.PI) * Math.atan(Math.sinh(n));
};

const calculateBoundsFromTiles = (db: Database): [number, number, number, number] | undefined => {
	let stmt: ReturnType<Database['prepare']> | null = null;

	try {
		stmt = db.prepare(
			'SELECT MIN(zoom_level), MAX(zoom_level), MIN(tile_column), MAX(tile_column), MIN(tile_row), MAX(tile_row) FROM tiles'
		);
		if (!stmt.step()) return undefined;

		const [minZoom, maxZoom, minColumn, maxColumn, minRow, maxRow] = stmt.get() as Array<
			number | null
		>;
		if (
			maxZoom === null ||
			minColumn === null ||
			maxColumn === null ||
			minRow === null ||
			maxRow === null
		) {
			return undefined;
		}

		const zoom = maxZoom;
		const tileCount = 2 ** zoom;
		const minX = minColumn;
		const maxX = maxColumn + 1;
		const minY = tileCount - 1 - maxRow;
		const maxY = tileCount - minRow;

		const bounds: [number, number, number, number] = [
			tileXToLng(minX, zoom),
			tileYToLat(maxY, zoom),
			tileXToLng(maxX, zoom),
			tileYToLat(minY, zoom)
		];
		return bounds.every((value) => Number.isFinite(value)) ? bounds : undefined;
	} catch {
		return undefined;
	} finally {
		stmt?.free();
	}
};

const parseVectorLayers = (jsonText?: string): MBTilesVectorLayer[] => {
	if (!jsonText) return [];

	try {
		const jsonMeta = JSON.parse(jsonText);
		const vectorLayers: MBTilesVectorLayer[] = [];

		if (jsonMeta.vector_layers && Array.isArray(jsonMeta.vector_layers)) {
			for (const layer of jsonMeta.vector_layers) {
				vectorLayers.push({
					id: layer.id,
					fields: layer.fields ?? {},
					geometryType: layer.geometry_type ?? undefined,
					minZoom: layer.minzoom ?? undefined,
					maxZoom: layer.maxzoom ?? undefined
				});
			}
		}

		if (jsonMeta.tilestats?.layers && Array.isArray(jsonMeta.tilestats.layers)) {
			for (const stat of jsonMeta.tilestats.layers) {
				const existing = vectorLayers.find((layer) => layer.id === stat.layer);
				if (existing) {
					if (!existing.geometryType && stat.geometry) existing.geometryType = stat.geometry;
					continue;
				}
				vectorLayers.push({
					id: stat.layer,
					fields: {},
					geometryType: stat.geometry ?? undefined
				});
			}
		}

		return vectorLayers;
	} catch {
		return [];
	}
};

const extractMetadata = (db: Database, fileName: string): MBTilesMetadata => {
	const meta: Record<string, string> = {};
	let metadataStmt: ReturnType<Database['prepare']> | null = null;

	try {
		metadataStmt = db.prepare('SELECT name, value FROM metadata');
		while (metadataStmt.step()) {
			const [name, value] = metadataStmt.get() as [string, string];
			if (typeof name === 'string' && typeof value === 'string') {
				meta[name] = value;
			}
		}
	} catch {
		// メタデータテーブルがない場合
	} finally {
		metadataStmt?.free();
	}

	const isVector = meta.format === 'pbf';
	const bounds = parseBounds(meta.bounds) ?? calculateBoundsFromTiles(db);
	const center =
		parseCenter(meta.center) ??
		(bounds ? [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2] : undefined);

	return {
		name: meta.name || fileName.replace(/\.[^.]+$/, ''),
		format: meta.format || 'png',
		bounds,
		minZoom: meta.minzoom ? parseInt(meta.minzoom, 10) : undefined,
		maxZoom: meta.maxzoom ? parseInt(meta.maxzoom, 10) : undefined,
		center,
		isVector,
		vectorLayers: isVector ? parseVectorLayers(meta.json) : [],
		description: meta.description ?? undefined
	};
};

self.onmessage = async (event: MessageEvent<MetadataWorkerRequest>) => {
	const message = event.data;

	try {
		if (message.type !== 'extractMetadata') return;

		const SQL = await getSql();
		const db = new SQL.Database(new Uint8Array(message.buffer));
		try {
			const metadata = extractMetadata(db, message.fileName);
			const response: MetadataWorkerResponse = {
				id: message.id,
				metadata
			};
			self.postMessage(response);
		} finally {
			db.close();
		}
	} catch (error) {
		const response: MetadataWorkerResponse = {
			id: message.id,
			error: error instanceof Error ? error.message : String(error)
		};
		self.postMessage(response);
	}
};
