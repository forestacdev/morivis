import { runSingleShotWorker } from '$routes/map/utils/worker/run-single-shot';

import {
	type DrmFeatureCollection,
	type DrmInput,
	getDrmInputName,
	type ToGeoJsonOptions
} from '.';
import type { DrmWorkerResponse } from './worker';
import DrmWorker from './worker?worker';

export interface DrmAnalyzeResult {
	geojson: DrmFeatureCollection;
}

const analyzeDrmInWorker = (
	inputs: DrmInput[],
	options: ToGeoJsonOptions,
	transfer: Transferable[]
): Promise<DrmAnalyzeResult> =>
	runSingleShotWorker<
		{ inputs: DrmInput[]; options: ToGeoJsonOptions; },
		DrmWorkerResponse,
		DrmAnalyzeResult
	>(
		DrmWorker,
		{ inputs, options },
		{
			errorPrefix: 'DRM worker error',
			mapResponse: (response) => response as DrmAnalyzeResult,
			transfer
		}
	);

export const analyzeDrmFilesInWorker = async (
	files: File[],
	options: ToGeoJsonOptions = {}
): Promise<DrmAnalyzeResult> => {
	const arrayBuffers = await Promise.all(files.map((file) => file.arrayBuffer()));
	const inputs: DrmInput[] = files.map((file, index) => ({
		name: getDrmInputName(file),
		data: arrayBuffers[index]
	}));

	return await analyzeDrmInWorker(inputs, options, arrayBuffers);
};
