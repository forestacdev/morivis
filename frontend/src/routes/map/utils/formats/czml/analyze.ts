import { base } from '$app/paths';
import type { CzmlResult } from '.';
import { formatCzml } from './definition';
import type { CzmlRequest, CzmlResponse } from './worker';

import { assertInputResourceLimits } from '../resource-limits';
import CzmlWorker from './worker?worker';

export const runCzmlWorker = (
	request: Pick<CzmlRequest, 'file'>,
	signal: AbortSignal
): Promise<CzmlResult> => {
	signal.throwIfAborted();
	assertInputResourceLimits(
		[{ name: request.file.name, files: [request.file] }],
		formatCzml.limits
	);
	return new Promise((resolve, reject) => {
		const worker = new CzmlWorker();
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
				new Error('CZMLの解析が時間内に完了しませんでした。ファイルを分割してください')
			);
		}, formatCzml.limits.timeoutMs);
		signal.addEventListener('abort', abort, { once: true });
		worker.onmessage = (
			{ data }: MessageEvent<CzmlResponse>
		) => {
			cleanup();
			if ('error' in data) reject(new Error(data.error));
			else resolve(data.result);
		};
		worker.onerror = () => {
			cleanup();
			reject(new Error('CZMLの解析処理を実行できませんでした'));
		};
		worker.onmessageerror = () => {
			cleanup();
			reject(new Error('CZMLの解析結果を受け取れませんでした'));
		};
		try {
			worker.postMessage(
				{
					...request,
					cesiumBaseUrl: new URL(`${base}/vendor/cesium/`, window.location.href).href
				} satisfies CzmlRequest
			);
		} catch (error) {
			cleanup();
			reject(error);
		}
	});
};

export const analyzeCzmlFile = (file: File, signal: AbortSignal): Promise<CzmlResult> =>
	runCzmlWorker({ file }, signal);
