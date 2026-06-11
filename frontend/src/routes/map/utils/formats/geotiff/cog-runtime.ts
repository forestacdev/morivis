import type maplibregl from 'maplibre-gl';
import type { Coordinates } from 'maplibre-gl';

import { getAdjustableRangeValue } from '$routes/map/data/types';
import type { RasterCogEntry, RasterTiffStyle } from '$routes/map/data/types/raster';
import { CogTileManager } from '$routes/map/utils/formats/geotiff/cog_tile_manager';
import { ColorMapManager } from '$routes/map/utils/style/color-mapping';

const MAX_COG_IMAGE_SIZE = 768;

const cogObjectUrls = new Map<string, string>();
const readyCogViewportEntryIds = new Set<string>();

const getViewportSize = (map: maplibregl.Map) => {
	const canvas = map.getCanvas();
	const width = canvas.width || canvas.clientWidth || 256;
	const height = canvas.height || canvas.clientHeight || 256;
	const scale = Math.min(1, MAX_COG_IMAGE_SIZE / Math.max(width, height));

	return {
		width: Math.max(1, Math.round(width * scale)),
		height: Math.max(1, Math.round(height * scale))
	};
};

const getViewportBbox = (map: maplibregl.Map): [number, number, number, number] => {
	const bounds = map.getBounds();
	return [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
};

const bboxToCoordinates = (bbox: [number, number, number, number]): Coordinates => {
	return [
		[bbox[0], bbox[3]],
		[bbox[2], bbox[3]],
		[bbox[2], bbox[1]],
		[bbox[0], bbox[1]]
	];
};

const revokeObjectUrl = (entryId: string) => {
	const current = cogObjectUrls.get(entryId);
	if (!current) return;
	URL.revokeObjectURL(current);
	cogObjectUrls.delete(entryId);
};

const createFloat32Copy = (band: ArrayLike<number>): Float32Array => {
	const copy = new Float32Array(band.length);
	for (let i = 0; i < band.length; i++) {
		copy[i] = band[i];
	}
	return copy;
};

class CogViewportRenderer {
	private worker: Worker;
	private colorMapManager: ColorMapManager;
	private pending = new Map<
		string,
		{
			resolve: (blob: Blob) => void;
			reject: (error?: Error) => void;
		}
	>();
	private requestCounter = 0;

	constructor() {
		this.worker = new Worker(
			new URL('../../../protocol/cog/protocol_cog.worker.ts', import.meta.url),
			{
				type: 'module'
			}
		);
		this.colorMapManager = new ColorMapManager();
		this.worker.addEventListener('message', this.handleMessage);
		this.worker.addEventListener('error', this.handleError);
	}

	render = async (
		entry: RasterCogEntry<RasterTiffStyle>,
		width: number,
		height: number,
		bbox: [number, number, number, number]
	): Promise<Blob | null> => {
		const tileData = await CogTileManager.readViewport(entry.id, bbox, width, height);
		if (!tileData) return null;

		const metadata = CogTileManager.getMetadata(entry.id);
		const nodata = metadata?.nodata ?? null;
		const sampleRanges = metadata?.sampleRanges ?? [];
		const visualization = entry.style.visualization;
		const requestId = `${entry.id}_${this.requestCounter++}`;

		if (visualization.mode === 'single') {
			const uniform = visualization.uniformsData.single;
			const bandIndex = uniform.index;
			const band = createFloat32Copy(tileData.bands[bandIndex] ?? tileData.bands[0]);
			const dataMin = sampleRanges[bandIndex]?.min ?? 0;
			const dataMax = sampleRanges[bandIndex]?.max ?? 1;
			const [valueMin, valueMax] = getAdjustableRangeValue(
				uniform.range,
				uniform.min,
				uniform.max
			);
			const normalizedMin = dataMax !== dataMin
				? (valueMin - dataMin) / (dataMax - dataMin)
				: 0;
			const normalizedMax = dataMax !== dataMin
				? (valueMax - dataMin) / (dataMax - dataMin)
				: 1;
			const colorMapArray = this.colorMapManager.createColorArray(uniform.colorMap);

			return await new Promise<Blob>((resolve, reject) => {
				this.pending.set(requestId, { resolve, reject });
				this.worker.postMessage(
					{
						tileId: requestId,
						mode: 'single',
						targetWidth: width,
						targetHeight: height,
						preferBlob: true,
						triangles: tileData.triangles,
						srcWidth: tileData.srcWidth,
						srcHeight: tileData.srcHeight,
						nodata,
						band,
						dataMin,
						dataMax,
						colorMapArray,
						min: normalizedMin,
						max: normalizedMax
					},
					{ transfer: [band.buffer] }
				);
			});
		}

		const uniform = visualization.uniformsData.multi;
		const copyBand = (bandIndex: number) => {
			const band = createFloat32Copy(tileData.bands[bandIndex] ?? tileData.bands[0]);
			return {
				band,
				range: sampleRanges[bandIndex] ?? { min: 0, max: 1 }
			};
		};

		const r = copyBand(uniform.r.index);
		const g = copyBand(uniform.g.index);
		const b = copyBand(uniform.b.index);
		const [rMin, rMax] = getAdjustableRangeValue(uniform.r.range, uniform.r.min, uniform.r.max);
		const [gMin, gMax] = getAdjustableRangeValue(uniform.g.range, uniform.g.min, uniform.g.max);
		const [bMin, bMax] = getAdjustableRangeValue(uniform.b.range, uniform.b.min, uniform.b.max);
		const normalize = (value: number, min: number, max: number) =>
			max !== min ? (value - min) / (max - min) : 0;

		return await new Promise<Blob>((resolve, reject) => {
			this.pending.set(requestId, { resolve, reject });
			this.worker.postMessage(
				{
					tileId: requestId,
					mode: 'multi',
					targetWidth: width,
					targetHeight: height,
					preferBlob: true,
					triangles: tileData.triangles,
					srcWidth: tileData.srcWidth,
					srcHeight: tileData.srcHeight,
					nodata,
					bandR: r.band,
					bandG: g.band,
					bandB: b.band,
					dataMinR: r.range.min,
					dataMaxR: r.range.max,
					dataMinG: g.range.min,
					dataMaxG: g.range.max,
					dataMinB: b.range.min,
					dataMaxB: b.range.max,
					rMin: normalize(rMin, r.range.min, r.range.max),
					rMax: normalize(rMax, r.range.min, r.range.max),
					gMin: normalize(gMin, g.range.min, g.range.max),
					gMax: normalize(gMax, g.range.min, g.range.max),
					bMin: normalize(bMin, b.range.min, b.range.max),
					bMax: normalize(bMax, b.range.min, b.range.max)
				},
				{ transfer: [r.band.buffer, g.band.buffer, b.band.buffer] }
			);
		});
	};

	private handleMessage = async (event: MessageEvent) => {
		const { id, buffer, error } = event.data;
		const pending = this.pending.get(id);
		if (!pending) return;
		this.pending.delete(id);

		if (error) {
			pending.reject(new Error(error));
			return;
		}

		pending.resolve(new Blob([buffer], { type: 'image/png' }));
	};

	private handleError = (event: ErrorEvent) => {
		console.error('COG viewport worker error:', event);
		this.pending.forEach(({ reject }) => {
			reject(new Error('COG viewport worker error'));
		});
		this.pending.clear();
	};

	terminate = () => {
		this.pending.forEach(({ reject }) => {
			reject(new Error('COG viewport worker terminated'));
		});
		this.pending.clear();
		this.worker.terminate();
	};
}

let renderer: CogViewportRenderer | null = null;

const getRenderer = () => {
	if (!renderer) {
		renderer = new CogViewportRenderer();
	}
	return renderer;
};

export const clearCogViewportImage = (entryId: string) => {
	revokeObjectUrl(entryId);
	readyCogViewportEntryIds.delete(entryId);
};

export const clearAllCogViewportImages = () => {
	Array.from(cogObjectUrls.keys()).forEach((entryId) => revokeObjectUrl(entryId));
	readyCogViewportEntryIds.clear();
};

export const markCogViewportReady = (entryId: string) => {
	readyCogViewportEntryIds.add(entryId);
};

export const resetCogViewportReady = (entryId: string) => {
	readyCogViewportEntryIds.delete(entryId);
};

export const fetchCogViewportImage = async (
	entry: RasterCogEntry<RasterTiffStyle>,
	map: maplibregl.Map
): Promise<{ url: string; coordinates: Coordinates; } | null> => {
	if (!readyCogViewportEntryIds.has(entry.id)) {
		return null;
	}

	const bbox = getViewportBbox(map);
	const { width, height } = getViewportSize(map);
	const blob = await getRenderer().render(entry, width, height, bbox);
	if (!blob) return null;

	revokeObjectUrl(entry.id);
	const objectUrl = URL.createObjectURL(blob);
	cogObjectUrls.set(entry.id, objectUrl);

	return {
		url: objectUrl,
		coordinates: bboxToCoordinates(bbox)
	};
};

export const terminateCogViewportRuntime = () => {
	if (!renderer) return;
	renderer.terminate();
	renderer = null;
};
