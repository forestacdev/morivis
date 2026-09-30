import { formatGeoZarr } from '$routes/map/utils/formats/geozarr/definition';
import {
	createLocalGeoZarrStore,
	type LocalGeoZarrInput
} from '$routes/map/utils/formats/geozarr/local';
import { createChunkCache } from './chunk-cache';
import {
	type GpmLayout,
	parseGpmLayout,
	releaseGpmCache,
	renderGpmPixels,
	validateGpmArray
} from './gpm';
import { coordinateAxis, type GeoZarrGrid, gridPixel, tileGridWindow, tileLatitude } from './grid';
import { normalizeGeoZarrUrl } from './url';
import { createVoxelCells, type VoxelRegionRequest } from './voxels';
export { normalizeGeoZarrUrl } from './url';
import * as tilebelt from '@mapbox/tilebelt';
import proj4 from 'proj4';
import * as zarr from 'zarrita';

import { convertCanvasToResult } from '$routes/map/protocol/farbling';
import type { BandDataRange } from '$routes/map/utils/cache/raster/geotiff-cache';
import { getColorBrewerSchemeColors } from '$routes/map/utils/color/color-brewer';
import { devProxyTransform } from '$routes/map/utils/platform/proxy';
import { ColorMapManager } from '$routes/map/utils/style/color-mapping';

const EMPTY_TILE = Uint8Array.from(
	atob(
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII='
	),
	char => char.charCodeAt(0)
);
const createAbortError = () => new DOMException('Request aborted', 'AbortError');
const throwIfAborted = (signal: AbortSignal) => {
	if (signal.aborted) throw createAbortError();
};
const GEOZARR_TIMING_DEBUG = false;
let runtimeOrigin = 'http://localhost';
let runtimePublicEnv: Record<string, string | undefined> = {};
export const configureGeoZarrRuntime = (
	origin: string,
	publicEnv: Record<string, string | undefined> = {}
) => {
	runtimeOrigin = origin;
	runtimePublicEnv = publicEnv;
};
const GEOZARR_TILE_CACHE_MAX = 256;
const GEOZARR_WINDOW_CACHE_MAX = 1024;

type GeoZarrArrayNode = {
	shape: number[];
	chunks: number[];
	dtype?: string;
	dimension_names?: string[];
	dimensionNames?: string[];
	attrs?: Record<string, unknown>;
	attributes?: Record<string, unknown>;
};

export interface GeoZarrRegistrationInput {
	entryId: string;
	url: string;
	arrayPath?: string;
	bboxText?: string | null;
	metadata?: GeoZarrRegistrationMeta | null;
}

export interface GeoZarrRegistrationMeta {
	url: string;
	arrayPath: string;
	width: number;
	height: number;
	numBands: number;
	bbox: [number, number, number, number];
	sampleRanges: BandDataRange[];
	dtype: string;
	dimensionNames: string[];
	grid: GeoZarrGrid;
	noData: number[];
	scale: number;
	offset: number;
	gpm?: GpmLayout;
	categorical?: {
		values: number[];
		labels: string[];
		colors: string[];
	} | null;
}

export interface GeoZarrArrayCandidate {
	arrayPath: string;
	groupPath: string;
	score: number;
	shape: number[];
	dtype: string;
	dimensionNames: string[];
	longName: string | null;
	shortName: string | null;
	units: string | null;
	category: 'measurements' | 'quality' | 'conditions' | 'coordinates' | 'other';
	isRecommended: boolean;
	columnMaximum?: boolean;
}

interface GeoZarrSourceState extends GeoZarrRegistrationMeta {
	array: GeoZarrArrayNode;
	xIndex: number;
	yIndex: number;
	bandIndex: number | null;
	fixedIndices: number[];
}

type GeoZarrRasterView = {
	data: ArrayLike<number>;
	shape: number[];
	stride: number[];
};

export type GeoZarrSampleWindow = {
	xStart: number;
	xEnd: number;
	yStart: number;
	yEnd: number;
};

export type GeoZarrFallbackRange = {
	displayRange: BandDataRange;
	sliderRange?: BandDataRange;
	colorMap?: string;
};

const zarrRegistry = new Map<string, GeoZarrSourceState>();
const colorMapManager = new ColorMapManager();
const openingSources = new Map<string, Promise<GeoZarrRegistrationMeta>>();
const pendingGeoZarrRequests = new Map<
	string,
	{
		controller: AbortController;
		reject: (reason?: Error) => void;
	}
>();
const geozarrStoreCache = new Map<string, Promise<GeoZarrListableStore>>();
type CachedChunk = {
	data: ArrayLike<number> & { byteLength: number; };
	shape: number[];
	stride: number[];
};
const chunkCache = createChunkCache<CachedChunk>(
	formatGeoZarr.limits.maxExpandedBytes,
	chunk => chunk.data.byteLength
);
const geozarrTileCache = new Map<string, Uint8Array>();
const geozarrWindowCache = new Map<string, GeoZarrRasterView>();

type GeoZarrListableStore = zarr.Readable & {
	contents?: () => { path: string; kind: 'array' | 'group'; }[];
};

const localInputs = new Map<string, LocalGeoZarrInput>();
export const mountLocalGeoZarr = (url: string, input: LocalGeoZarrInput) => {
	localInputs.set(normalizeGeoZarrUrl(url), input);
};
export const releaseLocalGeoZarr = (url: string) => {
	releaseGpmCache(normalizeGeoZarrUrl(url));
	localInputs.delete(normalizeGeoZarrUrl(url));
	geozarrStoreCache.delete(normalizeGeoZarrUrl(url));
};

const logGeoZarrTiming = (phase: string, details: Record<string, unknown>) => {
	if (!GEOZARR_TIMING_DEBUG) return;
	console.info(`[GeoZarr] ${phase}`, details);
};

const createProxyFetchStore = async (url: string): Promise<GeoZarrListableStore> => {
	const normalizedUrl = normalizeGeoZarrUrl(url);
	const cached = geozarrStoreCache.get(normalizedUrl);
	if (cached) {
		logGeoZarrTiming('store-cache-hit', { url: normalizedUrl });
		return cached;
	}

	const storePromise = (async () => {
		if (normalizedUrl.startsWith('zarr-local:')) {
			const input = localInputs.get(normalizedUrl);
			if (!input) {
				throw new Error(
					'ローカルZarrが見つかりません。フォルダーまたはZIPを再登録してください'
				);
			}
			const localStore = await createLocalGeoZarrStore(input);
			return zarr.withMaybeConsolidatedMetadata(localStore);
		}
		const startAt = performance.now();
		const baseStore = new zarr.FetchStore(normalizedUrl, {
			fetch: async (request) => {
				const requestUrl = import.meta.env.DEV
					? devProxyTransform(request.url, runtimePublicEnv).url
					: request.url;
				const resolved = new URL(requestUrl, runtimeOrigin);
				if (import.meta.env.DEV && resolved.origin !== runtimeOrigin) {
					const proxyUrl = new URL('/api/cog-proxy', runtimeOrigin);
					proxyUrl.searchParams.set('url', resolved.href);
					return fetch(new Request(proxyUrl, request));
				}
				return fetch(new Request(resolved, request));
			}
		});
		const store = (await zarr.withMaybeConsolidatedMetadata(baseStore)) as GeoZarrListableStore;
		logGeoZarrTiming('store-open', {
			url: normalizedUrl,
			durationMs: Number((performance.now() - startAt).toFixed(1))
		});
		return store;
	})();

	if (geozarrStoreCache.size >= 32) {
		geozarrStoreCache.delete(geozarrStoreCache.keys().next().value!);
	}
	geozarrStoreCache.set(normalizedUrl, storePromise);
	try {
		return await storePromise;
	} catch (error) {
		geozarrStoreCache.delete(normalizedUrl);
		throw error;
	}
};

const cloneUint8Array = (value: Uint8Array): Uint8Array => {
	return new Uint8Array(value.slice().buffer);
};

const getGeoZarrTileCache = (key: string): Uint8Array | null => {
	const cached = geozarrTileCache.get(key);
	if (!cached) return null;
	geozarrTileCache.delete(key);
	geozarrTileCache.set(key, cached);
	return cloneUint8Array(cached);
};

const setGeoZarrTileCache = (key: string, value: Uint8Array) => {
	if (geozarrTileCache.has(key)) {
		geozarrTileCache.delete(key);
	}
	if (geozarrTileCache.size >= GEOZARR_TILE_CACHE_MAX) {
		const oldest = geozarrTileCache.keys().next().value;
		if (oldest) geozarrTileCache.delete(oldest);
	}
	geozarrTileCache.set(key, cloneUint8Array(value));
	let bytes = [...geozarrTileCache.values()].reduce((total, tile) => total + tile.byteLength, 0);
	while (bytes > formatGeoZarr.limits.maxExpandedBytes && geozarrTileCache.size) {
		const oldest = geozarrTileCache.keys().next().value!;
		bytes -= geozarrTileCache.get(oldest)!.byteLength;
		geozarrTileCache.delete(oldest);
	}
};

const cloneGeoZarrViewData = (data: ArrayLike<number>): ArrayLike<number> => {
	if (ArrayBuffer.isView(data)) {
		const TypedArray = data.constructor as new(source: ArrayLike<number>) => ArrayLike<number>;
		return new TypedArray(data);
	}
	return Array.from(data);
};

const getGeoZarrWindowCache = (key: string): GeoZarrRasterView | null => {
	const cached = geozarrWindowCache.get(key);
	if (!cached) return null;
	geozarrWindowCache.delete(key);
	geozarrWindowCache.set(key, cached);
	return {
		data: cloneGeoZarrViewData(cached.data),
		shape: [...cached.shape],
		stride: [...cached.stride]
	};
};

const setGeoZarrWindowCache = (key: string, value: GeoZarrRasterView) => {
	if (geozarrWindowCache.has(key)) {
		geozarrWindowCache.delete(key);
	}
	if (geozarrWindowCache.size >= GEOZARR_WINDOW_CACHE_MAX) {
		const oldest = geozarrWindowCache.keys().next().value;
		if (oldest) geozarrWindowCache.delete(oldest);
	}
	geozarrWindowCache.set(key, {
		data: cloneGeoZarrViewData(value.data),
		shape: [...value.shape],
		stride: [...value.stride]
	});
	let bytes = [...geozarrWindowCache.values()].reduce(
		(total, view) => total + view.data.length * 4,
		0
	);
	while (bytes > formatGeoZarr.limits.maxExpandedBytes && geozarrWindowCache.size) {
		const oldest = geozarrWindowCache.keys().next().value!;
		bytes -= geozarrWindowCache.get(oldest)!.data.length * 4;
		geozarrWindowCache.delete(oldest);
	}
};

const normalizeArrayPath = (value?: string): string =>
	value?.trim().replace(/^\/+|\/+$/g, '') ?? '';

const getArrayAttrs = (array: GeoZarrArrayNode): Record<string, unknown> => {
	return array.attrs ?? array.attributes ?? {};
};

const getNodeAttrs = (
	node: { attrs?: Record<string, unknown>; attributes?: Record<string, unknown>; }
) => node.attrs ?? node.attributes ?? {};

const parseBboxText = (value?: string | null): [number, number, number, number] | null => {
	if (!value) return null;
	const numbers = value
		.split(',')
		.map((part) => Number.parseFloat(part.trim()))
		.filter((part) => Number.isFinite(part));
	if (numbers.length !== 4) return null;
	const [minX, minY, maxX, maxY] = numbers;
	if (minX >= maxX || minY >= maxY) return null;
	return [minX, minY, maxX, maxY];
};

const toStringArray = (value: unknown): string[] => {
	if (!Array.isArray(value)) return [];
	return value.map((item) => String(item));
};

const getEopfAttrs = (attrs: Record<string, unknown>) => {
	return attrs['_eopf_attrs'] && typeof attrs['_eopf_attrs'] === 'object'
		? (attrs['_eopf_attrs'] as Record<string, unknown>)
		: null;
};

const inferDimensionNames = (array: GeoZarrArrayNode): string[] => {
	const attrs = getArrayAttrs(array);
	const eopfAttrs = getEopfAttrs(attrs);
	const candidates = [
		array.dimensionNames,
		array.dimension_names,
		eopfAttrs?.['dimensions'],
		eopfAttrs?.['coordinates'],
		attrs['_ARRAY_DIMENSIONS'],
		attrs['dimension_names'],
		attrs['dimensions'],
		attrs['xarray_dims']
	];
	for (const candidate of candidates) {
		const names = toStringArray(candidate);
		if (names.length === array.shape.length) return names;
	}
	return array.shape.map((_, index) => `dim_${index}`);
};

const isCoordinateLikePath = (path: string): boolean => {
	return /(^|\/)(time|valid_time|step|latitude|lat|longitude|lon|x|y|band|bands|angle|angles|detector|detectors|level|levels|hybrid|hybrid_sigma_pressure|pressure)$/i
		.test(
			path
		);
};

const getGeoZarrArrayCategory = (
	path: string,
	array: GeoZarrArrayNode
): GeoZarrArrayCandidate['category'] => {
	if (path.startsWith('measurements/')) return 'measurements';
	if (path.startsWith('quality/')) return 'quality';
	if (path.startsWith('conditions/')) return 'conditions';
	if (array.shape.length < 2 || isCoordinateLikePath(path)) return 'coordinates';
	return 'other';
};

const getMetadataString = (attrs: Record<string, unknown>, ...keys: string[]) => {
	const eopfAttrs = getEopfAttrs(attrs);
	for (const key of keys) {
		const direct = attrs[key];
		if (typeof direct === 'string' && direct.trim().length > 0) return direct.trim();
		const nested = eopfAttrs?.[key];
		if (typeof nested === 'string' && nested.trim().length > 0) return nested.trim();
	}
	return null;
};

const parseNumberArray = (value: unknown): number[] => {
	if (!Array.isArray(value)) return [];
	return value
		.map((item) => Number(item))
		.filter((item) => Number.isFinite(item));
};

const parseMeaningLabels = (value: unknown): string[] => {
	if (Array.isArray(value)) {
		return value.map((item) => String(item).trim()).filter((item) => item.length > 0);
	}
	if (typeof value !== 'string') return [];
	return value
		.split(/[,\s]+/u)
		.map((item) => item.trim())
		.filter((item) => item.length > 0);
};

export const buildCategoricalMeta = (arrayPath: string, attrs: Record<string, unknown>) => {
	const flagValues = parseNumberArray(attrs['flag_values']);
	const flagMeanings = parseMeaningLabels(attrs['flag_meanings']);
	const categories = flagValues.length > 0
		? flagValues
		: typeof attrs['valid_min'] === 'number' && typeof attrs['valid_max'] === 'number'
		? Array.from(
			{
				length: Math.max(
					0,
					Math.min(32, Number(attrs['valid_max']) - Number(attrs['valid_min']) + 1)
				)
			},
			(_, index) => Number(attrs['valid_min']) + index
		)
		: [];
	const isCategorical = categories.length > 0
		|| /^categorical_/i.test(arrayPath)
		|| getMetadataString(attrs, 'standard_name')?.startsWith('categorical_')
		|| getMetadataString(attrs, 'long_name')?.toLowerCase().includes('categorical') === true;

	if (!isCategorical || categories.length === 0) return null;

	const palette = getColorBrewerSchemeColors('Set3');
	const labels = categories.map((value, index) => flagMeanings[index] ?? String(value));
	const colors = categories.map((_, index) => palette[index % palette.length] ?? '#999999');

	return {
		values: categories,
		labels,
		colors
	};
};

export const GEOZARR_FALLBACK_RANGES: Record<string, GeoZarrFallbackRange> = {
	dew_point_temperature: {
		displayRange: { min: -60, max: 30 },
		sliderRange: { min: -90, max: 40 },
		colorMap: 'jet'
	},
	air_temperature: {
		displayRange: { min: -60, max: 50 },
		sliderRange: { min: -90, max: 60 },
		colorMap: 'jet'
	},
	precipitation_amount: {
		displayRange: { min: 0, max: 100 },
		sliderRange: { min: 0, max: 300 },
		colorMap: 'viridis'
	},
	eastward_wind: {
		displayRange: { min: -80, max: 80 },
		sliderRange: { min: -120, max: 120 },
		colorMap: 'jet'
	},
	northward_wind: {
		displayRange: { min: -80, max: 80 },
		sliderRange: { min: -120, max: 120 },
		colorMap: 'jet'
	},
	wind_speed: {
		displayRange: { min: 0, max: 80 },
		sliderRange: { min: 0, max: 120 },
		colorMap: 'viridis'
	},
	relative_humidity: {
		displayRange: { min: 0, max: 100 },
		sliderRange: { min: 0, max: 100 },
		colorMap: 'viridis'
	},
	specific_humidity: {
		displayRange: { min: 0, max: 0.03 },
		sliderRange: { min: 0, max: 0.05 },
		colorMap: 'viridis'
	}
};

export const resolveGeoZarrFallbackRange = (
	attrs: Record<string, unknown>
): GeoZarrFallbackRange | null => {
	const standardName = getMetadataString(attrs, 'standard_name');
	if (!standardName) return null;
	return GEOZARR_FALLBACK_RANGES[standardName] ?? null;
};

const compareGeoZarrCandidates = (a: GeoZarrArrayCandidate, b: GeoZarrArrayCandidate) => {
	if (a.isRecommended !== b.isRecommended) return a.isRecommended ? -1 : 1;
	if (a.category !== b.category) {
		const order = {
			measurements: 0,
			other: 1,
			quality: 2,
			conditions: 3,
			coordinates: 4
		} as const;
		return order[a.category] - order[b.category];
	}
	if (a.score !== b.score) return b.score - a.score;
	return a.arrayPath.localeCompare(b.arrayPath);
};

const scoreArrayCandidate = (path: string, array: GeoZarrArrayNode): number => {
	const dimensionNames = inferDimensionNames(array);
	const hasX = dimensionNames.some((name) =>
		[/^x$/i, /^lon(gitude)?$/i, /^cols?$/i, /^easting$/i].some((pattern) => pattern.test(name))
	);
	const hasY = dimensionNames.some((name) =>
		[/^y$/i, /^lat(itude)?$/i, /^rows?$/i, /^northing$/i].some((pattern) => pattern.test(name))
	);

	let score = 0;
	if (array.shape.length < 2) return Number.NEGATIVE_INFINITY;
	if (array.shape.length >= 2) score += 10;
	if (hasX) score += 30;
	if (hasY) score += 30;
	if (hasX && hasY) score += 40;
	if (array.shape.length >= 3) score += 5;
	if (!isCoordinateLikePath(path)) score += 10;
	return score;
};

const getParentArrayPath = (path: string): string => {
	const normalizedPath = normalizeArrayPath(path);
	const index = normalizedPath.lastIndexOf('/');
	return index >= 0 ? normalizedPath.slice(0, index) : '';
};

const joinArrayPath = (basePath: string, childPath: string): string => {
	const normalizedBase = normalizeArrayPath(basePath);
	const normalizedChild = normalizeArrayPath(childPath);
	if (!normalizedBase) return normalizedChild;
	if (!normalizedChild) return normalizedBase;
	return `${normalizedBase}/${normalizedChild}`;
};

const readCoordinateArray = async (
	root: zarr.Location<GeoZarrListableStore>,
	path: string
): Promise<number[] | null> => {
	try {
		const array = await zarr.open(root.resolve(path), { kind: 'array' });
		if (array.shape.length !== 1) throw new Error('2次元の曲線座標を持つZarrは未対応です。');
		if (array.shape[0] > 1_000_000) throw new Error('Zarrの座標軸が取得上限を超えています。');
		const values = (await zarr.get(
			array,
			[zarr.slice(0, array.shape[0])] as Parameters<typeof zarr.get>[1]
		)) as {
			data: ArrayLike<number>;
		};
		return Array.from(values.data, (value) => Number(value));
	} catch (error) {
		if (error instanceof zarr.NotFoundError) return null;
		throw error;
	}
};

const inferGridFromCoordinateArrays = async (
	url: string,
	arrayPath: string,
	dimensionNames: string[]
): Promise<
	{ bbox: [number, number, number, number]; xDescending: boolean; yAscending: boolean; } | null
> => {
	const store = await createProxyFetchStore(url);
	const root = zarr.root(store);
	const parentPath = getParentArrayPath(arrayPath);

	const xCandidates = Array.from(
		new Set([
			dimensionNames.find((name) => /^(x|lon|longitude)$/i.test(name)),
			'longitude',
			'lon',
			'x'
		])
	).filter((value): value is string => !!value);
	const yCandidates = Array.from(
		new Set([
			dimensionNames.find((name) => /^(y|lat|latitude)$/i.test(name)),
			'latitude',
			'lat',
			'y'
		])
	).filter((value): value is string => !!value);

	let xValues: number[] | null = null;
	for (const candidate of xCandidates) {
		xValues = await readCoordinateArray(root, joinArrayPath(parentPath, candidate));
		if (xValues?.length) break;
		xValues = await readCoordinateArray(root, candidate);
		if (xValues?.length) break;
	}

	let yValues: number[] | null = null;
	for (const candidate of yCandidates) {
		yValues = await readCoordinateArray(root, joinArrayPath(parentPath, candidate));
		if (yValues?.length) break;
		yValues = await readCoordinateArray(root, candidate);
		if (yValues?.length) break;
	}

	if (!xValues?.length || !yValues?.length) return null;

	const x = coordinateAxis(xValues), y = coordinateAxis(yValues);
	return {
		bbox: [x.min, y.min, x.max, y.max],
		xDescending: x.descending,
		yAscending: !y.descending
	};
};

const cacheArrayChunks = (node: GeoZarrArrayNode, url: string, path: string) => {
	if (!/^(?:u?int(?:8|16|32)|float(?:16|32|64))$/.test(node.dtype ?? '')) {
		throw new Error(`未対応のZarrデータ型です: ${node.dtype}`);
	}
	if (node.chunks.reduce((a, b) => a * b, 8) > formatGeoZarr.limits.maxExpandedBytes) {
		throw new Error('Zarrの1チャンクが展開容量の上限を超えています。');
	}
	const array = node as GeoZarrArrayNode & {
		getChunk: (
			coordinates: number[],
			options?: { signal?: AbortSignal; }
		) => Promise<CachedChunk>;
	};
	const read = array.getChunk.bind(array);
	array.getChunk = (coordinates, options) =>
		chunkCache.get(
			`${url}|${path}|${coordinates.join(',')}`,
			signal => read(coordinates, { signal }),
			options?.signal ?? new AbortController().signal
		);
	return node;
};

const openGeoZarrArray = async (
	url: string,
	arrayPath?: string
): Promise<{ array: GeoZarrArrayNode; arrayPath: string; }> => {
	const store = await createProxyFetchStore(url);
	const root = zarr.root(store);
	const normalizedPath = normalizeArrayPath(arrayPath);

	if (normalizedPath) {
		const array =
			(await zarr.open(root.resolve(normalizedPath), { kind: 'array' })) as GeoZarrArrayNode;
		return { array: cacheArrayChunks(array, url, normalizedPath), arrayPath: normalizedPath };
	}

	const node = await zarr.open(root);
	if (node.kind === 'array') return { array: cacheArrayChunks(node, url, ''), arrayPath: '' };

	const candidates = await listGeoZarrArrayCandidates(url);
	let bestCandidate:
		| {
			path: string;
			array: GeoZarrArrayNode;
			score: number;
		}
		| null = null;

	for (const candidate of candidates) {
		try {
			const array = (await zarr.open(root.resolve(candidate.arrayPath), {
				kind: 'array'
			})) as GeoZarrArrayNode;
			if (!bestCandidate || candidate.score > bestCandidate.score) {
				bestCandidate = { path: candidate.arrayPath, array, score: candidate.score };
			}
		} catch {
			// skip
		}
	}

	if (bestCandidate) {
		return {
			array: cacheArrayChunks(bestCandidate.array, url, bestCandidate.path),
			arrayPath: bestCandidate.path
		};
	}

	throw new Error(
		'GeoZarr の配列を特定できませんでした。group ルートの可能性があります。配列パスを指定してください。'
	);
};

export const listGeoZarrArrayCandidates = async (url: string): Promise<GeoZarrArrayCandidate[]> => {
	const store = await createProxyFetchStore(url);
	const root = zarr.root(store);

	const node = await zarr.open(root);
	const paths = node.kind === 'array' ? [''] : typeof store.contents === 'function'
		? store.contents().filter(entry => entry.kind === 'array').map(entry =>
			entry.path.replace(/^\/+/, '')
		)
		: [];

	const candidates: GeoZarrArrayCandidate[] = [];

	for (const path of paths) {
		try {
			const array =
				(await zarr.open(root.resolve(path), { kind: 'array' })) as GeoZarrArrayNode;
			const attrs = getArrayAttrs(array);
			const dimensionNames = inferDimensionNames(array);
			const category = getGeoZarrArrayCategory(path, array);
			const score = scoreArrayCandidate(path, array);
			const gpm = parseGpmLayout(getNodeAttrs(node).gpm, path, array);
			candidates.push({
				arrayPath: path,
				...(gpm ? { columnMaximum: true } : {}),
				groupPath: getParentArrayPath(path) || '/',
				score,
				shape: [...array.shape],
				dtype: array.dtype ?? 'unknown',
				dimensionNames,
				longName: getMetadataString(attrs, 'long_name', 'title', 'name'),
				shortName: getMetadataString(attrs, 'short_name', 'standard_name'),
				units: getMetadataString(attrs, 'units'),
				category,
				isRecommended: category === 'measurements'
					&& array.shape.length >= 2
					&& Number.isFinite(score)
					&& score >= 100
			});
		} catch {
			// skip
		}
	}

	return candidates.sort(compareGeoZarrCandidates);
};

const matchDimensionIndex = (names: string[], patterns: RegExp[]): number | null => {
	const index = names.findIndex((name) => patterns.some((pattern) => pattern.test(name)));
	return index >= 0 ? index : null;
};

const inferAxisIndexes = (array: GeoZarrArrayNode, dimensionNames: string[]) => {
	const xIndex =
		matchDimensionIndex(dimensionNames, [/^x$/i, /^lon(gitude)?$/i, /^cols?$/i, /^easting$/i])
			?? Math.max(1, array.shape.length - 1);
	const yIndex =
		matchDimensionIndex(dimensionNames, [/^y$/i, /^lat(itude)?$/i, /^rows?$/i, /^northing$/i])
			?? Math.max(0, array.shape.length - 2);

	const bandIndex = matchDimensionIndex(dimensionNames, [/^band(s)?$/i, /^channel(s)?$/i, /rgb/i])
		?? (dimensionNames.every(name => /^dim_/.test(name)) && array.shape.length >= 3
				&& array.shape[0] <= 4 && 0 !== xIndex && 0 !== yIndex
			? 0
			: null);

	if (array.shape.length < 2 || xIndex === yIndex) {
		throw new Error('地図に表示するには2つの空間軸が必要です。');
	}
	return { xIndex, yIndex, bandIndex };
};

export const parseBboxFromAttrs = (
	attrs: Record<string, unknown>
): [number, number, number, number] | null => {
	const bboxCandidates = [
		attrs['spatial:bbox'],
		attrs['proj:bbox'],
		attrs['bbox'],
		attrs['bounds'],
		attrs['extent']
	];
	for (const candidate of bboxCandidates) {
		if (!Array.isArray(candidate) || candidate.length < 4) continue;
		const values = candidate
			.slice(0, 4)
			.map((item) => Number(item))
			.filter((item) => Number.isFinite(item));
		if (values.length === 4 && values[0] < values[2] && values[1] < values[3]) {
			return values as [number, number, number, number];
		}
	}

	const lonMin = Number(attrs['geospatial_lon_min']);
	const lonMax = Number(attrs['geospatial_lon_max']);
	const latMin = Number(attrs['geospatial_lat_min']);
	const latMax = Number(attrs['geospatial_lat_max']);
	if ([lonMin, lonMax, latMin, latMax].every((value) => Number.isFinite(value))) {
		return [lonMin, latMin, lonMax, latMax];
	}

	return null;
};

export const parseProjectionCodeFromAttrs = (attrs: Record<string, unknown>): string | null => {
	const candidates = [attrs['proj:code'], attrs['crs'], attrs['proj:epsg']];

	for (const candidate of candidates) {
		if (typeof candidate === 'string' && candidate.trim().length > 0) {
			const trimmed = candidate.trim();
			const epsgMatch = trimmed.match(/EPSG:\d+$/i) ?? trimmed.match(/EPSG\/0\/(\d+)$/i);
			if (epsgMatch) {
				return epsgMatch[1] ? `EPSG:${epsgMatch[1]}` : epsgMatch[0].toUpperCase();
			}
			return trimmed;
		}

		if (typeof candidate === 'number' && Number.isFinite(candidate)) {
			return `EPSG:${candidate}`;
		}
	}

	return null;
};

export const normalizeGeoZarrBbox = (
	bbox: [number, number, number, number],
	projectionCode: string | null
): [number, number, number, number] => {
	if (!projectionCode || /^EPSG:4326$/i.test(projectionCode)) {
		return bbox;
	}

	try {
		const corners = [
			[bbox[0], bbox[1]],
			[bbox[2], bbox[1]],
			[bbox[2], bbox[3]],
			[bbox[0], bbox[3]]
		].map((corner) => proj4(projectionCode, 'EPSG:4326', corner as [number, number]));
		const lons = corners.map((corner) => Number(corner[0])).filter((value) =>
			Number.isFinite(value)
		);
		const lats = corners.map((corner) => Number(corner[1])).filter((value) =>
			Number.isFinite(value)
		);

		if (lons.length !== 4 || lats.length !== 4) return bbox;

		return [
			Math.min(...lons),
			Math.min(...lats),
			Math.max(...lons),
			Math.max(...lats)
		];
	} catch {
		return bbox;
	}
};

const readAncestorGroupMetadata = async (url: string, arrayPath: string) => {
	const store = await createProxyFetchStore(url);
	const root = zarr.root(store);
	const normalizedPath = normalizeArrayPath(arrayPath);
	const segments = normalizedPath ? normalizedPath.split('/') : [];

	let bbox: [number, number, number, number] | null = null;
	let projectionCode: string | null = null;

	for (let depth = segments.length - 1; depth >= 0; depth--) {
		const groupPath = segments.slice(0, depth).join('/');
		try {
			const group = (await zarr.open(
				groupPath ? root.resolve(groupPath) : root,
				{ kind: 'group' }
			)) as {
				attrs?: Record<string, unknown>;
				attributes?: Record<string, unknown>;
			};
			const attrs = getNodeAttrs(group);
			bbox ??= parseBboxFromAttrs(attrs);
			projectionCode ??= parseProjectionCodeFromAttrs(attrs);
			if (bbox && projectionCode) break;
		} catch {
			// skip
		}
	}

	return { bbox, projectionCode };
};

const getNumBands = (array: GeoZarrArrayNode, bandIndex: number | null): number => {
	if (bandIndex === null) return 1;
	return Math.max(1, array.shape[bandIndex] ?? 1);
};

const buildSelection = (
	state: GeoZarrSourceState,
	xStart: number,
	xEnd: number,
	yStart: number,
	yEnd: number,
	bandSelection?: number
) => {
	return state.array.shape.map((_, index) => {
		if (index === state.xIndex) return zarr.slice(xStart, xEnd);
		if (index === state.yIndex) return zarr.slice(yStart, yEnd);
		if (state.bandIndex !== null && index === state.bandIndex) {
			return Math.max(0, Math.min(state.numBands - 1, bandSelection ?? 0));
		}
		return state.fixedIndices[index] ?? 0;
	});
};

const getViewValue = (
	view: { data: ArrayLike<number>; shape: number[]; stride: number[]; },
	row: number,
	column: number
): number => {
	return Number(view.data[row * view.stride[0] + column * view.stride[1]]);
};

const getFiniteMinMax = (data: ArrayLike<number>): BandDataRange => {
	let min = Number.POSITIVE_INFINITY;
	let max = Number.NEGATIVE_INFINITY;
	for (let i = 0; i < data.length; i++) {
		const value = Number(data[i]);
		if (!Number.isFinite(value)) continue;
		if (value < min) min = value;
		if (value > max) max = value;
	}
	if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
		return { min: 0, max: 1 };
	}
	return { min, max };
};

export const mergeBandDataRanges = (ranges: BandDataRange[]): BandDataRange => {
	let min = Number.POSITIVE_INFINITY;
	let max = Number.NEGATIVE_INFINITY;

	for (const range of ranges) {
		if (!Number.isFinite(range.min) || !Number.isFinite(range.max)) continue;
		if (range.min < min) min = range.min;
		if (range.max > max) max = range.max;
	}

	if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
		return { min: 0, max: 1 };
	}

	return { min, max };
};

export const mergeSampleRangeWithFallback = (
	sampleRange: BandDataRange,
	fallbackRange: BandDataRange | null
): BandDataRange => {
	if (!fallbackRange) return sampleRange;
	return {
		min: Math.min(sampleRange.min, fallbackRange.min),
		max: Math.max(sampleRange.max, fallbackRange.max)
	};
};

export const buildGeoZarrSampleWindows = (
	width: number,
	height: number,
	maxWindowSize = 96
): GeoZarrSampleWindow[] => {
	const sampleWidth = Math.max(1, Math.min(maxWindowSize, width));
	const sampleHeight = Math.max(1, Math.min(maxWindowSize, height));
	const xStarts = [
		0,
		Math.max(0, width - sampleWidth),
		Math.max(0, Math.floor((width - sampleWidth) / 2))
	];
	const yStarts = [
		0,
		Math.max(0, height - sampleHeight),
		Math.max(0, Math.floor((height - sampleHeight) / 2))
	];
	const windows = [
		{ xStart: xStarts[0], yStart: yStarts[0] },
		{ xStart: xStarts[1], yStart: yStarts[0] },
		{ xStart: xStarts[0], yStart: yStarts[1] },
		{ xStart: xStarts[1], yStart: yStarts[1] },
		{ xStart: xStarts[2], yStart: yStarts[2] }
	];

	return Array.from(
		new Map(
			windows.map(({ xStart, yStart }) => [
				`${xStart}:${yStart}`,
				{
					xStart,
					xEnd: Math.min(width, xStart + sampleWidth),
					yStart,
					yEnd: Math.min(height, yStart + sampleHeight)
				}
			])
		).values()
	);
};

const getDefaultRangeFromDtype = (dtype: string): BandDataRange => {
	const normalized = dtype.toLowerCase();
	if (normalized.includes('uint8')) return { min: 0, max: 255 };
	if (normalized.includes('uint16')) return { min: 0, max: 65535 };
	if (normalized.includes('int16')) return { min: -32768, max: 32767 };
	if (normalized.includes('uint32')) return { min: 0, max: 4294967295 };
	if (normalized.includes('int32')) return { min: -2147483648, max: 2147483647 };
	return { min: 0, max: 1 };
};

const readBandWindow = async (
	state: GeoZarrSourceState,
	xStart: number,
	xEnd: number,
	yStart: number,
	yEnd: number,
	bandIndex = 0,
	signal?: AbortSignal
) => {
	const count = (xEnd - xStart) * (yEnd - yStart);
	const chunkCount = (Math.floor((xEnd - 1) / state.array.chunks[state.xIndex])
		- Math.floor(xStart / state.array.chunks[state.xIndex]) + 1)
		* (Math.floor((yEnd - 1) / state.array.chunks[state.yIndex])
			- Math.floor(yStart / state.array.chunks[state.yIndex]) + 1);
	const expandedBytes = chunkCount * state.array.chunks.reduce((a, b) => a * b, 8);
	if (
		count > formatGeoZarr.limits.maxSamples
		|| expandedBytes > formatGeoZarr.limits.maxExpandedBytes
	) {
		throw new Error(
			'Zarrの取得範囲が上限を超えます。拡大するか、縮小解像度の配列を選んでください。'
		);
	}
	const result = await zarr.get(
		state.array as Parameters<typeof zarr.get>[0],
		buildSelection(state, xStart, xEnd, yStart, yEnd, bandIndex),
		{ signal }
	) as GeoZarrRasterView;
	const yStride = result.stride[state.yIndex < state.xIndex ? 0 : 1];
	const xStride = result.stride[state.xIndex < state.yIndex ? 0 : 1];
	const width = xEnd - xStart, height = yEnd - yStart;
	const data = new Float32Array(count);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const value = Number(result.data[y * yStride + x * xStride]);
			data[y * width + x] = !Number.isFinite(value) || state.noData.includes(value)
				? NaN
				: value * state.scale + state.offset;
		}
	}
	return { data, shape: [height, width], stride: [width, 1] };
};

const getGeoZarrWindowCacheKey = (
	state: GeoZarrSourceState,
	xStart: number,
	xEnd: number,
	yStart: number,
	yEnd: number,
	bandIndex: number
) => `${state.url}|${state.arrayPath}|${state.width}|${state.height}|${xStart}|${xEnd}|${yStart}|${yEnd}|${bandIndex}`;

const readBandWindowCached = async (
	state: GeoZarrSourceState,
	xStart: number,
	xEnd: number,
	yStart: number,
	yEnd: number,
	bandIndex = 0,
	signal?: AbortSignal
): Promise<{ view: GeoZarrRasterView; cacheHit: boolean; }> => {
	const cacheKey = getGeoZarrWindowCacheKey(state, xStart, xEnd, yStart, yEnd, bandIndex);
	const cached = getGeoZarrWindowCache(cacheKey);
	if (cached) return { view: cached, cacheHit: true };

	const view = await readBandWindow(state, xStart, xEnd, yStart, yEnd, bandIndex, signal);
	setGeoZarrWindowCache(cacheKey, view);
	return { view, cacheHit: false };
};

const inspectGeoZarrInternal = async (
	url: string,
	arrayPath?: string,
	bboxText?: string | null
): Promise<Omit<GeoZarrSourceState, 'array'>> => {
	const normalizedUrl = normalizeGeoZarrUrl(url);
	const { array, arrayPath: resolvedArrayPath } = await openGeoZarrArray(
		normalizedUrl,
		arrayPath
	);
	const attrs = getArrayAttrs(array);
	const dimensionNames = inferDimensionNames(array);
	const { xIndex, yIndex, bandIndex } = inferAxisIndexes(array, dimensionNames);
	const rootNode = await zarr.open(zarr.root(await createProxyFetchStore(normalizedUrl)));
	const gpm = parseGpmLayout(getNodeAttrs(rootNode).gpm, resolvedArrayPath, array);
	if (gpm) {
		return {
			url: normalizedUrl,
			arrayPath: resolvedArrayPath,
			width: gpm.dimensions[0],
			height: gpm.dimensions[1],
			numBands: 1,
			bbox: gpm.bbox,
			sampleRanges: [{ min: 0, max: Math.max(1, gpm.max) }],
			dtype: array.dtype ?? 'float32',
			dimensionNames,
			grid: { bbox: gpm.bbox, projection: 'EPSG:4326', xDescending: false, yAscending: true },
			noData: [gpm.noData],
			scale: 1,
			offset: 0,
			gpm,
			xIndex,
			yIndex,
			bandIndex: null,
			fixedIndices: array.shape.map(() => 0)
		};
	}

	const { bbox: ancestorBbox, projectionCode } = await readAncestorGroupMetadata(
		normalizedUrl,
		resolvedArrayPath
	);
	const coordinates = await inferGridFromCoordinateArrays(
		normalizedUrl,
		resolvedArrayPath,
		dimensionNames
	);
	const manualBbox = parseBboxText(bboxText);
	if (bboxText && !manualBbox) {
		throw new Error('bboxは西端,南端,東端,北端の順で入力してください。');
	}
	const embeddedBbox = coordinates?.bbox ?? parseBboxFromAttrs(attrs) ?? ancestorBbox;
	const nativeBbox = embeddedBbox ?? manualBbox;
	const projection = !embeddedBbox && manualBbox
		? 'EPSG:4326'
		: parseProjectionCodeFromAttrs(attrs) ?? projectionCode ?? 'EPSG:4326';
	if (projection !== 'EPSG:4326' && !proj4.defs(projection)) {
		const utm = /^EPSG:(326|327)(\d{2})$/.exec(projection);
		if (utm && Number(utm[2]) >= 1 && Number(utm[2]) <= 60) {
			proj4.defs(
				projection,
				`+proj=utm +zone=${Number(utm[2])} ${
					utm[1] === '327' ? '+south' : ''
				} +datum=WGS84 +units=m +no_defs`
			);
		} else throw new Error(`未対応のZarr座標系です: ${projection}`);
	}
	const grid: GeoZarrGrid | null = nativeBbox
		? {
			bbox: nativeBbox,
			projection,
			xDescending: coordinates?.xDescending ?? false,
			yAscending: coordinates?.yAscending ?? false
		}
		: null;
	let bbox = nativeBbox ? normalizeGeoZarrBbox(nativeBbox, projection) : null;
	if (bbox && projection === 'EPSG:4326' && (bbox[0] < -180 || bbox[2] > 180)) {
		bbox = [-180, Math.max(-90, bbox[1]), 180, Math.min(90, bbox[3])];
	}
	const noData = [attrs._FillValue, attrs.missing_value, attrs.nodata].filter((
		value
	): value is number => typeof value === 'number');
	const scale = typeof attrs.scale_factor === 'number' ? attrs.scale_factor : 1;
	const offset = typeof attrs.add_offset === 'number' ? attrs.add_offset : 0;

	if (!bbox || !grid) {
		throw new Error(
			'GeoZarr の bbox を判定できませんでした。bbox を minx,miny,maxx,maxy で入力してください。'
		);
	}

	const width = array.shape[xIndex];
	const height = array.shape[yIndex];
	if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
		throw new Error('GeoZarr の配列サイズが不正です。');
	}

	const numBands = getNumBands(array, bandIndex);
	const categorical = buildCategoricalMeta(resolvedArrayPath, attrs);
	const sampleRanges: BandDataRange[] = [];
	const sampleWindows = buildGeoZarrSampleWindows(width, height);
	const fallbackRange = resolveGeoZarrFallbackRange(attrs)?.displayRange ?? null;

	const bandsToSample = numBands >= 3 ? [0, 1, 2] : [0];
	for (const index of bandsToSample) {
		const ranges: BandDataRange[] = [];
		try {
			for (const sampleWindow of sampleWindows) {
				const view = await readBandWindow(
					{
						url,
						arrayPath: resolvedArrayPath,
						width,
						height,
						numBands,
						bbox,
						sampleRanges: [],
						dtype: array.dtype ?? 'unknown',
						dimensionNames,
						grid,
						noData,
						scale,
						offset,
						array,
						xIndex,
						yIndex,
						bandIndex,
						fixedIndices: array.shape.map(() => 0)
					},
					sampleWindow.xStart,
					sampleWindow.xEnd,
					sampleWindow.yStart,
					sampleWindow.yEnd,
					index
				);
				ranges.push(getFiniteMinMax(view.data));
			}
			sampleRanges.push(
				mergeSampleRangeWithFallback(mergeBandDataRanges(ranges), fallbackRange)
			);
		} catch {
			sampleRanges.push(
				mergeSampleRangeWithFallback(
					getDefaultRangeFromDtype(array.dtype ?? 'unknown'),
					fallbackRange
				)
			);
		}
	}

	return {
		url: normalizedUrl,
		arrayPath: resolvedArrayPath,
		width,
		height,
		numBands,
		bbox,
		sampleRanges,
		dtype: array.dtype ?? 'unknown',
		dimensionNames,
		grid,
		noData,
		scale,
		offset,
		categorical,
		xIndex,
		yIndex,
		bandIndex,
		fixedIndices: array.shape.map(() => 0)
	};
};

export const inspectGeoZarr = async (
	url: string,
	arrayPath?: string,
	bboxText?: string | null
): Promise<GeoZarrRegistrationMeta> => {
	const state = await inspectGeoZarrInternal(url, arrayPath, bboxText);
	return {
		url: state.url,
		arrayPath: state.arrayPath,
		width: state.width,
		height: state.height,
		numBands: state.numBands,
		bbox: state.bbox,
		sampleRanges: state.sampleRanges,
		dtype: state.dtype,
		dimensionNames: state.dimensionNames,
		grid: state.grid,
		noData: state.noData,
		scale: state.scale,
		offset: state.offset,
		...(state.gpm ? { gpm: state.gpm } : {}),
		categorical: state.categorical
	};
};

export const registerGeoZarr = async (
	input: GeoZarrRegistrationInput
): Promise<GeoZarrRegistrationMeta> => {
	const normalizedUrl = normalizeGeoZarrUrl(input.url);
	const { array } = await openGeoZarrArray(normalizedUrl, input.arrayPath);
	const metadata = input.metadata && normalizeGeoZarrUrl(input.metadata.url) === normalizedUrl
			&& input.metadata.arrayPath === normalizeArrayPath(input.arrayPath)
		? input.metadata
		: null;
	const axisIndexes = metadata ? inferAxisIndexes(array, metadata.dimensionNames) : null;
	const inspected = metadata
		? {
			...metadata,
			xIndex: axisIndexes?.xIndex ?? Math.max(1, array.shape.length - 1),
			yIndex: axisIndexes?.yIndex ?? Math.max(0, array.shape.length - 2),
			bandIndex: axisIndexes?.bandIndex ?? null,
			fixedIndices: array.shape.map(() => 0)
		}
		: await inspectGeoZarrInternal(normalizedUrl, input.arrayPath, input.bboxText);
	const state: GeoZarrSourceState = {
		...inspected,
		array
	};
	zarrRegistry.set(input.entryId, state);

	return {
		url: state.url,
		arrayPath: state.arrayPath,
		width: state.width,
		height: state.height,
		numBands: state.numBands,
		bbox: state.bbox,
		sampleRanges: state.sampleRanges,
		dtype: state.dtype,
		dimensionNames: state.dimensionNames,
		grid: state.grid,
		noData: state.noData,
		scale: state.scale,
		offset: state.offset,
		...(state.gpm ? { gpm: state.gpm } : {}),
		categorical: state.categorical
	};
};

export const unregisterGeoZarr = (entryId: string) => {
	const state = zarrRegistry.get(entryId);
	zarrRegistry.delete(entryId);
	for (const key of geozarrTileCache.keys()) {
		if (key.startsWith(`${entryId}|`)) geozarrTileCache.delete(key);
	}
	if (
		state
		&& ![...zarrRegistry.values()].some(other =>
			other.url === state.url && other.arrayPath === state.arrayPath
		)
	) {
		chunkCache.deletePrefix(`${state.url}|${state.arrayPath}|`);
		if (state.gpm) releaseGpmCache(state.url);
		for (const key of geozarrWindowCache.keys()) {
			if (key.startsWith(`${state.url}|${state.arrayPath}|`)) geozarrWindowCache.delete(key);
		}
	}
};

const clamp = (value: number, min: number, max: number): number => {
	return Math.max(min, Math.min(max, value));
};

const encodeGeoZarrCanvas = async (canvas: OffscreenCanvas): Promise<Uint8Array> => {
	const result = await convertCanvasToResult(canvas);
	if (result instanceof Blob) return new Uint8Array(await result.arrayBuffer());

	const fallbackCanvas = new OffscreenCanvas(canvas.width, canvas.height);
	const fallbackContext = fallbackCanvas.getContext('2d');
	if (!fallbackContext) throw new Error('GeoZarr PNG 変換に失敗しました');
	fallbackContext.drawImage(result, 0, 0);
	result.close();
	const blob = await fallbackCanvas.convertToBlob({ type: 'image/png' });
	return new Uint8Array(await blob.arrayBuffer());
};

const renderSingleBandTile = async (
	view: { data: ArrayLike<number>; shape: number[]; stride: number[]; },
	state: GeoZarrSourceState,
	z: number,
	x: number,
	y: number,
	tileSize: number,
	xOrigin: number,
	yOrigin: number,
	style: {
		bandIndex: number;
		colorMap: string;
		min: number;
		max: number;
	}
): Promise<Uint8Array> => {
	const [west, , east] = tilebelt.tileToBBOX([x, y, z]);
	const width = view.shape[1];
	const height = view.shape[0];
	const colorMap = colorMapManager.createColorArray(style.colorMap);

	const canvas = new OffscreenCanvas(tileSize, tileSize);
	const context = canvas.getContext('2d');
	if (!context) throw new Error('GeoZarr タイル描画用の Canvas 初期化に失敗しました');

	const image = new ImageData(tileSize, tileSize);
	const data = image.data;
	for (let row = 0; row < tileSize; row++) {
		const lat = tileLatitude(y, z, row, tileSize);
		for (let column = 0; column < tileSize; column++) {
			const lon = west + ((column + 0.5) / tileSize) * (east - west);
			const offset = (row * tileSize + column) * 4;
			const pixel = gridPixel(state.grid, state.width, state.height, lon, lat);
			if (!pixel) continue;
			const [srcX, srcY] = pixel;
			const localX = clamp(srcX - xOrigin, 0, width - 1);
			const localY = clamp(srcY - yOrigin, 0, height - 1);
			const value = getViewValue(view, localY, localX);
			if (!Number.isFinite(value)) {
				data[offset + 3] = 0;
				continue;
			}

			const normalized = clamp(
				(value - style.min) / Math.max(style.max - style.min, 1e-9),
				0,
				1
			);
			const colorIndex = Math.round(normalized * 255) * 3;
			data[offset] = colorMap[colorIndex] ?? 0;
			data[offset + 1] = colorMap[colorIndex + 1] ?? 0;
			data[offset + 2] = colorMap[colorIndex + 2] ?? 0;
			data[offset + 3] = 255;
		}
	}

	context.putImageData(image, 0, 0);
	return encodeGeoZarrCanvas(canvas);
};

const renderCategoricalTile = async (
	view: { data: ArrayLike<number>; shape: number[]; stride: number[]; },
	state: GeoZarrSourceState,
	z: number,
	x: number,
	y: number,
	tileSize: number,
	xOrigin: number,
	yOrigin: number,
	style: {
		values: number[];
		colors: string[];
	}
): Promise<Uint8Array> => {
	const [west, , east] = tilebelt.tileToBBOX([x, y, z]);
	const width = view.shape[1];
	const height = view.shape[0];
	const colorTable = style.values.map((value, index) => ({
		value,
		color: style.colors[index] ?? '#999999'
	}));

	const canvas = new OffscreenCanvas(tileSize, tileSize);
	const context = canvas.getContext('2d');
	if (!context) throw new Error('GeoZarr タイル描画用の Canvas 初期化に失敗しました');

	const image = new ImageData(tileSize, tileSize);
	const data = image.data;
	for (let row = 0; row < tileSize; row++) {
		const lat = tileLatitude(y, z, row, tileSize);
		for (let column = 0; column < tileSize; column++) {
			const lon = west + ((column + 0.5) / tileSize) * (east - west);
			const offset = (row * tileSize + column) * 4;
			const pixel = gridPixel(state.grid, state.width, state.height, lon, lat);
			if (!pixel) continue;
			const [srcX, srcY] = pixel;
			const localX = clamp(srcX - xOrigin, 0, width - 1);
			const localY = clamp(srcY - yOrigin, 0, height - 1);
			const value = getViewValue(view, localY, localX);
			if (!Number.isFinite(value)) {
				data[offset + 3] = 0;
				continue;
			}

			const matched = colorTable.find((item) => Math.abs(item.value - value) < 1e-6);
			if (!matched) {
				data[offset + 3] = 0;
				continue;
			}

			const rgb = matched.color.startsWith('#') ? matched.color : `#${matched.color}`;
			const [r, g, b] = [
				Number.parseInt(rgb.slice(1, 3), 16),
				Number.parseInt(rgb.slice(3, 5), 16),
				Number.parseInt(rgb.slice(5, 7), 16)
			];
			data[offset] = r;
			data[offset + 1] = g;
			data[offset + 2] = b;
			data[offset + 3] = 255;
		}
	}

	context.putImageData(image, 0, 0);
	return encodeGeoZarrCanvas(canvas);
};

const renderMultiBandTile = async (
	views: { data: ArrayLike<number>; shape: number[]; stride: number[]; }[],
	state: GeoZarrSourceState,
	z: number,
	x: number,
	y: number,
	tileSize: number,
	xOrigin: number,
	yOrigin: number,
	style: {
		indices: [number, number, number];
		ranges: [BandDataRange, BandDataRange, BandDataRange];
	}
): Promise<Uint8Array> => {
	const [west, , east] = tilebelt.tileToBBOX([x, y, z]);
	const width = views[0]?.shape[1] ?? 0;
	const height = views[0]?.shape[0] ?? 0;

	const canvas = new OffscreenCanvas(tileSize, tileSize);
	const context = canvas.getContext('2d');
	if (!context) throw new Error('GeoZarr タイル描画用の Canvas 初期化に失敗しました');

	const image = new ImageData(tileSize, tileSize);
	const data = image.data;
	for (let row = 0; row < tileSize; row++) {
		const lat = tileLatitude(y, z, row, tileSize);
		for (let column = 0; column < tileSize; column++) {
			const lon = west + ((column + 0.5) / tileSize) * (east - west);
			const offset = (row * tileSize + column) * 4;
			const pixel = gridPixel(state.grid, state.width, state.height, lon, lat);
			if (!pixel) continue;
			const [srcX, srcY] = pixel;
			const localX = clamp(srcX - xOrigin, 0, width - 1);
			const localY = clamp(srcY - yOrigin, 0, height - 1);

			let transparent = false;
			for (let band = 0; band < 3; band++) {
				const view = views[band];
				const range = style.ranges[band];
				const value = getViewValue(view, localY, localX);
				if (!Number.isFinite(value)) {
					transparent = true;
					break;
				}
				data[offset + band] = clamp(
					Math.round(((value - range.min) / Math.max(range.max - range.min, 1e-9)) * 255),
					0,
					255
				);
			}

			data[offset + 3] = transparent ? 0 : 255;
		}
	}

	context.putImageData(image, 0, 0);
	return encodeGeoZarrCanvas(canvas);
};

/** Worker内で展開し、正のセルだけを描画側へ渡す。 */
export const readGeoZarrVoxelRegion = async (input: VoxelRegionRequest, signal: AbortSignal) => {
	signal.throwIfAborted();
	let state = zarrRegistry.get(input.entryId);
	if (!state || state.url !== input.url || state.arrayPath !== (input.arrayPath ?? '')) {
		await registerGeoZarr(input);
		state = zarrRegistry.get(input.entryId);
	}
	signal.throwIfAborted();
	if (!state?.gpm?.height) {
		throw new Error('このZarrにはボクセル表示用の地域・高度情報がありません');
	}
	let layout = state.gpm, array = state.array;
	if (!Number.isInteger(input.region) || !layout.regions[input.region]) {
		throw new Error('Zarrの地域番号が不正です');
	}
	if (input.overview && layout.overviewPath && layout.overviewDimensions) {
		array = (await openGeoZarrArray(state.url, layout.overviewPath)).array;
		validateGpmArray(array, layout.regions.length, layout.overviewDimensions);
		layout = { ...layout, dimensions: layout.overviewDimensions };
	}
	const [nx, ny, nz] = layout.dimensions;
	const reader = array as GeoZarrArrayNode & {
		getChunk: (
			position: number[],
			options: { signal: AbortSignal; }
		) => Promise<{ data: ArrayLike<number>; stride: number[]; }>;
	};
	const chunk = await reader.getChunk([input.region, 0, 0, 0], { signal });
	signal.throwIfAborted();
	if ([nx * ny * nz, nx * ny, nx, 1].some((value, i) => value !== chunk.stride[i])) {
		throw new Error('Zarrのボクセル配列順が不正です');
	}
	return createVoxelCells(layout, input.region, chunk.data);
};

export const geozarrProtocol = (protocolName: 'geozarr') => ({
	protocolName,
	request: async (
		params: { url: string; },
		abortController: AbortController
	): Promise<{ data: Uint8Array; }> => {
		const urlWithoutProtocol = params.url.replace(`${protocolName}://`, '');
		const url = new URL(urlWithoutProtocol, runtimeOrigin);
		const requestId = `${url.toString()}_${crypto.randomUUID()}`;
		const requestStartedAt = performance.now();

		return new Promise<{ data: Uint8Array; }>((resolve, reject) => {
			let settled = false;
			const finish = (callback: () => void) => {
				if (settled) return;
				settled = true;
				pendingGeoZarrRequests.delete(requestId);
				abortController.signal.removeEventListener('abort', handleAbort);
				callback();
			};
			const handleAbort = () => {
				finish(() => reject(createAbortError()));
			};

			pendingGeoZarrRequests.set(requestId, { controller: abortController, reject });
			abortController.signal.addEventListener('abort', handleAbort, { once: true });

			void (async () => {
				try {
					throwIfAborted(abortController.signal);
					const entryId = url.searchParams.get('entryId') ?? '';
					let state = zarrRegistry.get(entryId);
					if (!state && url.searchParams.get('url')) {
						let opening = openingSources.get(entryId);
						if (!opening) {
							opening = registerGeoZarr({
								entryId,
								url: url.searchParams.get('url')!,
								arrayPath: url.searchParams.get('arrayPath') ?? undefined,
								bboxText: url.searchParams.get('bbox')
							});
							openingSources.set(entryId, opening);
							void opening.finally(() => openingSources.delete(entryId)).catch(
								() => {}
							);
						}
						await opening;
						throwIfAborted(abortController.signal);
						state = zarrRegistry.get(entryId);
					}
					if (!state) {
						finish(() => resolve({ data: EMPTY_TILE.slice() }));
						return;
					}
					const cacheKey = `${entryId}|${url.toString()}`;
					const cachedTile = getGeoZarrTileCache(cacheKey);
					if (cachedTile) {
						logGeoZarrTiming('tile-cache-hit', {
							entryId,
							mode: url.searchParams.get('mode') ?? 'single',
							z: url.searchParams.get('z'),
							x: url.searchParams.get('x'),
							y: url.searchParams.get('y'),
							durationMs: Number((performance.now() - requestStartedAt).toFixed(1))
						});
						finish(() => resolve({ data: cachedTile }));
						return;
					}

					const x = Number.parseInt(url.searchParams.get('x') ?? '0', 10);
					const y = Number.parseInt(url.searchParams.get('y') ?? '0', 10);
					const z = Number.parseInt(url.searchParams.get('z') ?? '0', 10);
					const tileSize = Number.parseInt(url.searchParams.get('tileSize') ?? '256', 10);
					if (
						![x, y, z].every(Number.isInteger) || z < 0 || z > 24 || x < 0 || y < 0
						|| x >= 2 ** z || y >= 2 ** z || ![256, 512].includes(tileSize)
					) throw new Error('Zarrのタイル要求が不正です。');
					if (state.gpm) {
						const gpmMode = url.searchParams.get('gpmMode') ?? 'max';
						const gpmHeight = Number(url.searchParams.get('gpmHeight') ?? 0);
						if (
							(gpmMode !== 'max' && gpmMode !== 'height')
							|| !Number.isFinite(gpmHeight)
						) {
							throw new Error('GPM Zarrの高度指定が不正です');
						}
						let layout = state.gpm, array = state.array, path = state.arrayPath;
						if (z < 5 && layout.overviewPath && layout.overviewDimensions) {
							path = layout.overviewPath;
							array = (await openGeoZarrArray(state.url, path)).array;
							validateGpmArray(
								array,
								layout.regions.length,
								layout.overviewDimensions
							);
							layout = { ...layout, dimensions: layout.overviewDimensions };
						}
						const reader = array as GeoZarrArrayNode & {
							getChunk: (
								coordinates: number[],
								options: { signal: AbortSignal; }
							) => Promise<{ data: ArrayLike<number>; stride: number[]; }>;
						};
						const [nx, ny, nz] = layout.dimensions;
						const pixels = await renderGpmPixels(layout, {
							x,
							y,
							z,
							size: tileSize,
							min: Number(url.searchParams.get('min') ?? 0),
							max: Number(url.searchParams.get('max') ?? layout.max),
							colorMap: url.searchParams.get('colorMap') ?? 'jet',
							cacheKey: `${state.url}|${path}`,
							mode: gpmMode,
							height: gpmHeight
						}, async (index, signal) => {
							const chunk = await reader.getChunk([index, 0, 0, 0], { signal });
							if (
								[nx * ny * nz, nx * ny, nx, 1].some((stride, i) =>
									chunk.stride[i] !== stride
								)
							) throw new Error('GPM Zarrのチャンク配列順が不正です');
							return chunk.data;
						}, abortController.signal);
						throwIfAborted(abortController.signal);
						const canvas = new OffscreenCanvas(tileSize, tileSize);
						const context = canvas.getContext('2d');
						if (!context) throw new Error('ZarrのCanvasを初期化できません');
						const image = new ImageData(tileSize, tileSize);
						image.data.set(pixels);
						context.putImageData(image, 0, 0);
						const data = await encodeGeoZarrCanvas(canvas);
						throwIfAborted(abortController.signal);
						setGeoZarrTileCache(cacheKey, data);
						finish(() => resolve({ data }));
						return;
					}
					const window = tileGridWindow(
						state.grid,
						state.width,
						state.height,
						x,
						y,
						z,
						tileSize
					);
					if (!window) {
						finish(() => resolve({ data: EMPTY_TILE.slice() }));
						return;
					}
					const { xStart, xEnd, yStart, yEnd } = window;

					const mode = url.searchParams.get('mode') ?? 'single';
					if (mode === 'categorical') {
						const bandIndex = Number.parseInt(
							url.searchParams.get('bandIndex') ?? '0',
							10
						);
						const values = (url.searchParams.get('values') ?? '')
							.split('|')
							.map((item) => Number(item))
							.filter((item) => Number.isFinite(item));
						const colors = (url.searchParams.get('colors') ?? '')
							.split('|')
							.map((item) => item.trim())
							.filter((item) => item.length > 0);
						const windowStartedAt = performance.now();
						const { view, cacheHit } = await readBandWindowCached(
							state,
							xStart,
							xEnd,
							yStart,
							yEnd,
							bandIndex,
							abortController.signal
						);
						logGeoZarrTiming('tile-window-read', {
							entryId,
							mode,
							z,
							x,
							y,
							width: xEnd - xStart,
							height: yEnd - yStart,
							cacheHits: cacheHit ? 1 : 0,
							cacheMisses: cacheHit ? 0 : 1,
							durationMs: Number((performance.now() - windowStartedAt).toFixed(1))
						});
						throwIfAborted(abortController.signal);
						const renderStartedAt = performance.now();
						const data = await renderCategoricalTile(
							view,
							state,
							z,
							x,
							y,
							tileSize,
							xStart,
							yStart,
							{
								values,
								colors
							}
						);
						logGeoZarrTiming('tile-render', {
							entryId,
							mode,
							z,
							x,
							y,
							durationMs: Number((performance.now() - renderStartedAt).toFixed(1))
						});
						throwIfAborted(abortController.signal);
						setGeoZarrTileCache(cacheKey, data);
						logGeoZarrTiming('tile-finished', {
							entryId,
							mode,
							z,
							x,
							y,
							durationMs: Number((performance.now() - requestStartedAt).toFixed(1))
						});
						finish(() => resolve({ data }));
						return;
					}

					if (mode === 'multi' && state.numBands >= 3) {
						const indices = [
							Number.parseInt(url.searchParams.get('rIndex') ?? '0', 10),
							Number.parseInt(url.searchParams.get('gIndex') ?? '1', 10),
							Number.parseInt(url.searchParams.get('bIndex') ?? '2', 10)
						] as [number, number, number];
						const windowStartedAt = performance.now();
						const windowReads = await Promise.all(
							indices.map((index) =>
								readBandWindowCached(
									state,
									xStart,
									xEnd,
									yStart,
									yEnd,
									index,
									abortController.signal
								)
							)
						);
						const windowCacheHits = windowReads.filter((item) => item.cacheHit).length;
						const views = windowReads.map((item) => item.view);
						logGeoZarrTiming('tile-window-read', {
							entryId,
							mode,
							z,
							x,
							y,
							width: xEnd - xStart,
							height: yEnd - yStart,
							cacheHits: windowCacheHits,
							cacheMisses: windowReads.length - windowCacheHits,
							durationMs: Number((performance.now() - windowStartedAt).toFixed(1))
						});
						throwIfAborted(abortController.signal);
						const ranges = [
							{
								min: Number.parseFloat(
									url.searchParams.get('rMin')
										?? String(state.sampleRanges[0]?.min ?? 0)
								),
								max: Number.parseFloat(
									url.searchParams.get('rMax')
										?? String(state.sampleRanges[0]?.max ?? 1)
								)
							},
							{
								min: Number.parseFloat(
									url.searchParams.get('gMin')
										?? String(state.sampleRanges[1]?.min ?? 0)
								),
								max: Number.parseFloat(
									url.searchParams.get('gMax')
										?? String(state.sampleRanges[1]?.max ?? 1)
								)
							},
							{
								min: Number.parseFloat(
									url.searchParams.get('bMin')
										?? String(state.sampleRanges[2]?.min ?? 0)
								),
								max: Number.parseFloat(
									url.searchParams.get('bMax')
										?? String(state.sampleRanges[2]?.max ?? 1)
								)
							}
						] as [BandDataRange, BandDataRange, BandDataRange];
						const renderStartedAt = performance.now();
						const data = await renderMultiBandTile(
							views,
							state,
							z,
							x,
							y,
							tileSize,
							xStart,
							yStart,
							{
								indices,
								ranges
							}
						);
						logGeoZarrTiming('tile-render', {
							entryId,
							mode,
							z,
							x,
							y,
							durationMs: Number((performance.now() - renderStartedAt).toFixed(1))
						});
						throwIfAborted(abortController.signal);
						setGeoZarrTileCache(cacheKey, data);
						logGeoZarrTiming('tile-finished', {
							entryId,
							mode,
							z,
							x,
							y,
							durationMs: Number((performance.now() - requestStartedAt).toFixed(1))
						});
						finish(() => resolve({ data }));
						return;
					}

					const bandIndex = Number.parseInt(url.searchParams.get('bandIndex') ?? '0', 10);
					const windowStartedAt = performance.now();
					const { view, cacheHit } = await readBandWindowCached(
						state,
						xStart,
						xEnd,
						yStart,
						yEnd,
						bandIndex,
						abortController.signal
					);
					logGeoZarrTiming('tile-window-read', {
						entryId,
						mode,
						z,
						x,
						y,
						width: xEnd - xStart,
						height: yEnd - yStart,
						cacheHits: cacheHit ? 1 : 0,
						cacheMisses: cacheHit ? 0 : 1,
						durationMs: Number((performance.now() - windowStartedAt).toFixed(1))
					});
					throwIfAborted(abortController.signal);
					const renderStartedAt = performance.now();
					const data = await renderSingleBandTile(
						view,
						state,
						z,
						x,
						y,
						tileSize,
						xStart,
						yStart,
						{
							bandIndex,
							colorMap: url.searchParams.get('colorMap') ?? 'jet',
							min: Number.parseFloat(
								url.searchParams.get('min')
									?? String(state.sampleRanges[bandIndex]?.min ?? 0)
							),
							max: Number.parseFloat(
								url.searchParams.get('max')
									?? String(state.sampleRanges[bandIndex]?.max ?? 1)
							)
						}
					);
					logGeoZarrTiming('tile-render', {
						entryId,
						mode,
						z,
						x,
						y,
						durationMs: Number((performance.now() - renderStartedAt).toFixed(1))
					});
					throwIfAborted(abortController.signal);
					setGeoZarrTileCache(cacheKey, data);
					logGeoZarrTiming('tile-finished', {
						entryId,
						mode,
						z,
						x,
						y,
						durationMs: Number((performance.now() - requestStartedAt).toFixed(1))
					});
					finish(() => resolve({ data }));
				} catch (error) {
					finish(() =>
						reject(
							error instanceof Error
								? error
								: new Error('GeoZarr tile request failed')
						)
					);
				}
			})();
		});
	},
	cancelAllRequests: () => {
		pendingGeoZarrRequests.forEach(({ controller }) => {
			controller.abort();
		});
		pendingGeoZarrRequests.clear();
	}
});
