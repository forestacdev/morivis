import type { DgnResult } from '.';
import { formatDgn } from './definition';
import type { DgnRequest, DgnResponse } from './worker';

import { checkDgnSize } from './files';
import DgnWorker from './worker?worker';

export const runDgnWorker = (request: DgnRequest, signal: AbortSignal): Promise<DgnResult> => {
	signal.throwIfAborted();
	checkDgnSize(request.file);
	return new Promise((resolve, reject) => {
		const worker = new DgnWorker();
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
			reject(new Error('DGNの解析が時間内に完了しませんでした。図面を分割してください'));
		}, formatDgn.limits.timeoutMs);
		signal.addEventListener('abort', abort, { once: true });
		worker.onmessage = (
			{ data }: MessageEvent<DgnResponse>
		) => {
			cleanup();
			if ('error' in data) reject(new Error(data.error));
			else resolve(data.result);
		};
		worker.onerror = () => {
			cleanup();
			reject(new Error('DGNの解析処理を実行できませんでした'));
		};
		worker.onmessageerror = () => {
			cleanup();
			reject(new Error('DGNの解析結果を受け取れませんでした'));
		};
		try {
			worker.postMessage(request);
		} catch (error) {
			cleanup();
			reject(error);
		}
	});
};
