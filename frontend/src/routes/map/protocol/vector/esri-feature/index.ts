import * as tilebelt from '@mapbox/tilebelt';
import arcgisPbfDecode from 'arcgis-pbf-parser';

/**
 * ArcGIS FeatureServer からタイルごとにbboxクエリしてベクタータイルを返すプロトコル
 * f=pbf（Esri PBF形式）で取得し、arcgis-pbf-parserでGeoJSONに変換してからタイル化する
 *
 * URL形式: esri-feature://{featureServerLayerUrl}?x={x}&y={y}&z={z}
 */

// タイルキャッシュ（LRU方式）
const TILE_CACHE_LIMIT = 256;
const tileCache = new Map<string, Uint8Array>();

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
	tileCache.set(key, value);
};

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

			// FeatureServerのレイヤーURLを取得（クエリパラメータを除去）
			const layerUrl = url.origin + url.pathname;
			const cacheKey = `${layerUrl}/${z}/${x}/${y}`;

			// キャッシュヒットならそのまま返す
			if (tileCache.has(cacheKey)) {
				const cached = tileCache.get(cacheKey)!;
				// LRU順序更新
				tileCache.delete(cacheKey);
				tileCache.set(cacheKey, cached);
				return { data: cached };
			}

			// タイルのbboxを算出 [minLng, minLat, maxLng, maxLat]
			const bbox = tilebelt.tileToBBOX([x, y, z]);
			const [minLng, minLat, maxLng, maxLat] = bbox;

			const { signal } = abortController;

			// ArcGIS FeatureServer に bbox でクエリ
			const geometryParam = encodeURIComponent(
				`${minLng},${minLat},${maxLng},${maxLat}`
			);


			// PBF形式でクエリ（GeoJSONより転送量が大幅に小さい）
			const queryUrl =
				`${layerUrl}/query?f=pbf&where=1%3D1` +
				`&geometry=${geometryParam}` +
				`&geometryType=esriGeometryEnvelope` +
				`&inSR=4326&outFields=*&outSR=4326` +
				`&spatialRel=esriSpatialRelIntersects`;

			const res = await fetch(queryUrl, { signal });
			if (!res.ok) {
				// PBF非対応の場合、GeoJSONにフォールバック
				return this.requestGeoJsonFallback(layerUrl, geometryParam, z, x, y, cacheKey, signal);
			}

			const contentType = res.headers.get('content-type') || '';

			let geojson: GeoJSON.FeatureCollection;

			if (contentType.includes('application/x-protobuf') || contentType.includes('application/octet-stream')) {
				// PBFレスポンスをデコード
				const buffer = await res.arrayBuffer();
				const result = arcgisPbfDecode(new Uint8Array(buffer));
				geojson = result.featureCollection;
			} else {
				// JSONが返ってきた場合（エラーレスポンス等）
				const json = await res.json();
				if (json.error || !json.features) {
					const empty = new Uint8Array();
					setTileCache(cacheKey, empty);
					return { data: empty };
				}
				geojson = json;
			}

			if (!geojson.features || geojson.features.length === 0) {
				const empty = new Uint8Array();
				setTileCache(cacheKey, empty);
				return { data: empty };
			}

			const id = `${z}/${x}/${y}_esri_feature`;

			return new Promise((resolve, reject) => {
				this.pendingRequests.set(id, {
					resolve: (result) => {
						// Worker結果をキャッシュ
						const data = 'data' in result ? (result as { data: Uint8Array }).data : new Uint8Array();
						setTileCache(cacheKey, data);
						resolve(result);
					},
					reject
				});

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

	/** PBF非対応時のGeoJSONフォールバック */
	private async requestGeoJsonFallback(
		layerUrl: string,
		geometryParam: string,
		z: number,
		x: number,
		y: number,
		cacheKey: string,
		signal: AbortSignal
	): Promise<{ data: Uint8Array }> {
		const queryUrl =
			`${layerUrl}/query?f=geojson&where=1%3D1` +
			`&geometry=${geometryParam}` +
			`&geometryType=esriGeometryEnvelope` +
			`&inSR=4326&outFields=*&outSR=4326` +
			`&spatialRel=esriSpatialRelIntersects`;

		const res = await fetch(queryUrl, { signal });
		if (!res.ok) {
			return { data: new Uint8Array() };
		}

		const geojson = await res.json();

		if (geojson.error || !geojson.features || geojson.features.length === 0) {
			const empty = new Uint8Array();
			setTileCache(cacheKey, empty);
			return { data: empty };
		}

		const id = `${z}/${x}/${y}_esri_feature`;

		return new Promise((resolve, reject) => {
			this.pendingRequests.set(id, {
				resolve: (result) => {
					const data = 'data' in result ? (result as { data: Uint8Array }).data : new Uint8Array();
					setTileCache(cacheKey, data);
					resolve(result);
				},
				reject
			});

			signal.addEventListener('abort', () => {
				this.pendingRequests.delete(id);
				reject(new Error('Request aborted'));
			});

			this.worker.postMessage({ id, z, x, y, geojson });
		});
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
