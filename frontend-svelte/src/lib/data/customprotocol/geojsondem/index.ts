import type { ProtocolKey } from '$lib/data/types';

const loadGeojson = async (src: string, signal: AbortSignal): Promise<ImageBitmap> => {
	const response = await fetch(src, { signal: signal });
	if (!response.ok) {
		throw new Error('Failed to fetch image');
	}
	return await response.json();
};

export class WorkerProtocol {
	private worker: Worker;
	private pendingRequests: Map<string, { resolve: Function; reject: Function }>;

	constructor(worker: Worker) {
		this.worker = worker;
		this.pendingRequests = new Map();

		this.worker.addEventListener('message', this.handleMessage);
		this.worker.addEventListener('error', this.handleError);
	}

	async request(url: string, abortController: AbortController): Promise<{ data: Uint8Array }> {
		try {
			const geojson = await loadGeojson(url, abortController.signal);
			return new Promise((resolve, reject) => {
				this.pendingRequests.set(url, { resolve, reject });
				this.worker.postMessage({ geojson, url });

				abortController.signal.addEventListener('abort', () => {
					this.pendingRequests.delete(url);
					reject(new Error('Request aborted'));
				});
			});
		} catch (error) {
			return Promise.reject(error);
		}
	}

	private handleMessage = (e: MessageEvent) => {
		const { id, buffer } = e.data;
		const request = this.pendingRequests.get(id);
		if (request) {
			if (buffer.byteLength === 0) {
				request.reject(new Error('Empty buffer received'));
			} else {
				request.resolve({ data: buffer });
			}
			this.pendingRequests.delete(id);
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

export const geojsondemProtocol = (protocolName: ProtocolKey) => {
	return (params: { url: string }, abortController: AbortController) => {
		const geojsonUrl = params.url.replace(`${protocolName}://`, '');
		return workerProtocol.request(geojsonUrl, abortController);
	};
};
