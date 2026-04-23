/**
 * COG Tile Protocol
 *
 * MapLibreの addProtocol で登録し、cog:// URLへのタイルリクエストを処理する。
 * メインスレッドで CogTileManager からバンドデータを読み取り、
 * 生バンドデータをWorkerにtransferしてTerrarium エンコード+WebGLレンダリングする。
 */
import { CogTileManager } from '$routes/map/utils/formats/geotiff/cog_tile_manager';
import { ColorMapManager } from '$routes/map/utils/style/color-mapping';

// --- Worker Protocol ---

class CogWorkerProtocol {
	private worker: Worker;
	private pendingRequests: Map<
		string,
		{
			resolve: (value: { data: Uint8Array | ImageBitmap }) => void;
			reject: (reason?: Error) => void;
			controller: AbortController;
		}
	>;
	private colorMapCache: ColorMapManager;
	private requestCounter = 0;

	constructor(worker: Worker) {
		this.worker = worker;
		this.pendingRequests = new Map();
		this.colorMapCache = new ColorMapManager();
		this.worker.addEventListener('message', this.handleMessage);
		this.worker.addEventListener('error', this.handleError);
	}

	async request(
		url: URL,
		controller: AbortController
	): Promise<{ data: Uint8Array | ImageBitmap }> {
		const x = parseInt(url.searchParams.get('x') || '0', 10);
		const y = parseInt(url.searchParams.get('y') || '0', 10);
		const z = parseInt(url.searchParams.get('z') || '0', 10);
		const entryId = url.searchParams.get('entryId') || '';
		const mode = url.searchParams.get('mode') || 'single';
		const tileSize = parseInt(url.searchParams.get('tileSize') || '256', 10);

		const cacheKey = `${entryId}_${x}_${y}_${z}`;
		const requestId = `${cacheKey}_${this.requestCounter++}`;

		// CogTileManagerからバンドデータ + 三角形メッシュを読み取る
		const tileData = await CogTileManager.readTile(entryId, z, x, y, tileSize);
		if (!tileData) {
			return { data: new Uint8Array(0) };
		}

		const metadata = CogTileManager.getMetadata(entryId);
		const nodata = metadata?.nodata ?? null;
		const { srcWidth, srcHeight, triangles } = tileData;

		if (mode === 'single') {
			const bandIndex = parseInt(url.searchParams.get('bandIndex') || '0', 10);
			const colorMap = url.searchParams.get('colorMap') || 'jet';
			const min = parseFloat(url.searchParams.get('min') || '0');
			const max = parseFloat(url.searchParams.get('max') || '1');

			const band = tileData.bands[bandIndex] ?? tileData.bands[0];
			const dataMin = metadata?.sampleRanges[bandIndex]?.min ?? 0;
			const dataMax = metadata?.sampleRanges[bandIndex]?.max ?? 1;
			const colorMapArray = this.colorMapCache.createColorArray(colorMap);

			const normMin = dataMax !== dataMin ? (min - dataMin) / (dataMax - dataMin) : 0;
			const normMax = dataMax !== dataMin ? (max - dataMin) / (dataMax - dataMin) : 1;

			// バンドデータのコピーを作成してtransfer（元データはキャッシュで保持）
			const bandCopy = new Float32Array(band.length);
			for (let i = 0; i < band.length; i++) bandCopy[i] = band[i];

			return new Promise((resolve, reject) => {
				this.pendingRequests.set(requestId, { resolve, reject, controller });
				this.worker.postMessage(
					{
						tileId: requestId,
						mode: 'single',
						tileSize,
						triangles,
						band: bandCopy,
						srcWidth,
						srcHeight,
						dataMin,
						dataMax,
						nodata,
						colorMapArray,
						min: normMin,
						max: normMax
					},
					{ transfer: [bandCopy.buffer] }
				);
			});
		} else {
			// multi mode
			const rIdx = parseInt(url.searchParams.get('rIndex') || '0', 10);
			const gIdx = parseInt(url.searchParams.get('gIndex') || '1', 10);
			const bIdx = parseInt(url.searchParams.get('bIndex') || '2', 10);

			const ranges = metadata?.sampleRanges ?? [];

			const copyBand = (
				bandIdx: number
			): { band: Float32Array; dataMin: number; dataMax: number } => {
				const src = tileData.bands[bandIdx] ?? tileData.bands[0];
				const copy = new Float32Array(src.length);
				for (let i = 0; i < src.length; i++) copy[i] = src[i];
				const dMin = ranges[bandIdx]?.min ?? 0;
				const dMax = ranges[bandIdx]?.max ?? 1;
				return { band: copy, dataMin: dMin, dataMax: dMax };
			};

			const r = copyBand(rIdx);
			const g = copyBand(gIdx);
			const b = copyBand(bIdx);

			const rRange = ranges[rIdx] ?? { min: 0, max: 1 };
			const gRange = ranges[gIdx] ?? { min: 0, max: 1 };
			const bRange = ranges[bIdx] ?? { min: 0, max: 1 };

			const rMin = parseFloat(url.searchParams.get('rMin') || String(rRange.min));
			const rMax = parseFloat(url.searchParams.get('rMax') || String(rRange.max));
			const gMin = parseFloat(url.searchParams.get('gMin') || String(gRange.min));
			const gMax = parseFloat(url.searchParams.get('gMax') || String(gRange.max));
			const bMin = parseFloat(url.searchParams.get('bMin') || String(bRange.min));
			const bMax = parseFloat(url.searchParams.get('bMax') || String(bRange.max));

			const norm = (val: number, dMin: number, dMax: number) =>
				dMax !== dMin ? (val - dMin) / (dMax - dMin) : 0;

			return new Promise((resolve, reject) => {
				this.pendingRequests.set(requestId, { resolve, reject, controller });
				this.worker.postMessage(
					{
						tileId: requestId,
						mode: 'multi',
						tileSize,
						triangles,
						srcWidth,
						srcHeight,
						nodata,
						bandR: r.band,
						bandG: g.band,
						bandB: b.band,
						dataMinR: r.dataMin,
						dataMaxR: r.dataMax,
						dataMinG: g.dataMin,
						dataMaxG: g.dataMax,
						dataMinB: b.dataMin,
						dataMaxB: b.dataMax,
						rMin: norm(rMin, rRange.min, rRange.max),
						rMax: norm(rMax, rRange.min, rRange.max),
						gMin: norm(gMin, gRange.min, gRange.max),
						gMax: norm(gMax, gRange.min, gRange.max),
						bMin: norm(bMin, bRange.min, bRange.max),
						bMax: norm(bMax, bRange.min, bRange.max)
					},
					{ transfer: [r.band.buffer, g.band.buffer, b.band.buffer] }
				);
			});
		}
	}

	private handleMessage = (e: MessageEvent) => {
		const { id, buffer, imageBitmap, error } = e.data;
		const request = this.pendingRequests.get(id);
		if (error) {
			console.error(`COG tile error ${id}:`, error);
			if (request) {
				request.reject(new Error(error));
				this.pendingRequests.delete(id);
			}
		} else if (request) {
			request.resolve({ data: imageBitmap ?? buffer });
			this.pendingRequests.delete(id);
		}
	};

	private handleError = (e: ErrorEvent) => {
		console.error('COG Worker error:', e);
		this.pendingRequests.forEach((request) => {
			request.reject(new Error('Worker error occurred'));
		});
		this.pendingRequests.clear();
	};

	cancelAllRequests() {
		this.pendingRequests.forEach(({ reject, controller }) => {
			controller.abort();
			reject(new Error('Request cancelled'));
		});
		this.pendingRequests.clear();
	}

	terminate() {
		this.cancelAllRequests();
		this.worker.terminate();
	}
}

class CogWorkerProtocolPool {
	private workers: CogWorkerProtocol[] = [];
	private workerIndex = 0;
	private poolSize: number;

	constructor(poolSize: number) {
		this.poolSize = poolSize;
		for (let i = 0; i < poolSize; i++) {
			const worker = new Worker(new URL('./protocol_cog.worker.ts', import.meta.url), {
				type: 'module'
			});
			this.workers.push(new CogWorkerProtocol(worker));
		}
	}

	private getNextWorker(): CogWorkerProtocol {
		const worker = this.workers[this.workerIndex];
		this.workerIndex = (this.workerIndex + 1) % this.poolSize;
		return worker;
	}

	async request(
		url: URL,
		controller: AbortController
	): Promise<{ data: Uint8Array | ImageBitmap }> {
		return this.getNextWorker().request(url, controller);
	}

	cancelAllRequests() {
		this.workers.forEach((w) => w.cancelAllRequests());
	}

	terminate() {
		this.workers.forEach((w) => w.terminate());
		this.workers = [];
		this.workerIndex = 0;
	}
}

let workerPool: CogWorkerProtocolPool | null = null;

const getWorkerPool = () => {
	if (!workerPool) {
		workerPool = new CogWorkerProtocolPool(2);
	}
	return workerPool;
};

export const terminateCogWorkerPool = () => {
	if (workerPool) {
		workerPool.terminate();
		workerPool = null;
	}
};

export const cogProtocol = (protocolName: string) => ({
	protocolName,
	request: (params: { url: string }, abortController: AbortController) => {
		const urlWithoutProtocol = params.url.replace(`${protocolName}://`, '');
		const url = new URL(urlWithoutProtocol, window.location.origin);
		return getWorkerPool().request(url, abortController);
	},
	cancelAllRequests: () => workerPool?.cancelAllRequests()
});
