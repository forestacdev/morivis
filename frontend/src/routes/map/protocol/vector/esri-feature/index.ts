import * as tilebelt from '@mapbox/tilebelt';

/**
 * ArcGIS FeatureServer からタイルごとにbboxクエリしてベクタータイルを返すプロトコル
 *
 * URL形式: esri-feature://{featureServerLayerUrl}?x={x}&y={y}&z={z}
 * 例: esri-feature://https://example.com/arcgis/rest/services/Foo/FeatureServer/1?x=0&y=0&z=0
 */

class WorkerProtocol {
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

			// タイルのbboxを算出 [minLng, minLat, maxLng, maxLat]
			const bbox = tilebelt.tileToBBOX([x, y, z]);
			const [minLng, minLat, maxLng, maxLat] = bbox;

			// FeatureServerのレイヤーURLを取得（クエリパラメータを除去）
			const layerUrl = url.origin + url.pathname;

			const { signal } = abortController;

			// ArcGIS FeatureServer に bbox でクエリ
			const geometryParam = encodeURIComponent(
				`${minLng},${minLat},${maxLng},${maxLat}`
			);

			// 低ズームではジオメトリを簡略化して転送量を削減
			// maxAllowableOffset: ズームレベルに応じた許容誤差（度単位）
			const maxAllowableOffset = z < 10 ? 360 / (256 * Math.pow(2, z)) : 0;
			const simplifyParam = maxAllowableOffset > 0
				? `&maxAllowableOffset=${maxAllowableOffset}`
				: '';

			// 取得件数を制限（低ズームで大量データを防ぐ）
			const recordCount = z < 8 ? 500 : z < 12 ? 2000 : 5000;

			const queryUrl =
				`${layerUrl}/query?f=geojson&where=1%3D1` +
				`&geometry=${geometryParam}` +
				`&geometryType=esriGeometryEnvelope` +
				`&inSR=4326&outFields=*&outSR=4326` +
				`&spatialRel=esriSpatialRelIntersects` +
				`&resultRecordCount=${recordCount}` +
				simplifyParam;

			const res = await fetch(queryUrl, { signal });
			if (!res.ok) {
				return { data: new Uint8Array() };
			}

			const geojson = await res.json();

			if (geojson.error || !geojson.features || geojson.features.length === 0) {
				return { data: new Uint8Array() };
			}

			const id = `${z}/${x}/${y}_esri_feature`;

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

const worker = new Worker(
	new URL('./protocol_esri_feature.worker.ts', import.meta.url),
	{ type: 'module' }
);
const workerProtocol = new WorkerProtocol(worker);

export const esriFeatureProtocol = (protocolName: 'esri-feature') => {
	return {
		protocolName,
		request: (params: { url: string }, abortController: AbortController) => {
			const urlWithoutProtocol = params.url.replace(`${protocolName}://`, '');
			const url = new URL(urlWithoutProtocol);
			return workerProtocol.request(url, abortController);
		}
	};
};
