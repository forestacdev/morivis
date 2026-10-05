import type { FeatureCollection } from '$routes/map/types/geojson';
import { hasWorkerError } from '$routes/map/utils/worker/run-single-shot';
import type { CadGeoreference } from './georeference';
import type { IndexedCadMesh } from './indexed-mesh';
import MeshWorker from './mesh.worker?worker';
import type { CadModelPlacement } from './model-placement';

export const convertDxfModelInWorker = (
	geojson: FeatureCollection,
	signal: AbortSignal,
	indexedMeshes: IndexedCadMesh[] = [],
	georeference?: CadGeoreference
) => new Promise<{ glb: ArrayBuffer; placement?: CadModelPlacement; }>((resolve, reject) => {
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
	worker.onmessage = (
		{ data }: MessageEvent<
			{ glb: ArrayBuffer; placement?: CadModelPlacement; } | { error: string; }
		>
	) => {
		cleanup();
		if (hasWorkerError(data)) reject(new Error(data.error));
		else resolve(data);
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
		worker.postMessage({ geojson, indexedMeshes, georeference });
	} catch (error) {
		cleanup();
		reject(error);
	}
});

export const dxfGeoJsonToGlbInWorker = async (
	geojson: FeatureCollection,
	signal: AbortSignal,
	indexedMeshes: IndexedCadMesh[] = []
) => (await convertDxfModelInWorker(geojson, signal, indexedMeshes)).glb;
