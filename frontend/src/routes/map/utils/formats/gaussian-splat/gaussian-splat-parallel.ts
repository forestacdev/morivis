import GaussianSplatWorker from './gaussian-splat.worker?worker';

import type { GaussianSplatData } from './index';

interface GaussianSplatWorkerResponse {
	data?: GaussianSplatData;
	error?: string;
}

export const parseGaussianSplatInWorker = async (
	buffer: ArrayBuffer
): Promise<GaussianSplatData> => {
	return await new Promise((resolve, reject) => {
		const worker = new GaussianSplatWorker();
		worker.onmessage = (event: MessageEvent<GaussianSplatWorkerResponse>) => {
			worker.terminate();
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
			worker.terminate();
			reject(new Error(event.message || '3D Gaussian Splatting の解析に失敗しました。'));
		};
		worker.postMessage({ buffer }, [buffer]);
	});
};
