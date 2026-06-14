import type { DMGeoJSON, DMInfo } from '.';

import { convertDMArrayBufferToGeoJSON, getDMInfoFromArrayBuffer } from '.';

interface DmWorkerRequest {
	arrayBuffer: ArrayBuffer;
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
		const { arrayBuffer } = event.data;
		const [geojson, info] = await Promise.all([
			convertDMArrayBufferToGeoJSON(arrayBuffer),
			getDMInfoFromArrayBuffer(arrayBuffer)
		]);

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
