import * as tilebelt from '@mapbox/tilebelt';
import { fromArrayBuffer } from 'geotiff';

import { convertCanvasToResult } from '$routes/map/protocol/farbling';
import { buildWcsGetCoverageUrl } from '$routes/map/utils/formats/wcs';
import { fetchWithDevProxy } from '$routes/map/utils/platform/request';

const TILE_CACHE_LIMIT = 256;
const tileCache = new Map<string, Uint8Array>();

const DIRECT_IMAGE_CONTENT_TYPE_RE = /^image\/(png|jpeg|jpg|webp|gif|bmp)/i;
const TIFF_CONTENT_TYPE_RE = /image\/tiff|geotiff|tif/i;
const XML_CONTENT_TYPE_RE = /xml|html|text/i;

const cloneUint8Array = (value: Uint8Array): Uint8Array => {
	return new Uint8Array(value.slice().buffer);
};

const setTileCache = (key: string, value: Uint8Array) => {
	if (tileCache.has(key)) {
		tileCache.delete(key);
	}
	if (tileCache.size >= TILE_CACHE_LIMIT) {
		const oldestKey = tileCache.keys().next().value;
		if (oldestKey) {
			tileCache.delete(oldestKey);
		}
	}
	tileCache.set(key, cloneUint8Array(value));
};

const toUint8Array = async (blob: Blob): Promise<Uint8Array> => {
	return new Uint8Array(await blob.arrayBuffer());
};

const getFiniteMinMax = (
	data: ArrayLike<number>,
	nodata: number | null
): { min: number; max: number } => {
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

const parseRanges = (value: string | null): number[] => {
	return (value ?? '')
		.split(',')
		.map((part) => Number.parseFloat(part))
		.filter((part) => Number.isFinite(part));
};

const renderTiffToPngBytes = async (
	buffer: ArrayBuffer,
	tileSize: number,
	requestedRanges?: { mins: number[]; maxs: number[] }
): Promise<Uint8Array> => {
	const tiff = await fromArrayBuffer(buffer);
	const image = await tiff.getImage();
	const nodata = image.getGDALNoData();
	const samplesPerPixel = image.getSamplesPerPixel();
	const readOptions = {
		width: tileSize,
		height: tileSize,
		interleave: false as const,
		resampleMethod: 'bilinear' as const
	};

	const sampleIndexes = samplesPerPixel >= 3 ? [0, 1, 2] : [0];
	const rasters = (await image.readRasters({
		...readOptions,
		samples: sampleIndexes
	})) as ArrayLike<number>[];

	const rgba = new Uint8ClampedArray(tileSize * tileSize * 4);

	if (sampleIndexes.length >= 3) {
		const [rBand, gBand, bBand] = rasters;
		const rRange =
			requestedRanges && requestedRanges.mins.length >= 3 && requestedRanges.maxs.length >= 3
				? { min: requestedRanges.mins[0], max: requestedRanges.maxs[0] }
				: getFiniteMinMax(rBand, nodata);
		const gRange =
			requestedRanges && requestedRanges.mins.length >= 3 && requestedRanges.maxs.length >= 3
				? { min: requestedRanges.mins[1], max: requestedRanges.maxs[1] }
				: getFiniteMinMax(gBand, nodata);
		const bRange =
			requestedRanges && requestedRanges.mins.length >= 3 && requestedRanges.maxs.length >= 3
				? { min: requestedRanges.mins[2], max: requestedRanges.maxs[2] }
				: getFiniteMinMax(bBand, nodata);

		for (let i = 0; i < tileSize * tileSize; i++) {
			const offset = i * 4;
			const r = rBand[i];
			const g = gBand[i];
			const b = bBand[i];
			const isTransparent =
				(nodata !== null && (r === nodata || g === nodata || b === nodata)) ||
				!Number.isFinite(r) ||
				!Number.isFinite(g) ||
				!Number.isFinite(b);

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
		const range =
			requestedRanges && requestedRanges.mins.length >= 1 && requestedRanges.maxs.length >= 1
				? { min: requestedRanges.mins[0], max: requestedRanges.maxs[0] }
				: getFiniteMinMax(band, nodata);

		for (let i = 0; i < tileSize * tileSize; i++) {
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

	const canvas = new OffscreenCanvas(tileSize, tileSize);
	const context = canvas.getContext('2d');
	if (!context) {
		throw new Error('WCS タイル描画用の Canvas 初期化に失敗しました');
	}
	context.putImageData(new ImageData(rgba, tileSize, tileSize), 0, 0);

	const result = await convertCanvasToResult(canvas);
	if (result instanceof Blob) {
		return toUint8Array(result);
	}

	const fallbackCanvas = new OffscreenCanvas(tileSize, tileSize);
	const fallbackContext = fallbackCanvas.getContext('2d');
	if (!fallbackContext) {
		throw new Error('WCS タイル PNG 変換に失敗しました');
	}
	fallbackContext.drawImage(result, 0, 0);
	const blob = await fallbackCanvas.convertToBlob({ type: 'image/png' });
	return toUint8Array(blob);
};

const extractServiceException = (text: string): string | null => {
	const xml = new DOMParser().parseFromString(text, 'text/xml');
	return (
		xml
			.querySelector('ExceptionText, ows\\:ExceptionText, ServiceException')
			?.textContent?.trim() ??
		xml.documentElement.textContent?.trim() ??
		null
	);
};

class WcsProtocolHandler {
	private pendingRequests = new Map<
		string,
		{
			controller: AbortController;
		}
	>();

	async request(url: URL, abortController: AbortController): Promise<{ data: Uint8Array }> {
		const x = Number.parseInt(url.searchParams.get('x') ?? '0', 10);
		const y = Number.parseInt(url.searchParams.get('y') ?? '0', 10);
		const z = Number.parseInt(url.searchParams.get('z') ?? '0', 10);
		const tileSize = Number.parseInt(url.searchParams.get('tileSize') ?? '256', 10);
		const serviceUrl = url.searchParams.get('serviceUrl') ?? '';
		const version = url.searchParams.get('version') ?? '2.0.1';
		const coverageId = url.searchParams.get('coverageId') ?? '';
		const outputFormat = url.searchParams.get('outputFormat') ?? 'image/tiff';
		const crs = url.searchParams.get('crs') ?? 'EPSG:4326';
		const axisLabels = (url.searchParams.get('axisLabels') ?? '')
			.split(',')
			.map((value) => value.trim())
			.filter(Boolean);
		const bandMins = parseRanges(url.searchParams.get('bandMins'));
		const bandMaxs = parseRanges(url.searchParams.get('bandMaxs'));

		if (!serviceUrl || !coverageId) {
			return { data: new Uint8Array() };
		}

		const cacheKey = `${serviceUrl}|${coverageId}|${outputFormat}|${z}/${x}/${y}`;
		const cached = tileCache.get(cacheKey);
		if (cached) {
			tileCache.delete(cacheKey);
			tileCache.set(cacheKey, cached);
			return { data: cloneUint8Array(cached) };
		}

		const bbox = tilebelt.tileToBBOX([x, y, z]) as [number, number, number, number];
		const requestId = `${cacheKey}_${Date.now()}`;
		this.pendingRequests.set(requestId, { controller: abortController });

		try {
			const requestUrl = buildWcsGetCoverageUrl({
				serviceUrl,
				version,
				coverageId,
				format: outputFormat,
				axisLabels,
				bbox,
				crs,
				width: tileSize,
				height: tileSize
			});

			const response = await fetchWithDevProxy(requestUrl, { signal: abortController.signal });
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			const contentType = response.headers.get('content-type') ?? outputFormat;
			let data: Uint8Array;

			if (
				DIRECT_IMAGE_CONTENT_TYPE_RE.test(contentType) &&
				!TIFF_CONTENT_TYPE_RE.test(contentType)
			) {
				data = new Uint8Array(await response.arrayBuffer());
			} else if (
				TIFF_CONTENT_TYPE_RE.test(contentType) ||
				TIFF_CONTENT_TYPE_RE.test(outputFormat)
			) {
				data = await renderTiffToPngBytes(await response.arrayBuffer(), tileSize, {
					mins: bandMins,
					maxs: bandMaxs
				});
			} else if (XML_CONTENT_TYPE_RE.test(contentType)) {
				const text = await response.text();
				throw new Error(
					extractServiceException(text) ?? 'WCS が画像ではなく XML/HTML を返しました'
				);
			} else {
				data = new Uint8Array(await response.arrayBuffer());
			}

			setTileCache(cacheKey, data);
			return { data: cloneUint8Array(data) };
		} finally {
			this.pendingRequests.delete(requestId);
		}
	}

	cancelAllRequests = () => {
		this.pendingRequests.forEach(({ controller }) => controller.abort());
		this.pendingRequests.clear();
	};

	clearCache = () => {
		tileCache.clear();
	};
}

const handler = new WcsProtocolHandler();

export const terminateWcsProtocol = () => {
	handler.cancelAllRequests();
	handler.clearCache();
};

export const wcsProtocol = (protocolName: 'wcs') => {
	return {
		protocolName,
		request: (params: { url: string }, abortController: AbortController) => {
			const urlWithoutProtocol = params.url.replace(`${protocolName}://`, '');
			const url = new URL(urlWithoutProtocol, window.location.origin);
			return handler.request(url, abortController);
		},
		cancelAllRequests: handler.cancelAllRequests,
		clearCache: handler.clearCache
	};
};
