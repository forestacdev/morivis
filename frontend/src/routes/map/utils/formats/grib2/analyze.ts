import AnalyzeGrib2Worker from './worker?worker';
import type { Grib2ParsedMessage } from './worker';

import { runSingleShotWorker } from '$routes/map/utils/worker/run-single-shot';

export type { Grib2ParsedMessage } from './worker';

interface Grib2WorkerSuccessResponse {
	messages: Grib2ParsedMessage[];
}

export const analyzeGrib2InWorker = (arrayBuffer: ArrayBuffer): Promise<Grib2ParsedMessage[]> =>
	runSingleShotWorker<
		{ arrayBuffer: ArrayBuffer; },
		Grib2WorkerSuccessResponse,
		Grib2ParsedMessage[]
	>(AnalyzeGrib2Worker, { arrayBuffer }, {
		errorPrefix: 'GRIB2 worker error',
		mapResponse: (response) => response.messages,
		transfer: [arrayBuffer]
	});
