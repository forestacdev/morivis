import type { CityGmlLod, CityGmlResult } from '.';
import type { CityGmlWorkerResponse } from './worker';
import CityGmlWorker from './worker?worker';

export const cityGmlFilesToGeoJsonInWorker = (
	files: File[],
	lod: CityGmlLod,
	signal: AbortSignal
): Promise<CityGmlResult> =>
	new Promise((resolve, reject) => {
		if (signal.aborted) {
			reject(new DOMException('変換をキャンセルしました', 'AbortError'));
			return;
		}
		const worker = new CityGmlWorker();
		const cleanup = () => {
			worker.terminate();
			signal.removeEventListener('abort', abort);
		};
		const abort = () => {
			cleanup();
			reject(new DOMException('変換をキャンセルしました', 'AbortError'));
		};
		signal.addEventListener('abort', abort, { once: true });
		worker.onmessage = ({ data }: MessageEvent<CityGmlWorkerResponse>) => {
			cleanup();
			if ('error' in data) reject(new Error(data.error));
			else resolve(data.result);
		};
		worker.onerror = (event) => {
			cleanup();
			reject(new Error(`CityGML変換に失敗しました: ${event.message}`));
		};
		worker.onmessageerror = () => {
			cleanup();
			reject(new Error('CityGMLの変換結果を受け取れませんでした'));
		};
		worker.postMessage({ files, lod });
	});
