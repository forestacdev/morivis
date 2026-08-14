import type { FeatureCollection } from '$routes/map/types/geojson';
import { runSingleShotWorker } from '$routes/map/utils/worker/run-single-shot';

import type { DwgWorkerResponse } from './worker';
import DwgWorker from './worker?worker';

export const dwgArrayBufferToGeoJsonInWorker = (
	arrayBuffer: ArrayBuffer
): Promise<FeatureCollection> =>
	runSingleShotWorker<{ arrayBuffer: ArrayBuffer; }, DwgWorkerResponse, FeatureCollection>(
		DwgWorker,
		{ arrayBuffer },
		{
			errorPrefix: 'DWG worker error',
			mapResponse: (response) => (response as { result: FeatureCollection; }).result,
			transfer: [arrayBuffer]
		}
	);

export const dwgFileToGeoJsonInWorker = async (file: File): Promise<FeatureCollection> =>
	dwgArrayBufferToGeoJsonInWorker(await file.arrayBuffer());
