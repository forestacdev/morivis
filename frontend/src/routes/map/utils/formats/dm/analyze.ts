import { runSingleShotWorker } from '$routes/map/utils/worker/run-single-shot';
import type { DMGeoJSON, DMInfo } from '.';

import type { DmWorkerResponse } from './worker';
import DmWorker from './worker?worker';

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
