import type { FeatureCollection } from '$routes/map/types/geojson';
import { gmlTextToGeoJson } from '.';

interface GmlWorkerRequest {
	text: string;
}

interface GmlWorkerSuccessResponse {
	result: FeatureCollection;
}

interface GmlWorkerErrorResponse {
	error: string;
}

self.onmessage = async (event: MessageEvent<GmlWorkerRequest>) => {
	try {
		const result = await gmlTextToGeoJson(event.data.text);
		postMessage({ result } satisfies GmlWorkerSuccessResponse);
	} catch (error) {
		postMessage({
			error: error instanceof Error ? error.message : String(error)
		} satisfies GmlWorkerErrorResponse);
	}
};

export type GmlWorkerResponse = GmlWorkerSuccessResponse | GmlWorkerErrorResponse;
