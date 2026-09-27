import type { DMGeoJSON, DMInfo } from '.';

import { convertDMArrayBufferToGeoJSON, getDMInfoFromArrayBuffer } from '.';

interface DmWorkerRequest {
	arrayBuffer: ArrayBuffer;
	indexBuffers: ArrayBuffer[];
}

interface DmWorkerSuccessResponse {
	geojson: DMGeoJSON;
	info: DMInfo;
}

interface DmWorkerErrorResponse {
	error: string;
}

self.onmessage = async (event: MessageEvent<DmWorkerRequest>) => {
	try {
		const { arrayBuffer, indexBuffers } = event.data;
		const [geojson, info] = await Promise.all([
			convertDMArrayBufferToGeoJSON(arrayBuffer),
			getDMInfoFromArrayBuffer(arrayBuffer, indexBuffers)
		]);

		if (geojson.properties) geojson.properties.coordinateSystem = info.zone;

		postMessage(
			{
				geojson,
				info
			} satisfies DmWorkerSuccessResponse
		);
	} catch (error) {
		postMessage(
			{
				error: error instanceof Error ? error.message : String(error)
			} satisfies DmWorkerErrorResponse
		);
	}
};

export type DmWorkerResponse = DmWorkerSuccessResponse | DmWorkerErrorResponse;
