import { fromArrayBuffer } from 'geotiff';
import type { TypedArray } from 'geotiff';

interface AnalyzeGeoTiffWorkerRequest {
	arrayBuffer: ArrayBuffer;
}

export interface GeoTiffAnalyzeWorkerResponse {
	width: number;
	height: number;
	rawBbox: [number, number, number, number] | null;
	numBands: number;
	nodata: number | null;
	dataRanges: { min: number; max: number }[];
	bandBuffers: ArrayBuffer[];
	bandTypes: string[];
}

interface GeoTiffAnalyzeWorkerErrorResponse {
	error: string;
}

const getMinMax = (
	band: TypedArray,
	nodata: number | null
): { min: number; max: number } => {
	let min = Infinity;
	let max = -Infinity;

	for (let i = 0; i < band.length; i++) {
		const value = band[i];
		const isValid = Number.isFinite(value)
			&& (nodata === null
				|| (!Number.isNaN(nodata) && value !== nodata)
				|| (Number.isNaN(nodata) && !Number.isNaN(value)));
		if (isValid) {
			min = Math.min(min, value);
			max = Math.max(max, value);
		}
	}

	if (!Number.isFinite(min)) min = 0;
	if (!Number.isFinite(max)) max = 255;

	return { min, max };
};

const parseRasterBands = (rasterData: TypedArray | TypedArray[]): TypedArray[] => {
	if (Array.isArray(rasterData)) {
		return rasterData;
	}
	return [rasterData];
};

const parseBboxFromGeoTiffImage = (
	image: Awaited<ReturnType<Awaited<ReturnType<typeof fromArrayBuffer>>['getImage']>>,
	width: number,
	height: number
): [number, number, number, number] | null => {
	try {
		const imageBbox = image.getBoundingBox();
		if (imageBbox && imageBbox.length === 4) {
			return imageBbox as [number, number, number, number];
		}
	} catch {
		// getBoundingBox に必要なメタデータが欠けている場合は origin/resolution にフォールバックする
	}

	try {
		const [originX, originY] = image.getOrigin();
		const [resolutionX, resolutionY] = image.getResolution();

		if (
			![originX, originY, resolutionX, resolutionY].every((value) => Number.isFinite(value))
			|| resolutionX === 0
			|| resolutionY === 0
		) {
			return null;
		}

		const maxX = originX + resolutionX * width;
		const maxY = originY + resolutionY * height;

		return [
			Math.min(originX, maxX),
			Math.min(originY, maxY),
			Math.max(originX, maxX),
			Math.max(originY, maxY)
		];
	} catch {
		return null;
	}
};

self.onmessage = async (event: MessageEvent<AnalyzeGeoTiffWorkerRequest>) => {
	try {
		const tiff = await fromArrayBuffer(event.data.arrayBuffer);
		const image = await tiff.getImage();
		const width = image.getWidth();
		const height = image.getHeight();
		const rawBbox = parseBboxFromGeoTiffImage(image, width, height);
		const rasterData = await image.readRasters({ interleave: false });
		const bands = parseRasterBands(rasterData as TypedArray | TypedArray[]);
		const nodata = image.fileDirectory.GDAL_NODATA !== undefined
			? parseFloat(image.fileDirectory.GDAL_NODATA)
			: null;
		const dataRanges = bands.map((band) => getMinMax(band, nodata));
		const bandBuffers = bands.map((band) => band.buffer as ArrayBuffer);
		const bandTypes = bands.map((band) => band.constructor.name);

		const response: GeoTiffAnalyzeWorkerResponse = {
			width,
			height,
			rawBbox,
			numBands: bands.length,
			nodata,
			dataRanges,
			bandBuffers,
			bandTypes
		};

		postMessage(response, {
			transfer: bandBuffers
		});
	} catch (error) {
		const response: GeoTiffAnalyzeWorkerErrorResponse = {
			error: error instanceof Error ? error.message : String(error)
		};
		postMessage(response);
	}
};
