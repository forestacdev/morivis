import type { OpenDriveResult } from '.';
import { formatOpenDrive } from './definition';
import type { OpenDriveRequest, OpenDriveResponse } from './worker';

import { assertInputResourceLimits } from '../resource-limits';
import OpenDriveWorker from './worker?worker';

export const runOpenDriveWorker = (
	request: OpenDriveRequest,
	signal: AbortSignal
): Promise<OpenDriveResult> => {
	signal.throwIfAborted();
	assertInputResourceLimits(
		[{ name: request.file.name, files: [request.file] }],
		formatOpenDrive.limits
	);
	return new Promise((resolve, reject) => {
		const worker = new OpenDriveWorker();
		const cleanup = () => {
			worker.terminate();
			clearTimeout(timer);
			signal.removeEventListener('abort', abort);
		};
		const abort = () => {
			cleanup();
			reject(signal.reason);
		};
		const timer = setTimeout(() => {
			cleanup();
			reject(
				new Error('OpenDRIVEの解析が時間内に完了しませんでした。図面を分割してください')
			);
		}, formatOpenDrive.limits.timeoutMs);
		signal.addEventListener('abort', abort, { once: true });
		worker.onmessage = (
			{ data }: MessageEvent<OpenDriveResponse>
		) => {
			cleanup();
			if ('error' in data) reject(new Error(data.error));
			else resolve(data.result);
		};
		worker.onerror = () => {
			cleanup();
			reject(new Error('OpenDRIVEの解析処理を実行できませんでした'));
		};
		worker.onmessageerror = () => {
			cleanup();
			reject(new Error('OpenDRIVEの解析結果を受け取れませんでした'));
		};
		try {
			worker.postMessage(request);
		} catch (error) {
			cleanup();
			reject(error);
		}
	});
};
