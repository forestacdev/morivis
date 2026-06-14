import { runSingleShotWorker } from '$routes/map/utils/worker/run-single-shot';

import { type ComputeUploadedModelMetaParams, type UploadedModelMeta } from './model-bounds';
import type { ModelBoundsWorkerResponse } from './model-bounds.worker';
import ModelBoundsWorker from './model-bounds.worker?worker';

export const computeUploadedModelMetaInWorker = (
	params: ComputeUploadedModelMetaParams
): Promise<UploadedModelMeta> =>
	runSingleShotWorker<
		ComputeUploadedModelMetaParams,
		ModelBoundsWorkerResponse,
		UploadedModelMeta
	>(ModelBoundsWorker, params, {
		errorPrefix: '3D model meta worker error',
		mapResponse: (response) => (response as { result: UploadedModelMeta; }).result
	});
