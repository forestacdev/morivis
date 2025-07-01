import { DEM_DATA_TYPE, type DemDataTypeKey } from '$routes/map/data/dem';
import { TileImageManager } from '../image';
import { ColorMapManager } from '$routes/map/utils/colorMapping';
import { DEM_STYLE_TYPE } from '$routes/map/data/types/raster';

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
	private tileCache: TileImageManager;
	private colorMapCache: ColorMapManager;

	constructor(worker: Worker) {
		this.worker = worker;
		this.pendingRequests = new Map();
		this.tileCache = TileImageManager.getInstance();
		this.colorMapCache = new ColorMapManager();
		this.worker.addEventListener('message', this.handleMessage);
		this.worker.addEventListener('error', this.handleError);
	}

	async request(url: URL, controller: AbortController): Promise<{ data: Uint8Array }> {
		const x = parseInt(url.searchParams.get('x') || '0', 10);
		const y = parseInt(url.searchParams.get('y') || '0', 10);
		const z = parseInt(url.searchParams.get('z') || '0', 10);
		const entryId = url.searchParams.get('entryId') || '';
		const baseUrl = url.origin + url.pathname;
		const tileId = `${entryId}_${x}_${y}_${z}`;
		const formatType = url.searchParams.get('formatType') as 'image' | 'pmtiles';
		const demType = url.searchParams.get('demType'); // デフォルト値を設定
		const demTypeNumber = DEM_DATA_TYPE[demType as DemDataTypeKey];
		const mode = url.searchParams.get('mode') || 'default'; // デフォルト値を設定
		const modeNumber = DEM_STYLE_TYPE[mode as keyof typeof DEM_STYLE_TYPE];

		if (mode === 'relief') {
			const image = await this.tileCache.getSingleTileImage(
				tileId,
				x,
				y,
				z,
				baseUrl,
				formatType,
				controller
			);
			const elevationColorArray = this.colorMapCache.createColorArray(
				url.searchParams.get('colorMap') || 'bone'
			);
			const max = parseFloat(url.searchParams.get('max') || '10000');
			const min = parseFloat(url.searchParams.get('min') || '0');
			return new Promise((resolve, reject) => {
				this.pendingRequests.set(tileId, { resolve, reject, controller });

				this.worker.postMessage({
					tileId,
					center: image,
					demTypeNumber,
					modeNumber,
					mode,
					elevationColorArray,
					max,
					min
				});
			});
		} else if (mode === 'slope' || 'curvature') {
			const images = await this.tileCache.getAdjacentTilesWithImages(
				entryId,
				x,
				y,
				z,
				baseUrl,
				formatType,
				controller
			);

			const elevationColorArray = this.colorMapCache.createColorArray(
				url.searchParams.get('colorMap') || 'bone'
			);

			const center = images.center; // 中央のタイル
			const tileId = center.tileId; // ワーカー用ID
			const left = images.left; // 左のタイル
			const right = images.right; // 右のタイル
			const top = images.top; // 上のタイル
			const bottom = images.bottom; // 下のタイル
			const max = parseFloat(url.searchParams.get('max') || '90');
			const min = parseFloat(url.searchParams.get('min') || '0');

			return new Promise((resolve, reject) => {
				this.pendingRequests.set(tileId, { resolve, reject, controller });

				this.worker.postMessage({
					tileId,
					center: center.image,
					left: left.image,
					right: right.image,
					top: top.image,
					bottom: bottom.image,
					demTypeNumber,
					modeNumber,
					mode,
					elevationColorArray,
					max,
					min,
					tile: { x, y, z }
				});
			});
		} else {
			const image = await this.tileCache.getSingleTileImage(
				entryId,
				x,
				y,
				z,
				baseUrl,
				formatType,
				controller
			);

			return new Promise((resolve, reject) => {
				this.pendingRequests.set(tileId, { resolve, reject, controller });

				this.worker.postMessage({
					tileId,
					center: image,
					z,
					demTypeNumber
				});
			});
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
		}
	};

	private handleError(e: ErrorEvent) {
		console.error('Worker error:', e);
		this.pendingRequests.forEach((request) => {
			request.reject(new Error('Worker error occurred'));
		});
		this.pendingRequests.clear();
	}

	// 全てのリクエストをキャンセル
	cancelAllRequests() {
		if (this.pendingRequests.size > 0) {
			this.pendingRequests.forEach(({ reject, controller }) => {
				controller.abort(); // AbortControllerをキャンセル
				reject(new Error('Request cancelled'));
			});
		}

		console.info('All requests have been cancelled.');
		this.pendingRequests.clear();
	}

	// タイルキャッシュをクリア
	clearCache() {
		this.tileCache.clear();
	}
}

class WorkerProtocolPool {
	private workers: WorkerProtocol[] = [];
	private workerIndex = 0;
	private poolSize: number;

	constructor(poolSize: number) {
		this.poolSize = poolSize;

		// 指定されたプールサイズのワーカープロトコルを作成
		for (let i = 0; i < poolSize; i++) {
			const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
			this.workers.push(new WorkerProtocol(worker));
		}
	}

	// ラウンドロビン方式で次のワーカーを取得
	private getNextWorker(): WorkerProtocol {
		const worker = this.workers[this.workerIndex];
		this.workerIndex = (this.workerIndex + 1) % this.poolSize;
		return worker;
	}

	// タイルリクエストを処理する
	async request(url: URL, controller: AbortController): Promise<{ data: Uint8Array }> {
		const worker = this.getNextWorker();
		return worker.request(url, controller);
	}

	// 全てのリクエストをキャンセル
	cancelAllRequests() {
		this.workers.forEach((worker) => worker.cancelAllRequests());
	}

	// 全てのタイルキャッシュをクリア
	clearCache() {
		this.workers.forEach((worker) => worker.clearCache());
	}
}

const workerProtocolPool = new WorkerProtocolPool(2); // 4つのワーカースレッドを持つプールを作成

export const demProtocol = (protocolName: string) => {
	return {
		protocolName,
		request: (params: { url: string }, abortController: AbortController) => {
			const urlWithoutProtocol = params.url.replace(`${protocolName}://`, '');
			const url = new URL(urlWithoutProtocol);
			return workerProtocolPool.request(url, abortController);
		},
		cancelAllRequests: () => workerProtocolPool.cancelAllRequests(),
		clearCache: () => workerProtocolPool.clearCache()
	};
};
