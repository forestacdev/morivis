import { runSingleShotWorker } from '$routes/map/utils/worker/run-single-shot';

import {
	getFileGdbInputName,
	type FileGdbAnalyzeResult,
	type FileGdbInput
} from '$routes/map/utils/formats/filegdb';
import type { FileGdbWorkerResponse } from '$routes/map/utils/formats/filegdb/worker';
import FileGdbWorker from '$routes/map/utils/formats/filegdb/worker?worker';

const analyzeFileGdbInWorker = (
	inputs: FileGdbInput[],
	transfer: Transferable[]
): Promise<FileGdbAnalyzeResult> =>
	runSingleShotWorker<{ inputs: FileGdbInput[] }, FileGdbWorkerResponse, FileGdbAnalyzeResult>(
		FileGdbWorker,
		{ inputs },
		{
			errorPrefix: 'FileGDB worker error',
			mapResponse: (response) => response as FileGdbAnalyzeResult,
			transfer
		}
	);

export const analyzeFileGdbFilesInWorker = async (
	files: File[]
): Promise<FileGdbAnalyzeResult> => {
	const arrayBuffers = await Promise.all(files.map((file) => file.arrayBuffer()));
	const inputs: FileGdbInput[] = files.map((file, index) => ({
		name: getFileGdbInputName(file),
		data: arrayBuffers[index]
	}));

	return await analyzeFileGdbInWorker(inputs, arrayBuffers);
};
