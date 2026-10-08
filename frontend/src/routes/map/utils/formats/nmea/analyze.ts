import type { NmeaResult } from '.';
import { formatNmea } from './definition';
import type { NmeaRequest, NmeaResponse } from './worker';

import { assertInputResourceLimits } from '../resource-limits';
import NmeaWorker from './worker?worker';

export const runNmeaWorker = (
	request: NmeaRequest,
	signal: AbortSignal
): Promise<NmeaResult> => {
	signal.throwIfAborted();
	assertInputResourceLimits(
		[{ name: request.file.name, files: [request.file] }],
		formatNmea.limits
	);
	return new Promise((resolve, reject) => {
		const worker = new NmeaWorker();
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
				new Error('NMEAの解析が時間内に完了しませんでした。ログを分割してください')
			);
		}, formatNmea.limits.timeoutMs);
		signal.addEventListener('abort', abort, { once: true });
		worker.onmessage = (
			{ data }: MessageEvent<NmeaResponse>
		) => {
			cleanup();
			if ('error' in data) reject(new Error(data.error));
			else resolve(data.result);
		};
		worker.onerror = () => {
			cleanup();
			reject(new Error('NMEAの解析処理を実行できませんでした'));
		};
		worker.onmessageerror = () => {
			cleanup();
			reject(new Error('NMEAの解析結果を受け取れませんでした'));
		};
		try {
			worker.postMessage(request);
		} catch (error) {
			cleanup();
			reject(error);
		}
	});
};

export const analyzeNmeaFile = (file: File, signal: AbortSignal): Promise<NmeaResult> =>
	runNmeaWorker({ file }, signal);
