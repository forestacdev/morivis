import type { FeatureCollection } from '$routes/map/types/geojson';
import { runSingleShotWorker } from '$routes/map/utils/worker/run-single-shot';

import type { SxfWorkerResponse } from './worker';
import SxfWorker from './worker?worker';

export const sxfArrayBufferToGeoJsonInWorker = (
	arrayBuffer: ArrayBuffer
): Promise<FeatureCollection> =>
	runSingleShotWorker<{ arrayBuffer: ArrayBuffer; }, SxfWorkerResponse, FeatureCollection>(
		SxfWorker,
		{ arrayBuffer },
		{
			errorPrefix: 'SXF worker error',
			mapResponse: (response) => (response as { result: FeatureCollection; }).result,
			transfer: [arrayBuffer]
		}
	);

export const sxfFileToGeoJsonInWorker = async (file: File): Promise<FeatureCollection> =>
	sxfArrayBufferToGeoJsonInWorker(await file.arrayBuffer());
