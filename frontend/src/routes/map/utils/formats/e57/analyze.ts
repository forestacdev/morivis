import { type E57Result, validateE57Size } from '.';
import type { E57Response } from './worker';
import E57Worker from './worker?worker';

export const parseE57File = (
	file: File,
	signal: AbortSignal
): Promise<E57Result> =>
	new Promise((resolve, reject) => {
		if (signal.aborted) {
			reject(new DOMException('Aborted', 'AbortError'));
			return;
		}
		validateE57Size(file.size);
		const worker = new E57Worker();
		const cleanup = () => {
			worker.terminate();
			signal.removeEventListener('abort', abort);
		};
		const abort = () => {
			cleanup();
			reject(new DOMException('Aborted', 'AbortError'));
		};
		signal.addEventListener('abort', abort, { once: true });
		worker.onmessage = ({ data }: MessageEvent<E57Response>) => {
			cleanup();
			if ('error' in data) reject(new Error(data.error));
			else resolve(data.result);
		};
		worker.onerror = event => {
			cleanup();
			reject(new Error(event.message || 'E57の解析に失敗しました'));
		};
		worker.onmessageerror = () => {
			cleanup();
			reject(new Error('E57の解析結果を受け取れませんでした'));
		};
		try {
			worker.postMessage(file);
		} catch (error) {
			cleanup();
			reject(error);
		}
	});
