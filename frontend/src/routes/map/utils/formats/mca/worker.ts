import { mcaToGlb } from '.';
import { MAX_REGION_BYTES, validateMcaOptions } from './region';
import type { McaOptions, McaProgress, McaResult } from './types';

export type McaWorkerResponse = { result: McaResult; } | { error: string; } | {
	progress: McaProgress;
};

self.onmessage = async ({ data }: MessageEvent<{ file: File; options: McaOptions; }>) => {
	try {
		validateMcaOptions(data.options);
		if (data.file.size > MAX_REGION_BYTES) {
			throw new Error('MCAファイルは256 MiB以下にしてください');
		}
		let lastProgress = 0;
		const result = await mcaToGlb(await data.file.arrayBuffer(), data.options, (progress) => {
			const now = performance.now();
			if (now - lastProgress < 100 && progress.completed !== progress.total) return;
			lastProgress = now;
			postMessage({ progress } satisfies McaWorkerResponse);
		});
		postMessage({ result } satisfies McaWorkerResponse, { transfer: [result.glb] });
	} catch (error) {
		postMessage(
			{
				error: error instanceof Error ? error.message : 'MCAを読み込めませんでした'
			} satisfies McaWorkerResponse
		);
	}
};
