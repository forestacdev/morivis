import type { CityJsonOptions, CityJsonResult } from '.';
import type { CityJsonWorkerResponse } from './worker';
import CityJsonWorker from './worker?worker';

export const cityJsonFilesToGeoJsonInWorker = (
	files: File[],
	options: CityJsonOptions,
	signal: AbortSignal
): Promise<CityJsonResult> =>
	new Promise((resolve, reject) => {
		if (signal.aborted) {
			reject(new DOMException('変換をキャンセルしました', 'AbortError'));
			return;
		}
		const worker = new CityJsonWorker();
		const cleanup = () => {
			worker.terminate();
			signal.removeEventListener('abort', abort);
		};
		const abort = () => {
			cleanup();
			reject(new DOMException('変換をキャンセルしました', 'AbortError'));
		};
		signal.addEventListener('abort', abort, { once: true });
		worker.onmessage = ({ data }: MessageEvent<CityJsonWorkerResponse>) => {
			cleanup();
			if ('error' in data) reject(new Error(data.error));
			else resolve(data.result);
		};
		worker.onerror = (event) => {
			cleanup();
			reject(new Error(`CityJSON変換に失敗しました: ${event.message}`));
		};
		worker.onmessageerror = () => {
			cleanup();
			reject(new Error('CityJSONの変換結果を受け取れませんでした'));
		};
		worker.postMessage({ files, options });
	});
