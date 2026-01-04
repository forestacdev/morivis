import * as tilebelt from '@mapbox/tilebelt';

import type { FeatureCollection } from 'geojson';
import bboxPolygon from '@turf/bbox-polygon';

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

			const tiles = tilebelt.getSiblings([x, y, z]);

			const geojson: FeatureCollection = {
				type: 'FeatureCollection',
				features: tiles.map((tile) => {
					const [tileX, tileY, tileZ] = tile;
					const tileBbox = tilebelt.tileToBBOX([tileX, tileY, tileZ]);
					const polygon = bboxPolygon(tileBbox);
					return {
						...polygon,
						properties: {
							x,
							y,
							z,
							index: `${tileZ}/${tileX}/${tileY}`
						}
					};
				})
			};

			const { signal } = abortController;

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

const worker = new Worker(new URL('./tile_index.worker.ts', import.meta.url), { type: 'module' });
const workerProtocol = new WorkerProtocol(worker);

export const tileIndexProtocol = (protocolName: 'tile_index') => {
	return {
		protocolName,
		request: (params: { url: string }, abortController: AbortController) => {
			const urlWithoutProtocol = params.url.replace(`${protocolName}://`, '');
			const url = new URL(urlWithoutProtocol);
			return workerProtocol.request(url, abortController);
		}
	};
};
