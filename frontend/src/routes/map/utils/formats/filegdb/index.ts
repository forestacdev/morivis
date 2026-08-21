import fgdbRead from 'fgdb/lib/read';

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

type FileGdbCatalogRow = {
	Name?: string;
	[key: string]: unknown;
};

const FILE_GDB_ROOT_PATTERN = /\.gdb$/i;
const FILE_GDB_TABLE_SUFFIX = '.gdbtable';
const FILE_GDB_TABLX_SUFFIX = '.gdbtablx';
const FILE_GDB_SYSTEM_LAYER_PREFIX = 'GDB_';
const SUPPORTED_GEOMETRY_TYPES = new Set<VectorEntryGeometryType>([
	'Point',
	'LineString',
	'Polygon'
]);

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
	tableEntries: Array<{ index: number; data: ArrayBuffer | Uint8Array }>,
	tablxEntries: Array<{ index: number; data: ArrayBuffer | Uint8Array }>
): FileGdbCatalogRow[] => {
	const firstTable = tableEntries[0];
	const firstTablx = tablxEntries[0];

	if (!firstTable || !firstTablx || firstTable.index !== 1 || firstTablx.index !== 1) {
		throw new Error('FileGDB のカタログテーブル a00000001 を見つけられませんでした');
	}

	const catalog = fgdbRead(firstTable.data, firstTablx.data);
	if (!Array.isArray(catalog)) {
		throw new Error('FileGDB のカタログを読み取れませんでした');
	}

	return catalog as FileGdbCatalogRow[];
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

	const tableEntries = Array.from(tableMap.entries())
		.sort(([left], [right]) => left - right)
		.map(([index, data]) => ({ index, data }));
	const tablxEntries = Array.from(tablxMap.entries())
		.sort(([left], [right]) => left - right)
		.map(([index, data]) => ({ index, data }));

	for (const tableEntry of tableEntries) {
		if (!tablxMap.has(tableEntry.index)) {
			throw new Error(
				`FileGDB テーブル ${tableEntry.index.toString(16)} に対応する .gdbtablx が見つかりません`
			);
		}
	}

	const catalog = readCatalogTable(tableEntries, tablxEntries);
	const layerRefs: Array<{ name: string; position: number }> = [];
	let position = 1;

	for (const row of catalog) {
		const layerName = typeof row?.Name === 'string' ? row.Name : null;
		if (!layerName || layerName.startsWith(FILE_GDB_SYSTEM_LAYER_PREFIX)) continue;

		layerRefs.push({ name: layerName, position });
		position += 1;
	}

	const layers = layerRefs
		.map(({ name, position: layerPosition }) => {
			const tableEntry = tableEntries[layerPosition];
			const tablxEntry = tablxEntries[layerPosition];
			if (!tableEntry || !tablxEntry) {
				throw new Error(`FileGDB レイヤー「${name}」のテーブルを見つけられませんでした`);
			}

			const geojson = assertFeatureCollection(fgdbRead(tableEntry.data, tablxEntry.data), name);
			return {
				name,
				geojson
			} satisfies FileGdbLayer;
		})
		.filter((layer) => hasSupportedGeometry(layer.geojson));

	if (layers.length === 0) {
		throw new Error('読み込み可能な FileGDB レイヤーが見つかりませんでした');
	}

	return {
		datasetName: resolved.datasetName,
		layers
	};
};
