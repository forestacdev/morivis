import type { AsciiGrid } from '.';
import type { AsciiGridRequest, AsciiGridResponse } from './worker';
import AsciiGridWorker from './worker?worker';

export const runAsciiGridWorker = (
	request: AsciiGridRequest,
	signal: AbortSignal
): Promise<AsciiGrid> =>
	new Promise((resolve, reject) => {
		if (signal.aborted) {
			reject(new DOMException('Aborted', 'AbortError'));
			return;
		}
		const worker = new AsciiGridWorker();
		const cleanup = () => {
			worker.terminate();
			signal.removeEventListener('abort', abort);
		};
		const abort = () => {
			cleanup();
			reject(new DOMException('Aborted', 'AbortError'));
		};
		signal.addEventListener('abort', abort, { once: true });
		worker.onmessage = ({ data }: MessageEvent<AsciiGridResponse>) => {
			cleanup();
			if ('error' in data) reject(new Error(data.error));
			else resolve(data.result);
		};
		worker.onerror = event => {
			cleanup();
			reject(new Error(event.message || 'ASCII Gridの解析に失敗しました'));
		};
		worker.onmessageerror = () => {
			cleanup();
			reject(new Error('ASCII Gridの解析結果を受け取れませんでした'));
		};
		try {
			worker.postMessage(request);
		} catch (error) {
			cleanup();
			reject(error);
		}
	});
