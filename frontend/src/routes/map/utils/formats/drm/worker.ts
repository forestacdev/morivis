import { type DrmFeatureCollection, type DrmInput, toGeoJson, type ToGeoJsonOptions } from '.';

interface DrmWorkerRequest {
	inputs: DrmInput[];
	options: ToGeoJsonOptions;
}

interface DrmWorkerSuccessResponse {
	geojson: DrmFeatureCollection;
}

interface DrmWorkerErrorResponse {
	error: string;
}

self.onmessage = async (event: MessageEvent<DrmWorkerRequest>) => {
	try {
		const { inputs, options } = event.data;

		postMessage(
			{
				geojson: toGeoJson(inputs, options)
			} satisfies DrmWorkerSuccessResponse
		);
	} catch (error) {
		postMessage(
			{
				error: error instanceof Error ? error.message : String(error)
			} satisfies DrmWorkerErrorResponse
		);
	}
};

export type DrmWorkerResponse = DrmWorkerSuccessResponse | DrmWorkerErrorResponse;
