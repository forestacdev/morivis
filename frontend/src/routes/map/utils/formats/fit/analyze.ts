import { formatFit } from './definition';

import type { FitParseResult } from '.';
import FitWorker from './worker?worker';

export const analyzeFitFile = async (file: File, signal: AbortSignal): Promise<FitParseResult> => {
	// SDK本体をmain threadへ読み込まない。
	if (file.size > formatFit.limits.maxFileBytes) {
		throw new Error('FITは64 MiB以下のファイルを選択してください');
	}
	signal.throwIfAborted();
	const buffer = await file.arrayBuffer();
	signal.throwIfAborted();
	return new Promise((resolve, reject) => {
		const worker = new FitWorker();
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
			reject(new Error('FITの解析がタイムアウトしました'));
		}, formatFit.limits.timeoutMs);
		signal.addEventListener('abort', abort, { once: true });
		worker.onmessage = (
			event: MessageEvent<{ result: FitParseResult; } | { error: string; }>
		) => {
			cleanup();
			if ('error' in event.data) reject(new Error(event.data.error));
			else resolve(event.data.result);
		};
		worker.onerror = () => {
			cleanup();
			reject(new Error('FITの解析に失敗しました'));
		};
		try {
			worker.postMessage(buffer, [buffer]);
		} catch (error) {
			cleanup();
			reject(error);
		}
	});
};
