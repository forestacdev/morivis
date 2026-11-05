import { JoinDataCache } from '$routes/map/utils/cache/join-data-cache';
import type { FeatureCollection } from 'geojson';
import type { GeojsonTileRequest } from './tile';
import { createSheetDataLoader } from './topographic-sheets/loader';
import { parseTopographicSheetTileUrl } from './topographic-sheets/request';

const loadGeoJSON = async (src: string, signal: AbortSignal): Promise<FeatureCollection> => {
	try {
		const response = await fetch(src, { signal });
		if (!response.ok) throw new Error('Failed to fetch GeoJSON data');
		return await response.json() as FeatureCollection;
	} catch {
		signal.throwIfAborted();
		// 通常のGeoJSONタイルは既存の配信範囲外の扱いを維持する。
		return { type: 'FeatureCollection', features: [] };
	}
};

interface PendingRequest {
	resolve: (value: { data: Uint8Array; }) => void;
	reject: (reason: unknown) => void;
	cleanup: () => void;
}

export class WorkerProtocol {
	private pendingRequests = new Map<number, PendingRequest>();
	private nextRequestId = 0;
	private lifetime = new AbortController();
	private loadSheets = createSheetDataLoader(this.lifetime.signal);

	constructor(private worker: Worker) {
		worker.addEventListener('message', this.handleMessage);
		worker.addEventListener('error', this.handleError);
		worker.addEventListener('messageerror', this.handleMessageError);
	}

	isDisposed = () => this.lifetime.signal.aborted;

	request = async (url: URL, { signal }: AbortController): Promise<{ data: Uint8Array; }> => {
		signal.throwIfAborted();
		this.lifetime.signal.throwIfAborted();
		// 複数ソースが同じz/x/yを要求しても応答を取り違えない。
		const id = ++this.nextRequestId;
		return new Promise((resolve, reject) => {
			const abort = () =>
				this.reject(id, new DOMException('GeoJSON request aborted', 'AbortError'));
			this.pendingRequests.set(id, {
				resolve,
				reject,
				cleanup: () => signal.removeEventListener('abort', abort)
			});
			signal.addEventListener('abort', abort, { once: true });
			void this.load(url, AbortSignal.any([signal, this.lifetime.signal])).then(request => {
				if (!this.pendingRequests.has(id)) return;
				this.worker.postMessage({ id, ...request });
			}).catch(error => this.reject(id, error));
		});
	};

	private load = async (
		url: URL,
		signal: AbortSignal
	): Promise<Omit<GeojsonTileRequest, 'id'>> => {
		const x = parseInt(url.searchParams.get('x') || '0', 10);
		const y = parseInt(url.searchParams.get('y') || '0', 10);
		const z = parseInt(url.searchParams.get('z') || '0', 10);
		const entryId = url.searchParams.get('entryId') || '';
		const baseUrl = url.origin + url.pathname;
		const transform = url.searchParams.get('transform') === 'topographic-sheets'
			? 'topographic-sheets'
			: undefined;
		const geojson = transform
			? await this.loadSheets(parseTopographicSheetTileUrl(baseUrl))
			: await loadGeoJSON(baseUrl, signal);
		signal.throwIfAborted();
		const joinData = JoinDataCache.get(entryId);
		const features = joinData
			? geojson.features.map(feature => {
				const code = feature.properties?.code;
				return code !== undefined && joinData[code]
					? { ...feature, properties: { ...feature.properties, ...joinData[code] } }
					: feature;
			})
			: geojson.features;
		return { x, y, z, transform, geojson: { ...geojson, features } };
	};

	private reject = (id: number, error: unknown) => {
		const request = this.pendingRequests.get(id);
		if (!request) return;
		this.pendingRequests.delete(id);
		request.cleanup();
		request.reject(error);
	};

	private handleMessage = (
		event: MessageEvent<{ id: number; buffer?: Uint8Array; error?: string; }>
	) => {
		const { id, buffer, error } = event.data;
		if (error || !buffer) {
			this.reject(id, new Error(error ?? 'Invalid GeoJSON worker response'));
			return;
		}
		const request = this.pendingRequests.get(id);
		if (!request) return;
		this.pendingRequests.delete(id);
		request.cleanup();
		request.resolve({ data: buffer });
	};

	private handleError = (event: ErrorEvent) =>
		this.dispose(new Error(event.message || 'GeoJSON worker error'));
	private handleMessageError = () => this.dispose(new Error('Invalid GeoJSON worker message'));

	dispose = (reason: Error = new DOMException('GeoJSON stopped', 'AbortError')) => {
		this.lifetime.abort(reason);
		this.worker.removeEventListener('message', this.handleMessage);
		this.worker.removeEventListener('error', this.handleError);
		this.worker.removeEventListener('messageerror', this.handleMessageError);
		this.worker.terminate();
		for (const id of this.pendingRequests.keys()) this.reject(id, reason);
	};
}

let workerProtocol: WorkerProtocol | null = null;
const getWorkerProtocol = (): WorkerProtocol => {
	if (!workerProtocol || workerProtocol.isDisposed()) {
		workerProtocol = new WorkerProtocol(
			new Worker(new URL('./protocol_geojson.worker.ts', import.meta.url), { type: 'module' })
		);
	}
	return workerProtocol;
};

export const terminateGeojsonWorker = () => {
	workerProtocol?.dispose();
	workerProtocol = null;
};

export const geojsonProtocol = (protocolName: 'geojson') => ({
	protocolName,
	request: (params: { url: string; }, abortController: AbortController) => {
		abortController.signal.throwIfAborted();
		const url = new URL(params.url.replace(`${protocolName}://`, ''));
		return getWorkerProtocol().request(url, abortController);
	}
});
