import type { FeatureCollection } from '$routes/map/types/geojson';
import type {
	TabularPreview,
	TabularPreviewOptions,
	TabularRow
} from '$routes/map/utils/formats/tabular';
import { resolveStaticAssetPath } from '$routes/map/utils/platform/asset-path';

export interface SqliteGeometryColumnInfo {
	columnName: string;
	geometryType: number | null;
	srid: number | null;
	geometryFormat: string | null;
}

export interface SqliteTableInfo {
	name: string;
	columns: string[];
	rowCount: number | null;
	geometryColumns: SqliteGeometryColumnInfo[];
}

export interface SqlitePreview extends TabularPreview {
	tables: SqliteTableInfo[];
	activeTable: string;
}

export interface SqliteTableRows {
	headers: string[];
	rows: TabularRow[];
}

export interface SqliteGeoJsonResult {
	geojson: FeatureCollection;
}

type PendingRequest = {
	resolve: (value: any) => void;
	reject: (reason?: Error) => void;
};

let worker: Worker | null = null;
let requestId = 0;
const pendingRequests = new Map<number, PendingRequest>();

const getWorker = (): Worker => {
	if (!worker) {
		worker = new Worker(new URL('./sqlite.worker.ts', import.meta.url), {
			type: 'module'
		});

		worker.onmessage = (
			event: MessageEvent<{ id: number; result?: unknown; error?: string; }>
		) => {
			const { id, result, error } = event.data;
			const pending = pendingRequests.get(id);
			if (!pending) return;

			pendingRequests.delete(id);
			if (error) {
				pending.reject(new Error(error));
				return;
			}

			pending.resolve(result);
		};

		worker.onerror = (event) => {
			for (const pending of pendingRequests.values()) {
				pending.reject(new Error(event.message ?? 'Worker error'));
			}
			pendingRequests.clear();
		};
	}

	return worker;
};

const sendCommand = <T>(
	message: Record<string, unknown>,
	transfer?: Transferable[]
): Promise<T> => {
	const sqliteWorker = getWorker();
	const id = requestId++;

	return new Promise<T>((resolve, reject) => {
		pendingRequests.set(id, { resolve, reject });
		const payload = { ...message, id };
		if (transfer) {
			sqliteWorker.postMessage(payload, transfer);
			return;
		}
		sqliteWorker.postMessage(payload);
	});
};

export const openSqlite = async (data: Uint8Array): Promise<void> => {
	const wasmUrl = resolveStaticAssetPath('/sql-wasm.wasm');
	const copy = new Uint8Array(data);
	await sendCommand<boolean>({ type: 'open', data: copy, wasmUrl }, [copy.buffer]);
};

export const closeSqlite = (): void => {
	if (!worker) return;
	worker.terminate();
	worker = null;
	pendingRequests.clear();
};

export const getSqliteTables = (): Promise<SqliteTableInfo[]> =>
	sendCommand<SqliteTableInfo[]>({ type: 'getTables' });

export const getSqlitePreview = async (
	tableName?: string,
	options: TabularPreviewOptions = {}
): Promise<SqlitePreview> => {
	const tables = await getSqliteTables();
	const activeTable = tableName && tables.some((table) => table.name === tableName)
		? tableName
		: (tables[0]?.name ?? '');

	if (!activeTable) {
		return {
			tables,
			activeTable: '',
			headers: [],
			rows: []
		};
	}

	const preview = await sendCommand<TabularPreview>({
		type: 'getPreview',
		tableName: activeTable,
		previewRowCount: options.previewRowCount ?? 5
	});

	return {
		...preview,
		tables,
		activeTable
	};
};

export const getSqliteTableRows = (tableName: string): Promise<SqliteTableRows> =>
	sendCommand<SqliteTableRows>({
		type: 'getRows',
		tableName
	});

export const getSqliteTableGeoJson = (
	tableName: string,
	geometryColumn: string
): Promise<SqliteGeoJsonResult> =>
	sendCommand<SqliteGeoJsonResult>({
		type: 'toGeoJson',
		tableName,
		geometryColumn
	});
