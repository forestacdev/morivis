import type { AisResult } from '.';
import { formatAis } from './definition';
import type { AisRequest, AisResponse } from './worker';

import { assertInputResourceLimits } from '../resource-limits';
import AisWorker from './worker?worker';

export const runAisWorker = (
	request: AisRequest,
	signal: AbortSignal
): Promise<AisResult> => {
	signal.throwIfAborted();
	assertInputResourceLimits(
		[{ name: request.file.name, files: [request.file] }],
		formatAis.limits
	);
	return new Promise((resolve, reject) => {
		const worker = new AisWorker();
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
				new Error('AISの解析が時間内に完了しませんでした。ログを分割してください')
			);
		}, formatAis.limits.timeoutMs);
		signal.addEventListener('abort', abort, { once: true });
		worker.onmessage = (
			{ data }: MessageEvent<AisResponse>
		) => {
			cleanup();
			if ('error' in data) reject(new Error(data.error));
			else resolve(data.result);
		};
		worker.onerror = () => {
			cleanup();
			reject(new Error('AISの解析処理を実行できませんでした'));
		};
		worker.onmessageerror = () => {
			cleanup();
			reject(new Error('AISの解析結果を受け取れませんでした'));
		};
		try {
			worker.postMessage(request);
		} catch (error) {
			cleanup();
			reject(error);
		}
	});
};

export const analyzeAisFile = (file: File, signal: AbortSignal): Promise<AisResult> =>
	runAisWorker({ file }, signal);
