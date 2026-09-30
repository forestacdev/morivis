import { formatGeoZarr } from '$routes/map/utils/formats/geozarr/definition';
import { ColorMapManager } from '$routes/map/utils/style/color-mapping';
import { createChunkCache } from './chunk-cache';
import { tileLatitude } from './grid';

type Bounds = {
	west: number;
	south: number;
	east: number;
	north: number;
	minHeight?: number;
	maxHeight?: number;
};
export type GpmLayout = {
	regions: { index: number; bounds: Bounds; }[];
	dimensions: [number, number, number];
	height?: { min: number; max: number; step: number; };
	noData: number;
	max: number;
	bbox: [number, number, number, number];
	overviewPath?: string;
	overviewDimensions?: [number, number, number];
};
type ArrayShape = { shape: number[]; chunks: number[]; dtype?: string; };
const record = (value: unknown): Record<string, unknown> =>
	value && typeof value === 'object' && !Array.isArray(value)
		? value as Record<string, unknown>
		: {};
const dimensions = (value: unknown): [number, number, number] => {
	if (
		!Array.isArray(value) || value.length !== 3
		|| !value.every(n => Number.isInteger(n) && n > 0 && n <= 128)
	) throw new Error('GPM Zarrの地域格子の寸法が不正です');
	return value as [number, number, number];
};
export const validateGpmArray = (array: ArrayShape, count: number, dims: number[]) => {
	const shape = [count, ...dims.toReversed()], chunks = [1, ...dims.toReversed()];
	if (
		array.dtype !== 'float32' || array.shape.length !== 4 || array.chunks.length !== 4
		|| shape.some((n, i) => array.shape[i] !== n)
		|| chunks.some((n, i) => array.chunks[i] !== n)
	) throw new Error('GPM Zarrの配列形状と地域索引が一致しません');
};
export const parseGpmLayout = (
	value: unknown,
	arrayPath: string,
	array: ArrayShape
): GpmLayout | null => {
	if (value === undefined) return null;
	const meta = record(value), levels = record(meta.levels);
	const levelName = arrayPath.split('/').pop()!;
	if (!Object.hasOwn(levels, levelName)) return null;
	if (
		meta.version !== 3 || meta.order !== 'x-fastest' || meta.dtype !== 'float32-le'
		|| !Array.isArray(meta.tiles) || !meta.tiles.length
		|| meta.tiles.length > formatGeoZarr.limits.maxFiles || typeof meta.noData !== 'number'
		|| !Number.isFinite(meta.noData) || typeof meta.max !== 'number'
		|| !Number.isFinite(meta.max) || meta.max < 0
	) throw new Error('未対応または不正なGPM Zarrの地域索引です');
	const dims = dimensions(record(levels[levelName]).dimensions);
	validateGpmArray(array, meta.tiles.length, dims);
	const keys = new Set<string>();
	const regions = meta.tiles.map((value, index) => {
		const tile = record(value), b = record(tile.bounds);
		const values = [b.west, b.south, b.east, b.north];
		if (
			tile.index !== index || !values.every(v => typeof v === 'number' && Number.isFinite(v))
		) throw new Error('GPM Zarrの地域番号または座標が不正です');
		const [west, south, east, north] = values as number[];
		const key = `${west},${south},${east},${north}`;
		if (
			west < -180 || east > 180 || south < -90 || north > 90 || west >= east || south >= north
			|| keys.has(key)
		) throw new Error('GPM Zarrの地域範囲が不正です');
		keys.add(key);
		const minHeight = b.minHeight, maxHeight = b.maxHeight;
		if (minHeight !== undefined || maxHeight !== undefined) {
			if (
				typeof minHeight !== 'number' || typeof maxHeight !== 'number'
				|| !Number.isFinite(minHeight) || !Number.isFinite(maxHeight)
				|| minHeight >= maxHeight
			) {
				throw new Error('GPM Zarrの高度範囲が不正です');
			}
			return { index, bounds: { west, south, east, north, minHeight, maxHeight } };
		}
		return { index, bounds: { west, south, east, north } };
	});
	const bbox: GpmLayout['bbox'] = [180, 90, -180, -90];
	for (const { bounds: b } of regions) {
		bbox[0] = Math.min(bbox[0], b.west);
		bbox[1] = Math.min(bbox[1], b.south);
		bbox[2] = Math.max(bbox[2], b.east);
		bbox[3] = Math.max(bbox[3], b.north);
	}
	const height = regions.every(({ bounds }) => bounds.minHeight !== undefined)
		? {
			min: Math.min(...regions.map(({ bounds }) => bounds.minHeight!)),
			max: Math.max(...regions.map(({ bounds }) => bounds.maxHeight!)),
			step: Math.min(
				...regions.map(({ bounds }) => (bounds.maxHeight! - bounds.minHeight!) / dims[2])
			)
		}
		: undefined;
	return {
		...(height ? { height } : {}),
		regions,
		dimensions: dims,
		noData: meta.noData,
		max: meta.max,
		bbox,
		...(levelName === 'detail' && levels.overview
			? {
				overviewPath: arrayPath.replace(/detail$/, 'overview'),
				overviewDimensions: dimensions(record(levels.overview).dimensions)
			}
			: {})
	};
};

export const reduceGpmColumnMax = (
	data: ArrayLike<number>,
	dims: number[],
	noData: number,
	layer?: number
) => {
	const [nx, ny, nz] = dims, size = nx * ny;
	if (data.length !== size * nz) throw new Error('GPM Zarrのチャンク長が不正です');
	const reduced = new Float32Array(size).fill(NaN);
	if (layer !== undefined && (!Number.isInteger(layer) || layer < 0 || layer >= nz)) {
		return reduced;
	}
	for (let h = layer ?? 0; h < (layer === undefined ? nz : layer + 1); h++) {
		for (let i = 0; i < size; i++) {
			const value = data[h * size + i];
			if (!Number.isFinite(value) || value === noData || value < 0) continue;
			reduced[i] = Number.isNaN(reduced[i]) ? value : Math.max(reduced[i], value);
		}
	}
	return reduced;
};
const reducedCache = createChunkCache<Float32Array>(
	formatGeoZarr.limits.maxExpandedBytes,
	data => data.byteLength
);
export const releaseGpmCache = (url: string) => reducedCache.deletePrefix(`${url}|`);
const colors = new ColorMapManager();
/** 各地域を別々の範囲へ配置する。離れた地域の間を画像で埋めない。 */
export const renderGpmPixels = async (
	layout: GpmLayout,
	request: {
		x: number;
		y: number;
		z: number;
		size: number;
		min: number;
		max: number;
		colorMap: string;
		cacheKey: string;
		mode?: 'max' | 'height';
		height?: number;
	},
	read: (index: number, signal: AbortSignal) => Promise<ArrayLike<number>>,
	signal: AbortSignal
) => {
	signal.throwIfAborted();
	const { x, y, z, size } = request, n = 2 ** z;
	const west = x / n * 360 - 180, east = (x + 1) / n * 360 - 180;
	const lats = Array.from({ length: size }, (_, row) => tileLatitude(y, z, row, size));
	const pixels = new Uint8ClampedArray(size * size * 4);
	const palette = colors.createColorArray(request.colorMap);
	const [nx, ny] = layout.dimensions;
	for (const region of layout.regions) {
		const b = region.bounds;
		if (b.east <= west || b.west >= east || b.north < lats[size - 1] || b.south > lats[0]) {
			continue;
		}
		let layer: number | undefined;
		if (request.mode === 'height') {
			if (
				b.minHeight === undefined || b.maxHeight === undefined
				|| !Number.isFinite(request.height)
			) {
				throw new Error('GPM Zarrの高度を指定できません');
			}
			if (request.height! < b.minHeight || request.height! >= b.maxHeight) continue;
			layer = Math.floor(
				(request.height! - b.minHeight) / (b.maxHeight - b.minHeight) * layout.dimensions[2]
			);
		}
		const values = await reducedCache.get(
			`${request.cacheKey}|${region.index}|${layer ?? 'max'}`,
			async sharedSignal =>
				reduceGpmColumnMax(
					await read(region.index, sharedSignal),
					layout.dimensions,
					layout.noData,
					layer
				),
			signal
		);
		signal.throwIfAborted();
		const firstCol = Math.max(0, Math.ceil((b.west - west) / (east - west) * size - 0.5));
		const lastCol = Math.min(size, Math.ceil((b.east - west) / (east - west) * size - 0.5));
		for (let row = 0; row < size; row++) {
			const lat = lats[row];
			if (lat < b.south || lat >= b.north) continue;
			const iy = Math.floor((lat - b.south) / (b.north - b.south) * ny);
			for (let col = firstCol; col < lastCol; col++) {
				const lon = west + (col + 0.5) / size * (east - west);
				const ix = Math.floor((lon - b.west) / (b.east - b.west) * nx);
				const value = values[iy * nx + ix];
				if (!Number.isFinite(value)) continue;
				const color = Math.round(
					Math.max(
						0,
						Math.min(
							1,
							(value - request.min) / Math.max(request.max - request.min, 1e-9)
						)
					) * 255
				) * 3;
				const offset = (row * size + col) * 4;
				pixels[offset] = palette[color];
				pixels[offset + 1] = palette[color + 1];
				pixels[offset + 2] = palette[color + 2];
				pixels[offset + 3] = 255;
			}
		}
	}
	return pixels;
};
