import { analyzeGeoTiffArrayBuffer, type GeoTiffAnalyzeWorkerResponse } from './analyze-core';

interface AnalyzeGeoTiffWorkerRequest {
	arrayBuffer: ArrayBuffer;
}

interface GeoTiffAnalyzeWorkerErrorResponse {
	error: string;
}

self.onmessage = async (event: MessageEvent<AnalyzeGeoTiffWorkerRequest>) => {
	try {
		const response = await analyzeGeoTiffArrayBuffer(event.data.arrayBuffer);

		postMessage(response, {
			transfer: response.bandBuffers
		});
	} catch (error) {
		const response: GeoTiffAnalyzeWorkerErrorResponse = {
			error: error instanceof Error ? error.message : String(error)
		};
		postMessage(response);
	}
};

export type { GeoTiffAnalyzeWorkerResponse } from './analyze-core';
