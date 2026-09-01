import {
	type FileGdbAnalyzeResult,
	type FileGdbFailureDetails,
	type FileGdbInput,
	getFileGdbInputName
} from '$routes/map/utils/formats/filegdb';
import type { FileGdbWorkerResponse } from '$routes/map/utils/formats/filegdb/worker';
import FileGdbWorker from '$routes/map/utils/formats/filegdb/worker?worker';

type FileGdbWorkerError = Error & {
	details?: FileGdbFailureDetails;
};

const analyzeFileGdbInWorker = (
	inputs: FileGdbInput[],
	transfer: Transferable[]
): Promise<FileGdbAnalyzeResult> =>
	new Promise((resolve, reject) => {
		const worker = new FileGdbWorker();

		worker.onmessage = (event: MessageEvent<FileGdbWorkerResponse>) => {
			worker.terminate();

			if ('error' in event.data) {
				const error = new Error(event.data.error) as FileGdbWorkerError;
				error.details = event.data.details;
				reject(error);
				return;
			}

			resolve(event.data);
		};

		worker.onerror = (error) => {
			worker.terminate();
			reject(new Error(`FileGDB worker error: ${error.message}`));
		};

		worker.postMessage({ inputs }, transfer);
	});

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
