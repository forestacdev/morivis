import type { GeoParquetReadResult } from '.';
import type { GeoParquetWorkerResponse } from './worker';
import GeoParquetWorker from './worker?worker';

import { runSingleShotWorker } from '$routes/map/utils/worker/run-single-shot';

export const geoParquetFileToGeoJsonInWorker = async (
	file: File
): Promise<GeoParquetReadResult> => {
	const arrayBuffer = await file.arrayBuffer();

	return runSingleShotWorker<
		{ arrayBuffer: ArrayBuffer; },
		GeoParquetWorkerResponse,
		GeoParquetReadResult
	>(GeoParquetWorker, { arrayBuffer }, {
		errorPrefix: 'GeoParquet worker error',
		mapResponse: (response) => (response as { result: GeoParquetReadResult; }).result,
		transfer: [arrayBuffer]
	});
};
