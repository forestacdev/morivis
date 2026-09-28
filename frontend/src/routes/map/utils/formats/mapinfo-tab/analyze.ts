import { formatMapinfoTab } from './definition';

import type { MapInfoResult } from '.';
import { prepareMapInfoFiles } from './files';
import type { MapInfoRequest, MapInfoResponse } from './worker';
import MapInfoWorker from './worker?worker';

export const runMapInfoWorker = async (
	request: MapInfoRequest & { tab: File; },
	signal: AbortSignal
): Promise<MapInfoResult> => {
	// SvelteのProxyやFileの独自パス属性はWorkerへ複製できないため、先に表を解決する。
	const files = await prepareMapInfoFiles(request.files, request.tab);
	return new Promise((resolve, reject) => {
		if (signal.aborted) {
			reject(new DOMException('Aborted', 'AbortError'));
			return;
		}
		const worker = new MapInfoWorker();
		const cleanup = () => {
			worker.terminate();
			clearTimeout(timer);
			signal.removeEventListener('abort', abort);
		};
		const abort = () => {
			cleanup();
			reject(new DOMException('Aborted', 'AbortError'));
		};
		const timer = setTimeout(() => {
			cleanup();
			reject(
				new Error(
					'MapInfo TABの処理が時間内に完了しませんでした。ファイルを分割してください'
				)
			);
		}, formatMapinfoTab.limits.timeoutMs);
		signal.addEventListener('abort', abort, { once: true });
		worker.onmessage = ({ data }: MessageEvent<MapInfoResponse>) => {
			cleanup();
			if ('error' in data) reject(new Error(data.error));
			else resolve(data.result);
		};
		worker.onerror = event => {
			cleanup();
			reject(new Error(event.message || 'MapInfo変換エンジンを起動できませんでした'));
		};
		worker.onmessageerror = () => {
			cleanup();
			reject(new Error('MapInfoの解析結果を受け取れませんでした'));
		};
		try {
			worker.postMessage({ files, sourceCrs: request.sourceCrs } satisfies MapInfoRequest);
		} catch (error) {
			cleanup();
			reject(error);
		}
	});
};
