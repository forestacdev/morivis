import { parseRegionalMeshTileUrl } from './request';

interface PendingRequest {
	resolve: (value: { data: Uint8Array; }) => void;
	reject: (reason: Error) => void;
	cleanup: () => void;
}

let worker: Worker | null = null;
let nextRequestId = 0;
const pending = new Map<number, PendingRequest>();

export const terminateRegionalMeshWorker = (
	reason = new DOMException('Regional mesh stopped', 'AbortError')
) => {
	worker?.terminate();
	worker = null;
	for (const request of pending.values()) {
		request.cleanup();
		request.reject(reason);
	}
	pending.clear();
};

const getWorker = () => {
	if (worker) return worker;
	worker = new Worker(new URL('./regional-mesh.worker.ts', import.meta.url), { type: 'module' });
	worker.onmessage = (
		event: MessageEvent<{ id: number; data?: Uint8Array; error?: string; }>
	) => {
		const { id, data, error } = event.data;
		const request = pending.get(id);
		if (!request) return;
		pending.delete(id);
		request.cleanup();
		if (data) request.resolve({ data });
		else request.reject(new Error(error ?? 'Invalid regional mesh worker response'));
	};
	worker.onerror = (event) => {
		terminateRegionalMeshWorker(new DOMException(event.message, 'OperationError'));
	};
	worker.onmessageerror = () => {
		terminateRegionalMeshWorker(
			new DOMException('Invalid regional mesh worker message', 'DataCloneError')
		);
	};
	return worker;
};

export const regionalMeshProtocol = {
	protocolName: 'regional_mesh',
	request: async (
		{ url }: { url: string; },
		{ signal }: AbortController
	): Promise<{ data: Uint8Array; }> => {
		signal.throwIfAborted();
		const tile = parseRegionalMeshTileUrl(url);
		const currentWorker = getWorker();
		const id = ++nextRequestId;
		return new Promise((resolve, reject) => {
			const abort = () => {
				pending.delete(id);
				reject(new DOMException('Regional mesh request aborted', 'AbortError'));
			};
			const cleanup = () => signal.removeEventListener('abort', abort);
			pending.set(id, { resolve, reject, cleanup });
			signal.addEventListener('abort', abort, { once: true });
			try {
				currentWorker.postMessage({ id, ...tile });
			} catch (error) {
				pending.delete(id);
				cleanup();
				reject(error);
			}
		});
	}
};
