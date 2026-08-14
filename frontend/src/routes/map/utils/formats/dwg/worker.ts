import type { FeatureCollection } from '$routes/map/types/geojson';

import { dwgArrayBufferToGeoJson } from '.';

interface DwgWorkerRequest {
	arrayBuffer: ArrayBuffer;
}

interface DwgWorkerSuccessResponse {
	result: FeatureCollection;
}

interface DwgWorkerErrorResponse {
	error: string;
}

self.onmessage = async (event: MessageEvent<DwgWorkerRequest>) => {
	try {
		const result = await dwgArrayBufferToGeoJson(event.data.arrayBuffer);
		postMessage({ result } satisfies DwgWorkerSuccessResponse);
	} catch (error) {
		postMessage(
			{
				error: error instanceof Error ? error.message : String(error)
			} satisfies DwgWorkerErrorResponse
		);
	}
};

export type DwgWorkerResponse = DwgWorkerSuccessResponse | DwgWorkerErrorResponse;
