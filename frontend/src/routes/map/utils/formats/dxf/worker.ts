import { type DxfParseResult, type DxfUnit, parseDxf, readArrayBufferAsText } from '.';

interface DxfWorkerRequest {
	arrayBuffer: ArrayBuffer;
	unit?: DxfUnit;
}

interface DxfWorkerSuccessResponse {
	result: DxfParseResult;
}

interface DxfWorkerErrorResponse {
	error: string;
}

self.onmessage = async (event: MessageEvent<DxfWorkerRequest>) => {
	try {
		const result = parseDxf(readArrayBufferAsText(event.data.arrayBuffer), event.data.unit);
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
