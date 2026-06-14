import { runSingleShotWorker } from '$routes/map/utils/worker/run-single-shot';

import type { TransformBboxWorkerResponse } from './transform-bbox.worker';
import TransformBboxWorker from './transform-bbox.worker?worker';

export const transformBboxInWorker = (
	bbox: [number, number, number, number],
	prjContent: string
): Promise<[number, number, number, number]> => {
	const plainBbox: [number, number, number, number] = [bbox[0], bbox[1], bbox[2], bbox[3]];

	return runSingleShotWorker<
		{ bbox: [number, number, number, number]; prjContent: string; },
		TransformBboxWorkerResponse,
		[number, number, number, number]
	>(TransformBboxWorker, { bbox: plainBbox, prjContent }, {
		errorPrefix: 'BBox transform worker error',
		mapResponse: (response) =>
			(response as { result: [number, number, number, number]; }).result
	});
};
