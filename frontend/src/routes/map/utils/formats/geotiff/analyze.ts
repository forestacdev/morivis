import type { TypedArray } from 'geotiff';

import AnalyzeGeoTiffWorker from './analyze.worker?worker';
import type { GeoTiffAnalyzeWorkerResponse } from './analyze.worker';
import { runSingleShotWorker } from '$routes/map/utils/worker/run-single-shot';

export interface GeoTiffAnalyzeResult {
	width: number;
	height: number;
	rawBbox: [number, number, number, number] | null;
	numBands: number;
	nodata: number | null;
	dataRanges: { min: number; max: number }[];
	bands: TypedArray[];
}

const restoreBand = (buffer: ArrayBuffer, typeName: string): TypedArray => {
	switch (typeName) {
		case 'Int8Array':
			return new Int8Array(buffer);
		case 'Uint8Array':
			return new Uint8Array(buffer);
		case 'Int16Array':
			return new Int16Array(buffer);
		case 'Uint16Array':
			return new Uint16Array(buffer);
		case 'Int32Array':
			return new Int32Array(buffer);
		case 'Uint32Array':
			return new Uint32Array(buffer);
		case 'Float32Array':
			return new Float32Array(buffer);
		case 'Float64Array':
			return new Float64Array(buffer);
		default:
			throw new Error(`Unsupported raster band type: ${typeName}`);
	}
};

const restoreBands = (buffers: ArrayBuffer[], bandTypes: string[]): TypedArray[] =>
	buffers.map((buffer, index) => restoreBand(buffer, bandTypes[index]));

export const analyzeGeoTiffInWorker = (
	arrayBuffer: ArrayBuffer
): Promise<GeoTiffAnalyzeResult> =>
	runSingleShotWorker<
		{ arrayBuffer: ArrayBuffer; },
		GeoTiffAnalyzeWorkerResponse,
		GeoTiffAnalyzeResult
	>(AnalyzeGeoTiffWorker, { arrayBuffer }, {
		errorPrefix: 'GeoTIFF analyze worker error',
		mapResponse: (response) => ({
			width: response.width,
			height: response.height,
			rawBbox: response.rawBbox,
			numBands: response.numBands,
			nodata: response.nodata,
			dataRanges: response.dataRanges,
			bands: restoreBands(response.bandBuffers, response.bandTypes)
		}),
		transfer: [arrayBuffer]
	});
