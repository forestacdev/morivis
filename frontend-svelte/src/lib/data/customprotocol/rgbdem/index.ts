import type { ProtocolKey } from '$lib/data/types';
import { DEM_DATA_TYPE, COLOR_MAP_TYPE } from '$lib/data/raster/dem';
import type { DemDataTypeKey } from '$lib/data/raster/dem';
import { demEntry } from '$lib/data/raster/dem';
import chroma from 'chroma-js';

const loadImage = async (src: string, signal: AbortSignal): Promise<ImageBitmap> => {
	const response = await fetch(src, { signal: signal });
	if (!response.ok) {
		throw new Error('Failed to fetch image');
	}
	return await createImageBitmap(await response.blob());
};

export class WorkerProtocol {
	private worker: Worker;
	private pendingRequests: Map<
		string,
		{
			resolve: (value: { data: Uint8Array } | PromiseLike<{ data: Uint8Array }>) => void;
			reject: (reason?: Error) => void;
			controller: AbortController;
		}
	>;

	constructor(worker: Worker) {
		this.worker = worker;
		this.pendingRequests = new Map();
		this.worker.addEventListener('message', this.handleMessage);
		this.worker.addEventListener('error', this.handleError);
	}

	async request(url: string, controller: AbortController): Promise<{ data: Uint8Array }> {
		try {
			const image = await loadImage(url, controller.signal);
			return new Promise((resolve, reject) => {
				this.pendingRequests.set(url, { resolve, reject, controller });
				const demType = demEntry.demType;

				const demTypeNumber = DEM_DATA_TYPE[demType as DemDataTypeKey];
				const ridgeColor = demEntry.uniformsData.curvature.ridgeColor;
				const valleyColor = demEntry.uniformsData.curvature.valleyColor;

				this.worker.postMessage({
					image,
					url,
					demTypeNumber,
					uniformsData: demEntry.uniformsData,
					ridgeColor: chroma(ridgeColor).gl(),
					valleyColor: chroma(valleyColor).gl()
				});
			});
		} catch (error) {
			return Promise.reject(error);
		}
	}

	// 新しいメソッド: 全てのリクエストをキャンセル
	cancelAllRequests() {
		this.pendingRequests.forEach(({ reject, controller }) => {
			controller.abort(); // AbortControllerをキャンセル
			reject(new Error('Request cancelled'));
		});
		this.pendingRequests.clear();
	}
	private handleMessage = (e: MessageEvent) => {
		const { id, buffer, error } = e.data;
		if (error) {
			console.error(`Error processing tile ${id}:`, error);
			const request = this.pendingRequests.get(id);
			if (request) {
				request.reject(error);
				this.pendingRequests.delete(id);
			}
		} else {
			const request = this.pendingRequests.get(id);
			if (request) {
				request.resolve({ data: buffer });
				this.pendingRequests.delete(id);
			}
		}
	};

	private handleError = (e: ErrorEvent) => {
		console.error('Worker error:', e);
		this.pendingRequests.forEach((request) => {
			request.reject(new Error('Worker error occurred'));
		});
		this.pendingRequests.clear();
	};
}

const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
const workerProtocol = new WorkerProtocol(worker);

export const rgbdemProtocol = (protocolName: ProtocolKey) => {
	return {
		request: (params: { url: string }, abortController: AbortController) => {
			const imageUrl = params.url.replace(`${protocolName}://`, '');

			return workerProtocol.request(imageUrl, abortController);
		},
		cancelAllRequests: () => workerProtocol.cancelAllRequests()
	};
};

// export const rgbdemProtocol = (protocolName: ProtocolKey) => {
// 	return async (params: { url: string }, abortController: AbortController) => {
// 		const imageUrl = params.url.replace(`${protocolName}://`, '');
// 		const image = await loadImage(imageUrl, abortController.signal);
// 		return workerProtocol.request(imageUrl, image);
// 	};
// };
