import { createGlbEntry } from '$routes/map/data/entries/model';
import { hasWorkerError } from '$routes/map/utils/worker/run-single-shot';

import type { SurfaceWorkerRequest, SurfaceWorkerResult } from './surface.worker';
import SurfaceWorker from './surface.worker?worker';

const reconstructInWorker = (
	params: SurfaceWorkerRequest,
	signal?: AbortSignal,
	onProgress?: (message: string) => void
) => new Promise<SurfaceWorkerResult>((resolve, reject) => {
	if (signal?.aborted) {
		reject(new DOMException('生成を中止しました', 'AbortError'));
		return;
	}
	const worker = new SurfaceWorker();
	const cleanup = () => {
		worker.terminate();
		signal?.removeEventListener('abort', abort);
	};
	const abort = () => {
		cleanup();
		reject(new DOMException('生成を中止しました', 'AbortError'));
	};
	signal?.addEventListener('abort', abort, { once: true });
	worker.onmessage = (
		{ data }: MessageEvent<{ result: SurfaceWorkerResult; } | { progress: string; }>
	) => {
		if ('progress' in data) {
			onProgress?.(data.progress);
			return;
		}
		cleanup();
		if (hasWorkerError(data)) reject(new Error(data.error));
		else resolve(data.result);
	};
	worker.onerror = (error) => {
		cleanup();
		reject(new Error(`メッシュ生成に失敗しました: ${error.message}`));
	};
	worker.onmessageerror = () => {
		cleanup();
		reject(new Error('メッシュの結果を受け取れませんでした'));
	};
	try {
		// Clone the input: cancellation/retry must leave the uploaded point cloud intact.
		worker.postMessage(params);
	} catch (error) {
		cleanup();
		reject(error);
	}
});

export const createPointCloudSurfaceEntry = async (
	name: string,
	params: SurfaceWorkerRequest,
	signal?: AbortSignal,
	onProgress?: (message: string) => void
) => {
	const { glb, lng, lat, cellSize, triangleCount } = await reconstructInWorker(
		{
			...params,
			bounds: [...params.bounds],
			coordinateOrigin: params.coordinateOrigin ? [...params.coordinateOrigin] : undefined
		},
		signal,
		onProgress
	);
	if (signal?.aborted) throw new DOMException('生成を中止しました', 'AbortError');
	const url = URL.createObjectURL(new Blob([glb], { type: 'model/gltf-binary' }));
	try {
		const entry = createGlbEntry(
			name,
			url,
			{ lng, lat, altitude: 0 },
			'gltf',
			undefined,
			undefined,
			{
				normalizeToLocalOrigin: false,
				initialShadingEnabled: true,
				sourceFileName: `${name}.glb`
			}
		);
		entry.metaData.bounds = [...params.bounds];
		entry.metaData.attribution = 'Point Cloud Mesh';
		entry.style.shading = {
			...entry.style.shading!,
			ambientStrength: 0.45,
			shadeStrength: 0.55
		};
		entry.metaData.description = params.method === 'terrain'
			? '点群をXY格子に分け、各格子の最高標高をつないだ3Dメッシュ。建物や樹木を含む上面の形状と色の分布を確認するために利用できる。'
			: '点群の近傍から表面を復元した3Dメッシュ。計測された形状と色の分布を確認するために利用できる。';
		return { entry, cellSize, triangleCount };
	} catch (error) {
		URL.revokeObjectURL(url);
		throw error;
	}
};
