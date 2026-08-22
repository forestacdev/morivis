import {
	FileGdbParseError,
	parseFileGdbInputs,
	type FileGdbAnalyzeResult,
	type FileGdbFailureDetails,
	type FileGdbInput
} from '$routes/map/utils/formats/filegdb';

interface FileGdbWorkerRequest {
	inputs: FileGdbInput[];
}

interface FileGdbWorkerErrorResponse {
	error: string;
	details?: FileGdbFailureDetails;
}

const logFileGdbWorkerDebug = (message: string, payload?: unknown) => {
	if (!import.meta.env.DEV) return;

	if (payload === undefined) {
		console.debug('[FileGDB worker]', message);
		return;
	}

	console.debug('[FileGDB worker]', message, payload);
};

self.onmessage = async (event: MessageEvent<FileGdbWorkerRequest>) => {
	try {
		const { inputs } = event.data;
		logFileGdbWorkerDebug('message received', {
			inputs: inputs.map((input) => ({
				name: input.name,
				bytes: input.data instanceof ArrayBuffer ? input.data.byteLength : input.data.byteLength
			}))
		});

		const result = parseFileGdbInputs(inputs);
		logFileGdbWorkerDebug('parse completed', {
			datasetName: result.datasetName,
			layerNames: result.layers.map((layer) => layer.name)
		});
		postMessage(result satisfies FileGdbAnalyzeResult);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		const details = error instanceof FileGdbParseError ? error.details : undefined;
		logFileGdbWorkerDebug('parse failed', {
			error: errorMessage,
			details
		});
		postMessage({
			error: errorMessage,
			details
		} satisfies FileGdbWorkerErrorResponse);
	}
};

export type FileGdbWorkerResponse = FileGdbAnalyzeResult | FileGdbWorkerErrorResponse;
