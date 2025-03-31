import { TileImageManager, ColorMapManager } from '../image';

export type UniformsData = {
	elevation: {
		opacity: number;
		maxHeight: number;
		minHeight: number;
	};
	shadow: {
		opacity: number;
		shadowColor: string;
		highlightColor: string;
		ambient: number;
		azimuth: number;
		altitude: number;
	};
	edge: {
		opacity: number;
		edgeIntensity: number;
		edgeColor: string;
	};
};

// ユニフォーム変数
export const uniformsData: UniformsData = {
	// 標高
	elevation: {
		opacity: 1.0, // 不透明度
		maxHeight: 2500, // 最大標高値
		minHeight: 500 // 最小標高値
	},
	// 陰影
	shadow: {
		opacity: 0.8, // 不透明度
		shadowColor: '#000000', // 陰影色
		highlightColor: '#00ff9d', // ハイライト色
		ambient: 0.3, // 環境光
		azimuth: 0, // 方位
		altitude: 30 // 太陽高度
	},
	// エッジ
	edge: {
		opacity: 0.9, // 不透明度
		edgeIntensity: 0.4, // エッジ強度
		edgeColor: '#ffffff' // エッジカラー
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
		const baseUrl = 'https://cyberjapandata.gsi.go.jp/xyz/dem_png/{z}/{x}/{y}.png';

		const images = await this.tileCache.getAdjacentTilesWithImages(x, y, z, baseUrl, controller);

		return new Promise((resolve, reject) => {
			const center = images.center;
			const tileId = center.tileId;
			const left = images.left;
			const right = images.right;
			const top = images.top;
			const bottom = images.bottom;
			this.pendingRequests.set(tileId, { resolve, reject, controller });

			const elevationColorArray = this.colorMapCache.createColorArray('cool');

			this.worker.postMessage({
				tileId,
				center: center.image,
				left: left.image,
				right: right.image,
				top: top.image,
				bottom: bottom.image,
				z,
				uniformsData: uniformsData,
				elevationColorArray
			});
		});
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
