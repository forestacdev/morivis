import { formatOrbit } from './definition';
import type { OrbitOptions, OrbitResult, OrbitSummary } from './types';
import type { OrbitRequest, OrbitResponse } from './worker';

import { assertInputResourceLimits } from '../resource-limits';
import OrbitWorker from './worker?worker';

export const runOrbitWorker = (
	request: OrbitRequest,
	signal: AbortSignal
): Promise<Exclude<OrbitResponse, { error: string; }>> => {
	signal.throwIfAborted();
	assertInputResourceLimits(
		[{ name: request.file.name, files: [request.file] }],
		formatOrbit.limits
	);
	return new Promise((resolve, reject) => {
		const worker = new OrbitWorker();
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
				new Error(
					'TLE / OMMの解析が時間内に完了しませんでした。衛星数や計算期間を減らしてください'
				)
			);
		}, formatOrbit.limits.timeoutMs);
		signal.addEventListener('abort', abort, { once: true });
		worker.onmessage = (
			{ data }: MessageEvent<OrbitResponse>
		) => {
			cleanup();
			if ('error' in data) reject(new Error(data.error));
			else resolve(data);
		};
		worker.onerror = () => {
			cleanup();
			reject(new Error('TLE / OMMの解析処理を実行できませんでした'));
		};
		worker.onmessageerror = () => {
			cleanup();
			reject(new Error('TLE / OMMの解析結果を受け取れませんでした'));
		};
		try {
			worker.postMessage(request);
		} catch (error) {
			cleanup();
			reject(error);
		}
	});
};

export const inspectOrbitFile = async (file: File, signal: AbortSignal): Promise<OrbitSummary> => {
	const response = await runOrbitWorker({ file, mode: 'inspect' }, signal);
	if (!('summary' in response)) throw new Error('衛星情報を取得できませんでした');
	return response.summary;
};
export const propagateOrbitFile = async (
	file: File,
	options: OrbitOptions,
	signal: AbortSignal
): Promise<OrbitResult> => {
	const response = await runOrbitWorker({ file, mode: 'propagate', options }, signal);
	if (!('result' in response)) throw new Error('軌道を計算できませんでした');
	return response.result;
};
