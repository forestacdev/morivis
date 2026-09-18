import { mcaToGlb } from '.';
import { mcaFilesToGlb } from './batch-convert';
import { MAX_REGION_BYTES, validateMcaOptions } from './region';
import type { McaOptions, McaProgress, McaResult } from './types';

export type McaWorkerResponse = { result: McaResult; } | { error: string; } | {
	progress: McaProgress;
};

self.onmessage = async (
	{ data }: MessageEvent<({ file: File; } | { files: File[]; }) & { options: McaOptions; }>
) => {
	try {
		validateMcaOptions(data.options);
		if ('file' in data && data.file.size > MAX_REGION_BYTES) {
			throw new Error('MCAファイルは256 MiB以下にしてください');
		}
		let lastProgress = 0;
		const reportProgress = (progress: McaProgress) => {
			const now = performance.now();
			if (
				now - lastProgress < 100 && progress.completed !== progress.total
				&& progress.completed !== 0
			) return;
			lastProgress = now;
			postMessage({ progress } satisfies McaWorkerResponse);
		};
		const result = 'files' in data
			? await mcaFilesToGlb(data.files, data.options, reportProgress)
			: await mcaToGlb(await data.file.arrayBuffer(), data.options, reportProgress);
		postMessage({ result } satisfies McaWorkerResponse, { transfer: [result.glb] });
	} catch (error) {
		postMessage(
			{
				error: error instanceof Error ? error.message : 'MCAを読み込めませんでした'
			} satisfies McaWorkerResponse
		);
	}
};
