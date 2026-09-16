import { runSingleShotWorker } from '$routes/map/utils/worker/run-single-shot';
import { createRikModelFiles } from '.';
import { MAX_RIK_BYTES, type RikArchiveFile } from './cabinet';
import type { RikWorkerResponse } from './worker';
import RikWorker from './worker?worker';

export const extractRikModelFiles = async (file: File): Promise<File[]> => {
	if (file.size > MAX_RIK_BYTES) throw new Error('RIKファイルは256 MB以下にしてください');
	const arrayBuffer = await file.arrayBuffer();
	const entries = await runSingleShotWorker<
		{ arrayBuffer: ArrayBuffer; },
		RikWorkerResponse,
		RikArchiveFile[]
	>(
		RikWorker,
		{ arrayBuffer },
		{
			errorPrefix: 'RIK展開エラー',
			mapResponse: (response) => (response as { files: RikArchiveFile[]; }).files,
			transfer: [arrayBuffer]
		}
	);
	return createRikModelFiles(entries);
};
