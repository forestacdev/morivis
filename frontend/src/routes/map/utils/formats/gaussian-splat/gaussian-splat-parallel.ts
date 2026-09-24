import GaussianSplatWorker from './gaussian-splat.worker?worker';

import type { GaussianSplatData, GaussianSplatEncoding } from './index';

interface GaussianSplatWorkerResponse {
	data?: GaussianSplatData;
	error?: string;
}

export const parseGaussianSplatInWorker = async (
	buffer: ArrayBuffer,
	encoding: GaussianSplatEncoding = 'ply',
	signal?: AbortSignal
): Promise<GaussianSplatData> => {
	return await new Promise((resolve, reject) => {
		if (signal?.aborted) {
			reject(new DOMException('Aborted', 'AbortError'));
			return;
		}
		const worker = new GaussianSplatWorker();
		const cleanup = () => {
			worker.terminate();
			signal?.removeEventListener('abort', abort);
		};
		const abort = () => {
			cleanup();
			reject(new DOMException('Aborted', 'AbortError'));
		};
		signal?.addEventListener('abort', abort, { once: true });
		worker.onmessage = (event: MessageEvent<GaussianSplatWorkerResponse>) => {
			cleanup();
			if (event.data.error) {
				reject(new Error(event.data.error));
				return;
			}
			if (!event.data.data) {
				reject(new Error('3D Gaussian Splatting の解析結果が空です。'));
				return;
			}
			resolve(event.data.data);
		};
		worker.onerror = (event) => {
			cleanup();
			reject(new Error(event.message || '3D Gaussian Splatting の解析に失敗しました。'));
		};
		try {
			worker.postMessage({ buffer, encoding }, [buffer]);
		} catch (error) {
			cleanup();
			reject(error);
		}
	});
};
