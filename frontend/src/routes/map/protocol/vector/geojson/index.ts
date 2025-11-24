import { JoinDataCache } from '$routes/map/utils/join_data';
import { geojson } from 'flatgeobuf';

export class WorkerProtocol {
	private worker: Worker;
	private pendingRequests: Map<
		string,
		{
			resolve: (value: { data: Uint8Array } | PromiseLike<{ data: Uint8Array }>) => void;
			reject: (reason?: any) => void;
		}
	>;

	constructor(worker: Worker) {
		this.worker = worker;
		this.pendingRequests = new Map();

		this.worker.addEventListener('message', this.handleMessage);
		this.worker.addEventListener('error', this.handleError);
	}

	async request(url: URL, abortController: AbortController): Promise<{ data: Uint8Array }> {
		try {
			const x = parseInt(url.searchParams.get('x') || '0', 10);
			const y = parseInt(url.searchParams.get('y') || '0', 10);
			const z = parseInt(url.searchParams.get('z') || '0', 10);

			const entryId = url.searchParams.get('entryId') || '';

			const baseUrl = url.origin + url.pathname;

			const { signal } = abortController;

			const geojson = await fetch(baseUrl, { signal }).then((res) => {
				if (!res.ok) {
					throw new Error(`Failed to fetch GeoJSON data: ${res.status} ${res.statusText}`);
				}
				return res.json();
			});

			if (JoinDataCache.has(entryId)) {
				const joinData = JoinDataCache.get(entryId);

				if (joinData) {
					geojson.features = geojson.features.map((feature: any) => {
						const code = feature.properties.code;
						if (joinData[code]) {
							return {
								...feature,
								properties: {
									...feature.properties,
									...joinData[code]
								}
							};
						}
						return feature;
					});
				}
			}

			const id = `${z}/${x}/${y}_tile_index`;

			return new Promise((resolve, reject) => {
				this.pendingRequests.set(id, { resolve, reject });

				signal.addEventListener('abort', () => {
					this.pendingRequests.delete(id);
					reject(new Error('Request aborted'));
				});

				this.worker.postMessage({ id, z, x, y, geojson });
			});
		} catch (error) {
			return Promise.reject(error);
		}
	}

	private handleMessage = (e: MessageEvent) => {
		const { id, buffer, error } = e.data;
		if (error) {
			const request = this.pendingRequests.get(id);
			if (request) {
				// 空のデータを返す
				request.resolve({ data: new Uint8Array() });
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

export const geojsonProtocol = (protocolName: 'geojson') => {
	return {
		protocolName,
		request: (params: { url: string }, abortController: AbortController) => {
			const urlWithoutProtocol = params.url.replace(`${protocolName}://`, '');
			const url = new URL(urlWithoutProtocol);
			return workerProtocol.request(url, abortController);
		}
	};
};
