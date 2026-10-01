import type { RawRaster } from '.';
import type { RawRasterRequest, RawRasterResponse } from './worker';
import RawRasterWorker from './worker?worker';

export const runRawRasterWorker = (
	request: RawRasterRequest,
	signal: AbortSignal
): Promise<RawRaster> =>
	new Promise((resolve, reject) => {
		if (signal.aborted) {
			reject(new DOMException('Aborted', 'AbortError'));
			return;
		}
		const worker = new RawRasterWorker();
		const cleanup = () => {
			worker.terminate();
			signal.removeEventListener('abort', abort);
		};
		const abort = () => {
			cleanup();
			reject(new DOMException('Aborted', 'AbortError'));
		};
		signal.addEventListener('abort', abort, { once: true });
		worker.onmessage = ({ data }: MessageEvent<RawRasterResponse>) => {
			cleanup();
			if ('error' in data) reject(new Error(data.error));
			else resolve(data.result);
		};
		worker.onerror = event => {
			cleanup();
			reject(new Error(event.message || 'ENVI／ESRI BILの解析に失敗しました'));
		};
		worker.onmessageerror = () => {
			cleanup();
			reject(new Error('ENVI／ESRI BILの解析結果を受け取れませんでした'));
		};
		try {
			worker.postMessage(request);
		} catch (error) {
			cleanup();
			reject(error);
		}
	});
