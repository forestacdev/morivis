import {
	computeUploadedModelMeta,
	type ComputeUploadedModelMetaParams,
	type UploadedModelMeta
} from './model-bounds';

interface ModelBoundsWorkerSuccessResponse {
	result: UploadedModelMeta;
}

interface ModelBoundsWorkerErrorResponse {
	error: string;
}

self.onmessage = async (event: MessageEvent<ComputeUploadedModelMetaParams>) => {
	try {
		const result = await computeUploadedModelMeta(event.data);
		postMessage({ result } satisfies ModelBoundsWorkerSuccessResponse);
	} catch (error) {
		postMessage({
			error: error instanceof Error ? error.message : String(error)
		} satisfies ModelBoundsWorkerErrorResponse);
	}
};

export type ModelBoundsWorkerResponse =
	| ModelBoundsWorkerSuccessResponse
	| ModelBoundsWorkerErrorResponse;
