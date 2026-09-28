import type { RasterGrid } from '../raster/grid';
import { formatJpeg2000 } from './definition';

import type { Jp2Request, Jp2Response } from './worker';
import Jp2Worker from './worker?worker';

export const runJp2Worker = (request: Jp2Request, signal: AbortSignal): Promise<RasterGrid> =>
	new Promise((resolve, reject) => {
		if (signal.aborted) {
			reject(new DOMException('Aborted', 'AbortError'));
			return;
		}
		const worker = new Jp2Worker();
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
			reject(new Error('JP2の処理が時間内に完了しませんでした。画像を分割してください'));
		}, formatJpeg2000.limits.timeoutMs);
		signal.addEventListener('abort', abort, { once: true });
		worker.onmessage = ({ data }: MessageEvent<Jp2Response>) => {
			cleanup();
			if ('error' in data) reject(new Error(data.error));
			else resolve(data.result);
		};
		worker.onerror = event => {
			cleanup();
			reject(new Error(event.message || 'JP2変換エンジンを起動できませんでした'));
		};
		worker.onmessageerror = () => {
			cleanup();
			reject(new Error('JP2の解析結果を受け取れませんでした'));
		};
		try {
			worker.postMessage(request);
		} catch (error) {
			cleanup();
			reject(error);
		}
	});
