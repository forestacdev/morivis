import './worker-shim';
import { geoParquetArrayBufferToGeoJson, type GeoParquetReadResult } from '.';

interface GeoParquetWorkerRequest {
	arrayBuffer: ArrayBuffer;
}

interface GeoParquetWorkerSuccessResponse {
	result: GeoParquetReadResult;
}

interface GeoParquetWorkerErrorResponse {
	error: string;
}

self.onmessage = async (event: MessageEvent<GeoParquetWorkerRequest>) => {
	try {
		const result = await geoParquetArrayBufferToGeoJson(event.data.arrayBuffer);
		postMessage({ result } satisfies GeoParquetWorkerSuccessResponse);
	} catch (error) {
		postMessage({
			error: error instanceof Error ? error.message : String(error)
		} satisfies GeoParquetWorkerErrorResponse);
	}
};

export type GeoParquetWorkerResponse =
	| GeoParquetWorkerSuccessResponse
	| GeoParquetWorkerErrorResponse;
