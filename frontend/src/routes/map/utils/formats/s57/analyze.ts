import type { S57Result } from '.';
import { formatS57 } from './definition';
import type { S57Response } from './worker';

import { checkS57File } from './files';
import S57Worker from './worker?worker';

export const runS57Worker = (file: File, signal: AbortSignal): Promise<S57Result> => {
	signal.throwIfAborted();
	checkS57File(file);
	return new Promise((resolve, reject) => {
		const worker = new S57Worker();
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
			reject(new Error('S-57の解析が時間内に完了しませんでした。図面を分割してください'));
		}, formatS57.limits.timeoutMs);
		signal.addEventListener('abort', abort, { once: true });
		worker.onmessage = (
			{ data }: MessageEvent<S57Response>
		) => {
			cleanup();
			if ('error' in data) reject(new Error(data.error));
			else resolve(data.result);
		};
		worker.onerror = () => {
			cleanup();
			reject(new Error('S-57の解析処理を実行できませんでした'));
		};
		worker.onmessageerror = () => {
			cleanup();
			reject(new Error('S-57の解析結果を受け取れませんでした'));
		};
		try {
			worker.postMessage({ file });
		} catch (error) {
			cleanup();
			reject(error);
		}
	});
};
