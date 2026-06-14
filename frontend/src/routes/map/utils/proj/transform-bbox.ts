import { runSingleShotWorker } from '$routes/map/utils/worker/run-single-shot';

import TransformBboxWorker from './transform-bbox.worker?worker';
import type { TransformBboxWorkerResponse } from './transform-bbox.worker';

export const transformBboxInWorker = (
	bbox: [number, number, number, number],
	prjContent: string
): Promise<[number, number, number, number]> =>
	runSingleShotWorker<
		{ bbox: [number, number, number, number]; prjContent: string; },
		TransformBboxWorkerResponse,
		[number, number, number, number]
	>(TransformBboxWorker, { bbox, prjContent }, {
		errorPrefix: 'BBox transform worker error',
		mapResponse: (response) => (response as { result: [number, number, number, number]; }).result
	});
