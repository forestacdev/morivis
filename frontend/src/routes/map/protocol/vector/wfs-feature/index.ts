import * as tilebelt from '@mapbox/tilebelt';

import type { FeatureCollection } from '$routes/map/types/geojson';
import { normalizeGeoJsonGeometryCollections } from '$routes/map/utils/formats/geojson';
import { gmlTextToGeoJson } from '$routes/map/utils/formats/gml';
import { buildWfsBboxGetFeatureUrl } from '$routes/map/utils/formats/wfs';
import { fetchWithDevProxy } from '$routes/map/utils/platform/request';

const TILE_CACHE_LIMIT = 256;
const tileCache = new Map<string, Uint8Array>();

const cloneUint8Array = (value: Uint8Array): Uint8Array => {
	return new Uint8Array(value.slice().buffer);
};

const setTileCache = (key: string, value: Uint8Array) => {
	if (tileCache.has(key)) {
		tileCache.delete(key);
	}
	if (tileCache.size >= TILE_CACHE_LIMIT) {
		const oldestKey = tileCache.keys().next().value;
		if (oldestKey) {
			tileCache.delete(oldestKey);
		}
	}
	tileCache.set(key, cloneUint8Array(value));
};

const isGeoJsonContent = (contentType: string, text: string, outputFormat: string): boolean => {
	return (
		/json|geo\+json/i.test(contentType)
		|| /json|geojson/i.test(outputFormat)
		|| text.trim().startsWith('{')
	);
};

class WorkerProtocol {
	private worker: Worker;
	private pendingRequests: Map<
		string,
		{
			resolve: (value: { data: Uint8Array; } | PromiseLike<{ data: Uint8Array; }>) => void;
			reject: (reason?: any) => void;
		}
	>;

	constructor(worker: Worker) {
		this.worker = worker;
		this.pendingRequests = new Map();

		this.worker.addEventListener('message', this.handleMessage);
		this.worker.addEventListener('error', this.handleError);
	}

	private async fetchGeojson(
		requestUrl: string,
		outputFormat: string,
		signal: AbortSignal
	): Promise<FeatureCollection> {
		const response = await fetchWithDevProxy(requestUrl, { signal });
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		const text = await response.text();
		const contentType = response.headers.get('content-type') ?? '';
		if (isGeoJsonContent(contentType, text, outputFormat)) {
			return normalizeGeoJsonGeometryCollections(
				JSON.parse(text) as Parameters<typeof normalizeGeoJsonGeometryCollections>[0]
			);
		}

		return await gmlTextToGeoJson(text);
	}

	async request(url: URL, abortController: AbortController): Promise<{ data: Uint8Array; }> {
		try {
			const x = parseInt(url.searchParams.get('x') || '0', 10);
			const y = parseInt(url.searchParams.get('y') || '0', 10);
			const z = parseInt(url.searchParams.get('z') || '0', 10);
			const serviceUrl = url.searchParams.get('serviceUrl');
			const version = url.searchParams.get('version');
			const typeName = url.searchParams.get('typeName');
			const outputFormat = url.searchParams.get('outputFormat') || 'application/json';
			const sourceLayer = url.searchParams.get('sourceLayer') || 'geojsonLayer';
			const srsName = url.searchParams.get('srsName') || 'EPSG:4326';

			if (!serviceUrl || !version || !typeName) {
				return { data: new Uint8Array() };
			}

			const cacheKey = `${serviceUrl}/${typeName}/${outputFormat}/${srsName}/${z}/${x}/${y}`;

			if (tileCache.has(cacheKey)) {
				const cached = tileCache.get(cacheKey)!;
				tileCache.delete(cacheKey);
				tileCache.set(cacheKey, cached);
				return { data: cloneUint8Array(cached) };
			}

			const bbox = tilebelt.tileToBBOX([x, y, z]) as [number, number, number, number];
			const requestUrl = buildWfsBboxGetFeatureUrl({
				serviceUrl: decodeURIComponent(serviceUrl),
				version,
				typeName: decodeURIComponent(typeName),
				outputFormat: decodeURIComponent(outputFormat),
				bbox,
				srsName: decodeURIComponent(srsName)
			});
			const { signal } = abortController;
			const geojson = await this.fetchGeojson(
				requestUrl,
				decodeURIComponent(outputFormat),
				signal
			);

			if (!geojson.features || geojson.features.length === 0) {
				const empty = new Uint8Array();
				setTileCache(cacheKey, empty);
				return { data: empty };
			}

			const id = `${z}/${x}/${y}_wfs_feature`;

			return new Promise((resolve, reject) => {
				this.pendingRequests.set(id, {
					resolve: (result) => {
						const data = 'data' in result
							? (result as { data: Uint8Array; }).data
							: new Uint8Array();
						setTileCache(cacheKey, data);
						resolve({ data: cloneUint8Array(data) });
					},
					reject
				});

				signal.addEventListener('abort', () => {
					this.pendingRequests.delete(id);
					reject(new Error('Request aborted'));
				});

				this.worker.postMessage({ id, z, x, y, geojson, sourceLayer });
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

let _worker: Worker | null = null;
let _workerProtocol: WorkerProtocol | null = null;

const getWorkerProtocol = (): WorkerProtocol => {
	if (!_workerProtocol) {
		_worker = new Worker(new URL('./protocol_wfs_feature.worker.ts', import.meta.url), {
			type: 'module'
		});
		_workerProtocol = new WorkerProtocol(_worker);
	}
	return _workerProtocol;
};

export const terminateWfsFeatureWorker = () => {
	if (_worker) {
		_worker.terminate();
		_worker = null;
		_workerProtocol = null;
	}
	tileCache.clear();
};

export const wfsFeatureProtocol = (protocolName: 'wfs-feature') => {
	return {
		protocolName,
		request: (params: { url: string; }, abortController: AbortController) => {
			const urlWithoutProtocol = params.url.replace(`${protocolName}://`, '');
			const url = new URL(urlWithoutProtocol, 'https://morivis.local');
			return getWorkerProtocol().request(url, abortController);
		}
	};
};
