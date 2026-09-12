import type { FeatureCollection } from '$routes/map/types/geojson';
import { hasWorkerError } from '$routes/map/utils/worker/run-single-shot';
import MeshWorker from './mesh.worker?worker';

export const dxfGeoJsonToGlbInWorker = (geojson: FeatureCollection, signal: AbortSignal) =>
	new Promise<ArrayBuffer>((resolve, reject) => {
		if (signal.aborted) {
			reject(new DOMException('変換を中止しました', 'AbortError'));
			return;
		}
		const worker = new MeshWorker();
		const cleanup = () => {
			worker.terminate();
			signal.removeEventListener('abort', abort);
		};
		const abort = () => {
			cleanup();
			reject(new DOMException('変換を中止しました', 'AbortError'));
		};
		signal.addEventListener('abort', abort, { once: true });
		worker.onmessage = ({ data }: MessageEvent<{ glb: ArrayBuffer; } | { error: string; }>) => {
			cleanup();
			if (hasWorkerError(data)) reject(new Error(data.error));
			else resolve(data.glb);
		};
		worker.onerror = (error) => {
			cleanup();
			reject(new Error(`DXFのメッシュ変換に失敗しました: ${error.message}`));
		};
		worker.onmessageerror = () => {
			cleanup();
			reject(new Error('DXFのメッシュを受け取れませんでした'));
		};
		try {
			worker.postMessage(geojson);
		} catch (error) {
			cleanup();
			reject(error);
		}
	});
