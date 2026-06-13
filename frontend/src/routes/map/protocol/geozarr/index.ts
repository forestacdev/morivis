import * as tilebelt from '@mapbox/tilebelt';
import proj4 from 'proj4';
import * as zarr from 'zarrita';

import { convertCanvasToResult } from '$routes/map/protocol/farbling';
import type { BandDataRange } from '$routes/map/utils/cache/raster/geotiff-cache';
import { resolveAbsoluteRequestUrl } from '$routes/map/utils/platform/request';
import { ColorMapManager } from '$routes/map/utils/style/color-mapping';

const EMPTY_TILE = new Uint8Array(0);
const createAbortError = () => new Error('Request aborted');
const throwIfAborted = (signal: AbortSignal) => {
	if (signal.aborted) throw createAbortError();
};
const GEOZARR_TILE_CACHE_MAX = 256;

type GeoZarrArrayNode = {
	shape: number[];
	chunks: number[];
	dtype?: string;
	dimension_names?: string[];
	attrs?: Record<string, unknown>;
	attributes?: Record<string, unknown>;
};

interface GeoZarrRegistrationInput {
	entryId: string;
	url: string;
	arrayPath?: string;
	bboxText?: string | null;
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
}

interface GeoZarrSourceState extends GeoZarrRegistrationMeta {
	array: GeoZarrArrayNode;
	xIndex: number;
	yIndex: number;
	bandIndex: number | null;
	fixedIndices: number[];
}

const zarrRegistry = new Map<string, GeoZarrSourceState>();
const colorMapManager = new ColorMapManager();
const pendingGeoZarrRequests = new Map<
	string,
	{
		controller: AbortController;
		reject: (reason?: Error) => void;
	}
>();
const geozarrStoreCache = new Map<string, Promise<GeoZarrListableStore>>();
const geozarrTileCache = new Map<string, Uint8Array>();

type GeoZarrListableStore = zarr.FetchStore & {
	contents?: () => { path: string; kind: 'array' | 'group'; }[];
};

export const normalizeGeoZarrUrl = (url: string): string => {
	const trimmed = url.trim();
	if (!trimmed) return trimmed;

	try {
		const parsed = new URL(trimmed);
		parsed.pathname = parsed.pathname
			.replace(/\/(?:\.zmetadata|\.zgroup|\.zattrs|zarr\.json)$/iu, '')
			.replace(/\/+$/u, '');
		return parsed.toString();
	} catch {
		return trimmed
			.replace(/\/(?:\.zmetadata|\.zgroup|\.zattrs|zarr\.json)$/iu, '')
			.replace(/\/+$/u, '');
	}
};

const createProxyFetchStore = async (url: string): Promise<GeoZarrListableStore> => {
	const normalizedUrl = normalizeGeoZarrUrl(url);
	const cached = geozarrStoreCache.get(normalizedUrl);
	if (cached) return cached;

	const storePromise = (async () => {
		const baseStore = new zarr.FetchStore(resolveAbsoluteRequestUrl(normalizedUrl), {
			fetch: async (request) => {
				const proxyUrl = new URL('/api/cog-proxy', window.location.origin);
				proxyUrl.searchParams.set('url', request.url);
				return fetch(new Request(proxyUrl.toString(), request));
			}
		});
		return (await zarr.withMaybeConsolidatedMetadata(baseStore)) as GeoZarrListableStore;
	})();

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
};

const normalizeArrayPath = (value?: string): string =>
	value?.trim().replace(/^\/+|\/+$/g, '') ?? '';

const getArrayAttrs = (array: GeoZarrArrayNode): Record<string, unknown> => {
	return array.attrs ?? array.attributes ?? {};
};

const getNodeAttrs = (node: { attrs?: Record<string, unknown>; attributes?: Record<string, unknown>; }) =>
	node.attrs ?? node.attributes ?? {};

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
	return /(^|\/)(time|valid_time|step|latitude|lat|longitude|lon|x|y|band|bands|angle|angles|detector|detectors|level|levels|hybrid|hybrid_sigma_pressure|pressure)$/i.test(
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
		if (array.shape.length !== 1) return null;
		const values = (await zarr.get(
			array,
			[zarr.slice(0, array.shape[0])] as Parameters<typeof zarr.get>[1]
		)) as {
			data: ArrayLike<number>;
		};
		return Array.from(values.data, (value) => Number(value)).filter((value) =>
			Number.isFinite(value)
		);
	} catch {
		return null;
	}
};

const inferBboxFromCoordinateArrays = async (
	url: string,
	arrayPath: string,
	dimensionNames: string[]
): Promise<[number, number, number, number] | null> => {
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

	let minX = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	for (const value of xValues) {
		if (value < minX) minX = value;
		if (value > maxX) maxX = value;
	}

	let minY = Number.POSITIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;
	for (const value of yValues) {
		if (value < minY) minY = value;
		if (value > maxY) maxY = value;
	}

	if (![minX, minY, maxX, maxY].every((value) => Number.isFinite(value))) return null;

	return [minX, minY, maxX, maxY];
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
		return { array, arrayPath: normalizedPath };
	}

	try {
		const array = (await zarr.open(root, { kind: 'array' })) as GeoZarrArrayNode;
		return { array, arrayPath: '' };
	} catch {
		// root が group の場合は下位配列を探索する
	}

	await zarr.open(root, { kind: 'group' });

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
		return { array: bestCandidate.array, arrayPath: bestCandidate.path };
	}

	throw new Error(
		'GeoZarr の配列を特定できませんでした。group ルートの可能性があります。配列パスを指定してください。'
	);
};

export const listGeoZarrArrayCandidates = async (url: string): Promise<GeoZarrArrayCandidate[]> => {
	const store = await createProxyFetchStore(url);
	const root = zarr.root(store);

	try {
		await zarr.open(root, { kind: 'group' });
	} catch {
		return [];
	}

	const paths =
		typeof store.contents === 'function'
			? store
					.contents()
					.filter((entry) => entry.kind === 'array' && entry.path !== '/')
					.map((entry) => entry.path.replace(/^\/+/, ''))
			: [];

	const candidates: GeoZarrArrayCandidate[] = [];

	for (const path of paths) {
		try {
			const array = (await zarr.open(root.resolve(path), { kind: 'array' })) as GeoZarrArrayNode;
			const attrs = getArrayAttrs(array);
			const dimensionNames = inferDimensionNames(array);
			const category = getGeoZarrArrayCategory(path, array);
			const score = scoreArrayCandidate(path, array);
			candidates.push({
				arrayPath: path,
				groupPath: getParentArrayPath(path) || '/',
				score,
				shape: [...array.shape],
				dtype: array.dtype ?? 'unknown',
				dimensionNames,
				longName: getMetadataString(attrs, 'long_name', 'title', 'name'),
				shortName: getMetadataString(attrs, 'short_name', 'standard_name'),
				units: getMetadataString(attrs, 'units'),
				category,
				isRecommended:
					category === 'measurements'
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
		?? (array.shape.length >= 3 && array.shape[0] <= 4 && 0 !== xIndex && 0 !== yIndex
			? 0
			: null);

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

const isGeographicBbox = (bbox: [number, number, number, number]) => {
	return (
		Math.abs(bbox[0]) <= 180
		&& Math.abs(bbox[2]) <= 180
		&& Math.abs(bbox[1]) <= 90
		&& Math.abs(bbox[3]) <= 90
	);
};

export const normalizeGeoZarrBbox = (
	bbox: [number, number, number, number],
	projectionCode: string | null
): [number, number, number, number] => {
	if (!projectionCode || /^EPSG:4326$/i.test(projectionCode) || isGeographicBbox(bbox)) {
		return bbox;
	}

	try {
		const corners = [
			[bbox[0], bbox[1]],
			[bbox[2], bbox[1]],
			[bbox[2], bbox[3]],
			[bbox[0], bbox[3]]
		].map((corner) => proj4(projectionCode, 'EPSG:4326', corner as [number, number]));
		const lons = corners.map((corner) => Number(corner[0])).filter((value) => Number.isFinite(value));
		const lats = corners.map((corner) => Number(corner[1])).filter((value) => Number.isFinite(value));

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

const readDatasetGroupMetadata = async (url: string) => {
	const store = await createProxyFetchStore(url);
	const root = zarr.root(store);

	const inspectGroup = async (groupPath: string) => {
		try {
			const group = (await zarr.open(groupPath ? root.resolve(groupPath) : root, {
				kind: 'group'
			})) as {
				attrs?: Record<string, unknown>;
				attributes?: Record<string, unknown>;
			};
			const attrs = getNodeAttrs(group);
			const bbox = parseBboxFromAttrs(attrs);
			const projectionCode = parseProjectionCodeFromAttrs(attrs);
			if (bbox || projectionCode) {
				return { bbox, projectionCode };
			}
		} catch {
			// skip
		}

		return null;
	};

	const rootMeta = await inspectGroup('');
	if (rootMeta?.bbox || rootMeta?.projectionCode) return rootMeta;

	const paths =
		typeof store.contents === 'function'
			? store
					.contents()
					.filter((entry) => entry.kind === 'group' && entry.path !== '/')
					.map((entry) => entry.path.replace(/^\/+/, ''))
			: [];

	for (const groupPath of paths) {
		const meta = await inspectGroup(groupPath);
		if (meta?.bbox || meta?.projectionCode) return meta;
	}

	return { bbox: null, projectionCode: null };
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
	bandIndex = 0
) => {
	return (await zarr.get(
		state.array as Parameters<typeof zarr.get>[0],
		buildSelection(state, xStart, xEnd, yStart, yEnd, bandIndex)
	)) as {
		data: ArrayLike<number>;
		shape: number[];
		stride: number[];
	};
};

const inspectGeoZarrInternal = async (
	url: string,
	arrayPath?: string,
	bboxText?: string | null
): Promise<Omit<GeoZarrSourceState, 'array'>> => {
	const normalizedUrl = normalizeGeoZarrUrl(url);
	const { array, arrayPath: resolvedArrayPath } = await openGeoZarrArray(normalizedUrl, arrayPath);
	const attrs = getArrayAttrs(array);
	const dimensionNames = inferDimensionNames(array);
	const { xIndex, yIndex, bandIndex } = inferAxisIndexes(array, dimensionNames);
	const { bbox: ancestorBbox, projectionCode } = await readAncestorGroupMetadata(
		normalizedUrl,
		resolvedArrayPath
	);
	const datasetMetadata =
		ancestorBbox && projectionCode
			? { bbox: ancestorBbox, projectionCode }
			: await readDatasetGroupMetadata(normalizedUrl);
	const rawBbox =
		parseBboxText(bboxText)
		?? parseBboxFromAttrs(attrs)
		?? ancestorBbox
		?? datasetMetadata.bbox
		?? (await inferBboxFromCoordinateArrays(normalizedUrl, resolvedArrayPath, dimensionNames));
	const bbox = rawBbox
		? normalizeGeoZarrBbox(rawBbox, projectionCode ?? datasetMetadata.projectionCode)
		: null;

	if (!bbox) {
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
	const sampleRanges: BandDataRange[] = [];

	const sampleWidth = Math.max(1, Math.min(128, width));
	const sampleHeight = Math.max(1, Math.min(128, height));
	const xStart = Math.max(0, Math.floor((width - sampleWidth) / 2));
	const yStart = Math.max(0, Math.floor((height - sampleHeight) / 2));
	const xEnd = Math.min(width, xStart + sampleWidth);
	const yEnd = Math.min(height, yStart + sampleHeight);

	const bandsToSample = numBands >= 3 ? [0, 1, 2] : [0];
	for (const index of bandsToSample) {
		try {
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
					array,
					xIndex,
					yIndex,
					bandIndex,
					fixedIndices: array.shape.map(() => 0)
				},
				xStart,
				xEnd,
				yStart,
				yEnd,
				index
			);
			sampleRanges.push(getFiniteMinMax(view.data));
		} catch {
			sampleRanges.push(getDefaultRangeFromDtype(array.dtype ?? 'unknown'));
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
		dimensionNames: state.dimensionNames
	};
};

export const registerGeoZarr = async (
	input: GeoZarrRegistrationInput
): Promise<GeoZarrRegistrationMeta> => {
	const normalizedUrl = normalizeGeoZarrUrl(input.url);
	const { array } = await openGeoZarrArray(normalizedUrl, input.arrayPath);
	const inspected = await inspectGeoZarrInternal(normalizedUrl, input.arrayPath, input.bboxText);
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
		dimensionNames: state.dimensionNames
	};
};

export const unregisterGeoZarr = (entryId: string) => {
	zarrRegistry.delete(entryId);
	for (const key of geozarrTileCache.keys()) {
		if (key.startsWith(`${entryId}|`)) geozarrTileCache.delete(key);
	}
};

const clamp = (value: number, min: number, max: number): number => {
	return Math.max(min, Math.min(max, value));
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
	const [west, south, east, north] = tilebelt.tileToBBOX([x, y, z]);
	const [minX, minY, maxX, maxY] = state.bbox;
	const width = view.shape[1];
	const height = view.shape[0];
	const range = state.sampleRanges[style.bandIndex] ?? getDefaultRangeFromDtype(state.dtype);
	const colorMap = colorMapManager.createColorArray(style.colorMap);

	const canvas = new OffscreenCanvas(tileSize, tileSize);
	const context = canvas.getContext('2d');
	if (!context) throw new Error('GeoZarr タイル描画用の Canvas 初期化に失敗しました');

	const image = new ImageData(tileSize, tileSize);
	const data = image.data;
	for (let row = 0; row < tileSize; row++) {
		const lat = north - ((row + 0.5) / tileSize) * (north - south);
		for (let column = 0; column < tileSize; column++) {
			const lon = west + ((column + 0.5) / tileSize) * (east - west);
			const offset = (row * tileSize + column) * 4;
			if (lon < minX || lon > maxX || lat < minY || lat > maxY) {
				data[offset + 3] = 0;
				continue;
			}

			const srcX = clamp(
				Math.floor(((lon - minX) / (maxX - minX)) * state.width),
				0,
				state.width - 1
			);
			const srcY = clamp(
				Math.floor(((maxY - lat) / (maxY - minY)) * state.height),
				0,
				state.height - 1
			);
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
			const colorIndex = Math.round(normalized * 255) * 4;
			data[offset] = colorMap[colorIndex] ?? 0;
			data[offset + 1] = colorMap[colorIndex + 1] ?? 0;
			data[offset + 2] = colorMap[colorIndex + 2] ?? 0;
			data[offset + 3] = 255;
		}
	}

	context.putImageData(image, 0, 0);
	const result = await convertCanvasToResult(canvas);
	if (result instanceof Blob) return new Uint8Array(await result.arrayBuffer());

	const fallbackCanvas = new OffscreenCanvas(tileSize, tileSize);
	const fallbackContext = fallbackCanvas.getContext('2d');
	if (!fallbackContext) throw new Error('GeoZarr PNG 変換に失敗しました');
	fallbackContext.drawImage(result, 0, 0);
	const blob = await fallbackCanvas.convertToBlob({ type: 'image/png' });
	return new Uint8Array(await blob.arrayBuffer());
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
	const [west, south, east, north] = tilebelt.tileToBBOX([x, y, z]);
	const [minX, minY, maxX, maxY] = state.bbox;
	const width = views[0]?.shape[1] ?? 0;
	const height = views[0]?.shape[0] ?? 0;

	const canvas = new OffscreenCanvas(tileSize, tileSize);
	const context = canvas.getContext('2d');
	if (!context) throw new Error('GeoZarr タイル描画用の Canvas 初期化に失敗しました');

	const image = new ImageData(tileSize, tileSize);
	const data = image.data;
	for (let row = 0; row < tileSize; row++) {
		const lat = north - ((row + 0.5) / tileSize) * (north - south);
		for (let column = 0; column < tileSize; column++) {
			const lon = west + ((column + 0.5) / tileSize) * (east - west);
			const offset = (row * tileSize + column) * 4;
			if (lon < minX || lon > maxX || lat < minY || lat > maxY) {
				data[offset + 3] = 0;
				continue;
			}

			const srcX = clamp(
				Math.floor(((lon - minX) / (maxX - minX)) * state.width),
				0,
				state.width - 1
			);
			const srcY = clamp(
				Math.floor(((maxY - lat) / (maxY - minY)) * state.height),
				0,
				state.height - 1
			);
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
	const result = await convertCanvasToResult(canvas);
	if (result instanceof Blob) return new Uint8Array(await result.arrayBuffer());

	const fallbackCanvas = new OffscreenCanvas(tileSize, tileSize);
	const fallbackContext = fallbackCanvas.getContext('2d');
	if (!fallbackContext) throw new Error('GeoZarr PNG 変換に失敗しました');
	fallbackContext.drawImage(result, 0, 0);
	const blob = await fallbackCanvas.convertToBlob({ type: 'image/png' });
	return new Uint8Array(await blob.arrayBuffer());
};

export const geozarrProtocol = (protocolName: 'geozarr') => ({
	protocolName,
	request: async (
		params: { url: string; },
		abortController: AbortController
	): Promise<{ data: Uint8Array; }> => {
		const urlWithoutProtocol = params.url.replace(`${protocolName}://`, '');
		const url = new URL(urlWithoutProtocol, window.location.origin);
		const requestId = `${url.toString()}_${crypto.randomUUID()}`;

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
					const state = zarrRegistry.get(entryId);
					if (!state) {
						finish(() => resolve({ data: EMPTY_TILE }));
						return;
					}
					const cacheKey = `${entryId}|${url.toString()}`;
					const cachedTile = getGeoZarrTileCache(cacheKey);
					if (cachedTile) {
						finish(() => resolve({ data: cachedTile }));
						return;
					}

					const x = Number.parseInt(url.searchParams.get('x') ?? '0', 10);
					const y = Number.parseInt(url.searchParams.get('y') ?? '0', 10);
					const z = Number.parseInt(url.searchParams.get('z') ?? '0', 10);
					const tileSize = Number.parseInt(url.searchParams.get('tileSize') ?? '256', 10);
					const westSouthEastNorth = tilebelt.tileToBBOX([x, y, z]);
					const [west, south, east, north] = westSouthEastNorth;
					const [minX, minY, maxX, maxY] = state.bbox;

					if (east <= minX || west >= maxX || north <= minY || south >= maxY) {
						finish(() => resolve({ data: EMPTY_TILE }));
						return;
					}

					const xStart = clamp(
						Math.floor(((west - minX) / (maxX - minX)) * state.width),
						0,
						state.width - 1
					);
					const xEnd = clamp(
						Math.ceil(((east - minX) / (maxX - minX)) * state.width),
						xStart + 1,
						state.width
					);
					const yStart = clamp(
						Math.floor(((maxY - north) / (maxY - minY)) * state.height),
						0,
						state.height - 1
					);
					const yEnd = clamp(
						Math.ceil(((maxY - south) / (maxY - minY)) * state.height),
						yStart + 1,
						state.height
					);

					const mode = url.searchParams.get('mode') ?? 'single';
					if (mode === 'multi' && state.numBands >= 3) {
						const indices = [
							Number.parseInt(url.searchParams.get('rIndex') ?? '0', 10),
							Number.parseInt(url.searchParams.get('gIndex') ?? '1', 10),
							Number.parseInt(url.searchParams.get('bIndex') ?? '2', 10)
						] as [number, number, number];
						const views = await Promise.all(
							indices.map((index) => readBandWindow(state, xStart, xEnd, yStart, yEnd, index))
						);
						throwIfAborted(abortController.signal);
						const ranges = [
							{
								min: Number.parseFloat(
									url.searchParams.get('rMin') ?? String(state.sampleRanges[0]?.min ?? 0)
								),
								max: Number.parseFloat(
									url.searchParams.get('rMax') ?? String(state.sampleRanges[0]?.max ?? 1)
								)
							},
							{
								min: Number.parseFloat(
									url.searchParams.get('gMin') ?? String(state.sampleRanges[1]?.min ?? 0)
								),
								max: Number.parseFloat(
									url.searchParams.get('gMax') ?? String(state.sampleRanges[1]?.max ?? 1)
								)
							},
							{
								min: Number.parseFloat(
									url.searchParams.get('bMin') ?? String(state.sampleRanges[2]?.min ?? 0)
								),
								max: Number.parseFloat(
									url.searchParams.get('bMax') ?? String(state.sampleRanges[2]?.max ?? 1)
								)
							}
						] as [BandDataRange, BandDataRange, BandDataRange];
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
						throwIfAborted(abortController.signal);
						setGeoZarrTileCache(cacheKey, data);
						finish(() => resolve({ data }));
						return;
					}

					const bandIndex = Number.parseInt(url.searchParams.get('bandIndex') ?? '0', 10);
					const view = await readBandWindow(state, xStart, xEnd, yStart, yEnd, bandIndex);
					throwIfAborted(abortController.signal);
					const data = await renderSingleBandTile(view, state, z, x, y, tileSize, xStart, yStart, {
						bandIndex,
						colorMap: url.searchParams.get('colorMap') ?? 'jet',
						min: Number.parseFloat(
							url.searchParams.get('min') ?? String(state.sampleRanges[bandIndex]?.min ?? 0)
						),
						max: Number.parseFloat(
							url.searchParams.get('max') ?? String(state.sampleRanges[bandIndex]?.max ?? 1)
						)
					});
					throwIfAborted(abortController.signal);
					setGeoZarrTileCache(cacheKey, data);
					finish(() => resolve({ data }));
				} catch (error) {
					finish(() =>
						reject(error instanceof Error ? error : new Error('GeoZarr tile request failed'))
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
