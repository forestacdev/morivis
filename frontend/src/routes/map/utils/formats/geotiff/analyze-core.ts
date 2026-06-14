import { fromArrayBuffer } from 'geotiff';
import type { ReadRasterResult, TypedArray } from 'geotiff';

import { getMinMax, parseRasterBands } from '.';

interface GeoTiffImageLike {
	fileDirectory: {
		GDAL_NODATA?: string;
	};
	getBoundingBox(): [number, number, number, number];
	getOrigin(): [number, number];
	getResolution(): [number, number];
	getWidth(): number;
	getHeight(): number;
	readRasters(options: { interleave: false; }): Promise<ReadRasterResult>;
}

export interface GeoTiffAnalyzeWorkerResponse {
	width: number;
	height: number;
	rawBbox: [number, number, number, number] | null;
	numBands: number;
	nodata: number | null;
	dataRanges: { min: number; max: number; }[];
	bandBuffers: ArrayBuffer[];
	bandTypes: string[];
}

export const parseBboxFromGeoTiffImage = (
	image: GeoTiffImageLike,
	width: number,
	height: number
): [number, number, number, number] | null => {
	try {
		const imageBbox = image.getBoundingBox();
		if (imageBbox && imageBbox.length === 4) {
			return imageBbox;
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

export const analyzeGeoTiffArrayBuffer = async (
	arrayBuffer: ArrayBuffer
): Promise<GeoTiffAnalyzeWorkerResponse> => {
	const tiff = await fromArrayBuffer(arrayBuffer);
	const image = (await tiff.getImage()) as unknown as GeoTiffImageLike;
	const width = image.getWidth();
	const height = image.getHeight();
	const rawBbox = parseBboxFromGeoTiffImage(image, width, height);
	const rasterData = await image.readRasters({ interleave: false });
	const bands = parseRasterBands(rasterData);
	const nodata = image.fileDirectory.GDAL_NODATA !== undefined
		? parseFloat(image.fileDirectory.GDAL_NODATA)
		: null;
	const dataRanges = bands.map((band) => getMinMax(band, nodata));
	const bandBuffers = bands.map((band) => band.buffer as ArrayBuffer);
	const bandTypes = bands.map((band) => band.constructor.name);

	return {
		width,
		height,
		rawBbox,
		numBands: bands.length,
		nodata,
		dataRanges,
		bandBuffers,
		bandTypes
	};
};
