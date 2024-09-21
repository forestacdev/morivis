import type { ProtocolKey } from '$lib/data/types';
import { DEM_DATA_TYPE, COLOR_MAP_TYPE } from '$lib/data/raster/dem';
import type { DemDataTypeKey } from '$lib/data/raster/dem';
import { demEntry } from '$lib/data/raster/dem';

const loadImage = async (src: string, signal: AbortSignal): Promise<ImageBitmap> => {
	const response = await fetch(src, { signal: signal });
	if (!response.ok) {
		throw new Error('Failed to fetch image');
	}
	return await createImageBitmap(await response.blob());
};

const calculateLightDirection = (azimuth: number, altitude: number) => {
	// 方位角と高度をラジアンに変換
	const azimuthRad = (azimuth * Math.PI) / 180;
	const altitudeRad = (altitude * Math.PI) / 180;

	// 光の方向ベクトルを計算
	const x = Math.cos(altitudeRad) * Math.sin(azimuthRad);
	const y = Math.sin(altitudeRad);
	const z = -Math.cos(altitudeRad) * Math.cos(azimuthRad); // 北がZ軸の負の方向

	return [x, y, z];
};

export class WorkerProtocol {
	private worker: Worker;
	private pendingRequests: Map<
		string,
		{ resolve: Function; reject: Function; controller: AbortController }
	>;

	constructor(worker: Worker) {
		this.worker = worker;
		this.pendingRequests = new Map();
		this.worker.addEventListener('message', this.handleMessage);
		this.worker.addEventListener('error', this.handleError);
	}

	async request(url: string, controller: AbortController): Promise<{ data: Uint8Array }> {
		const image = await loadImage(url, controller.signal);
		return new Promise((resolve, reject) => {
			this.pendingRequests.set(url, { resolve, reject, controller });
			const demType = demEntry.demType;
			const demTypeNumber = DEM_DATA_TYPE[demType as DemDataTypeKey];
			const slopeModeNumber = demEntry.uniformsData.slope.visible ? 1 : 0;
			const shadowModeNumber = demEntry.uniformsData.shadow.visible ? 1 : 0;
			const evolutionModeNumber = demEntry.uniformsData.evolution.visible ? 1 : 0;
			const aspectModeNumber = demEntry.uniformsData.aspect.visible ? 1 : 0;

			const lightDirection = calculateLightDirection(
				demEntry.uniformsData.shadow.azimuth,
				demEntry.uniformsData.shadow.altitude
			);

			this.worker.postMessage({
				image,
				url,
				demTypeNumber,
				slopeModeNumber,
				shadowModeNumber,
				evolutionModeNumber,
				aspectModeNumber,
				lightDirection,
				uniformsData: demEntry.uniformsData
			});
		});
	}

	// 新しいメソッド: 全てのリクエストをキャンセル
	cancelAllRequests() {
		this.pendingRequests.forEach(({ reject, controller }, url) => {
			controller.abort(); // AbortControllerをキャンセル
			reject(new Error('Request cancelled'));
		});
		// this.pendingRequests.clear();
	}
	private handleMessage = (e: MessageEvent) => {
		const { id, buffer, error } = e.data;
		if (error) {
			console.error(`Error processing tile ${id}:`, error);
		} else {
			const request = this.pendingRequests.get(id);
			if (request) {
				request.resolve({ data: new Uint8Array(buffer) });
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

export const rgbdemProtocol = (protocolName: ProtocolKey) => {
	return {
		request: (params: { url: string }, abortController: AbortController) => {
			const imageUrl = params.url.replace(`${protocolName}://`, '');

			return workerProtocol.request(imageUrl, abortController);
		},
		cancelAllRequests: () => workerProtocol.cancelAllRequests()
	};
};

// export const rgbdemProtocol = (protocolName: ProtocolKey) => {
// 	return async (params: { url: string }, abortController: AbortController) => {
// 		const imageUrl = params.url.replace(`${protocolName}://`, '');
// 		const image = await loadImage(imageUrl, abortController.signal);
// 		return workerProtocol.request(imageUrl, image);
// 	};
// };
