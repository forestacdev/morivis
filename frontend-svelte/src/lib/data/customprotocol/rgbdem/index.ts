import type { ProtocolKey } from '$lib/data/types';
import { DEM_DATA_TYPE } from '$lib/data/raster/dem';
import type { DemDataTypeKey } from '$lib/data/raster/dem';
import { demDataType, demVisualMode } from '$lib/store/store';
import { get } from 'svelte/store';

export class WorkerProtocol {
	private worker: Worker;
	private pendingRequests: Map<string, { resolve: Function; reject: Function }>;

	constructor(worker: Worker) {
		this.worker = worker;
		this.pendingRequests = new Map();

		this.worker.addEventListener('message', this.handleMessage);
		this.worker.addEventListener('error', this.handleError);
	}

	request(url: string, abortController: AbortController): Promise<{ data: Uint8Array }> {
		return new Promise((resolve, reject) => {
			this.pendingRequests.set(url, { resolve, reject });
			const demType = get(demDataType);
			const demTypeNumber = DEM_DATA_TYPE[demType as DemDataTypeKey];
			this.worker.postMessage({ url, demTypeNumber, demVisualMode: get(demVisualMode) });

			abortController.signal.addEventListener('abort', () => {
				this.pendingRequests.delete(url);
				reject(new Error('Request aborted'));
			});
		});
	}

	private handleMessage = (e: MessageEvent) => {
		const { id, buffer, error } = e.data;
		if (error) {
			console.error(`Error processing tile ${id}:`, error);
		} else {
			const request = this.pendingRequests.get(id);
			if (request) {
				request.resolve({ data: new Uint8Array(buffer) });
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
	return (params: { url: string }, abortController: AbortController) => {
		const imageUrl = params.url.replace(`${protocolName}://`, '');
		return workerProtocol.request(imageUrl, abortController);
	};
};
