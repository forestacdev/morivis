import type { FeatureCollection } from '$routes/map/types/geojson';
import { runSingleShotWorker } from '$routes/map/utils/worker/run-single-shot';

import DxfWorker from './worker?worker';
import type { DxfWorkerResponse } from './worker';

export const dxfArrayBufferToGeoJsonInWorker = (arrayBuffer: ArrayBuffer): Promise<FeatureCollection> =>
	runSingleShotWorker<{ arrayBuffer: ArrayBuffer; }, DxfWorkerResponse, FeatureCollection>(
		DxfWorker,
		{ arrayBuffer },
		{
			errorPrefix: 'DXF worker error',
			mapResponse: (response) => (response as { result: FeatureCollection; }).result,
			transfer: [arrayBuffer]
		}
	);

export const dxfFileToGeoJsonInWorker = async (file: File): Promise<FeatureCollection> =>
	dxfArrayBufferToGeoJsonInWorker(await file.arrayBuffer());
