import type { CadUpAxis } from './types';
import type { CadRequest, CadResponse } from './worker';
import CadWorker from './worker?worker';

export const cadFileToGlbInWorker = (
	file: File,
	upAxis: CadUpAxis,
	signal: AbortSignal
): Promise<ArrayBuffer> =>
	new Promise((resolve, reject) => {
		if (signal.aborted) {
			reject(new DOMException('Aborted', 'AbortError'));
			return;
		}
		const worker = new CadWorker();
		const cleanup = () => {
			worker.terminate();
			signal.removeEventListener('abort', abort);
		};
		const abort = () => {
			cleanup();
			reject(new DOMException('Aborted', 'AbortError'));
		};
		signal.addEventListener('abort', abort, { once: true });
		worker.onmessage = ({ data }: MessageEvent<CadResponse>) => {
			cleanup();
			if ('error' in data) reject(new Error(data.error));
			else resolve(data.glb);
		};
		worker.onerror = event => {
			cleanup();
			reject(new Error(event.message || 'STEP／IGESを読み込めませんでした'));
		};
		worker.onmessageerror = () => {
			cleanup();
			reject(new Error('STEP／IGESの変換結果を受け取れませんでした'));
		};
		try {
			worker.postMessage({ file, upAxis } satisfies CadRequest);
		} catch (error) {
			cleanup();
			reject(error);
		}
	});
