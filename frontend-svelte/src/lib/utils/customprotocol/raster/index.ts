// customgsidem.ts

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
			this.worker.postMessage({ url });

			abortController.signal.addEventListener('abort', () => {
				this.pendingRequests.delete(url);
				reject(new Error('Request aborted'));
			});
		});
	}

	private handleMessage = (e: MessageEvent) => {
		const { id, buffer } = e.data;
		const request = this.pendingRequests.get(id);
		if (request) {
			if (buffer.byteLength === 0) {
				request.reject(new Error('Empty buffer received'));
			} else {
				request.resolve({ data: new Uint8Array(buffer) });
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

export function customTileProtocol() {
	const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
	const workerProtocol = new WorkerProtocol(worker);

	return (params: { url: string }, abortController: AbortController) => {
		const imageUrl = params.url.replace('customgsidem://', '');
		return workerProtocol.request(imageUrl, abortController);
	};
}
