import {
	parseFileGdbInputs,
	type FileGdbAnalyzeResult,
	type FileGdbInput
} from '$routes/map/utils/formats/filegdb';

interface FileGdbWorkerRequest {
	inputs: FileGdbInput[];
}

interface FileGdbWorkerErrorResponse {
	error: string;
}

self.onmessage = async (event: MessageEvent<FileGdbWorkerRequest>) => {
	try {
		const { inputs } = event.data;

		postMessage(parseFileGdbInputs(inputs) satisfies FileGdbAnalyzeResult);
	} catch (error) {
		postMessage({
			error: error instanceof Error ? error.message : String(error)
		} satisfies FileGdbWorkerErrorResponse);
	}
};

export type FileGdbWorkerResponse = FileGdbAnalyzeResult | FileGdbWorkerErrorResponse;
