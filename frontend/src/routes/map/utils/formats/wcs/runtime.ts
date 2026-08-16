import type maplibregl from '$routes/map/utils/maplibre';
import type { Coordinates } from '$routes/map/utils/maplibre';
import { fromArrayBuffer } from 'geotiff';

import type { RasterWcsEntry } from '$routes/map/data/types/raster';
import { buildWcsGetCoverageUrl } from '$routes/map/utils/formats/wcs';
import { fetchWithDevProxy } from '$routes/map/utils/platform/request';

const MAX_WCS_IMAGE_SIZE = 512;
const XML_CONTENT_TYPE_RE = /xml|html|text/i;
const TIFF_CONTENT_TYPE_RE = /image\/tiff|geotiff|tif/i;

const wcsObjectUrls = new Map<string, string>();
const readyWcsViewportEntryIds = new Set<string>();

export class WcsViewportTooBroadError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'WcsViewportTooBroadError';
	}
}

const getFiniteMinMax = (
	data: ArrayLike<number>,
	nodata: number | null
): { min: number; max: number; } => {
	let min = Number.POSITIVE_INFINITY;
	let max = Number.NEGATIVE_INFINITY;

	for (let i = 0; i < data.length; i++) {
		const value = data[i];
		if (!Number.isFinite(value)) continue;
		if (nodata !== null && value === nodata) continue;
		if (value < min) min = value;
		if (value > max) max = value;
	}

	if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
		return { min: 0, max: 1 };
	}

	return { min, max };
};

const normalizeByte = (value: number, min: number, max: number): number => {
	if (!Number.isFinite(value)) return 0;
	if (max === min) return 0;
	const normalized = ((value - min) / (max - min)) * 255;
	return Math.max(0, Math.min(255, Math.round(normalized)));
};

const getViewportSize = (map: maplibregl.Map) => {
	const canvas = map.getCanvas();
	const width = canvas.width || canvas.clientWidth || 256;
	const height = canvas.height || canvas.clientHeight || 256;
	const scale = Math.min(1, MAX_WCS_IMAGE_SIZE / Math.max(width, height));

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

const extractServiceException = (text: string): string | null => {
	const xml = new DOMParser().parseFromString(text, 'text/xml');
	return (
		xml
			.querySelector('ExceptionText, ows\\:ExceptionText, ServiceException')
			?.textContent?.trim()
			?? xml.documentElement.textContent?.trim()
			?? null
	);
};

const isTooBroadCoverageError = (message: string): boolean => {
	const normalized = message.toLowerCase();
	return (
		normalized.includes('too many datasets')
		|| normalized.includes('reduce the bounds of your request')
		|| normalized.includes('processes too much data')
	);
};

const renderTiffToBlob = async (
	buffer: ArrayBuffer,
	width: number,
	height: number,
	ranges?: { min: number; max: number; }[]
): Promise<Blob> => {
	const tiff = await fromArrayBuffer(buffer);
	const image = await tiff.getImage();
	const nodata = image.getGDALNoData();
	const samplesPerPixel = image.getSamplesPerPixel();
	const sampleIndexes = samplesPerPixel >= 3 ? [0, 1, 2] : [0];
	const rasters = (await image.readRasters({
		width,
		height,
		interleave: false,
		resampleMethod: 'bilinear',
		samples: sampleIndexes
	})) as ArrayLike<number>[];

	const rgba = new Uint8ClampedArray(width * height * 4);

	if (sampleIndexes.length >= 3) {
		const [rBand, gBand, bBand] = rasters;
		const rRange = ranges?.[0] ?? getFiniteMinMax(rBand, nodata);
		const gRange = ranges?.[1] ?? getFiniteMinMax(gBand, nodata);
		const bRange = ranges?.[2] ?? getFiniteMinMax(bBand, nodata);

		for (let i = 0; i < width * height; i++) {
			const offset = i * 4;
			const r = rBand[i];
			const g = gBand[i];
			const b = bBand[i];
			const isTransparent =
				(nodata !== null && (r === nodata || g === nodata || b === nodata))
				|| !Number.isFinite(r)
				|| !Number.isFinite(g)
				|| !Number.isFinite(b);

			if (isTransparent) {
				rgba[offset + 3] = 0;
				continue;
			}

			rgba[offset] = normalizeByte(r, rRange.min, rRange.max);
			rgba[offset + 1] = normalizeByte(g, gRange.min, gRange.max);
			rgba[offset + 2] = normalizeByte(b, bRange.min, bRange.max);
			rgba[offset + 3] = 255;
		}
	} else {
		const [band] = rasters;
		const range = ranges?.[0] ?? getFiniteMinMax(band, nodata);

		for (let i = 0; i < width * height; i++) {
			const offset = i * 4;
			const value = band[i];
			const isTransparent = (nodata !== null && value === nodata) || !Number.isFinite(value);

			if (isTransparent) {
				rgba[offset + 3] = 0;
				continue;
			}

			const gray = normalizeByte(value, range.min, range.max);
			rgba[offset] = gray;
			rgba[offset + 1] = gray;
			rgba[offset + 2] = gray;
			rgba[offset + 3] = 255;
		}
	}

	const canvas = new OffscreenCanvas(width, height);
	const context = canvas.getContext('2d');
	if (!context) {
		throw new Error('WCS 画像描画用の Canvas 初期化に失敗しました');
	}
	context.putImageData(new ImageData(rgba, width, height), 0, 0);
	return await canvas.convertToBlob({ type: 'image/png' });
};

const revokeObjectUrl = (entryId: string) => {
	const current = wcsObjectUrls.get(entryId);
	if (!current) return;
	URL.revokeObjectURL(current);
	wcsObjectUrls.delete(entryId);
};

export const clearWcsViewportImage = (entryId: string) => {
	revokeObjectUrl(entryId);
	readyWcsViewportEntryIds.delete(entryId);
};

export const clearAllWcsViewportImages = () => {
	Array.from(wcsObjectUrls.keys()).forEach((entryId) => revokeObjectUrl(entryId));
	readyWcsViewportEntryIds.clear();
};

export const markWcsViewportReady = (entryId: string) => {
	readyWcsViewportEntryIds.add(entryId);
};

export const resetWcsViewportReady = (entryId: string) => {
	readyWcsViewportEntryIds.delete(entryId);
};

export const fetchWcsViewportImage = async (
	entry: RasterWcsEntry<unknown>,
	map: maplibregl.Map
): Promise<{ url: string; coordinates: Coordinates; } | null> => {
	if (!readyWcsViewportEntryIds.has(entry.id)) {
		return null;
	}

	const bbox = getViewportBbox(map);
	const { width, height } = getViewportSize(map);
	const requestUrl = buildWcsGetCoverageUrl({
		serviceUrl: entry.format.serviceUrl,
		version: entry.format.version,
		coverageId: entry.format.coverageId,
		format: entry.format.outputFormat,
		axisLabels: entry.format.axisLabels,
		bbox,
		crs: entry.format.crs,
		width,
		height
	});

	const response = await fetchWithDevProxy(requestUrl);
	if (!response.ok) {
		const errorText = await response.text().catch(() => '');
		const serviceException = extractServiceException(errorText)
			?? `WCS GetCoverage に失敗しました (HTTP ${response.status})`;
		console.warn('[WCS request failed]', {
			status: response.status,
			requestUrl,
			body: errorText.slice(0, 500)
		});
		if (isTooBroadCoverageError(serviceException)) {
			throw new WcsViewportTooBroadError(serviceException);
		}
		throw new Error(serviceException);
	}

	const contentType = response.headers.get('content-type') ?? entry.format.outputFormat;
	let blob: Blob;

	if (XML_CONTENT_TYPE_RE.test(contentType)) {
		const text = await response.text();
		throw new Error(
			extractServiceException(text) ?? 'WCS が画像ではなく XML/HTML を返しました'
		);
	}

	if (
		TIFF_CONTENT_TYPE_RE.test(contentType)
		|| TIFF_CONTENT_TYPE_RE.test(entry.format.outputFormat)
	) {
		blob = await renderTiffToBlob(
			await response.arrayBuffer(),
			width,
			height,
			entry.properties?.bands?.sampleRanges
		);
	} else {
		blob = await response.blob();
	}

	revokeObjectUrl(entry.id);
	const objectUrl = URL.createObjectURL(blob);
	wcsObjectUrls.set(entry.id, objectUrl);

	return {
		url: objectUrl,
		coordinates: bboxToCoordinates(bbox)
	};
};
