import fgdbRead from 'fgdb/dist/fgdb.js';

import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
import type { Feature, FeatureCollection } from '$routes/map/types/geojson';

// Esri FileGDB の前提確認用リンク
// - File geodatabases:
//   https://pro.arcgis.com/en/pro-app/3.3/help/data/geodatabases/manage-file-gdb/file-geodatabases.htm
// - File geodatabases and Microsoft File Explorer:
//   https://pro.arcgis.com/en/pro-app/3.4/help/data/geodatabases/manage-file-gdb/file-geodatabases-and-windows-explorer.htm
// - File geodatabase size and name limits:
//   https://pro.arcgis.com/en/pro-app/3.4/help/data/geodatabases/manage-file-gdb/file-geodatabase-size-and-name-limits.htm
// - Guide to the File Geodatabase API:
//   https://www.esri.com/arcgis-blog/products/developers/data-management/guide-to-the-file-geodatabase-api

type PathLikeFile = File & { morivisRelativePath?: string };

export const FILE_GDB_DIALOG_EXTENSIONS = ['.gdbtable', '.gdbtablx'] as const;
export const FILE_GDB_RELEVANT_EXTENSIONS = [
	...FILE_GDB_DIALOG_EXTENSIONS,
	'.gdbindexes',
	'.gdbindex',
	'.atx',
	'.spx',
	'.cdf',
	'.freelist'
] as const;

export interface FileGdbInput {
	name: string;
	data: ArrayBuffer | Uint8Array;
}

export interface FileGdbLayer {
	name: string;
	geojson: FeatureCollection;
}

export interface FileGdbAnalyzeResult {
	datasetName: string;
	layers: FileGdbLayer[];
}

export interface FileGdbDebugEvent {
	message: string;
	payload?: unknown;
}

export interface FileGdbFailureDetails {
	datasetName: string;
	rootPath: string | null;
	inputs: Array<{
		name: string;
		bytes: number;
	}>;
	firstError: string | null;
	lastError: string | null;
	events: FileGdbDebugEvent[];
}

interface FileGdbTableEntry {
	index: number;
	data: ArrayBuffer | Uint8Array;
}

type FileGdbCatalogRow = {
	Name?: string;
	[key: string]: unknown;
};

const FILE_GDB_ROOT_PATTERN = /\.gdb$/i;
const FILE_GDB_TABLE_SUFFIX = '.gdbtable';
const FILE_GDB_TABLX_SUFFIX = '.gdbtablx';
const FILE_GDB_SYSTEM_LAYER_PREFIX = 'GDB_';
const FILE_GDB_DEBUG_PREFIX = '[FileGDB]';
const SUPPORTED_GEOMETRY_TYPES = new Set<VectorEntryGeometryType>([
	'Point',
	'LineString',
	'Polygon'
]);

type FgdbProcessShim = {
	browser?: boolean;
	env?: Record<string, string>;
	versions?: {
		node?: string;
	};
};

type FileGdbDebugReporter = (message: string, payload?: unknown) => void;

export class FileGdbParseError extends Error {
	details: FileGdbFailureDetails;

	constructor(message: string, details: FileGdbFailureDetails) {
		super(message);
		this.name = 'FileGdbParseError';
		this.details = details;
	}
}

const logFileGdbDebug = (message: string, payload?: unknown) => {
	if (!import.meta.env.DEV) return;

	if (payload === undefined) {
		console.debug(FILE_GDB_DEBUG_PREFIX, message);
		return;
	}

	console.debug(FILE_GDB_DEBUG_PREFIX, message, payload);
};

const createFileGdbDebugReporter = (events: FileGdbDebugEvent[]): FileGdbDebugReporter =>
	(message, payload) => {
		events.push(payload === undefined ? { message } : { message, payload });
		logFileGdbDebug(message, payload);
	};

const formatTableIndex = (index: number): string => `a${index.toString(16).padStart(8, '0')}`;

const getDataByteLength = (data: ArrayBuffer | Uint8Array): number =>
	data instanceof ArrayBuffer ? data.byteLength : data.byteLength;

const toFgdbArrayBuffer = (data: ArrayBuffer | Uint8Array): ArrayBuffer => {
	if (data instanceof ArrayBuffer) return data;
	return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
};

const summarizeTableEntry = (entry: FileGdbTableEntry) => ({
	index: formatTableIndex(entry.index),
	bytes: getDataByteLength(entry.data)
});

const ensureFgdbProcessShim = () => {
	const globalObject = globalThis as {
		process?: FgdbProcessShim;
	};

	if (!globalObject.process) {
		globalObject.process = {
			browser: true,
			env: {}
		};
		return;
	}

	// fgdb/lib/read は process.browser を直接参照する。
	// 実 Node.js 以外で process がある場合は browser フラグだけ補う。
	if (!globalObject.process.versions?.node) {
		globalObject.process.browser ??= true;
		globalObject.process.env ??= {};
	}
};

const readFgdbTable = (
	table: ArrayBuffer | Uint8Array,
	tablex: ArrayBuffer | Uint8Array
) => {
	ensureFgdbProcessShim();
	// fgdb/lib/read は Vite worker の prebundle で proj4 の CJS 互換が崩れる。
	// browserify 済みの dist 版を使うと proj4 を内包したまま読める。
	return fgdbRead(toFgdbArrayBuffer(table), toFgdbArrayBuffer(tablex));
};

const getBaseName = (pathLikeName: string): string => {
	const normalized = pathLikeName.replace(/\\/g, '/');
	return normalized.split('/').filter(Boolean).at(-1) ?? pathLikeName;
};

const hasFileGdbExtension = (pathLikeName: string): boolean => {
	const normalized = pathLikeName.toLowerCase();
	return FILE_GDB_RELEVANT_EXTENSIONS.some((extension) => normalized.endsWith(extension));
};

const getFileGdbDatasetName = (rootPath: string | null, fallbackName: string | null): string => {
	if (rootPath) {
		return getBaseName(rootPath).replace(FILE_GDB_ROOT_PATTERN, '') || 'FileGDBデータ';
	}

	if (fallbackName) {
		return fallbackName.replace(/\.[^.]+$/, '') || 'FileGDBデータ';
	}

	return 'FileGDBデータ';
};

const getFileGdbTableIndex = (pathLikeName: string, suffix: string): number | null => {
	const baseName = getBaseName(pathLikeName).toLowerCase();
	if (!baseName.endsWith(suffix)) return null;
	if (!baseName.startsWith('a')) return null;

	const hexPart = baseName.slice(1, -suffix.length);
	const index = Number.parseInt(hexPart, 16);
	if (!Number.isFinite(index)) return null;
	if (index !== 1 && index <= 8) return null;

	return index;
};

const getFallbackLayerName = (index: number): string => `a${index.toString(16).padStart(8, '0')}`;

const toFeatureArray = (geojson: FeatureCollection): Feature[] =>
	Array.isArray(geojson.features) ? geojson.features : [];

const normalizeGeometryType = (geometryType?: string | null): VectorEntryGeometryType | null => {
	if (!geometryType) return null;
	if (geometryType === 'Point' || geometryType === 'MultiPoint') return 'Point';
	if (geometryType === 'LineString' || geometryType === 'MultiLineString') return 'LineString';
	if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') return 'Polygon';
	return null;
};

const hasSupportedGeometry = (geojson: FeatureCollection): boolean =>
	toFeatureArray(geojson).some((feature) => {
		const geometryType = normalizeGeometryType(feature.geometry?.type);
		return geometryType !== null && SUPPORTED_GEOMETRY_TYPES.has(geometryType);
	});

const assertFeatureCollection = (value: unknown, layerName: string): FeatureCollection => {
	if (
		typeof value !== 'object'
		|| value === null
		|| (value as { type?: unknown }).type !== 'FeatureCollection'
		|| !Array.isArray((value as { features?: unknown }).features)
	) {
		throw new Error(`FileGDB レイヤー「${layerName}」を GeoJSON として解釈できませんでした`);
	}

	return value as FeatureCollection;
};

const extractFileGdbRootPath = (pathLikeName: string): string | null => {
	const normalized = pathLikeName.replace(/\\/g, '/').replace(/^\/+/, '');
	const segments = normalized.split('/').filter(Boolean);
	const rootIndex = segments.findIndex((segment) => FILE_GDB_ROOT_PATTERN.test(segment));
	if (rootIndex < 0) return null;
	return segments.slice(0, rootIndex + 1).join('/');
};

const readCatalogTable = (
	tableEntries: FileGdbTableEntry[],
	tablxEntries: FileGdbTableEntry[],
	debug: FileGdbDebugReporter
): FileGdbCatalogRow[] => {
	const firstTable = tableEntries[0];
	const firstTablx = tablxEntries[0];

	if (!firstTable || !firstTablx || firstTable.index !== 1 || firstTablx.index !== 1) {
		throw new Error('FileGDB のカタログテーブル a00000001 を見つけられませんでした');
	}

	debug('catalog read start', {
		table: summarizeTableEntry(firstTable),
		tablx: summarizeTableEntry(firstTablx)
	});
	const catalog = readFgdbTable(firstTable.data, firstTablx.data);
	if (!Array.isArray(catalog)) {
		throw new Error('FileGDB のカタログを読み取れませんでした');
	}
	debug('catalog read success', {
		rowCount: catalog.length,
		sampleNames: catalog
			.slice(0, 10)
			.map((row) => (typeof row?.Name === 'string' ? row.Name : null))
			.filter((value): value is string => value !== null)
	});

	return catalog as FileGdbCatalogRow[];
};

const readFeatureLayer = (
	tableEntry: FileGdbTableEntry,
	tablxEntry: FileGdbTableEntry,
	name: string
): FileGdbLayer | null => {
	const geojson = assertFeatureCollection(readFgdbTable(tableEntry.data, tablxEntry.data), name);
	if (!hasSupportedGeometry(geojson)) return null;

	return {
		name,
		geojson
	};
};

export const getFileGdbInputName = (file: File | FileGdbInput): string =>
	((file as PathLikeFile).morivisRelativePath ?? file.name).replace(/^\/+/, '');

export const isFileGdbRelatedFile = (file: File | FileGdbInput): boolean =>
	hasFileGdbExtension(getFileGdbInputName(file));

export const resolveFileGdbInputSet = <T extends File | FileGdbInput>(
	inputs: T[]
): {
	datasetName: string;
	rootPath: string | null;
	inputs: T[];
} => {
	const relevantInputs = inputs.filter((input) => isFileGdbRelatedFile(input));
	if (relevantInputs.length === 0) {
		throw new Error('FileGDB の構成ファイルが見つかりませんでした');
	}

	const rootPaths = Array.from(
		new Set(
			relevantInputs
				.map((input) => extractFileGdbRootPath(getFileGdbInputName(input)))
				.filter((value): value is string => value !== null)
		)
	);

	if (rootPaths.length > 1) {
		throw new Error('複数の FileGDB フォルダは同時に読み込めません');
	}

	const rootPath = rootPaths[0] ?? null;
	const filteredInputs = rootPath
		? relevantInputs.filter((input) =>
				getFileGdbInputName(input).replace(/\\/g, '/').startsWith(`${rootPath}/`)
			)
		: relevantInputs;

	const fallbackName = filteredInputs[0] ? getBaseName(getFileGdbInputName(filteredInputs[0])) : null;

	return {
		datasetName: getFileGdbDatasetName(rootPath, fallbackName),
		rootPath,
		inputs: filteredInputs
	};
};

export const getFileGdbGeometryTypes = (geojson: FeatureCollection): VectorEntryGeometryType[] =>
	Array.from(
		new Set(
			toFeatureArray(geojson)
				.map((feature) => normalizeGeometryType(feature.geometry?.type))
				.filter((value): value is VectorEntryGeometryType => value !== null)
		)
	);

export const parseFileGdbInputs = (rawInputs: FileGdbInput[]): FileGdbAnalyzeResult => {
	const resolved = resolveFileGdbInputSet(rawInputs);
	const debugEvents: FileGdbDebugEvent[] = [];
	const debug = createFileGdbDebugReporter(debugEvents);
	debug('parse start', {
		datasetName: resolved.datasetName,
		rootPath: resolved.rootPath,
		inputs: resolved.inputs.map((input) => ({
			name: getFileGdbInputName(input),
			bytes: getDataByteLength(input.data)
		}))
	});
	const tableMap = new Map<number, ArrayBuffer | Uint8Array>();
	const tablxMap = new Map<number, ArrayBuffer | Uint8Array>();

	for (const input of resolved.inputs) {
		const inputName = getFileGdbInputName(input);
		const tableIndex = getFileGdbTableIndex(inputName, FILE_GDB_TABLE_SUFFIX);
		if (tableIndex !== null) {
			tableMap.set(tableIndex, input.data);
			continue;
		}

		const tablxIndex = getFileGdbTableIndex(inputName, FILE_GDB_TABLX_SUFFIX);
		if (tablxIndex !== null) {
			tablxMap.set(tablxIndex, input.data);
		}
	}

	if (tableMap.size === 0 || tablxMap.size === 0) {
		throw new Error('FileGDB の .gdbtable / .gdbtablx ファイルが不足しています');
	}

	const tableEntries: FileGdbTableEntry[] = Array.from(tableMap.entries())
		.sort(([left], [right]) => left - right)
		.map(([index, data]) => ({ index, data }));
	const tablxEntries: FileGdbTableEntry[] = Array.from(tablxMap.entries())
		.sort(([left], [right]) => left - right)
		.map(([index, data]) => ({ index, data }));
	debug('resolved table pairs', {
		tableEntries: tableEntries.map(summarizeTableEntry),
		tablxEntries: tablxEntries.map(summarizeTableEntry)
	});

	for (const tableEntry of tableEntries) {
		if (!tablxMap.has(tableEntry.index)) {
			throw new Error(
				`FileGDB テーブル ${tableEntry.index.toString(16)} に対応する .gdbtablx が見つかりません`
			);
		}
	}

	const userTableEntries = tableEntries.filter((entry) => entry.index !== 1);
	const userTablxMap = new Map(
		tablxEntries.filter((entry) => entry.index !== 1).map((entry) => [entry.index, entry])
	);
	const layers: FileGdbLayer[] = [];
	let firstError: Error | null = null;
	let lastError: Error | null = null;

	try {
		const catalog = readCatalogTable(tableEntries, tablxEntries, debug);
		let position = 1;

		for (const row of catalog) {
			const layerName = typeof row?.Name === 'string' ? row.Name : null;
			if (!layerName || layerName.startsWith(FILE_GDB_SYSTEM_LAYER_PREFIX)) continue;

			const tableEntry = userTableEntries[position - 1];
			if (!tableEntry) {
				debug('catalog layer skipped: table entry not found', {
					layerName,
					position
				});
				position += 1;
				continue;
			}

			const tablxEntry = userTablxMap.get(tableEntry.index);
			if (!tablxEntry) {
				debug('catalog layer skipped: tablx entry not found', {
					layerName,
					tableIndex: formatTableIndex(tableEntry.index)
				});
				position += 1;
				continue;
			}

			try {
				debug('catalog layer read start', {
					layerName,
					tableIndex: formatTableIndex(tableEntry.index)
				});
				const layer = readFeatureLayer(tableEntry, tablxEntry, layerName);
				if (layer) {
					layers.push(layer);
					debug('catalog layer read success', {
						layerName,
						tableIndex: formatTableIndex(tableEntry.index),
						featureCount: layer.geojson.features.length,
						geometryTypes: getFileGdbGeometryTypes(layer.geojson)
					});
				} else {
					debug('catalog layer skipped: unsupported geometry', {
						layerName,
						tableIndex: formatTableIndex(tableEntry.index)
					});
				}
			} catch (error) {
				const resolvedError = error instanceof Error ? error : new Error(String(error));
				debug('catalog layer read failed', {
					layerName,
					tableIndex: formatTableIndex(tableEntry.index),
					error: resolvedError.message
				});
				firstError ??= resolvedError;
				lastError = resolvedError;
			}

			position += 1;
		}
	} catch (error) {
		const resolvedError = error instanceof Error ? error : new Error(String(error));
		debug('catalog read failed', {
			error: resolvedError.message
		});
		firstError ??= resolvedError;
		lastError = resolvedError;
	}

	if (layers.length === 0) {
		debug('fallback direct table scan start', {
			tableIndices: userTableEntries.map((entry) => formatTableIndex(entry.index))
		});
		for (const tableEntry of userTableEntries) {
			const tablxEntry = userTablxMap.get(tableEntry.index);
			if (!tablxEntry) continue;

			try {
				debug('fallback table read start', {
					tableIndex: formatTableIndex(tableEntry.index)
				});
				const layer = readFeatureLayer(
					tableEntry,
					tablxEntry,
					getFallbackLayerName(tableEntry.index)
				);
				if (layer) {
					layers.push(layer);
					debug('fallback table read success', {
						layerName: layer.name,
						tableIndex: formatTableIndex(tableEntry.index),
						featureCount: layer.geojson.features.length,
						geometryTypes: getFileGdbGeometryTypes(layer.geojson)
					});
				} else {
					debug('fallback table skipped: unsupported geometry', {
						tableIndex: formatTableIndex(tableEntry.index)
					});
				}
			} catch (error) {
				const resolvedError = error instanceof Error ? error : new Error(String(error));
				debug('fallback table read failed', {
					tableIndex: formatTableIndex(tableEntry.index),
					error: resolvedError.message
				});
				firstError ??= resolvedError;
				lastError = resolvedError;
			}
		}
	}

	if (layers.length === 0) {
		debug('parse failed: no readable layers', {
			firstError: firstError?.message ?? null
		});
		const finalMessage =
			lastError?.message ?? firstError?.message ?? '読み込み可能な FileGDB レイヤーが見つかりませんでした';
		throw new FileGdbParseError(finalMessage, {
			datasetName: resolved.datasetName,
			rootPath: resolved.rootPath,
			inputs: resolved.inputs.map((input) => ({
				name: getFileGdbInputName(input),
				bytes: getDataByteLength(input.data)
			})),
			firstError: firstError?.message ?? null,
			lastError: lastError?.message ?? null,
			events: debugEvents
		});
	}

	debug('parse success', {
		datasetName: resolved.datasetName,
		layerNames: layers.map((layer) => layer.name)
	});
	return {
		datasetName: resolved.datasetName,
		layers
	};
};
