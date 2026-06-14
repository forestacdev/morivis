import type { DMGeoJSON, DMInfo } from '.';
import { runSingleShotWorker } from '$routes/map/utils/worker/run-single-shot';

import DmWorker from './worker?worker';
import type { DmWorkerResponse } from './worker';

export interface DmAnalyzeResult {
	geojson: DMGeoJSON;
	info: DMInfo;
}

export const analyzeDmInWorker = (arrayBuffer: ArrayBuffer): Promise<DmAnalyzeResult> =>
	runSingleShotWorker<{ arrayBuffer: ArrayBuffer; }, DmWorkerResponse, DmAnalyzeResult>(
		DmWorker,
		{ arrayBuffer },
		{
			errorPrefix: 'DM worker error',
			mapResponse: (response) => response as DmAnalyzeResult,
			transfer: [arrayBuffer]
		}
	);

export const analyzeDmFileInWorker = async (file: File): Promise<DmAnalyzeResult> =>
	analyzeDmInWorker(await file.arrayBuffer());
