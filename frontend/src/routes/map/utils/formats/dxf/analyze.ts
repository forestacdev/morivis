import type { FeatureCollection } from '$routes/map/types/geojson';
import { runSingleShotWorker } from '$routes/map/utils/worker/run-single-shot';
import type { DxfParseResult, DxfUnit } from '.';

import type { DxfWorkerResponse } from './worker';
import DxfWorker from './worker?worker';

const analyzeDxfArrayBufferInWorker = (
	arrayBuffer: ArrayBuffer,
	unit: DxfUnit = 'auto'
): Promise<DxfParseResult> =>
	runSingleShotWorker<
		{ arrayBuffer: ArrayBuffer; unit: DxfUnit; },
		DxfWorkerResponse,
		DxfParseResult
	>(
		DxfWorker,
		{ arrayBuffer, unit },
		{
			errorPrefix: 'DXF worker error',
			mapResponse: (response) => (response as { result: DxfParseResult; }).result,
			transfer: [arrayBuffer]
		}
	);

export const analyzeDxfFileInWorker = async (file: File, unit: DxfUnit = 'auto') =>
	analyzeDxfArrayBufferInWorker(await file.arrayBuffer(), unit);

export const dxfArrayBufferToGeoJsonInWorker = async (
	arrayBuffer: ArrayBuffer
): Promise<FeatureCollection> => (await analyzeDxfArrayBufferInWorker(arrayBuffer)).geojson;

export const dxfFileToGeoJsonInWorker = async (file: File): Promise<FeatureCollection> =>
	dxfArrayBufferToGeoJsonInWorker(await file.arrayBuffer());
