import type { FeatureCollection } from '$routes/map/types/geojson';

import { sxfArrayBufferToGeoJson } from '.';

interface SxfWorkerRequest {
	arrayBuffer: ArrayBuffer;
}

interface SxfWorkerSuccessResponse {
	result: FeatureCollection;
}

interface SxfWorkerErrorResponse {
	error: string;
}

self.onmessage = async (event: MessageEvent<SxfWorkerRequest>) => {
	try {
		const result = sxfArrayBufferToGeoJson(event.data.arrayBuffer);
		postMessage({ result } satisfies SxfWorkerSuccessResponse);
	} catch (error) {
		postMessage(
			{
				error: error instanceof Error ? error.message : String(error)
			} satisfies SxfWorkerErrorResponse
		);
	}
};

export type SxfWorkerResponse = SxfWorkerSuccessResponse | SxfWorkerErrorResponse;
