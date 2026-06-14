import type { FeatureCollection } from '$routes/map/types/geojson';

import { dxfArrayBufferToGeoJson } from '.';

interface DxfWorkerRequest {
	arrayBuffer: ArrayBuffer;
}

interface DxfWorkerSuccessResponse {
	result: FeatureCollection;
}

interface DxfWorkerErrorResponse {
	error: string;
}

self.onmessage = async (event: MessageEvent<DxfWorkerRequest>) => {
	try {
		const result = dxfArrayBufferToGeoJson(event.data.arrayBuffer);
		postMessage({ result } satisfies DxfWorkerSuccessResponse);
	} catch (error) {
		postMessage(
			{
				error: error instanceof Error ? error.message : String(error)
			} satisfies DxfWorkerErrorResponse
		);
	}
};

export type DxfWorkerResponse = DxfWorkerSuccessResponse | DxfWorkerErrorResponse;
