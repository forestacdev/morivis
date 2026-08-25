import { transformBbox } from '.';

interface TransformBboxWorkerRequest {
	bbox: [number, number, number, number];
	prjContent: string;
}

interface TransformBboxWorkerSuccessResponse {
	result: [number, number, number, number];
}

interface TransformBboxWorkerErrorResponse {
	error: string;
}

self.onmessage = async (event: MessageEvent<TransformBboxWorkerRequest>) => {
	try {
		const result = await transformBbox(event.data.bbox, event.data.prjContent);
		postMessage({ result } satisfies TransformBboxWorkerSuccessResponse);
	} catch (error) {
		postMessage(
			{
				error: error instanceof Error ? error.message : String(error)
			} satisfies TransformBboxWorkerErrorResponse
		);
	}
};

export type TransformBboxWorkerResponse =
	| TransformBboxWorkerSuccessResponse
	| TransformBboxWorkerErrorResponse;
