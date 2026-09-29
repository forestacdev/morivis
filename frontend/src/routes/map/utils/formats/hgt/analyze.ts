import type { HgtGrid } from '.';
import type { HgtResponse } from './worker';
import HgtWorker from './worker?worker';

export const runHgtWorker = (
	file: File,
	signal: AbortSignal
): Promise<HgtGrid> =>
	new Promise((resolve, reject) => {
		if (signal.aborted) {
			reject(new DOMException('Aborted', 'AbortError'));
			return;
		}
		const worker = new HgtWorker();
		const cleanup = () => {
			worker.terminate();
			signal.removeEventListener('abort', abort);
		};
		const abort = () => {
			cleanup();
			reject(new DOMException('Aborted', 'AbortError'));
		};
		signal.addEventListener('abort', abort, { once: true });
		worker.onmessage = ({ data }: MessageEvent<HgtResponse>) => {
			cleanup();
			if ('error' in data) reject(new Error(data.error));
			else resolve(data.result);
		};
		worker.onerror = event => {
			cleanup();
			reject(new Error(event.message || 'SRTM HGTの解析に失敗しました'));
		};
		worker.onmessageerror = () => {
			cleanup();
			reject(new Error('SRTM HGTの解析結果を受け取れませんでした'));
		};
		try {
			worker.postMessage(file);
		} catch (error) {
			cleanup();
			reject(error);
		}
	});
