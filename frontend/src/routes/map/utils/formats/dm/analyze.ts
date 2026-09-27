import { runSingleShotWorker } from '$routes/map/utils/worker/run-single-shot';
import type { DMGeoJSON, DMInfo } from '.';

import type { DmWorkerResponse } from './worker';
import DmWorker from './worker?worker';

export interface DmAnalyzeResult {
	geojson: DMGeoJSON;
	info: DMInfo;
}

export const analyzeDmInWorker = (
	arrayBuffer: ArrayBuffer,
	indexBuffers: ArrayBuffer[] = []
): Promise<DmAnalyzeResult> =>
	runSingleShotWorker<
		{ arrayBuffer: ArrayBuffer; indexBuffers: ArrayBuffer[]; },
		DmWorkerResponse,
		DmAnalyzeResult
	>(
		DmWorker,
		{ arrayBuffer, indexBuffers },
		{
			errorPrefix: 'DM worker error',
			mapResponse: (response) => response as DmAnalyzeResult,
			transfer: [arrayBuffer, ...indexBuffers]
		}
	);

export const analyzeDmFileInWorker = async (
	file: File,
	indexFiles: File[] = []
): Promise<DmAnalyzeResult> => {
	const [arrayBuffer, ...indexBuffers] = await Promise.all(
		[file, ...indexFiles].map(input => input.arrayBuffer())
	);
	return analyzeDmInWorker(arrayBuffer, indexBuffers);
};
