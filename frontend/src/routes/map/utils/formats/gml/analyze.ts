import type { FeatureCollection } from '$routes/map/types/geojson';
import { runSingleShotWorker } from '$routes/map/utils/worker/run-single-shot';

import GmlWorker from './worker?worker';
import type { GmlWorkerResponse } from './worker';

export const gmlTextToGeoJsonInWorker = (text: string): Promise<FeatureCollection> =>
	runSingleShotWorker<{ text: string; }, GmlWorkerResponse, FeatureCollection>(
		GmlWorker,
		{ text },
		{
			errorPrefix: 'GML worker error',
			mapResponse: (response) => (response as { result: FeatureCollection; }).result
		}
	);

export const gmlFileToGeoJsonInWorker = async (file: File): Promise<FeatureCollection> =>
	gmlTextToGeoJsonInWorker(await file.text());
