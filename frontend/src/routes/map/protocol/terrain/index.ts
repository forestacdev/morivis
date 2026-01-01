import { DEM_DATA_TYPE, type DemDataTypeKey } from '$routes/map/data/types/raster';
import { PMTiles } from 'pmtiles';

const pmCache = new Map<string, PMTiles>();

const loadImagePmtiles = async (
	src: string,
	tile: { x: number; y: number; z: number },
	signal: AbortSignal
): Promise<ImageBitmap> => {
	try {
		let pmtiles = pmCache.get(src);
		if (!pmtiles) {
			pmtiles = new PMTiles(src);
			pmCache.set(src, pmtiles);
		}

		// タイルデータを取得
		const tileData = await pmtiles.getZxy(tile.z, tile.x, tile.y, signal);
		if (!tileData || !tileData.data) {
			throw new Error('Tile data not found');
		}

		// Blob を生成
		const blob = new Blob([tileData.data], { type: 'image/png' });

		// ImageBitmap に変換して返す
		return await createImageBitmap(blob);
	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError') {
			// リクエストがキャンセルされた場合はエラーをスロー
			throw new Error('Request aborted');
		} else {
			// 他のエラー時には空の画像を返す
			return await createImageBitmap(new ImageData(1, 1));
		}
	}
};

const loadImage = async (src: string, signal: AbortSignal): Promise<ImageBitmap> => {
	try {
		const response = await fetch(src, { signal });
		if (!response.ok) {
			throw new Error('Failed to fetch image');
		}
		return await createImageBitmap(await response.blob());
	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError') {
			// リクエストがキャンセルされた場合はエラーをスロー
			throw new Error('Request aborted');
		} else {
			// 他のエラー時には空の画像を返す
			return await createImageBitmap(new ImageData(1, 1));
		}
	}
};

class WorkerProtocol {
	private worker: Worker;
	private pendingRequests: Map<
		string,
		{
			resolve: (value: { data: Uint8Array } | PromiseLike<{ data: Uint8Array }>) => void;
			reject: (reason?: Error) => void;
			controller: AbortController;
		}
	>;

	constructor(worker: Worker) {
		this.worker = worker;
		this.pendingRequests = new Map();

		this.worker.addEventListener('message', this.handleMessage);
		this.worker.addEventListener('error', this.handleError);
	}

	async request(url: URL, controller: AbortController): Promise<{ data: Uint8Array }> {
		try {
			const x = parseInt(url.searchParams.get('x') || '0', 10);
			const y = parseInt(url.searchParams.get('y') || '0', 10);
			const z = parseInt(url.searchParams.get('z') || '0', 10);
			const baseUrl = url.origin + url.pathname;
			const entryId = url.searchParams.get('entryId') || '';
			const tileId = `${baseUrl}_${entryId}_${x}_${y}_${z}`;
			const formatType = url.searchParams.get('formatType') || 'image'; // デフォルト値を設定
			const demType = url.searchParams.get('demType') || 'mapbox'; // デフォルト値を設定
			let image: ImageBitmap;
			if (formatType === 'pmtiles') {
				image = await loadImagePmtiles(baseUrl, { x, y, z }, controller.signal);
			} else if (formatType === 'image') {
				image = await loadImage(baseUrl, controller.signal);
			}

			return new Promise((resolve, reject) => {
				const demTypeNumber = DEM_DATA_TYPE[demType as DemDataTypeKey];
				this.pendingRequests.set(tileId, { resolve, reject, controller });
				this.worker.postMessage({ image, demTypeNumber, id: tileId });

				controller.signal.addEventListener('abort', () => {
					this.pendingRequests.delete(tileId);
					reject(new Error('Request aborted'));
				});
			});
		} catch (error) {
			return Promise.reject(error);
		}
	}

	private handleMessage = (e: MessageEvent) => {
		const { id, buffer, error } = e.data;
		const request = this.pendingRequests.get(id);
		if (error) {
			console.error(`Error processing tile ${id}:`, error);
			if (request) {
				request.reject(new Error(error));
				this.pendingRequests.delete(id);
			}
		} else if (request) {
			request.resolve({ data: buffer });
			this.pendingRequests.delete(id);
		} else {
			// console.warn(`No pending request found for tile ${id}`);
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

const worker = new Worker(new URL('./protocol_terrain.worker.ts', import.meta.url), {
	type: 'module'
});
const workerProtocol = new WorkerProtocol(worker);

export const terrainProtocol = (protocolName: string) => {
	return {
		protocolName,
		request: (params: { url: string }, abortController: AbortController) => {
			const urlWithoutProtocol = params.url.replace(`${protocolName}://`, '');
			const url = new URL(urlWithoutProtocol);
			return workerProtocol.request(url, abortController);
		}
	};
};
